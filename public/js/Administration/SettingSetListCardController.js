app.controller('AdministrationSettingSetListCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
    
    var closeSettingSetCardCallback = function() {
        $scope.selectedSettingSetItem = false;
    };

    // Click on user in user list shows user details
    $scope.selectSettingSetItem = function(selectedSettingSetItem) {
        utils.removeCardsToTheRightOf($element);
        utils.addCard(selectedSettingSetItem.mainCard, {
            closeCallback: closeSettingSetCardCallback
        });
        $scope.selectedSettingSetItem = selectedSettingSetItem;
    }

    // Loads the setting set list from the server
    $scope.load = function() {
        $scope.selectedUser = false;
        $http.get('/api/settingsets').then(function (response) {
            $scope.settingSets = response.data;
        });
    }

    $scope.load();
});
