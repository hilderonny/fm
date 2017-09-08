app.controller('BIMHierarchyCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $mdPanel, utils) {
    
    // Event callbacks
    var saveFmObjectCallback = function(savedFmObject) {
        $scope.selectedFmObject.name = savedFmObject.name;
        $scope.selectedFmObject.type = savedFmObject.type;
    };
    var deleteFmObjectCallback = function() {
        var idx = $scope.flatFmObjects.indexOf($scope.selectedFmObject);
        while ($scope.flatFmObjects[idx+1] && $scope.flatFmObjects[idx+1].level > $scope.selectedFmObject.level) {
            $scope.flatFmObjects.splice(idx + 1, 1);
        }
        $scope.flatFmObjects.splice(idx, 1);
        closeFmObjectCallback();
    };
    var createFmObjectCallback = function(createdFmObject) {
        if ($scope.selectedFmObject) {
            if (!$scope.selectedFmObject.children) $scope.selectedFmObject.children = [];
            var indexToInsert = $scope.flatFmObjects.indexOf($scope.selectedFmObject) + 1;
            while ($scope.flatFmObjects[indexToInsert] && $scope.flatFmObjects[indexToInsert].level > $scope.selectedFmObject.level) indexToInsert++;
            $scope.flatFmObjects.splice(indexToInsert, 0, createdFmObject);
            $scope.selectedFmObject.children.push(createdFmObject);
            createdFmObject.level = $scope.selectedFmObject.level + 1;
        } else {
            createdFmObject.level = 0;
            $scope.flatFmObjects.push(createdFmObject);
        }
        $scope.selectFmObject(createdFmObject);
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
            if ($scope.params.preselection) {
                var elementToSelect = allFmObjects[$scope.params.preselection];
                if (elementToSelect) $scope.selectFmObject(elementToSelect);
            } else {
                utils.setLocation('/fmobjects');
            }
        });
    /*
        var rootFmObjects;
        $http.get('/api/fmobjects').then(function(response) {
            rootFmObjects = response.data;
            // Check write permission
            $scope.canWriteFmObjects = $rootScope.canWrite('PERMISSION_BIM_FMOBJECT');
            // Check preselection
            $scope.flatFmObjects = [];
            var flattenFmObjects = function(fmObject, level) {
                $scope.flatFmObjects.push(fmObject); // Root-Objekt ignorieren
                fmObject.level = level;
                if (fmObject.children) fmObject.children.forEach(function(f) { flattenFmObjects(f, level + 1) });
            };
            rootFmObjects.forEach(function(fmo) {
                flattenFmObjects(fmo, 0);
            });
            utils.handlePreselection($scope, $scope.flatFmObjects, $scope.selectFmObject);
            if (!$scope.params.preselection) utils.setLocation('/fmobjects');
        });
        */
    }

    $scope.load();

});

app.directUrlMappings.fmobjects = {
    mainMenu: 'TRK_MENU_BIM',
    subMenu: 'TRK_MENU_BIM_FMOBJECTS'
};
