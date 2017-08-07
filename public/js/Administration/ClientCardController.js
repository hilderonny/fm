app.controller('AdministrationClientCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {

    $scope.getClientModules = function() {
        return $http.get('/api/clientmodules/forClient/' + $scope.client._id).then(function(clientModulesResponse) {
            $scope.client.clientModules = clientModulesResponse.data;
            $scope.client.clientModules.forEach(function(clientModule) {
                clientModule.translationKey = 'TRK_MODULE_' + clientModule.module + '_NAME';
            });
            return Promise.resolve();
        });
    };

    $scope.saveClientModule = function(clientModuleToSave, clientModuleToUpdate) {
        if (clientModuleToSave.active) {
            $http.post('/api/clientmodules', clientModuleToSave).then(function(response) {
                clientModuleToUpdate._id = response.data._id;
                clientModuleToUpdate.active = response.data.active;
            });
        } else {
            $http.delete('/api/clientmodules/' + clientModuleToSave._id).then(function() {
                delete clientModuleToUpdate._id;
                clientModuleToUpdate.active = false;
            });
        }
    };

    $scope.switchActive = function(clientModule) {
        if (!$scope.canWriteClients) return;
        var tempClientModule = JSON.parse(JSON.stringify(clientModule));
        tempClientModule.active = !tempClientModule.active;
        $scope.saveClientModule(tempClientModule, clientModule);
    };

    $scope.newAdmin = function() {
        var parentScope = $scope;
        $mdDialog.show({
            controller: function ($scope) { // https://github.com/angular/material/issues/1531#issuecomment-74640529
                $scope.parentScope = parentScope;
                parentScope.administrator = { name: '', pass: '' };
            },
            controllerAs: 'ctrl',
            templateUrl: 'CreateAdministratorDialog',
            parent: angular.element(document.body),
            clickOutsideToClose:true
        });
    };

    $scope.onCancelClick = function() {
        $scope.administrator = null; 
        $mdDialog.cancel();
    };

    $scope.onOkClick = function(childScope) {
        var administratorToSend = { 
            name: $scope.administrator.name, 
            pass: $scope.administrator.pass,
            clientId: $scope.params.clientId
        };
        $http.post('/api/clients/newadmin', administratorToSend).then(function(response) {
            if (response.status === 409) {
                childScope.administratorsForm.name.$setValidity('nameInUse', false);
                return Promise.reject();
            }
            return $translate(['TRK_CLIENTS_ADMINISTRATORCREATED']);
        }).then(function(translations) {
            $mdToast.show($mdToast.simple().textContent(translations.TRK_CLIENTS_ADMINISTRATORCREATED).hideDelay(1000).position('bottom right'));
            $mdDialog.hide();
        });
    };

    // Click on Create-button to create a new client
    $scope.createClient = function() {
        var clientToSend = { 
            name: $scope.client.name,
            comment:$scope.client.comment 
        };
        var createdClient;
        $http.post('/api/clients', clientToSend).then(function(response) {
            createdClient = response.data;
            $scope.isNewClient = false;
            $scope.client._id = createdClient._id;
            $scope.clientName = $scope.client.name;
            $scope.relationsEntity = { type:'clients', id:createdClient._id };
            if ($scope.params.createClientCallback) {
                $scope.params.createClientCallback(createdClient);
            }
            return $scope.getClientModules();
        }).then(function() {
            return $translate(['TRK_CLIENTS_CLIENTCREATED']);
        }).then(function(translations) {
            $mdToast.show($mdToast.simple().textContent(translations.TRK_CLIENTS_CLIENTCREATED).hideDelay(1000).position('bottom right'));
            utils.setLocation('/clients/' + createdClient._id);
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
                return $scope.getClientModules();
            }).then(function() {
                utils.setLocation('/clients/' + $scope.params.clientId);
            });
        } else {
            // New client
            $scope.isNewClient = true;
            $scope.client = { name : "", comment:'', clientModules: [] };
        }
        $scope.canWriteClients = $rootScope.canWrite('PERMISSION_ADMINISTRATION_CLIENT');
    };

    $scope.load();

});
