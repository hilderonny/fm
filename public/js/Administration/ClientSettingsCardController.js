app.controller('AdministrationClientSettingsCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
    
    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    $scope.saveClientSettings = function() {
        $rootScope.isLoading=true;
        var settingsToSend = { 
            logourl: $scope.clientSettings.logourl 
        };
        $http.post('/api/clientsettings/', settingsToSend).then(function(response) {
            $translate(['TRK_SETTINGSET_CLIENT_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_SETTINGSET_CLIENT_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });$rootScope.isLoading=false;
        });
    };

    $scope.load = function() {
        $rootScope.isLoading= true;
        $http.get('/api/clientsettings/').then(function(response) {
            $scope.clientSettings = response.data;
            $scope.canWriteClientSettings = $rootScope.canWrite('PERMISSION_SETTINGS_CLIENT');
            utils.setLocation('/settings/TRK_SETTINGSET_CLIENT');
            $rootScope.isLoading=false;
        });
    };

    $scope.load();

});
