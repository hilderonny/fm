app.controller('LicenseServerPortalCardController', function($scope, $rootScope, $http, $mdDialog, $element, $translate, $mdToast, utils) {

    $scope.getPortalModules = function() {
        return $http.get('/api/portalmodules/forPortal/' + $scope.portal._id).then(function(portalModulesResponse) {
            $scope.portal.portalModules = portalModulesResponse.data;
            $scope.portal.portalModules.forEach(function(portalModule) {
                portalModule.translationKey = 'TRK_MODULE_' + portalModule.module + '_NAME';
            });
            return Promise.resolve(); // No need for this? https://javascript.info/promise-chaining
        });
    };

    $scope.savePortalModule = function(portalModuleToSave, portalModuleToUpdate) {
        if (portalModuleToSave.active) {
            $http.post('/api/portalmodules', portalModuleToSave).then(function(response) {
                portalModuleToUpdate._id = response.data._id;
                portalModuleToUpdate.active = true;
                $rootScope.isLoading = false;
            });
        } else {
            $http.delete('/api/portalmodules/' + portalModuleToSave._id).then(function() {
                delete portalModuleToUpdate._id;
                portalModuleToUpdate.active = false;
                $rootScope.isLoading = false;
            });
        }
    };

    $scope.switchActive = function(portalModule) {
        if (!$scope.canWritePortals) return;
        var tempPortalModule = JSON.parse(JSON.stringify(portalModule));
        tempPortalModule.active = !tempPortalModule.active;
        $rootScope.isLoading = true;
        $scope.savePortalModule(tempPortalModule, portalModule);
    };

    // Click on Create-button to create a new portal
    $scope.createPortal = function() {
        $rootScope.isLoading = true;
        var portalToSend = { 
            name: $scope.portal.name,
            isActive: $scope.portal.isActive,
            url: $scope.portal.url,
            comment: $scope.portal.comment
        };
        var createdPortal;
        $http.post('/api/portals', portalToSend).then(function(response) {
            createdPortal = response.data;
            $scope.isNewPortal = false;
            $scope.portal._id = createdPortal._id;
            $scope.portal.licenseKey = createdPortal.licenseKey;
            $scope.portal.url = createdPortal.url,
            $scope.portal.comment = createdPortal.comment,
            $scope.portalName = $scope.portal.name;
            $scope.params.datatypename = 'portals';
            $scope.params.entityname = createdPortal._id;
            if ($scope.params.createPortalCallback) {
                $scope.params.createPortalCallback(createdPortal);
            }
            return $scope.getPortalModules();           
        }).then(function() {
            return $translate(['TRK_PORTALS_PORTAL_CREATED']);
        }).then(function(translations) {
            $mdToast.show($mdToast.simple().textContent(translations.TRK_PORTALS_PORTAL_CREATED).hideDelay(1000).position('bottom right'));
            utils.setLocation('/portals/' + createdPortal._id);
            $rootScope.isLoading = false;
        });
    };

    // Click on Save-button to save an existing portal
    $scope.savePortal = function() {
        $rootScope.isLoading = true;
        var portalToSend = { 
            name: $scope.portal.name,
            isActive: $scope.portal.isActive,
            url: $scope.portal.url,
            comment: $scope.portal.comment
        };
        utils.saveEntity($scope, 'portals',  $scope.portal._id, '/api/portals/', portalToSend).then(function(savedPortal) {
            $scope.portalName = $scope.portal.name;
            if ($scope.params.savePortalCallback) {
                $scope.params.savePortalCallback(savedPortal);
            }
            $translate(['TRK_PORTALS_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_PORTALS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });
            $rootScope.isLoading = false;
        });
    };

    // Click on delete button to delete an existing portal
    $scope.deletePortal = function() {
        $translate(['TRK_PORTALS_PORTAL_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations) {
            $translate('TRK_PORTALS_REALLY_DELETE_PORTAL', { portalName: $scope.portalName }).then(function(TRK_PORTALS_REALLY_DELETE_PORTAL) {
                var confirm = $mdDialog.confirm()
                    .title(TRK_PORTALS_REALLY_DELETE_PORTAL)
                    .ok(translations.TRK_YES)
                    .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function() {
                    $rootScope.isLoading = true;
                    $http.delete('/api/portals/' + $scope.portal._id).then(function(response) {
                        if ($scope.params.deletePortalCallback) {
                            $scope.params.deletePortalCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_PORTALS_PORTAL_DELETED).hideDelay(1000).position('bottom right'));
                        $rootScope.isLoading = false;
                    }); 
                });
            });
        });
    };

    // Portal clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    // User clicks on button to generate new license key
    $scope.generateNewLicenseKey = function() {
        $translate(['TRK_PORTALS_REALLY_GENERATE_LICENSEKEY', 'TRK_PORTALS_CHANGES_SAVED', 'TRK_YES', 'TRK_NO']).then(function(translations) {
            var confirm = $mdDialog.confirm()
                .title(translations.TRK_PORTALS_REALLY_GENERATE_LICENSEKEY)
                .ok(translations.TRK_YES)
                .cancel(translations.TRK_NO);
            $mdDialog.show(confirm).then(function() {
                $rootScope.isLoading = true;
                $http.post('/api/portals/newkey/' + $scope.portal._id, {}).then(function(response) {
                    var updatedPortal = response.data;
                    $scope.portal.licenseKey = updatedPortal.licenseKey;
                    $mdToast.show($mdToast.simple().textContent(translations.TRK_PORTALS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
                    $rootScope.isLoading = false;
                });
            });
        });
    };

    // Loads the portal details or prepares the empty dialog for a new portal
    // Params:
    // - $scope.params.portalId : ID of the portal to load, when not set, a new portal is to be created
    // - $scope.params.createPortalCallback : Callback function when a new portal was created. Gets the portal as parameter
    // - $scope.params.savePortalCallback : Callback function when an existing portal was saved. Gets the updated portal as parameter
    // - $scope.params.deletePortalCallback : Callback function when an existing portal was deleted. No parameters
    // - $scope.params.closeCallback : Callback function when the card gets closed via button. No parameters
    $scope.load = function() {
        $rootScope.isLoading= true;
        // Switch between creation of a new portal and loading of an existing portal
        if ($scope.params.portalId) {
            // Existing portal
            $http.get('/api/portals/' + $scope.params.portalId).then(function(portalResponse) {
                var completePortal = portalResponse.data;
                $scope.isNewPortal = false;
                $scope.portal = completePortal;
                $scope.portalName = completePortal.name; // Prevent updating the label when changing the name input value
                // Zeitstempel in Datum umwandeln
                if ($scope.portal.lastNotification) $scope.portal.lastNotification = new Date($scope.portal.lastNotification).toLocaleString();
                $scope.params.datatypename = 'portals';
                $scope.params.entityname = completePortal._id;
                return $scope.getPortalModules();              
            }).then(function() {
                utils.loadDynamicAttributes($scope, 'portals', $scope.params.portalId);
                utils.setLocation('/portals/' + $scope.params.portalId);
                $rootScope.isLoading = false;
            });           
        } else {
            // New portal
            $scope.isNewPortal = true;
            $scope.portal = { name : "", isActive : true, portalModules: [], url : "", comment: "" };
            $rootScope.isLoading = false;
        }
        $scope.canWritePortals = $rootScope.canWrite('PERMISSION_LICENSESERVER_PORTAL');
    };

    $scope.load();
});
