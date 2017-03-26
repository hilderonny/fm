app.controller('AdministrationClientModuleCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translatePartialLoader, $translate, utils) {
    
    // Register translations
    if (!$translatePartialLoader.isPartAvailable('clients')) {
        $translatePartialLoader.addPart('clients');
        $translate.refresh();
    }

    // Click on Create-button to create a new client module assignment
    $scope.createClientModule = function() {
        var clientModuleToSend = {
            clientId: $scope.params.clientId,
            module: $scope.clientModule.module 
        };
        $http.post('/api/clientmodules', clientModuleToSend).then(function(response) {
            var createdClientModule = response.data;
            $scope.isNewClientModule = false;
            $scope.clientModule._id = createdClientModule._id;
            if ($scope.params.createClientModuleCallback) {
                $scope.params.createClientModuleCallback(createdClientModule);
            }
            $translate(['CLIENTS_CLIENT_MODULE_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.CLIENTS_CLIENT_MODULE_CREATED).hideDelay(1000).position('bottom right'));
            });
        });
    }

    // Click on Save-button to save an existing client module
    $scope.saveClientModule = function() {
        var clientModuleToSend = { 
            module: $scope.clientModule.module 
        };
        $http.put('/api/clientmodules/' + $scope.clientModule._id, clientModuleToSend).then(function(response) {
            var savedClientModule = response.data;
            if ($scope.params.saveClientModuleCallback) {
                $scope.params.saveClientModuleCallback(savedClientModule);
            }
            $translate(['CLIENTS_CHANGESSAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.CLIENTS_CHANGESSAVED).hideDelay(1000).position('bottom right'));
            });
        });
    }

    // Click on delete button to delete an existing client module
    $scope.deleteClientModule = function() {
        var clientModuleTranslationKey = 'MODULE_' + $scope.clientModule.module + '_NAME';
        $translate(['CLIENTS_CLIENT_MODULE_DELETED', 'YES', 'NO', clientModuleTranslationKey]).then(function(translations) {
            $translate('CLIENTS_REALLY_DELETE_CLIENT_MODULE', { clientModule: translations[clientModuleTranslationKey] }).then(function(CLIENTS_REALLY_DELETE_CLIENT_MODULE) {
                var confirm = $mdDialog.confirm()
                    .title(CLIENTS_REALLY_DELETE_CLIENT_MODULE)
                    .ok(translations.YES)
                    .cancel(translations.NO);
                $mdDialog.show(confirm).then(function() {
                    $http.delete('/api/clientmodules/' + $scope.clientModule._id).then(function(response) {
                        if ($scope.params.deleteClientModuleCallback) {
                            $scope.params.deleteClientModuleCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.CLIENTS_CLIENT_MODULE_DELETED).hideDelay(1000).position('bottom right'));
                    });
                });
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

    // Loads the client module details or prepares the empty dialog for a new client module
    // Params:
    // - $scope.params.clientModuleId : ID of the client module to load, when not set, a new client module is to be created
    // - $scope.params.clientId : ID of the corresponding client for new client modules
    // - $scope.params.createClientModuleCallback : Callback function when a new client module was created. Gets the client module as parameter
    // - $scope.params.saveClientModuleCallback : Callback function when an existing client module was saved. Gets the updated client module as parameter
    // - $scope.params.deleteClientModuleCallback : Callback function when an existing client module was deleted. No parameters
    // - $scope.params.closeCallback : Callback function when the card gets closed via button. No parameters
    $scope.load = function() {
        // Switch between creation of a new client module and loading of an existing client module
        if ($scope.params.clientModuleId) {
            // Existing client module
            $http.get('/api/clientmodules/' + $scope.params.clientModuleId).then(function(response) {
                var completeClientModule = response.data;
                $scope.clientModule = completeClientModule;
                // Load available modules
                $http.get('/api/clientmodules/available?clientId=' + completeClientModule.clientId).then(function(response) {
                    $scope.modules = response.data;
                    // Add the currently selected client module to the list
                    $scope.modules.push(completeClientModule.module);
                    $scope.isNewClientModule = false;
                });
            });
        } else {
            // New client module assignment
            // Load available module names
            $http.get('/api/clientmodules/available?clientId=' + $scope.params.clientId).then(function(response) {
                $scope.modules = response.data;
                $scope.isNewClientModule = true;
                $scope.clientModule = { module: $scope.modules[0] };
            });
        }
    }

    $scope.load();

});
