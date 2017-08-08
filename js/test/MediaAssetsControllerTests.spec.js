describe('MediaAssetsControllerTests', function(){
	var S3Service, mediaAssetsService, schedulerService, $scope, $q, $rootScope, MediaAssetsController;
	
    beforeEach(angular.mock.module('adminUI'));

    beforeEach(inject(function($injector, $rootScope, $controller, _$q_, _S3Service_, _schedulerService_, _mediaAssetsService_) {
        $rootScope = $injector.get('$rootScope');
        $scope = $rootScope;
        createS3Service = function($rootScope) {
            return $injector.get('S3Service');
        };
        createSchedulerService = function($rootScope) {
            return $injector.get('schedulerService');
        };
        createMediaAssetsService = function($rootScope) {
            return $injector.get('mediaAssetsService');
        }

       $q = _$q_;
       S3Service = createS3Service($scope);
       schedulerService = createSchedulerService($scope);
       mediaAssetsService = createMediaAssetsService($scope);
       createMediaAssetsController = function() {
           return $controller('MediaAssetsController', {
               '$scope': $scope,
               '$rootScope': $rootScope,
               'S3Service': S3Service,
               '$q': $q,
               'mediaAssetsService': mediaAssetsService,
               'schedulerService': schedulerService
           });
       }
    }));
    
    describe('initial load tests', function() {
        it('should successfully load and bind variables', function() {
            MediaAssetsController = createMediaAssetsController($scope, $rootScope, S3Service, $q, mediaAssetsService, schedulerService);
            expect(MediaAssetsController).toBeTruthy();

            expect($scope.mediaAssets).toEqual(mediaAssetsService.mediaAssets);
            expect($scope.S3Objects.length).toBe(0);
            expect($scope.currentURL).toBe("");
            expect($scope.currentFileName).toBe("");
        });
    });

    describe("updateCurrentS3Video() tests", function() {
        it('should correctly set the file name and URL', function() {
            MediaAssetsController = createMediaAssetsController($scope, $rootScope, S3Service, $q, mediaAssetsService, schedulerService);
            var fileName = "testFile";
            var testURL = "www.foo.com";

            $scope.updateCurrentS3Video(fileName, testURL);
            expect($scope.currentFileName).toBe(fileName);
            expect($scope.currentURL).toBe(testURL);
        });
        it('should correctly handle null values', function() {
            MediaAssetsController = createMediaAssetsController($scope, $rootScope, S3Service, $q, mediaAssetsService, schedulerService);
            var fileName = null; 
            var testURL = null;

            $scope.updateCurrentS3Video(fileName, testURL);
            expect($scope.currentFileName).toBe("");
            expect($scope.currentURL).toBe("");
        });
    });
    describe("addFile() tests", function() {
        beforeEach(function() {
            MediaAssetsController = createMediaAssetsController($scope, $rootScope, S3Service, $q, mediaAssetsService, schedulerService);
            spyOn($scope, '$emit');
        });

        it("should broadcast the correct event and arguments", function() {

            $scope.currentFileName = "test";
            $scope.currentURL = "www.foo.com";
            $scope.title = "test title";
            $scope.category = "TV Show";
            $scope.videoStartTime = new Date();
            $scope.order = 1;

            $scope.addFile();
            expect($scope.$emit).toHaveBeenCalledWith('addS3ToPlaylist', { fileName: $scope.currentFileName, fileURL: $scope.currentURL, title: $scope.title, category: $scope.category, date: $scope.videoStartTime, order: $scope.order});
        });

    });
});