app.controller('AdministrationClientCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
    
    var createClientModuleCallback = function(createdClientModule) {
        $scope.clientModules.push(createdClientModule);
        $scope.selectClientModule(createdClientModule);
        checkAvailableModules();
    };
    
    var saveClientModuleCallback = function(savedClientModule) {
        $scope.selectedClientModule.module = savedClientModule.module;
        checkAvailableModules();
    };
    
    var deleteClientModuleCallback = function() {
        for (var i = 0; i < $scope.clientModules.length; i++) {
            var clientModule = $scope.clientModules[i];
            if (clientModule._id === $scope.selectedClientModule._id) {
                $scope.clientModules.splice(i, 1);
                $scope.selectedClientModule = false;
                break;
            }
        }
        checkAvailableModules();
    };

    var closeClientModuleCardCallback = function() {
        $scope.selectedClientModule = false;
    };

    var checkAvailableModules = function() {
        // Available modules for FAB button
        $http.get('/api/clientmodules/available?clientId=' + $scope.client._id).then(function(clientModulesResponse) {
            $scope.areModulesAvailable = clientModulesResponse.data.length > 0;
        });
    };

    // Click on Create-button to create a new client
    $scope.createClient = function() {
        var clientToSend = { 
            name: $scope.client.name,
            comment:$scope.client.comment 
        };
        $http.post('/api/clients', clientToSend).then(function(response) {
            var createdClient = response.data;
            $scope.isNewClient = false;
            $scope.client._id = createdClient._id;
            $scope.clientName = $scope.client.name;
            $scope.relationsEntity = { type:'clients', id:createdClient._id };
            if ($scope.params.createClientCallback) {
                $scope.params.createClientCallback(createdClient);
            }
            // Update automatically created client module assignments and check for available modules
            $http.get('/api/clientmodules?clientId=' + $scope.client._id).then(function(clientModulesResponse) {
                $scope.clientModules = clientModulesResponse.data;
                checkAvailableModules();
            });
            $translate(['TRK_CLIENTS_CLIENTCREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_CLIENTS_CLIENTCREATED).hideDelay(1000).position('bottom right'));
            });
        });
    };

    // Click on Save-button to save an existing client
    $scope.saveClient = function() {
        var clientToSend = { 
            name: $scope.client.name,
            comment:$scope.client.comment
        };
        $http.put('/api/clients/' + $scope.client._id, clientToSend).then(function(response) {
            var savedClient = response.data;
            $scope.clientName = $scope.client.name;
            if ($scope.params.saveClientCallback) {
                $scope.params.saveClientCallback(savedClient);
            }
            $translate(['TRK_CLIENTS_CHANGESSAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_CLIENTS_CHANGESSAVED).hideDelay(1000).position('bottom right'));
            });
        });
    };

    // Click on delete button to delete an existing client
    $scope.deleteClient = function() {
        $translate(['TRK_CLIENTS_CLIENTDELETED', 'TRK_YES', 'TRK_NO']).then(function(translations) {
            $translate('TRK_CLIENTS_REALLYDELETECLIENT', { clientName: $scope.clientName }).then(function(TRK_CLIENTS_REALLYDELETECLIENT) {
                var confirm = $mdDialog.confirm()
                    .title(TRK_CLIENTS_REALLYDELETECLIENT)
                    .ok(translations.TRK_YES)
                    .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function() {
                    $http.delete('/api/clients/' + $scope.client._id).then(function(response) {
                        if ($scope.params.deleteClientCallback) {
                            $scope.params.deleteClientCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_CLIENTS_CLIENTDELETED).hideDelay(1000).position('bottom right'));
                    });
                });
            });
        });
    };

    // Client clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    // Click on new admin button opens detail dialog with new administrator data
    $scope.newAdmin = function() {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/AdministratorCard', {
            clientId: $scope.client._id
        });
    };

    // Click on module in module list shows module details
    $scope.selectClientModule = function(selectedClientModule) {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/ClientModuleCard', {
            clientModuleId: selectedClientModule._id,
            saveClientModuleCallback: saveClientModuleCallback,
            deleteClientModuleCallback: deleteClientModuleCallback,
            closeCallback: closeClientModuleCardCallback
        });
        $scope.selectedClientModule = selectedClientModule;
    };

    // Click on add module button opens detail dialog with new module assignment
    $scope.addModule = function() {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/ClientModuleCard', {
            clientId: $scope.client._id,
            createClientModuleCallback: createClientModuleCallback,
            saveClientModuleCallback: saveClientModuleCallback,
            deleteClientModuleCallback: deleteClientModuleCallback,
            closeCallback: closeClientModuleCardCallback
        });
    };

    // Loads the client details or prepares the empty dialog for a new client
    // Params:
    // - $scope.params.clientId : ID of the client to load, when not set, a new client is to be created
    // - $scope.params.createClientCallback : Callback function when a new client was created. Gets the client as parameter
    // - $scope.params.saveClientCallback : Callback function when an existing client was saved. Gets the updated client as parameter
    // - $scope.params.deleteClientCallback : Callback function when an existing client was deleted. No parameters
    // - $scope.params.closeCallback : Callback function when the card gets closed via button. No parameters
    $scope.load = function() {
        // Switch between creation of a new client and loading of an existing client
        if ($scope.params.clientId) {
            // Existing client
            $http.get('/api/clients/' + $scope.params.clientId + '?fields=_id+name').then(function(clientResponse) {
                var completeClient = clientResponse.data;
                $scope.isNewClient = false;
                $scope.client = completeClient;
                $scope.clientName = completeClient.name; // Prevent updating the label when changing the name input value
                $scope.relationsEntity = { type:'clients', id:completeClient._id };
                checkAvailableModules();
                // client module assignments
                $http.get('/api/clientmodules?clientId=' + $scope.client._id).then(function(clientModulesResponse) {
                    $scope.clientModules = clientModulesResponse.data;
                });
            });
        } else {
            // New client
            $scope.isNewClient = true;
            $scope.client = { name : "", comment:'' };
            $scope.clientModules = [];
        }
    };

    $scope.load();

});
