app.controller('BIMFmobjectCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $mdPanel, $translate, utils) {

    $scope.types = [
        'FMOBJECTS_TYPE_PROJECT',
        'FMOBJECTS_TYPE_PROPERTY',
        'FMOBJECTS_TYPE_BUILDING',
        'FMOBJECTS_TYPE_LEVEL',
        'FMOBJECTS_TYPE_ROOM',
        'FMOBJECTS_TYPE_AREA',
        'FMOBJECTS_TYPE_INVENTORY'
    ];
    
    // Click on new FM object button opens detail dialog with new FM object data
    $scope.newFmObject = function() {
        utils.removeCard($element);
        utils.addCardWithPermission('BIM/FmobjectCard', {
            parentFmObjectId: $scope.fmObject._id,
            createFmObjectCallback: $scope.params.createFmObjectCallback,
            closeCallback: $scope.params.closeCallback
        }, 'PERMISSION_BIM_FMOBJECT');
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
            $scope.relationsEntity = { type:'fmobjects', id:createdFmObject._id };
            if ($scope.params.createFmObjectCallback) {
                $scope.params.createFmObjectCallback(createdFmObject);
            }
            $translate(['TRK_FMOBJECTS_FM_OBJECT_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_FMOBJECTS_FM_OBJECT_CREATED).hideDelay(1000).position('bottom right'));
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
        utils.saveEntity($scope, 'fmobjects', $scope.params.fmObjectId, '/api/fmobjects/', fmObjectToSend).then(function(savedFmObject) {
            $scope.fmObjectName = $scope.fmObject.name;
            if ($scope.params.saveFmObjectCallback) {
                $scope.params.saveFmObjectCallback(savedFmObject);
            }
            return $translate(['TRK_FMOBJECTS_CHANGES_SAVED']);
        }).then(function(translations) {
            $mdToast.show($mdToast.simple().textContent(translations.TRK_FMOBJECTS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
        });
    };

    // Click on delete button to delete an existing FM object
    $scope.deleteFmObject = function() {
        var translations;
        $translate(['TRK_FMOBJECTS_FM_OBJECT_DELETED', 'TRK_YES', 'TRK_NO']).then(function(t) {
            translations = t;
            return $translate('TRK_FMOBJECTS_REALLY_DELETE_FM_OBJECT', { fmObjectName: $scope.fmObjectName });
        }).then(function(TRK_FMOBJECTS_REALLY_DELETE_FM_OBJECT) {
            var confirm = $mdDialog.confirm()
                .title(TRK_FMOBJECTS_REALLY_DELETE_FM_OBJECT)
                .ok(translations.TRK_YES)
                .cancel(translations.TRK_NO);
            return $mdDialog.show(confirm);
        }).then(function() {
            return $http.delete('/api/fmobjects/' + $scope.fmObject._id);
        }).then(function(response) {
            if ($scope.params.deleteFmObjectCallback) {
                $scope.params.deleteFmObjectCallback();
            }
            utils.removeCardsToTheRightOf($element);
            utils.removeCard($element);
            $mdToast.show($mdToast.simple().textContent(translations.TRK_FMOBJECTS_FM_OBJECT_DELETED).hideDelay(1000).position('bottom right'));
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
                $scope.relationsEntity = { type:'fmobjects', id:completeFmObject._id };
                utils.loadDynamicAttributes($scope, 'fmobjects', $scope.params.fmObjectId);
                utils.setLocation('/fmobjects/' + $scope.params.fmObjectId);
            });
        } else {
            // New FM object
            $scope.isNewFmObject = true;
            $scope.fmObject = { name: '', type: $scope.types[0] };
            if ($scope.params.parentFmObjectId) {
                $scope.fmObject.parentId = $scope.params.parentFmObjectId;
            }
        }
        $scope.canWriteFmObjects = $rootScope.canWrite('PERMISSION_BIM_FMOBJECT');
    };

    $scope.load();

});
