var os = require('os');
var gulp = require('gulp')
var open = require('gulp-open');
var Server = require('karma').Server;
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var nodemon = require('gulp-nodemon')
/* Run our tests once, then quit */
/* Check the platform before selecting a browswer */
var browser = os.platform() === 'linux' ? ('google-chrome' || 'firefox') : (
    os.platform() === 'darwin' ? ('google chrome' || 'safari') : (
        os.platform() === 'win32' ? 'chrome' : 'iexplore'));

/* Run every unit test once, then quit */
gulp.task('unitTests', function (done) {
    new Server({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, done).start();
});

gulp.task('serve', ['nodemon'], function() {
	browserSync({
		proxy: "localhost:8080",
		port: 5000,
		notify: true
	});
});

gulp.task('nodemon', function(cb) {
	var called = false;
	return nodemon({
		script: 'server.js',
		watch: ["server.js", "app/*"],
		ext: 'js html'
	}).on('start', function() {
		if(!called) {
			called = true;
			cb();
		}
	}).on('restart', function() {
		gulp.src('server.js')
	});
});

/* Wait for unitTests to finish, then open the generated report */
gulp.task('openCodeCoverage', ['unitTests'], function () {
    gulp.src('./reports/*/index.html')
        .pipe(open({ app: browser }));
});

/* Can run `gulp test` to just run unit tests */
gulp.task('test', ['unitTests']);

/* Can run `gulp test-coverage` run unit tests and then show the code coverage */
gulp.task('test-coverage', ['unitTests', 'openCodeCoverage']);

