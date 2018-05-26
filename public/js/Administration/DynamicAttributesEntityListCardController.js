app.controller('AdministrationDynamicAttributesModelListCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    //User clicks on ceratin list item to select particular model
    $scope.selectModel = function(selectedModel){
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('Administration/DynamicAttributesCard', {
            model: selectedModel
        }, 'PERMISSION_SETTINGS_CLIENT_DYNAMICATTRIBUTES');
        $scope.selectedModel = selectedModel;
    };

    // Filter for icons, but later on other attribute
    // TODO: Obsolete with dynamic objects
    $scope.models = Object.keys($scope.$root.datatypes).map(function(k) { return $scope.$root.datatypes[k]; }).filter(function(dt) { return dt.icon; });
    utils.setLocation('/settings/TRK_SETTINGSET_DYNAMICATTRIBUTES');

    // //TODo check and fix problem with confusion between folders and documents database table
    // $http.get('/api/dynamicattributes/models').then(function(response) {
    //     $scope.models = response.data;
    //     utils.setLocation('/settings/TRK_SETTINGSET_DYNAMICATTRIBUTES');
    // });

});
