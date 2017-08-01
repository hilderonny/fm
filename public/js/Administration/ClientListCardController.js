app.controller('AdministrationClientListCardController', function($scope, $rootScope, $http, $mdDialog, $element, $translate, utils) {

    var saveClientCallback = function(savedClient) {
        $scope.selectedClient.name = savedClient.name;
    };
    var deleteClientCallback = function() {
        $scope.clients.splice($scope.clients.indexOf($scope.selectedClient), 1);
        closeClientCardCallback();
    };
    var createClientCallback = function(createdClient) {
        $scope.clients.push(createdClient);
        $scope.selectedClient = createdClient;
    };
    var closeClientCardCallback = function() {
        $scope.selectedClient = false;
        utils.setLocation('/clients');
    };

    // Click on client in client list shows client details
    $scope.selectClient = function(selectedClient) {
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('Administration/ClientCard', {
            clientId: selectedClient._id,
            saveClientCallback: saveClientCallback,
            deleteClientCallback: deleteClientCallback,
            closeCallback: closeClientCardCallback
        }, 'PERMISSION_ADMINISTRATION_CLIENT').then(function() {
            $scope.selectedClient = selectedClient;
        });
    }

    // Click on new client button opens detail dialog with new client data
    $scope.newClient = function() {
        $scope.selectedClient = null;
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('Administration/ClientCard', {
            createClientCallback: createClientCallback,
            saveClientCallback: saveClientCallback,
            deleteClientCallback: deleteClientCallback,
            closeCallback: closeClientCardCallback
        }, 'PERMISSION_ADMINISTRATION_CLIENT');
    }

    // Loads the clients list from the server
    // Params:
    // - $scope.params.preselection : ID of the client to select in the list
    $scope.load = function() {
        $scope.selectedClient = false;
        $http.get('/api/clients').then(function (response) {
            $scope.clients = response.data;
            // Check the permissions for the details page for handling button visibility
            $scope.canWriteClients = $rootScope.canWrite('PERMISSION_ADMINISTRATION_CLIENT');
            // Check preselection
            utils.handlePreselection($scope, $scope.clients, $scope.selectClient);
            if (!$scope.params.preselection) utils.setLocation('/clients');
        });
    }

    $scope.load();
});

app.directUrlMappings.clients = {
    mainMenu: 'TRK_MENU_PORTAL',
    subMenu: 'TRK_MENU_ADMINISTRATION_CLIENTS'
};
