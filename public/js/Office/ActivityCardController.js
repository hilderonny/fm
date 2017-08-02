app.controller('OfficeActivityCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
   
    $scope.types = [
        'ACTIVITIES_TYPE_NONE',
        'ACTIVITIES_TYPE_CALL_ON_CUSTOMERS',
        'ACTIVITIES_TYPE_MAINTENANCE',
        'ACTIVITIES_TYPE_WARRANTY'
    ];
    
    // Click on Create-button to create a new activity
    $scope.createActivity = function() {
        var activityToSend =  { 
            date: $scope.activity.date, 
            name: $scope.activity.name, 
            task: $scope.activity.task, 
            isDone: $scope.activity.isDone, 
            type: $scope.activity.type, 
            comment: $scope.activity.comment 
        };
        $http.post('/api/activities', activityToSend).then(function(response) {
            var createdActivity = response.data;
            $scope.isNewActivity = false;
            $scope.activity._id = createdActivity._id;
            $scope.activityName = $scope.activity.name;
            $scope.relationsEntity = { type:'activities', id:createdActivity._id };
            if ($scope.params.createActivityCallback) {
                $scope.params.createActivityCallback(createdActivity);
            }
            if ($scope.params.isSelection) {
                $scope.params.selectCallback(createdActivity);
            }
            $translate(['TRK_ACTIVITIES_ACTIVITY_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_ACTIVITIES_ACTIVITY_CREATED).hideDelay(1000).position('bottom right'));
            });
            utils.setLocation('/activities/' + createdActivity._id);
        });
    };

    // Click on Save-button to save an existing activity
    $scope.saveActivity = function() {
        var activityToSend = { isDone: $scope.activity.isDone, comment: $scope.activity.comment };
        if ($scope.activity.fullyEditable) {
            activityToSend.date = $scope.activity.date;
            activityToSend.name = $scope.activity.name;
            activityToSend.task = $scope.activity.task;
            activityToSend.type = $scope.activity.type;
        }
        $http.put('/api/activities/' + $scope.activity._id, activityToSend).then(function(response) {
            var savedActivity = response.data;
            $scope.activityName = $scope.activity.name;
            if ($scope.params.saveActivityCallback) {
                $scope.params.saveActivityCallback(savedActivity);
            }
            $translate(['TRK_ACTIVITIES_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_ACTIVITIES_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });
        });
    };

    // Click on delete button to delete an existing activity
    $scope.deleteActivity = function() {
        $translate(['TRK_ACTIVITIES_ACTIVITIY_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations) {
            $translate('TRK_ACTIVITIES_REALLY_DELETE_ACTIVITIY', { activityName: $scope.activityName }).then(function(TRK_ACTIVITIES_REALLY_DELETE_ACTIVITIY) {
                var confirm = $mdDialog.confirm()
                    .title(TRK_ACTIVITIES_REALLY_DELETE_ACTIVITIY)
                    .ok(translations.TRK_YES)
                    .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function() {
                    $http.delete('/api/activities/' + $scope.activity._id).then(function(response) {
                        if ($scope.params.deleteActivityCallback) {
                            $scope.params.deleteActivityCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_ACTIVITIES_ACTIVITIY_DELETED).hideDelay(1000).position('bottom right'));
                    });
                });
            });
        });
    };

    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    // Loads the activity details or prepares the empty dialog for a new activity
    // Params:
    // - $scope.params.activityId : ID of the activity to load, when not set, a new activity is to be created
    // - $scope.params.createActivityCallback : Callback function when a new activity was created. Gets the activity as parameter
    // - $scope.params.saveActivityCallback : Callback function when an existing activity was saved. Gets the updated activity as parameter
    // - $scope.params.deleteActivityCallback : Callback function when an existing activity was deleted. No parameters
    // - $scope.params.closeCallback : Callback function when the card gets closed via button. No parameters
    $scope.load = function() {
        // Switch between creation of a new activity and loading of an existing activity
        if ($scope.params.activityId) {
            // Existing activity
            $http.get('/api/activities/' + $scope.params.activityId).then(function(response) {
                var completeActivity = response.data;
                $scope.isNewActivity = false;
                completeActivity.date = new Date(completeActivity.date); // Convert string to Date object
                $scope.activity = completeActivity;
                $scope.activityName = completeActivity.name; // Prevent updating the label when changing the input value 
                $scope.relationsEntity = { type:'activities', id:completeActivity._id };
                utils.setLocation('/activities/' + completeActivity._id);
            });
        } else {
            // New activity
            $scope.isNewActivity = true;
            $scope.activity = { date: new Date(), name: '', task: '', isDone: false, type: 'ACTIVITIES_TYPE_NONE', comment: '', fullyEditable: true };
        }
        $scope.canWriteActivities = $rootScope.canWrite('PERMISSION_OFFICE_ACTIVITY');
    };

    // Listen on locale changes to update the date picker. Event is fired from MainController
    $rootScope.$on('localeChanged', function() {
        $scope.activity.date = new Date($scope.activity.date); // https://github.com/angular/material/issues/7054#issuecomment-181046527
    });

    $scope.load();

});
