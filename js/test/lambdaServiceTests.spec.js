/* Copyright 2017 PSU Capstone Team D
This code is available under the "MIT License".
Please see the file LICENSE in this distribution for license terms.*/

describe('lambdaService', function () {
    var lambdaService, $httpBackend, schedulerService;
	var gatewayURL = "https://cy2w528ju0.execute-api.us-west-2.amazonaws.com/api/schedule";

    // Load the adminUI module
    beforeEach(angular.mock.module('adminUI'));
    
    // Inject the $httpBackend to create 'fake' http responses,
    // create a function that will inject the lambdaService
    beforeEach(inject(function($injector) {
        $httpBackend = $injector.get('$httpBackend');
        schedulerService = $injector.get('schedulerService');
        createService = function($httpBackend, schedulerService) {
            return $injector.get('lambdaService');
        }
    }));

    // Ensure there are no requests trying to be made
    afterEach(function() {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
    });
 
    // Test for success
    it('should echo the data back on success', function () {
        var msg = "<test><header>Test header</header><body>Test body</body></test>"
        var result = '';
        $httpBackend.expectPOST(gatewayURL).respond(function () {
            result = msg;
            return [200, msg];
        });
        lambdaService = createService($httpBackend, schedulerService);

        lambdaService.sendBXF(msg);
        $httpBackend.flush();
        console.log('[$httpBackend]\tThe response was: ' + result);
        expect(result).toBe(msg);
    });

    // Test for failure
    it('should show an error when the POST command does not work', function () {
        var msg = "<test><header>Test header</header><body>Test body</body></test>"
        var result = '';
        $httpBackend.expectPOST(gatewayURL).respond(function() {
            result = 'Error';
            return [404, 'ERROR'];
        });

        lambdaService = createService($httpBackend, schedulerService);
        lambdaService.sendBXF(msg);
        $httpBackend.flush();
        console.log('[$httpBackend]\tThe response was: ' + result);
        expect(result).toBe('Error');
    });

 });
