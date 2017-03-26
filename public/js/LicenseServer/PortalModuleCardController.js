app.controller('LicenseServerPortalModuleCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translatePartialLoader, $translate, utils) {
    
    // Register translations
    if (!$translatePartialLoader.isPartAvailable('licenseserver')) {
        $translatePartialLoader.addPart('licenseserver');
        $translate.refresh();
    }

    // Click on Create-button to create a new portal module assignment
    $scope.createPortalModule = function() {
        var portalModuleToSend = {
            portalId: $scope.params.portalId,
            module: $scope.portalModule.module 
        };
        $http.post('/api/portalmodules', portalModuleToSend).then(function(response) {
            var createdPortalModule = response.data;
            $scope.isNewPortalModule = false;
            $scope.portalModule._id = createdPortalModule._id;
            if ($scope.params.createPortalModuleCallback) {
                $scope.params.createPortalModuleCallback(createdPortalModule);
            }
            $translate(['PORTALS_MODULEASSIGNMENT_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.PORTALS_MODULEASSIGNMENT_CREATED).hideDelay(1000).position('bottom right'));
            });
        });
    }

    // Click on Save-button to save an existing portal module
    $scope.savePortalModule = function() {
        var portalModuleToSend = { 
            module: $scope.portalModule.module 
        };
        $http.put('/api/portalmodules/' + $scope.portalModule._id, portalModuleToSend).then(function(response) {
            var savedPortalModule = response.data;
            if ($scope.params.savePortalModuleCallback) {
                $scope.params.savePortalModuleCallback(savedPortalModule);
            }
            $translate(['PORTALS_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.PORTALS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });
        });
    }

    // Click on delete button to delete an existing portal module
    $scope.deletePortalModule = function() {
        var portalModuleTranslationKey = 'MODULE_' + $scope.portalModule.module + '_NAME';
        $http.delete('/api/portalmodules/' + $scope.portalModule._id).then(function(response) {
            if ($scope.params.deletePortalModuleCallback) {
                $scope.params.deletePortalModuleCallback();
            }
            utils.removeCardsToTheRightOf($element);
            utils.removeCard($element);
            $translate(['PORTALS_MODULEASSIGNMENT_DELETED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.PORTALS_MODULEASSIGNMENT_DELETED).hideDelay(1000).position('bottom right'));
            });
        });
    }

    // Permission clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    }

    // Loads the portal module details or prepares the empty dialog for a new portal module
    // Params:
    // - $scope.params.portalModuleId : ID of the portal module to load, when not set, a new portal module is to be created
    // - $scope.params.portalId : ID of the corresponding portal for new portal modules
    // - $scope.params.createPortalModuleCallback : Callback function when a new portal module was created. Gets the portal module as parameter
    // - $scope.params.savePortalModuleCallback : Callback function when an existing portal module was saved. Gets the updated portal module as parameter
    // - $scope.params.deletePortalModuleCallback : Callback function when an existing portal module was deleted. No parameters
    // - $scope.params.closeCallback : Callback function when the card gets closed via button. No parameters
    $scope.load = function() {
        // Switch between creation of a new portal module and loading of an existing portal module
        if ($scope.params.portalModuleId) {
            // Existing portal module
            $http.get('/api/portalmodules/' + $scope.params.portalModuleId).then(function(response) {
                var completePortalModule = response.data;
                $scope.portalModule = completePortalModule;
                // Load available modules
                $http.get('/api/portalmodules/available?portalId=' + completePortalModule.portalId).then(function(response) {
                    $scope.modules = response.data;
                    // Add the currently selected portal module to the list
                    $scope.modules.push(completePortalModule.module);
                    $scope.isNewPortalModule = false;
                });
            });
        } else {
            // New portal module assignment
            // Load available module names
            $http.get('/api/portalmodules/available?portalId=' + $scope.params.portalId).then(function(response) {
                $scope.modules = response.data;
                $scope.isNewPortalModule = true;
                $scope.portalModule = { module: $scope.modules[0] };
            });
        }
    }

    $scope.load();

});
