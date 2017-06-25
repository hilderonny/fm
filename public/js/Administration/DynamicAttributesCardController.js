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
        $scope.canWriteAttributeDetails = response.data;
    });
    

    $http.get('/api/permissions/canRead/PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function (response) {
        $scope.canReadAttributeDetails = response.data;
    });

    $scope.newAttribute = function(){
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/DynamicAttributeCreationFormCard', {
            modelName: $scope.params.modelName,
            type: 'text' //TODO chech if default type is necessary
        });
    };

    $scope.selectAttribute = function(selectedAttribute){
        if(!$scope.canReadAttributeDetails){return;}
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/DynamicAttributeCreationFormCard', {
            dynamicAttributeId: selectedAttribute._id,
            modelName: selectedAttribute.modelName,
            type: selectedAttribute.type
        });
    };

    $scope.load = function(){
        if($scope.params.modelName){
            $scope.title =  $scope.params.title;
            $scope.icon = $scope.params.icon;
            $http.get(`/api/dynamicattributes/model/${$scope.params.modelName}`).then(function(attributesFromDataBank){
                $scope.attributes = attributesFromDataBank.data;
            })
        }
        else {
            $scope.title =  "some name";
        }
    };

    $scope.load();
});