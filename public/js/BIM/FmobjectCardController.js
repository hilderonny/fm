app.controller('BIMFmobjectCardController', function($scope, $http, $mdDialog, $element, $mdToast, $mdPanel, $translate, utils) {
    
    // Register translations
    utils.registerTranslations('fmobjects');
    utils.registerTranslations('activities'); // For relations

    $scope.types = [
        'FMOBJECTS_TYPE_PROJECT',
        'FMOBJECTS_TYPE_PROPERTY',
        'FMOBJECTS_TYPE_BUILDING',
        'FMOBJECTS_TYPE_LEVEL',
        'FMOBJECTS_TYPE_ROOM',
        'FMOBJECTS_TYPE_AREA',
        'FMOBJECTS_TYPE_INVENTORY'
    ];

    // When user wants to select an activity for the FM object
    $scope.startAssignActivity = function() {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Office/CalendarCard', {
            isSelection: true,
            selectButtonText: 'FMOBJECTS_ASSIGN',
            selectCallback: !$scope.params.isSelection ? function(selectedActivity) {
                var relationToSend =  { 
                    type1: 'fmObjects',
                    type2: 'activities',
                    id1: $scope.fmObject._id,
                    id2: selectedActivity._id
                };
                $http.post('/api/relations', relationToSend).then(function() {
                    $translate(['FMOBJECTS_ACTIVITY_ASSIGNED']).then(function(translations) {
                        $mdToast.show($mdToast.simple().textContent(translations.FMOBJECTS_ACTIVITY_ASSIGNED).hideDelay(1000).position('bottom right'));
                    });
                    $scope.loadActivities();
                    $scope.selectActivity(selectedActivity);
                });
            } : null,
            closeCallback: function() {
                $scope.activityListSelectedActivity = null;
                utils.removeCardsToTheRightOf($element)
            }
        });
        (event || window.event).stopPropagation(); // Prevent that card receives click event
    };

    // When user wants to select an assigned activity
    $scope.selectActivity = function(activity) {
        $scope.activityListSelectedActivity = activity;
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Office/ActivityCard', {
            activityId: activity._id,
            isSelection: true,
            selectButtonText: 'FMOBJECTS_UNASSIGN',
            selectCallback: $scope.canWriteFmObjects && !$scope.params.isSelection ? function(selectedActivity) {
                $http.delete('/api/relations/?type1=fmObjects&type2=activities&id1=' + $scope.fmObject._id + '&id2=' + selectedActivity._id).then(function() {
                    $translate(['FMOBJECTS_ACTIVITY_UNASSIGNED']).then(function(translations) {
                        $mdToast.show($mdToast.simple().textContent(translations.FMOBJECTS_ACTIVITY_UNASSIGNED).hideDelay(1000).position('bottom right'));
                    });
                    $scope.loadActivities();
                    $scope.activityListSelectedActivity = null;
                    utils.removeCardsToTheRightOf($element);
                });
            } : null,
            closeCallback: function() {
                $scope.activityListSelectedActivity = null;
                utils.removeCardsToTheRightOf($element)
            }
        });
        (event || window.event).stopPropagation(); // Prevent that card receives click event
    };
    
    // Click on Create-button to create a new FM object
    $scope.createFmObject = function() {
        var fmObjectToSend =  { 
            name: $scope.fmObject.name, 
            type: $scope.fmObject.type, 
            parentId: $scope.fmObject.parentId,
            size: $scope.fmObject.size,
            pos: $scope.fmObject.pos 
        };
        $http.post('/api/fmobjects', fmObjectToSend).then(function(response) {
            var createdFmObject = response.data;
            $scope.isNewFmObject = false;
            $scope.fmObject._id = createdFmObject._id;
            $scope.fmObjectName = $scope.fmObject.name; 
            if ($scope.params.createFmObjectCallback) {
                $scope.params.createFmObjectCallback(createdFmObject);
            }
            $translate(['FMOBJECTS_FM_OBJECT_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.FMOBJECTS_FM_OBJECT_CREATED).hideDelay(1000).position('bottom right'));
            });
        });
    };

    // Click on Save-button to save an existing FM object
    $scope.saveFmObject = function() {
        var fmObjectToSend = { 
            name: $scope.fmObject.name, 
            type: $scope.fmObject.type, 
            size: $scope.fmObject.size, 
            pos: $scope.fmObject.pos
        };
        $http.put('/api/fmobjects/' + $scope.fmObject._id, fmObjectToSend).then(function(response) {
            var savedFmObject = response.data;
            $scope.fmObjectName = $scope.fmObject.name;
            if ($scope.params.saveFmObjectCallback) {
                $scope.params.saveFmObjectCallback(savedFmObject);
            }
            $translate(['FMOBJECTS_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.FMOBJECTS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });
        });
    };

    // Click on delete button to delete an existing FM object
    $scope.deleteFmObject = function() {
        $translate(['FMOBJECTS_FM_OBJECT_DELETED', 'YES', 'NO']).then(function(translations) {
            $translate('FMOBJECTS_REALLY_DELETE_FM_OBJECT', { fmObjectName: $scope.fmObjectName }).then(function(FMOBJECTS_REALLY_DELETE_FM_OBJECT) {
                var confirm = $mdDialog.confirm()
                    .title(FMOBJECTS_REALLY_DELETE_FM_OBJECT)
                    .ok(translations.YES)
                    .cancel(translations.NO);
                $mdDialog.show(confirm).then(function() {
                    $http.delete('/api/fmobjects/' + $scope.fmObject._id).then(function(response) {
                        if ($scope.params.deleteFmObjectCallback) {
                            $scope.params.deleteFmObjectCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.FMOBJECTS_FM_OBJECT_DELETED).hideDelay(1000).position('bottom right'));
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

    // (Re-)loads activities of FM-Object
    $scope.loadActivities = function() {
        if (!$scope.canReadActivities) return;
            $http.get('api/activities/byRelationId/' + $scope.params.fmObjectId).then(function (response) {
            $scope.activityListActivities = response.data;
            $scope.activityListShowName = true;
            $scope.activityListShowType = true;
            $scope.activityListShowDate = true;
        });
    };

    // Loads the FM object details or prepares the empty dialog for a new FM object
    // Params:
    // - $scope.params.fmObjectId : ID of the FM object to load, when not set, a new FM object is to be created
    // - $scope.params.parentFmObjectId : ID of the parent FM object of the new FM object. When not set, the root is used as parent
    // - $scope.params.createFmObjectCallback : Callback function when a new FM object was created. Gets the FM object as parameter
    // - $scope.params.saveFmObjectCallback : Callback function when an existing FM object was saved. Gets the updated FM object as parameter
    // - $scope.params.deleteFmObjectCallback : Callback function when an existing FM object was deleted. No parameters
    // - $scope.params.closeCallback : Callback function when the card gets closed via button. No parameters
    $scope.load = function() {
        // Switch between creation of a new FM object and loading of an existing FM object
        if ($scope.params.fmObjectId) {
            // Existing FM object
            $http.get('/api/fmobjects/' + $scope.params.fmObjectId)
            .then(function(response) {
                var completeFmObject = response.data;
                $scope.isNewFmObject = false;
                $scope.fmObject = completeFmObject;
                $scope.fmObjectName = completeFmObject.name; // Prevent updating the label when changing the input value 
            })
            .then(function() {
                // Check activity permission
                return $http.get('/api/permissions/canRead/PERMISSION_OFFICE_ACTIVITY');
            }).then(function (response) {
                $scope.canReadActivities = response.data;
            }).then($scope.loadActivities); // Load activities
        } else {
            // New FM object
            $scope.isNewFmObject = true;
            $scope.fmObject = { name: '', type: $scope.types[0] };
            if ($scope.params.parentFmObjectId) {
                $scope.fmObject.parentId = $scope.params.parentFmObjectId;
            }
        }
        $http.get('/api/permissions/canWrite/PERMISSION_BIM_FMOBJECT').then(function (response) {
            $scope.canWriteFmObjects = response.data;
        });
    };

    $scope.load();

});
