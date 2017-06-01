app.controller('AdministrationDynamicAttributesCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
    
    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    // Check the permissions for the details page for handling button visibility
    //TODO ask if this permission check is not pointless in this case!?
    $http.get('/api/permissions/canWrite/PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function (response) {
        $scope.canWriteUserDetails = response.data;
    });

    $scope.newAttribute = function(){
        utils.addCard('Administration/DynamicAttributeCreationFormCard', {
        });
    };

    $scope.load = function(){
        if($scope.params.entityName){
            $scope.name =  $scope.params.entityName;
        }
        else {
            $scope.name =  "some name";
        }
    };

    $scope.load();

});
