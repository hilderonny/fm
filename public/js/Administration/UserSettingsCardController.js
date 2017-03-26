app.controller('AdministrationUserSettingsCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translatePartialLoader, $translate, utils) {
    
    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    $scope.saveUpdatedPassword = function() {
        var userToSend = {  
            pass: $scope.user.pass
        };
        $http.post('/api/users/newpassword', userToSend).then(function(response) {
            var savedUser = response.data;
            $scope.user.pass = '';
            $scope.user.pass2 = '';
            if ($scope.params.saveUserCallback) {
                $scope.params.saveUserCallback(savedUser);
            }
            $translate(['USERS_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.USERS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });
        });
    };

        // Check the permissions for the details page for handling button visibility
        $http.get('/api/permissions/canWrite/PERMISSION_SETTINGS_USER').then(function (response) {
            $scope.canWriteUserDetails = response.data;
        });

});
