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
                var element = {
                    id: fmObject._id,
                    icon: 'fm/' + fmObject.type,
                    name: fmObject.name,
                    type: 'fmobjects',
                    id: fmObject._id,
                    bgf: fmObject.bgf,
                    nrf: fmObject.nrf,
                    nuf: fmObject.nuf,
                    tf: fmObject.tf,
                    vf: fmObject.vf,
                    inset: []
                }
                fmObject.element = element;
                for (var i = 0; i < depth; i++) element.inset.push(i);
                $scope.fmObjects.push(element);
                if (fmObject.children) fmObject.children.forEach(function(child) { handleFmObject(child, depth + 1); });
                // Calculate areas depending on children
                if (fmObject.type === "FMOBJECTS_TYPE_AREA") {
                    switch(fmObject.category) {
                        case "FMOBJECTS_CATEGORY_NUF": element.nuf = fmObject.f; break;
                        case "FMOBJECTS_CATEGORY_TF": element.tf = fmObject.f; break;
                        case "FMOBJECTS_CATEGORY_VF": element.vf = fmObject.f; break;
                    }
                    element.nrf = fmObject.f;
                }
                else {
                    if (!["FMOBJECTS_TYPE_LEVEL", "FMOBJECTS_TYPE_ROOM"].includes(fmObject.type) && fmObject.children.length > 0) {
                        element.bgf = sum(fmObject.children, 'bgf');
                    }
                    if (fmObject.children.length > 0) element.nrf = sum(fmObject.children, 'nrf');
                    if (element.bgf) element.kgf = element.bgf - element.nrf;
                    if (fmObject.children.length > 0) element.nuf = sum(fmObject.children, 'nuf');
                    if (fmObject.children.length > 0) element.tf = sum(fmObject.children, 'tf');
                    if (fmObject.children.length > 0) element.vf = sum(fmObject.children, 'vf');
                }
            };
            response.data.forEach(function(fmObject) { handleFmObject(fmObject, 0); });
            utils.setLocation('/areas');
            if ($scope.params.currentFmObject) {
                $scope.currentFmObject = $scope.params.currentFmObject;
                $scope.childFmObjects = $scope.currentFmObject.children;
                // Fetch details for path for breadcrumbs
                $http.get('/api/fmobjects/' + $scope.currentFmObject._id).then(function(detailsResponse) {
                    $scope.breadcrumbs = detailsResponse.data.path.map(function(pathElement){
                        return pathElement.name;
                    }).join(' » ');
                });
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
