app.controller('LicenseServerPortalCardController', function($scope, $http, $mdDialog, $element, $translate, $mdToast, utils) {
    
    var createPortalModuleCallback = function(createdPortalModule) {
        $scope.portalModuleAssignments.push(createdPortalModule);
        $scope.selectPortalModule(createdPortalModule);
        checkAvailableModules();
    };
    
    var savePortalModuleCallback = function(savedPortalModule) {
        $scope.selectedPortalModule.module = savedPortalModule.module;
        checkAvailableModules();
    };
    
    var deletePortalModuleCallback = function() {
        for (var i = 0; i < $scope.portalModuleAssignments.length; i++) {
            var portalModule = $scope.portalModuleAssignments[i];
            if (portalModule._id === $scope.selectedPortalModule._id) {
                $scope.portalModuleAssignments.splice(i, 1);
                $scope.selectedPortalModule = false;
                break;
            }
        }
        checkAvailableModules();
    };

    var closePortalModuleCardCallback = function() {
        $scope.selectedPortalModule = false;
    };

    var checkAvailableModules = function() {
        // Available modules for FAB button
        $http.get('/api/portalmodules/available?portalId=' + $scope.portal._id).then(function(portalModulesResponse) {
            $scope.areModulesAvailable = portalModulesResponse.data.length > 0;
        });
    };

    // Click on Create-button to create a new portal
    $scope.createPortal = function() {
        var portalToSend = { 
            name: $scope.portal.name,
            isActive: $scope.portal.isActive
        };
        $http.post('/api/portals', portalToSend).then(function(response) {
            var createdPortal = response.data;
            $scope.isNewPortal = false;
            $scope.portal._id = createdPortal._id;
            $scope.portal.licenseKey = createdPortal.licenseKey;
            $scope.portalName = $scope.portal.name;
            $scope.relationsEntity = { type:'portals', id:createdPortal._id };
            if ($scope.params.createPortalCallback) {
                $scope.params.createPortalCallback(createdPortal);
            }
            // portal module assignments
            $http.get('/api/portalmodules?portalId=' + createdPortal._id).then(function(portalModulesResponse) {
                portalModulesResponse.data.forEach(function(portalModule) {
                    $scope.portalModuleAssignments.push(portalModule);
                });
                $translate(['TRK_PORTALS_PORTAL_CREATED']).then(function(translations) {
                    $mdToast.show($mdToast.simple().textContent(translations.TRK_PORTALS_PORTAL_CREATED).hideDelay(1000).position('bottom right'));
                });
                utils.setLocation('/portals/' + createdPortal._id);
            });
        });
    };

    // Click on Save-button to save an existing portal
    $scope.savePortal = function() {
        var portalToSend = { 
            name: $scope.portal.name,
            isActive: $scope.portal.isActive
        };
        $http.put('/api/portals/' + $scope.portal._id, portalToSend).then(function(response) {
            var savedPortal = response.data;
            $scope.portalName = $scope.portal.name;
            if ($scope.params.savePortalCallback) {
                $scope.params.savePortalCallback(savedPortal);
            }
            $translate(['TRK_PORTALS_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_PORTALS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });
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
                    $http.delete('/api/portals/' + $scope.portal._id).then(function(response) {
                        if ($scope.params.deletePortalCallback) {
                            $scope.params.deletePortalCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_PORTALS_PORTAL_DELETED).hideDelay(1000).position('bottom right'));
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
                $http.post('/api/portals/newkey/' + $scope.portal._id, {}).then(function(response) {
                    var updatedPortal = response.data;
                    $scope.portal.licenseKey = updatedPortal.licenseKey;
                    $mdToast.show($mdToast.simple().textContent(translations.TRK_PORTALS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
                });
            });
        });
    };

    // Click on module in module list shows module details
    $scope.selectPortalModule = function(selectedPortalModule) {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('LicenseServer/PortalModuleCard', {
            portalModuleId: selectedPortalModule._id,
            savePortalModuleCallback: savePortalModuleCallback,
            deletePortalModuleCallback: deletePortalModuleCallback,
            closeCallback: closePortalModuleCardCallback
        });
        $scope.selectedPortalModule = selectedPortalModule;
    };

    // Click on add module button opens detail dialog with new module assignment
    $scope.newModuleAssignment = function() {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('LicenseServer/PortalModuleCard', {
            portalId: $scope.portal._id,
            createPortalModuleCallback: createPortalModuleCallback,
            savePortalModuleCallback: savePortalModuleCallback,
            deletePortalModuleCallback: deletePortalModuleCallback,
            closeCallback: closePortalModuleCardCallback
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
        // Switch between creation of a new portal and loading of an existing portal
        if ($scope.params.portalId) {
            // Existing portal
            $http.get('/api/portals/' + $scope.params.portalId + '?fields=_id+name+isActive+licenseKey').then(function(portalResponse) {
                var completePortal = portalResponse.data;
                $scope.isNewPortal = false;
                $scope.portal = completePortal;
                $scope.portalName = completePortal.name; // Prevent updating the label when changing the name input value
                $scope.relationsEntity = { type:'portals', id:completePortal._id };
                checkAvailableModules();
                // portal module assignments
                return $http.get('/api/portalmodules?portalId=' + $scope.portal._id);
            }).then(function(portalModulesResponse) {
                $scope.portalModuleAssignments = portalModulesResponse.data;
                utils.setLocation('/portals/' + $scope.params.portalId);
            });
        } else {
            // New portal
            $scope.isNewPortal = true;
            $scope.portal = { name : "", isActive : true };
            $scope.portalModuleAssignments = [];
            //checkAvailableModules();
        }
    };

    $scope.load();
});
