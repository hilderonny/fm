app.controller('LicenseServerPortalListCardController', function($scope, $http, $mdDialog, $element, $translatePartialLoader, $translate, utils) {
    
    // Register translations
    if (!$translatePartialLoader.isPartAvailable('licenseserver')) {
        $translatePartialLoader.addPart('licenseserver');
        $translate.refresh();
    }

    var savePortalCallback = function(savedPortal) {
        $scope.selectedPortal.name = savedPortal.name;
        $scope.selectedPortal.isActive = savedPortal.isActive;
    };
    var deletePortalCallback = function() {
        for (var i = 0; i < $scope.portals.length; i++) {
            var portal = $scope.portals[i];
            if (portal._id === $scope.selectedPortal._id) {
                $scope.portals.splice(i, 1);
                $scope.selectedPortal = false;
                break;
            }
        }
    };
    var createPortalCallback = function(createdPortal) {
        $scope.portals.push(createdPortal);
        $scope.selectedPortal = createdPortal;
    };
    var closePortalCardCallback = function() {
        $scope.selectedPortal = false;
    };

    // Click on portal in portal list shows portal details
    $scope.selectPortal = function(selectedPortal) {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('LicenseServer/PortalCard', {
            portalId: selectedPortal._id,
            savePortalCallback: savePortalCallback,
            deletePortalCallback: deletePortalCallback,
            closeCallback: closePortalCardCallback
        });
        $scope.selectedPortal = selectedPortal;
    }

    // Click on new portal button opens detail dialog with new portal data
    $scope.newPortal = function() {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('LicenseServer/PortalCard', {
            createPortalCallback: createPortalCallback,
            savePortalCallback: savePortalCallback,
            deletePortalCallback: deletePortalCallback,
            closeCallback: closePortalCardCallback
        });
    }

    // Loads the portals list from the server
    // Params:
    // - $scope.params.selectedPortalId : ID of the portal to select in the list
    $scope.load = function() {
        $scope.selectedPortal = false;
        $http.get('/api/portals?fields=_id+name+isActive').then(function (response) {
            $scope.portals = response.data;
            if ($scope.params.selectedPortalId) {
                for (var i = 0; i < $scope.portals.length; i++) {
                    var portal = $scope.portals[i];
                    if (portal._id === $scope.params.selectedPortalId) {
                        $scope.selectedPortal = portal;
                        break;
                    }
                }
            }
        });
    }

    $scope.load();
});
