app.controller('BIMHierarchyCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $mdPanel, utils) {
    
    // Event callbacks
    var saveFmObjectCallback = function(savedFmObject) {
    //     $scope.selectedFmObject.icon = 'fm/' + savedFmObject.type,
    //     $scope.selectedFmObject.name = savedFmObject.name;
    //     $scope.selectedFmObject.type = savedFmObject.type;
    };

    var deleteFmObjectCallback = function() {
    //     var parentChildren = $scope.selectedFmObject.parent ? $scope.selectedFmObject.parent.children : $scope.child.children;
    //     parentChildren.splice(parentChildren.indexOf($scope.selectedFmObject), 1);
        closeFmObjectCallback();
    };

    var createFmObjectCallback = function(name) {
        var element = {
            name: name
        };
        // var element = {
        //     icon: 'fm/' + createdFmObject.type,
        //     name: createdFmObject.name,
        //     type: 'fmobjects',
        //     id: createdFmObject._id,
        //     children: createdFmObject.children ? createdFmObject.children.map(handleFmObject) : [],
        //     parent: $scope.selectedFmObject
        // }
        // if ($scope.selectedFmObject) {
        //     $scope.selectedFmObject.children.push(element);
        //     $scope.selectedFmObject.isOpen = true;
        // } else {
        //     $scope.child.children.push(element);
        // }
        $scope.selectFmObject(element);
    };
    
    var closeFmObjectCallback = function() {
        $scope.selectedFmObject = false;
        utils.setLocation('/fmobjects');
    };

    // Click on level name or icon to select it or click on card to unselect all
    $scope.selectFmObject = function(fmObject) {
        utils.removeCardsToTheRightOf($element);
        console.log(fmObject);
        utils.addCardWithPermission('BIM/FmobjectCard', {
            name: fmObject.name,
            createFmObjectCallback: createFmObjectCallback, // Wird benötigt, wenn Unterelemente erzeugt werden
            saveFmObjectCallback: saveFmObjectCallback,
            deleteFmObjectCallback: deleteFmObjectCallback,
            closeCallback: closeFmObjectCallback
        }, 'PERMISSION_BIM_FMOBJECT').then(function() {
            // $scope.selectedFmObject = fmObject;
        });
        // Hierarchie aufklappen, wenn nötig
        // var currentElement = fmObject;
        // while (currentElement.parent && !currentElement.parent.isOpen) {
        //     currentElement = currentElement.parent;
        //     currentElement.isOpen = true;
        // }
    };

    // Click on new FM object button opens detail dialog with new FM object data
    $scope.newFmObject = function() {
        $scope.selectedFmObject = null;
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('BIM/FmobjectCard', {
            parentname: null,
            parentdatatypename: null,
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

    $scope.openchild = function(child) {
        $rootScope.isLoading = true;
        $http.get('/api/dynamic/children/' + child._datatypename + '/' + child.name).then(function(response) {
            child.children = response.data;
            child.isOpen = true;
            $rootScope.isLoading = false;
        });
    };

    $scope.load = function() {
        $rootScope.isLoading = true;
        $http.get('/api/dynamic/rootelements/fmobjects').then(function(response) {
            $scope.child = { children: response.data };
            $scope.canWriteFmObjects = $rootScope.canWrite('PERMISSION_BIM_FMOBJECT');
        //     if ($scope.params.preselection) {
        //         var elementToSelect = allFmObjects[$scope.params.preselection];
        //         if (elementToSelect) $scope.selectFmObject(elementToSelect);
        //     } else {
        //         utils.setLocation('/fmobjects');
        //     }
            $rootScope.isLoading=false;
        });
    }

    $scope.load();

});

app.directUrlMappings.fmobjects = {
    mainMenu: 'TRK_MENU_BIM',
    subMenu: 'TRK_MENU_BIM_FMOBJECTS'
};
