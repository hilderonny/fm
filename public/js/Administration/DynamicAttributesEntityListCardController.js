app.controller('AdministrationDynamicAttributesModelListCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
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
        utils.addCard('Administration/DynamicAttributesCard', {
            modelName: selectedModel.name,
            icon: selectedModel.icon, //TODO check if you need this parameter
            title: selectedModel.title
        });
        $scope.selectedModel = selectedModel;
    };
    //TODo check and fix problem with confusion between folders and documents database table
    $scope.models = [
        {name: 'users', icon: 'User', title: 'Users'}, //TODO add translation key for title attribute 
        {name: 'usergroups', icon: 'User Group Man Man', title: 'User groups'},
        {name: 'folders', icon: 'Document', title: 'Documents'}
    ];

   /* $http.get('/api/dynamicattributes/types').then(function(response){
        $scope.Mmodels = response.data;
        console.log( $scope.Mmodels);
    });*/

});
