/* Copyright 2017 PSU Capstone Team D
This code is available under the "MIT License".
Please see the file LICENSE in this distribution for license terms.*/

angular.module('adminUI')
    .service('lambdaService', ['$http', 'schedulerService', function ($http, schedulerService) {

				
		// Input URL for Live to Delta
		this.deltaInputURL = 'http://delta-1-yanexx65s8e5.live.elementalclouddev.com/in_put/test.m3u8';
	
        // Send BXF to Lambda API
        this.sendBXF = function (xml) {
            var gatewayURL = "https://cy2w528ju0.execute-api.us-west-2.amazonaws.com/api/schedule";
            var config = {
               method: "POST",
               url: gatewayURL,
               data: { 'body' : xml, 'destination_uri' : this.deltaInputURL, 'stream_url': schedulerService.livestreamURL },
               headers: {
                   'Content-Type': 'application/json'
               }
            };

            // Posts the XML string to the API gateway, returns success / failure
            // depending on the response
            $http(config).then(function success(response) {
               //toastr.success('BXF Successfully Sent', 'Done');
               //console.log('[lambdaService]\tThe response was: ' + response.data);
               return "success";
            }, function error(response) {
               //toastr.success('BXF Successfully Sent', 'Done');
               //toastr.error(response, 'Error');
               //console.log('[lambdaService]\tThe response was: ' + response.data);
               return "failure";
            });
        }
    }]);

//application/xml