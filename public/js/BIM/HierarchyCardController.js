app.controller('BIMHierarchyCardController', function($scope, $http, $mdDialog, $element, $mdToast, $mdPanel, utils) {
    
    // Event callbacks
    var saveFmObjectCallback = function(savedFmObject) {
        $scope.selectedFmObject.name = savedFmObject.name;
        $scope.selectedFmObject.type = savedFmObject.type;
    };
    var deleteFmObjectCallback = function() {
        var parentFmObject = $scope.selectedFmObject.parent;
        for (var i = 0; i < parentFmObject.children.length; i++) {
            var childFmObject = parentFmObject.children[i];
            if (childFmObject._id === $scope.selectedFmObject._id) {
                parentFmObject.children.splice(i, 1);
                $scope.selectedFmObject = false;
                break;
            }
        }
    };
    var createFmObjectCallback = function(createdFmObject, event) {
        var parentFmObject = $scope.selectedFmObject ? $scope.selectedFmObject: $scope.fmObject;
        createdFmObject.children = []; 
        parentFmObject.children.push(createdFmObject);
        prepareReferencesToParent(parentFmObject);
        if (!parentFmObject.isOpen) {
            $scope.openFmObject(parentFmObject, event);
        }
        $scope.selectFmObject(createdFmObject, event);
    };
    var closeFmObjectCallback = function() {
        $scope.selectedFmObject = false;
    };

    // Click on Arrow button to open or close an hierarchy level
    $scope.openFmObject = function(fmObject, event) {
        fmObject.isOpen = !fmObject.isOpen;
        (event || window.event).stopPropagation(); // Prevent that card receives click event
    };

    // Click on level name or icon to select it or click on card to unselect all
    // Passing events for Firefox: http://stackoverflow.com/a/30777938
    $scope.selectFmObject = function(fmObject, event) {
        utils.removeCardsToTheRightOf($element);
        if (fmObject) {
            utils.addCard('BIM/FmobjectCard', {
                fmObjectId: fmObject._id,
                saveFmObjectCallback: saveFmObjectCallback,
                deleteFmObjectCallback: deleteFmObjectCallback,
                closeCallback: closeFmObjectCallback,
                isSelection: $scope.params.isSelection,
                selectButtonText: $scope.params.selectButtonText,
                selectCallback: $scope.params.selectCallback
            });
        }
        $scope.selectedFmObject = fmObject;
        (event || window.event).stopPropagation(); // Prevent that card receives click event
    };

    // Click on new FM object button opens detail dialog with new FM object data
    $scope.newFmObject = function(event) {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('BIM/FmobjectCard', {
            parentFmObjectId: $scope.selectedFmObject ? $scope.selectedFmObject._id : null,
            createFmObjectCallback: createFmObjectCallback,
            saveFmObjectCallback: saveFmObjectCallback,
            deleteFmObjectCallback: deleteFmObjectCallback,
            closeCallback: closeFmObjectCallback
        });
        (event || window.event).stopPropagation(); // Prevent that card receives click event
    }

    var prepareReferencesToParent = function(fmObject) {
        for (var i = 0; i < fmObject.children.length; i++) {
            var childFmObject = fmObject.children[i];
            childFmObject.parent = fmObject;
            prepareReferencesToParent(childFmObject);
        }
    }

    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    $scope.load = function() {
        $http.get('/api/fmobjects').then(function(response) {
            var rootFmObjects = response.data;
            $scope.fmObject = {
                children: rootFmObjects
            };
            prepareReferencesToParent($scope.fmObject);
        }).then(function() {
            // Check write permission
            return $http.get('/api/permissions/canWrite/PERMISSION_BIM_FMOBJECT');
        }).then(function (response) {
            $scope.canWriteFmObjects = response.data;
        });
    }

    $scope.load();

});
