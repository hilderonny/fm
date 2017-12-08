app.controller('AdministrationUserSettingsCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
    
    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    $scope.saveUpdatedPassword = function() {
        $rootScope.isLoading= true;
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
            $translate(['TRK_USERS_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_USERS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });$rootScope.isLoading=false;
        });
    };
    $scope.canWriteUserDetails = $rootScope.canWrite('PERMISSION_SETTINGS_USER');
    utils.setLocation('/settings/TRK_SETTINGSET_USER_GENERAL');

});
