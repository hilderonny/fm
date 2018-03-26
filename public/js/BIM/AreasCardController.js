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
            currentFmObject: fmObject
        }, 'PERMISSION_BIM_AREAS');
    };

    $scope.showFmObjectDetails = function(elem) {
        // TODO: Umstellen
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('BIM/FmobjectCard', {
            fmObjectId: elem.id,
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
            if ($scope.params.currentFmObject) {
                $scope.currentFmObject = $scope.params.currentFmObject;
                $scope.childFmObjects = $scope.currentFmObject._children;
                // Fetch details for path for breadcrumbs
                // TODO: Create special path API for breadcrumbs
                // $http.get('/api/fmobjects/' + $scope.currentFmObject._id).then(function(detailsResponse) {
                //     $scope.breadcrumbs = detailsResponse.data.path.map(function(pathElement){
                //         return pathElement.name;
                //     }).join(' » ');
                // });
            } else {
                $scope.childFmObjects = response.data;
            }
            $rootScope.isLoading=false;
        });
    }

    $scope.load();

});

app.directUrlMappings.areas = {
    mainMenu: 'TRK_MENU_BIM',
    subMenu: 'TRK_MENU_BIM_AREAS'
};
