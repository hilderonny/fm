app.controller('AdministrationDynamicAttributesCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
    
    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    var saveDynamicAttributeCallback = function(updatedAttribute) {
        upateListOfAttributes();
        $scope.selectedAttribute = updatedAttribute;
        utils.removeCardsToTheRightOf($element);
    };

    var createDynamicAttributeCallback = function(savedAttribute) {
        utils.removeCardsToTheRightOf($element);
        $scope.selectedAttribute = savedAttribute;
        upateListOfAttributes();
    };

    var deletDynamicAttributeCallback = function() {
        for (var i = 0; i < $scope.attributes.length; i++) {
            var attribute = $scope.attributes[i];
            if (attribute._id === $scope.selectedAttribute._id) {
                $scope.attributes.splice(i, 1); //remove deleted item 
                $scope.selectedAttribute = false;
                break;
            }
        }     
        utils.removeCardsToTheRightOf($element);
        upateListOfAttributes();
    }; 

    var upateListOfAttributes  = function(){
        $http.get('/api/dynamicattributes/model/' + $scope.params.modelName).then(function(attributesFromDataBank){
            $scope.attributes = attributesFromDataBank.data;
        });
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
            type: 'text', //TODO chech if default type is necessary
            createDynamicAttributeCallback: createDynamicAttributeCallback,
            deletDynamicAttributeCallback: deletDynamicAttributeCallback,
            saveDynamicAttributeCallback: saveDynamicAttributeCallback
        });
    };

    $scope.selectAttribute = function(selectedAttribute){
        if(!$scope.canReadAttributeDetails){return;}
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/DynamicAttributeCreationFormCard', {
            dynamicAttributeId: selectedAttribute._id,
            modelName: selectedAttribute.modelName,
            type: selectedAttribute.type,
            //createDynamicAttributeCallback: createDynamicAttributeCallback,
            deletDynamicAttributeCallback: deletDynamicAttributeCallback,
            saveDynamicAttributeCallback: saveDynamicAttributeCallback
        });
        $scope.selectedAttribute = selectedAttribute;
    };

    $scope.load = function(){
        if($scope.params.modelName){
            $scope.title =  $scope.params.title;
            $scope.icon = $scope.params.icon;
            $http.get('/api/dynamicattributes/model/' + $scope.params.modelName).then(function(attributesFromDataBank){
                $scope.attributes = attributesFromDataBank.data;
            });
        }
        else {
            $scope.title =  "some name";
        }
    };

    $scope.load();
});