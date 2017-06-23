app.controller('AdministrationDynamicAttributesEntityListCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    $scope.selectEntity = function(selectedEntity){
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/DynamicAttributesCard', {
            entityName: selectedEntity.name
        });
        $scope.selectedEntity = selectedEntity;
    };
    
    $scope.entities = [
        {name: 'users'},
        {name: 'user groups'},
        {name: 'documents'}
    ];
});
