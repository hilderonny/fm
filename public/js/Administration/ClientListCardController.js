app.controller('AdministrationClientListCardController', function($scope, $http, $mdDialog, $element, $translate, utils) {

    var saveClientCallback = function(savedClient) {
        $scope.selectedClient.name = savedClient.name;
    };
    var deleteClientCallback = function() {
        for (var i = 0; i < $scope.clients.length; i++) {
            var client = $scope.clients[i];
            if (client._id === $scope.selectedClient._id) {
                $scope.clients.splice(i, 1);
                $scope.selectedClient = false;
                break;
            }
        }
    };
    var createClientCallback = function(createdClient) {
        $scope.clients.push(createdClient);
        $scope.selectedClient = createdClient;
    };
    var closeClientCardCallback = function() {
        $scope.selectedClient = false;
    };

    // Click on client in client list shows client details
    $scope.selectClient = function(selectedClient) {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/ClientCard', {
            clientId: selectedClient._id,
            saveClientCallback: saveClientCallback,
            deleteClientCallback: deleteClientCallback,
            closeCallback: closeClientCardCallback
        });
        $scope.selectedClient = selectedClient;
    }

    // Click on new client button opens detail dialog with new client data
    $scope.newClient = function() {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/ClientCard', {
            createClientCallback: createClientCallback,
            saveClientCallback: saveClientCallback,
            deleteClientCallback: deleteClientCallback,
            closeCallback: closeClientCardCallback
        });
    }

    // Loads the clients list from the server
    // Params:
    // - $scope.params.selectedClientId : ID of the client to select in the list
    $scope.load = function() {
        $scope.selectedClient = false;
        $http.get('/api/clients?fields=_id+name').then(function (response) {
            $scope.clients = response.data;
            if ($scope.params.selectedClientId) {
                for (var i = 0; i < $scope.clients.length; i++) {
                    var client = $scope.clients[i];
                    if (client._id === $scope.params.selectedClientId) {
                        $scope.selectedClient = client;
                        break;
                    }
                }
            }
        });
    }

    $scope.load();
});
