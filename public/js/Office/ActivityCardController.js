app.controller('OfficeActivityCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
    
    // Register translations
    utils.registerTranslations('activities');
   
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
            if ($scope.params.createActivityCallback) {
                $scope.params.createActivityCallback(createdActivity);
            }
            if ($scope.params.isSelection) {
                $scope.params.selectCallback(createdActivity);
            }
            $translate(['ACTIVITIES_ACTIVITY_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.ACTIVITIES_ACTIVITY_CREATED).hideDelay(1000).position('bottom right'));
            });
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
            $translate(['ACTIVITIES_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.ACTIVITIES_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });
        });
    };

    // Click on delete button to delete an existing activity
    $scope.deleteActivity = function() {
        $translate(['ACTIVITIES_ACTIVITIY_DELETED', 'YES', 'NO']).then(function(translations) {
            $translate('ACTIVITIES_REALLY_DELETE_ACTIVITIY', { activityName: $scope.activityName }).then(function(ACTIVITIES_REALLY_DELETE_ACTIVITIY) {
                var confirm = $mdDialog.confirm()
                    .title(ACTIVITIES_REALLY_DELETE_ACTIVITIY)
                    .ok(translations.YES)
                    .cancel(translations.NO);
                $mdDialog.show(confirm).then(function() {
                    $http.delete('/api/activities/' + $scope.activity._id).then(function(response) {
                        if ($scope.params.deleteActivityCallback) {
                            $scope.params.deleteActivityCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.ACTIVITIES_ACTIVITIY_DELETED).hideDelay(1000).position('bottom right'));
                    });
                });
            });
        });
    };

    // When user wants to select an FM object for the activity
    $scope.startAssignFmObject = function() {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('BIM/HierarchyCard', {
            isSelection: true,
            selectButtonText: 'ACTIVITIES_ASSIGN',
            selectCallback: !$scope.params.isSelection ? function(selectedFmObject) {
                var relationToSend =  { 
                    type1: 'activities',
                    type2: 'fmObjects',
                    id1: $scope.activity._id,
                    id2: selectedFmObject._id
                };
                $http.post('/api/relations', relationToSend).then(function() {
                    $translate(['ACTIVITIES_FMOBJECT_ASSIGNED']).then(function(translations) {
                        $mdToast.show($mdToast.simple().textContent(translations.ACTIVITIES_FMOBJECT_ASSIGNED).hideDelay(1000).position('bottom right'));
                    });
                    $scope.loadFmObjects();
                    $scope.selectFmObject(selectedFmObject);
                });
            } : null,
            closeCallback: function() {
                $scope.fmObjectListSelectedFmObject = null;
                utils.removeCardsToTheRightOf($element)
            }
        });
        (event || window.event).stopPropagation(); // Prevent that card receives click event
    };

    // When user wants to select an assigned FM object
    $scope.selectFmObject = function(fmObject) {
        $scope.fmObjectListSelectedFmObject = fmObject;
        utils.removeCardsToTheRightOf($element);
        utils.addCard('BIM/FmobjectCard', {
            fmObjectId: fmObject._id,
            isSelection: true,
            selectButtonText: 'ACTIVITIES_UNASSIGN',
            selectCallback: $scope.canWriteActivities && !$scope.params.isSelection ? function(selectedFmObject) {
                $http.delete('/api/relations/?type1=activities&type2=fmObjects&id1=' + $scope.activity._id + '&id2=' + selectedFmObject._id).then(function() {
                    $translate(['ACTIVITIES_FMOBJECT_UNASSIGNED']).then(function(translations) {
                        $mdToast.show($mdToast.simple().textContent(translations.ACTIVITIES_FMOBJECT_UNASSIGNED).hideDelay(1000).position('bottom right'));
                    });
                    $scope.loadFmObjects();
                    $scope.fmObjectListSelectedFmObject = null;
                    utils.removeCardsToTheRightOf($element);
                });
            } : null,
            closeCallback: function() {
                $scope.fmObjectListSelectedFmObject = null;
                utils.removeCardsToTheRightOf($element)
            }
        });
        (event || window.event).stopPropagation(); // Prevent that card receives click event
    };

    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    // (Re-)loads FM objects of activity
    $scope.loadFmObjects = function() {
        if (!$scope.canReadFmObjects) return;
            $http.get('api/fmobjects/byRelationId/' + $scope.params.activityId).then(function (response) {
            $scope.fmObjects = response.data;
        });
    };

    // Loads the activity details or prepares the empty dialog for a new activity
    // Params:
    // - $scope.params.isSelection : When true, the card will not edit activities but show a select button and call the selectCallback when clicked
    // - $scope.params.selectButtonText : The translation key text for the select button when isSelection = true
    // - $scope.params.selectCallback : The callback to be called when the select button was pressed (when isSelection = true)
    // - $scope.params.activityId : ID of the activity to load, when not set, a new activity is to be created
    // - $scope.params.createActivityCallback : Callback function when a new activity was created. Gets the activity as parameter
    // - $scope.params.saveActivityCallback : Callback function when an existing activity was saved. Gets the updated activity as parameter
    // - $scope.params.deleteActivityCallback : Callback function when an existing activity was deleted. No parameters
    // - $scope.params.closeCallback : Callback function when the card gets closed via button. No parameters
    // - $scope.params.assignActivityCallback : Callback function when an activity was assigned to the given reference
    // - $scope.params.unAssignActivityCallback : Callback function when an activity was unassigned from the given reference
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
            })
            .then(function() {
                // Check FM object permission
                return $http.get('/api/permissions/canRead/PERMISSION_BIM_FMOBJECT');
            }).then(function (response) {
                $scope.canReadFmObjects = response.data;
            }).then($scope.loadFmObjects);
        } else {
            // New activity
            $scope.isNewActivity = true;
            $scope.activity = { date: new Date(), name: '', task: '', isDone: false, type: '', comment: '', fullyEditable: true };
        }
        $http.get('/api/permissions/canWrite/PERMISSION_OFFICE_ACTIVITY').then(function (response) {
            $scope.canWriteActivities = response.data;
        });
    };

    // Listen on locale changes to update the date picker. Event is fired from MainController
    $rootScope.$on('localeChanged', function() {
        $scope.activity.date = new Date($scope.activity.date); // https://github.com/angular/material/issues/7054#issuecomment-181046527
    });

    $scope.load();

});
