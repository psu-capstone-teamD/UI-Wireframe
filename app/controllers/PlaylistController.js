/* Copyright 2017 PSU Capstone Team D
This code is available under the "MIT License".
Please see the file LICENSE in this distribution for license terms.*/

angular.module('adminUI')
    .controller('PlaylistController', ['$scope', 
                                       '$rootScope', 
                                       'S3Service', 
                                       'BXFGeneratorService', 
                                       '$q',
                                       '$interval', 
                                       'uuid', 
                                       'schedulerService', 
                                       'currentVideoStatusService', 
                                       'mediaAssetsService',
                                       'mediaProcessingService',
function PlaylistController($scope, $rootScope, S3Service, BXFGeneratorService, $q, $interval, uuid, schedulerService, currentVideoStatusService, mediaAssetsService, mediaProcessingService) {



    // Stores the file duration for access
    $rootScope.fileDuration = "";

    // Stores the file's thumbnail for access 
    $rootScope.fileThumbnail = null;


    // Stores the length of the video
    $rootScope.videoLength = 0;

    // Stores the order of the last video in the playlist
    $scope.lastVideoOrder = 0;

    // Whether or not an event is runnning in Live
    $scope.eventRunning = false;

    $scope.videos = schedulerService.videos;
    $scope.videoCount = schedulerService.videos.length;

    $scope.uploadProgress = 0;

    // Initialize the Amazon Cognito credentials provider
    AWS.config.region = 'us-west-2'; // Region
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        AccountId: 'REPLACE ME',
        IdentityPoolId: 'REPLACE ME',
        RoleArn: 'REPLACE ME'
    });

     

    // Stores the files start time 
    $scope.startTime = "";
    $scope.sortableOptions = {
        cancel: ".unsortable",
        stop: function(e, ui) {
            var sortedList = schedulerService.videos.map(function(currentValue, index) {
                currentValue.order = index + 1;
                return currentValue;
            });
            schedulerService.videos = sortedList;
            schedulerService.playlistChanged();
            $scope.videos = schedulerService.videos;
        },
        'ui-floating': true,
        items: "tr:not(.unsortable)"
    }

    $rootScope.statusFilter = function(video) {
        if(video === undefined) {
            return false;
        }
        return !video.locked;
    };

    // When the MediaAssetController signals a video to be
    // added, the PlaylistController takes over control
    $rootScope.$on('addS3ToPlaylist', function(event, args) {
        args = S3Service.mediaObject;
        if (args === null) {
            return;
        }
       $scope.file = {};
       $scope.file.name = args.fileName;
       $scope.videoCount = schedulerService.videos.length;
       var videoTitle = args.title;
       var category = args.category;
       var date = args.videoStartTime; 
       var order = args.order;
       S3Service.mediaObject = null;

       var generateDuration = mediaProcessingService.findDuration(args.fileURL, true);
       generateDuration.then(function(result) {
            $scope.generateStartTime();
            var bucket = new AWS.S3();
            var thumb = S3Service.retrieveThumbnail($scope.file.name, bucket);
            thumb.then(function (result) {
                // Check if the user didn't put anything into the form
                // Local variables are used so the form's values don't mutate
                // in front of the user.
                $scope.fileThumbnail = result;
                if (category === undefined || category === null || category === "") {
                    category = "TV Show";
                }
                if (order === undefined || order === null || order === "") {
                    if ($scope.videoCount === undefined || $scope.videoCount === 0 ) {
                        order = 1;
                        $scope.newOrder = order;
                    }
                    else {
                        order = $scope.videoCount + 1;
                    }
                }
                // Add video to playlist UI and increment video count
                var videoTitle = schedulerService.validateVideoTitle(args.title);
                schedulerService.videos.push({ title: videoTitle,
                                        file: $scope.file.name, 
                                        category: category, 
                                        order: parseInt(order), 
                                        duration: $scope.fileDuration, 
                                        thumbnail: $scope.fileThumbnail, 
                                        date: $scope.startTime, 
                                        totalSeconds: $scope.videoLength, 
                                        liveStatus: "ok",
                                        locked: false,
                                        videoPlayed: false,
                                        uuid: uuid.v4()});
                $scope.videos = schedulerService.videos;
                $scope.videoCount = $scope.videoCount + 1;
                $scope.newOrder = parseInt(order);
                $rootScope.$broadcast('VideoCountChanged', $scope.videoCount);
                if(!$scope.verifyOrder()) {
                    $scope.reorder($scope.videoCount);
                    $scope.resetOrder();
                }
            }, function(error) {
                toastr.error("Error", error);
            })
        }, function (error) {
            toastr.error("Error", error);
        })
        .then(function (result) {
            // Put Finished
            // Reset The Progress Bar
            // Clear form in modal
            setTimeout(function() {
                $rootScope.$broadcast('S3AddFinished', null);
            }, 1000);
            return true;
        })
    });

    // Ensure the data bindings are correct
    $rootScope.$on('PlaylistChanged', function(event, args) {
        $scope.videos = schedulerService.videos;
        $scope.videoCount = $scope.videos.length;
    });
    // Resets form
    $scope.resetForm = function() {
        try {
            $('#addAsset').modal('hide');
        }
        catch (err) {
            console.log("Failed to hide the modal!");
        }
        $scope.title = null;
        try {
            document.getElementById('file').value = null;
        }
        catch (err) {
            console.log("Failed to reset the file!");
        }
        $scope.category = "";
        $scope.order = "";
        $scope.uploadProgress = 0;
        $scope.startTime = "";
        $scope.videoStartTime = "";
        $scope.file = null;
        schedulerService.playlistChanged();
    }



    // Generates BXF from JSON Object and sends to Lambda
    $scope.publish = function() {
        $scope.videos = schedulerService.videos;
        BXFGeneratorService.generateBXF($scope.videos);
        $scope.lastVideoOrder = $scope.videoCount;
        $scope.eventRunning = true;
    };

    // Set the the start time of the video. If this is the first video,
    // generate the start time based on user input. Otherwise, set it
    // to play after the previous video is finished.
    $scope.generateStartTime = function () {
        if ($scope.videos.length === 0) {
            if (schedulerService.initialStartTime === '') {
                schedulerService.initialStartTime = new Date();
                switch ($scope.videoStartTime) {
                    case "00:00:30":
                        schedulerService.initialStartTime.setSeconds(schedulerService.initialStartTime.getSeconds() + 30);
                        break;
                    case "00:05:00":
                        schedulerService.initialStartTime.setMinutes(schedulerService.initialStartTime.getMinutes() + 5);
                        break;
                    case "00:10:00":
                        schedulerService.initialStartTime.setMinutes(schedulerService.initialStartTime.getMinutes() + 10);
                        break;
                    case "00:30:00":
                        schedulerService.initialStartTime.setMinutes(schedulerService.initialStartTime.getMinutes() + 30);
                        break;
                    case "01:00:00":
                        schedulerService.initialStartTime.setHours(schedulerService.initialStartTime.getHours() + 1);
                        break;
                    case "24:00:00":
                        schedulerService.initialStartTime.setDate(schedulerService.initialStartTime.getDate() + 1);
                        break;
                    default:
                        schedulerService.initialStartTime.setSeconds(schedulerService.initialStartTime.getSeconds() + 30);
                        break;
                }
                $scope.startTime = schedulerService.initialStartTime.getDate();
            }
            else {
                $scope.startTime = schedulerService.initialStartTime.getDate();
            }
            return 1;
        }
        return 0;
    }

    $scope.addToPlaylist = function () {
        var category = $scope.category;
        var order = $scope.order;
        if ($scope.category === null || $scope.category === "") {
            category = "TV Show";
        }
        if ($scope.order === null || $scope.order === "") {
            if ($scope.videoCount === null || $scope.videoCount === "") {
                order = 1;
                $scope.newOrder = order;
                $scope.videoCount = 0;
            }
            else {
                order = $scope.videoCount + 1;
            }
        }
        // Add video to playlist UI and increment video count
        var videoTitle = schedulerService.validateVideoTitle($scope.title);
        schedulerService.videos.push({
            title: videoTitle,
            file: $scope.file.name,
            category: category,
            order: parseInt(order),
            duration: $rootScope.fileDuration,
            thumbnail: $rootScope.fileThumbnail,
            date: $scope.startTime,
            totalSeconds: $rootScope.videoLength,
            liveStatus: "ok",
            locked: false,
            videoPlayed: false,
            uuid: uuid.v4()
        });
        $scope.videos = schedulerService.videos;
        $scope.videoCount = $scope.videoCount + 1;
        $scope.newOrder = parseInt(order);
        $rootScope.$broadcast('VideoCountChanged', $scope.videoCount);
        if (!$scope.verifyOrder()) {
            $scope.reorder($scope.videoCount);
           $scope.resetOrder();
        }
    };

    //Workaround for updating upload progress, still have async issue
    $scope.$on('progressEvent', function (event, data) {
        if (data.total != 0)
            $scope.uploadProgress = Math.round(data.loaded * 100/ data.total);
        $scope.$digest();
    });

    // Upload a video to the S3 bucket and add to the playlist
    $scope.upload = function () {
		if($scope.file)
		{
            var bucket = S3Service.setBucket($scope.file);
            var upload = S3Service.upload($scope.file, bucket);
			upload.then(
				function (result) {
                    var generateDuration = mediaProcessingService.findDuration($scope.file, false);
                    generateDuration.then(function (result) {
                        $scope.generateStartTime();
                        toastr.info("Processing media data...", "Processing");
                        var thumb = mediaProcessingService.generateThumbnail($scope.file, false);
                        thumb.then(function (result) {

                            // Uploads the thumbnail to S3 for future retrieval
                            var bucket = new AWS.S3({ params: { Bucket: $scope.creds.bucket }});
                            var thumbnailBlob = $rootScope.convertDataURIToBlob($rootScope.fileThumbnail);
                            var uploadThumbnailToS3 = $scope.uploadThumbnailToS3(thumbnailBlob, $scope.file.name, bucket);
                            uploadThumbnailToS3.then(function(result) {
                                $scope.addToPlaylist();
                                setTimeout(function() {
                                    $scope.resetForm();
                                    $scope.uploadProgress = 0;
                                    $scope.$digest();
                                }, 750);
                                return true;
                            }, function(error) {
                                toastr.error("Error", error);
                                // Put Finished
                                // Reset The Progress Bar
                                // Clear form in modal
                                setTimeout(function() {
                                    $scope.resetForm();
                                    $scope.uploadProgress = 0;
                                    $scope.$digest();
                                }, 750);
                            });
                        }, function(error) {
                            toastr.error("Error", error);
                            // Put Finished
                            // Reset The Progress Bar
                            // Clear form in modal
                            setTimeout(function() {
                                $scope.resetForm();
                                $scope.uploadProgress = 0;
                                $scope.$digest();
                            }, 750);
                        })
                    }, function (error) {
                        toastr.error("Error", error);
                        // Put Finished
                        // Reset The Progress Bar
                        // Clear form in modal
                        setTimeout(function() {
                            $scope.resetForm();
                            $scope.uploadProgress = 0;
                            $scope.$digest();
                        }, 750);
                    })
			}, function(error) {
                toastr.error("Error", error);
					// Put Finished
					// Reset The Progress Bar
					// Clear form in modal
					setTimeout(function() {
                        $scope.resetForm();
                        $scope.uploadProgress = 0;
                        $scope.$digest();
                    }, 750);
                return false;
			});
		}
		else {
			//No File selected
		    toastr.error('Please select a valid file to upload.', 'No File Selected');
            return false;
        }
    };

    // Reset the order of the videos
    $scope.resetOrder = function() {
        var i = 1;
        $scope.videos.forEach(function(video) {
            video.order = i;
            ++i;
        });
        schedulerService.videos = $scope.videos;
    };

	//Reorder videos
    $scope.reorder = function (oldOrder) {
		//Case: No video on list, no need to reorder
		if($scope.videoCount === 0)
            return 0;

        //Case: Video is locked
        if($scope.videos[oldOrder - 1].liveStatus === "running" || $scope.videos[oldOrder -1].liveStatus === "pending") {
            return 0;
        }



		//Valid Cases
		var newIndex = $scope.newOrder - 1
		var oldIndex = oldOrder - 1;

        if(newIndex < 0) {
            return 0;
        }

        if(newIndex > $scope.videoCount) {
            return 0;
        }


		//Case: New order value less than old Order value, increment every videos on index newIndex to oldIndex - 1
		if(newIndex < oldIndex) {
			for(var i = newIndex; i <= oldIndex - 1; i++)
			{
				//var currentVid = $scope.videos[i];
                var currentVid = schedulerService.videos[i];
				currentVid.order = (parseInt(currentVid.order) + 1);
			}
		}
		//Case: New order value greater than old Order value, decrement every videos on oldIndex + 1 to newIndex
		else if(newIndex > oldIndex) {
			for(var i = oldIndex + 1; i <= newIndex; i++)
			{
				//var currentVid = $scope.videos[i];
                var currentVid = schedulerService.videos[i];
				currentVid.order = (parseInt(currentVid.order) - 1);
			}
		}
		//Case: new order value is the same as the old order value, do nothing, return 2
		else {
			return 2;
        }

		//Set the new value for the target video.
		//var targetVid = $scope.videos[oldIndex];
        var targetVid = schedulerService.videos[oldIndex];
		targetVid.order = parseInt($scope.newOrder);
		//$scope.videos = $scope.videos.sort(function(a, b) {
        schedulerService.videos = schedulerService.videos.sort(function(a, b) {
			return parseInt(a.order) - parseInt(b.order);
        });
        schedulerService.playlistChanged();
		return 0;
    }

    $scope.remove = function(order) {
        var result = schedulerService.remove(order);
        $scope.videoCount = $scope.videoCount;
        return result;
    };

    // Ensure the playlist is in correct order
    $scope.verifyOrder = function() {
        var count = $scope.videos.length;
        for(var i = 0; i < count; i++) {
            if(($scope.videos[i + 1] != null) && $scope.videos[i].order >= $scope.videos[i + 1].order) {
                return false;
            }
        }
        return true;
    }

    // Return the background color based on liveStatus
    $scope.setRowColor = function(status) {
        switch(status) {
            case "running":
                return {'background-color': "#e0827b"} // Red
            case "pending":
                return {'background-color': "#eef27b"} // Yellow
            case "done":
                return {'cursor': 'move', 'background-color': '#42f483'} // Green
            default:
                return {'cursor': 'move'}
        }
    }

    // Recursively go through and mark the current video
    // and the video before it as done
    $scope.markVideosAsDone = function(order) {
        if(order < 1 || order > schedulerService.videos.length + 1 || order === NaN || order === undefined) {
            return schedulerService.videos;
        }
        schedulerService.videos[order - 1].liveStatus = "done";
        schedulerService.videos[order - 1].locked = false;
        schedulerService.videos[order - 1].videoPlayed = true;
        schedulerService.videos = $scope.markVideosAsDone(order - 1);
        return schedulerService.videos;
    }

    // Main function to update the playlist's statuses
    $scope.checkLiveStatus = function() {
        // If there are no videos in the playlist, no need to check
        if(schedulerService.videos.length === 0 || $scope.videos.length === 0 || $scope.eventRunning === false) {
            return 0;
        }


        var liveStatus = currentVideoStatusService.getLiveStatus();
        return liveStatus.then(function(response) {

            // If there was an error, log this
            if(response === "failure") {
                console.log("Something went wrong, couldn't ping the Lambda service");
                return 0;
            }

            // If an error message was returned instead, don't do anything
            // (this usually comes from Lambda timing out)
            if(response.errorMessage !== undefined) {
                return -1;
            }

            // If the response code wasn't successful, that means the event
            // is no longer running (or Lambda had an issue)
            if(response.statusCode !== "200") {

                // See which videos in the playlist to unlock
                var toRemove = schedulerService.checkForRemoval([]);
                toRemove.forEach(function(item) {
                    $scope.videos = $scope.markVideosAsDone(parseInt(item));

                    // If the last item in the event is complete, set
                    // $scope.eventRunning to false
                    if(parseInt(item) === $scope.lastVideoOrder) {
                        $scope.eventRunning = false;
                    }
                });
                return 0;
            }

            // If there are running videos...
            if(response.running !== "") {
                // Split the uuids before passing on to schedulerService
                var uuids = response.running.split(",");
                schedulerService.setVideoStatus(uuids, "running");
                $scope.videos = schedulerService.videos;
            }

            // If there are pending videos...
            if(response.pending !== "") {
                // Split the uuids before passing on to schedulerService
                var uuids = response.pending.split(",");
                schedulerService.setVideoStatus(uuids, "pending");
                $scope.videos = schedulerService.videos;
            }

            // Check in case the current running video has switched
            var toRemove = schedulerService.checkForRemoval(response.running.split(","));
            toRemove.forEach(function(item) {
                $scope.videos = $scope.markVideosAsDone(parseInt(item));
                if(parseInt(item) === $scope.lastVideoOrder) {
                    $scope.eventRunning = false;
                }
            });
            return 1; 
        });
    };

    // Every 2.7 seconds, check the status of videos and update
    // the playlist accordingly
    var checkLive = $interval(function() {
        $scope.checkLiveStatus();
    }, 2700);

    // Clear the entire playlist
    $scope.clearPlaylist = function() {
        if ($scope.videos === undefined || $scope.videos.length === 0) {
            return 0;
        }
        else {
            var length = $scope.videos.length;
            for (var i = 0; i < length; ++i) {
                if ($scope.videos[i].locked === true) {
                    toastr.error("A video is currently locked, please wait until it is done playing", "Error");
                    return -1;
                }
            }
            schedulerService.videos = [];
            schedulerService.playlistChanged();
            return 1;
        }
    };

    // Ensure the interval doesn't keep spawning every time the 
    // Playlist view is refreshed
    $scope.$on('$destroy', function(event, args) {
        $interval.cancel(checkLive);
    });

}]);
