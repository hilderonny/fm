app.controller('AdministrationSettingSetListCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
    
    var closeSettingSetCardCallback = function() {
        $scope.selectedSettingSetItem = false;
        utils.setLocation('/settings');
    };

    // Click on user in user list shows user details
    $scope.selectSettingSetItem = function(selectedSettingSetItem) {
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission(selectedSettingSetItem.mainCard, {
            closeCallback: closeSettingSetCardCallback
        }, selectedSettingSetItem.permission).then(function() {
            $scope.selectedSettingSetItem = selectedSettingSetItem;
        });
    };

    // Loads the setting set list from the server
    $scope.load = function() {
        $scope.selectedUser = false;
        $http.get('/api/settingsets').then(function (response) {
            $scope.settingSets = response.data;
            // Check preselection
            if ($scope.params.preselection) {
                $scope.settingSets.forEach(function(settingSet) {
                    settingSet.items.forEach(function(item) {
                        if (item.title === $scope.params.preselection) {
                            $scope.selectSettingSetItem(item);
                        }
                    });
                });
            }
            if (!$scope.params.preselection) utils.setLocation('/settings');
        });
    }

    $scope.load();
});

app.directUrlMappings.settings = {
    mainMenu: 'TRK_MENU_ADMINISTRATION',
    subMenu: 'TRK_MENU_ADMINISTRATION_SETTINGS'
};
