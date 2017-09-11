app.controller('BIMHierarchyCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $mdPanel, utils) {
    
    // Event callbacks
    var saveFmObjectCallback = function(savedFmObject) {
        $scope.selectedFmObject.icon = 'fm/' + savedFmObject.type,
        $scope.selectedFmObject.name = savedFmObject.name;
        $scope.selectedFmObject.type = savedFmObject.type;
    };

    var deleteFmObjectCallback = function() {
        var parentChildren = $scope.selectedFmObject.parent ? $scope.selectedFmObject.parent.children : $scope.child.children;
        parentChildren.splice(parentChildren.indexOf($scope.selectedFmObject), 1);
        closeFmObjectCallback();
    };

    var createFmObjectCallback = function(createdFmObject) {
        var element = {
            icon: 'fm/' + createdFmObject.type,
            name: createdFmObject.name,
            type: 'fmobjects',
            id: createdFmObject._id,
            children: createdFmObject.children ? createdFmObject.children.map(handleFmObject) : [],
            parent: $scope.selectedFmObject
        }
        if ($scope.selectedFmObject) {
            $scope.selectedFmObject.children.push(element);
            $scope.selectedFmObject.isOpen = true;
        } else {
            $scope.child.children.push(element);
        }
        $scope.selectFmObject(element);
    };
    
    var closeFmObjectCallback = function() {
        $scope.selectedFmObject = false;
        utils.setLocation('/fmobjects');
    };

    // Click on level name or icon to select it or click on card to unselect all
    $scope.selectFmObject = function(fmObject) {
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('BIM/FmobjectCard', {
            fmObjectId: fmObject.id,
            createFmObjectCallback: createFmObjectCallback, // Wird benötigt, wenn Unterelemente erzeugt werden
            saveFmObjectCallback: saveFmObjectCallback,
            deleteFmObjectCallback: deleteFmObjectCallback,
            closeCallback: closeFmObjectCallback
        }, 'PERMISSION_BIM_FMOBJECT').then(function() {
            $scope.selectedFmObject = fmObject;
        });
        // Hierarchie aufklappen, wenn nötig
        var currentElement = fmObject;
        while (currentElement.parent && !currentElement.parent.isOpen) {
            currentElement = currentElement.parent;
            currentElement.isOpen = true;
        }
    };

    // Click on new FM object button opens detail dialog with new FM object data
    $scope.newFmObject = function() {
        $scope.selectedFmObject = null;
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('BIM/FmobjectCard', {
            parentFmObjectId: null,
            createFmObjectCallback: createFmObjectCallback,
            closeCallback: closeFmObjectCallback
        }, 'PERMISSION_BIM_FMOBJECT');
    };

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
            var allFmObjects = {};
            var handleFmObject = function(fmObject) {
                allFmObjects[fmObject._id] = fmObject;
                var element = {
                    icon: 'fm/' + fmObject.type,
                    name: fmObject.name,
                    type: 'fmobjects',
                    id: fmObject._id,
                    children: fmObject.children ? fmObject.children.map(handleFmObject) : []
                }
                allFmObjects[fmObject._id] = element;
                return element;
            };
            var viewModel = { children: response.data.map(handleFmObject) };
            Object.keys(allFmObjects).forEach(function(key) {
                var fmObject = allFmObjects[key];
                if (fmObject.children) {
                    fmObject.children.forEach(function(child) {
                        child.parent = fmObject;
                    });
                }
            });
            $scope.child = viewModel;
            $scope.canWriteFmObjects = $rootScope.canWrite('PERMISSION_BIM_FMOBJECT');
            if ($scope.params.preselection) {
                var elementToSelect = allFmObjects[$scope.params.preselection];
                if (elementToSelect) $scope.selectFmObject(elementToSelect);
            } else {
                utils.setLocation('/fmobjects');
            }
        });
    }

    $scope.load();

});

app.directUrlMappings.fmobjects = {
    mainMenu: 'TRK_MENU_BIM',
    subMenu: 'TRK_MENU_BIM_FMOBJECTS'
};
