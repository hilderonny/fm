app.controller('AdministrationAdministratorCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translate, utils) {

    // Click on Create-button to create a new administrator
    $scope.createAdministrator = function() {
        var administratorToSend = { 
            name: $scope.administrator.name, 
            pass: $scope.administrator.pass,
            clientId: $scope.params.clientId
        };
        $http.post('/api/clients/newadmin', administratorToSend).then(function successCallback(response) {
            $translate(['TRK_CLIENTS_ADMINISTRATORCREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_CLIENTS_ADMINISTRATORCREATED).hideDelay(1000).position('bottom right'));
                $scope.closeCard();
            });
        }, function errorCallback(response) {
            // Username is in use by another one
            if (response.status === 409) {
                $scope.administratorsForm.name.$setValidity('nameInUse', false);
            }
        });
    };

    // User clicks on close button
    $scope.closeCard = function() {
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    // Prepares the empty dialog for a new administrator
    // Params:
    // - $scope.params.clientId : ID of the client to assign the new admin to
    $scope.load = function() {
        $scope.administrator = {
            name : 'admin_' + (new Date()).getTime(), 
            pass : '' 
        };
    };

    $scope.load();

});
