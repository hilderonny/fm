app.controller('LicenseServerPortalListCardController', function($scope, $rootScope, $http, $mdDialog, $element, $translate, utils) {

    var savePortalCallback = function(savedPortal) {
        $scope.selectedPortal.name = savedPortal.name;
        $scope.selectedPortal.isActive = savedPortal.isActive;
    };
    var deletePortalCallback = function() {
        $scope.portals.splice($scope.portals.indexOf($scope.selectedPortal), 1);
        closePortalCardCallback();
    };
    var createPortalCallback = function(createdPortal) {
        $scope.portals.push(createdPortal);
        $scope.selectPortal(createdPortal);
    };
    var closePortalCardCallback = function() {
        $scope.selectedPortal = false;
        utils.setLocation('/portals');
    };

    // Click on portal in portal list shows portal details
    $scope.selectPortal = function(selectedPortal) {
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('LicenseServer/PortalCard', {
            portalId: selectedPortal._id,
            savePortalCallback: savePortalCallback,
            deletePortalCallback: deletePortalCallback,
            closeCallback: closePortalCardCallback
        }, 'PERMISSION_LICENSESERVER_PORTAL').then(function() {
            $scope.selectedPortal = selectedPortal;
        });
    }

    // Click on new portal button opens detail dialog with new portal data
    $scope.newPortal = function() {
        $scope.selectedPortal = null;
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('LicenseServer/PortalCard', {
            createPortalCallback: createPortalCallback,
            closeCallback: closePortalCardCallback
        }, 'PERMISSION_LICENSESERVER_PORTAL');
    }

    // Loads the portals list from the server
    // Params:
    // - $scope.params.selectedPortalId : ID of the portal to select in the list
    $scope.load = function() {
        $scope.selectedPortal = false;
        $http.get('/api/portals').then(function (response) {
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
            // Check the permissions for the details page for handling button visibility
            $scope.canWritePortals = $rootScope.canWrite('PERMISSION_LICENSESERVER_PORTAL');
            // Check preselection
            utils.handlePreselection($scope, $scope.portals, $scope.selectPortal);
            if (!$scope.params.preselection) utils.setLocation('/portals');
        });
    }

    $scope.load();
});

app.directUrlMappings.portals = {
    mainMenu: 'TRK_MENU_LICENSESERVER',
    subMenu: 'TRK_MENU_LICENSESERVER_PORTALS'
};
