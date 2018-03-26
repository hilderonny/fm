app.controller('BIMAreasCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $mdPanel, utils) {

    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    function sum(children, field) {
        return children.map(function(child) { return child.element[field] ? child.element[field] : 0.0; }).reduce(function(pv, cv) { return pv + cv; }, 0.0);
    }

    // Event callbacks
    var changeFmObjectCallback = function(savedFmObject) {
        utils.removeCardsToTheRightOf($element);
        $scope.load();
        closeFmObjectCallback();
    };
    
    var closeFmObjectCallback = function() {
        $scope.selectedFmObject = false;
        utils.setLocation('/areas');
    };

    $scope.openChildElement = function(fmObject) {
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('BIM/AreasCard', {
            fmObjects: $scope.fmObjects,
            currentFmObject: fmObject
        }, 'PERMISSION_BIM_AREAS');
    };

    $scope.showFmObjectDetails = function(elem) {
        // TODO: Umstellen
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('BIM/FmobjectCard', {
            fmObjectId: elem.name,
            createFmObjectCallback: changeFmObjectCallback,
            saveFmObjectCallback: changeFmObjectCallback,
            deleteFmObjectCallback: changeFmObjectCallback,
            closeCallback: closeFmObjectCallback
        }, 'PERMISSION_BIM_FMOBJECT').then(function() {
            $scope.selectedFmObject = elem;
        });
    };

    $scope.load = function() {
        $rootScope.isLoading = true;
        if ($scope.params.fmObjects && $scope.params.currentFmObject) { // We come here only on small devices to show additional cards
            $scope.currentFmObject = $scope.params.currentFmObject;
            $scope.fmObjects = $scope.params.fmObjects;
            $scope.childFmObjects = $scope.currentFmObject._children;
            // Fetch breadcrumbs
            $http.get('/api/dynamic/parentpath/' + $scope.currentFmObject._datatypename + '/' + $scope.currentFmObject.name).then(function(breadcrumbsresponse) {
                $scope.breadcrumbs = breadcrumbsresponse.data.join(' » ');
                $rootScope.isLoading=false;
            });
            return;
        }
        $http.get('/api/areas').then(function(response) {
            $scope.fmObjects = [];
            var handleFmObject = function(fmObject, depth) {
                fmObject.inset = [];
                for (var i = 0; i < depth; i++) fmObject.inset.push(i);
                $scope.fmObjects.push(fmObject);
                if (fmObject._children) fmObject._children.forEach(function(child) { handleFmObject(child, depth + 1); });
            };
            response.data.forEach(function(fmObject) { handleFmObject(fmObject, 0); });
            utils.setLocation('/areas');
            $scope.childFmObjects = response.data;
            $rootScope.isLoading=false;
        });
    }

    $scope.load();

});

app.directUrlMappings.areas = {
    mainMenu: 'TRK_MENU_BIM',
    subMenu: 'TRK_MENU_BIM_AREAS'
};
