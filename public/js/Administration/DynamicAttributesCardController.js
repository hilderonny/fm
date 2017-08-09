app.controller('AdministrationDynamicAttributesCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
    
    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    var saveDynamicAttributeCallback = function(updatedAttribute) {
        $scope.selectedAttribute.name_en = updatedAttribute.name_en;
    };

    var createDynamicAttributeCallback = function(savedAttribute) {
        $scope.attributes.push(savedAttribute);
        $scope.selectAttribute(savedAttribute);
    };

    var deleteDynamicAttributeCallback = function() {
        $scope.attributes.splice($scope.attributes.indexOf($scope.selectedAttribute), 1);
        closeDynamicAttributeCardCallback();
    };

    var closeDynamicAttributeCardCallback = function() {
        $scope.selectedAttribute = null;
    };

    var upateListOfAttributes  = function(){
        $http.get('/api/dynamicattributes/model/' + $scope.params.modelName).then(function(attributesFromDataBank){
            $scope.attributes = attributesFromDataBank.data;
        });
    };

    $scope.newAttribute = function(){
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('Administration/DynamicAttributeCreationFormCard', {
            modelName: $scope.params.modelName,
            createDynamicAttributeCallback: createDynamicAttributeCallback,
            closeCallback: closeDynamicAttributeCardCallback
        }, 'PERMISSION_SETTINGS_CLIENT_DYNAMICATTRIBUTES');
    };

    $scope.selectAttribute = function(selectedAttribute){
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('Administration/DynamicAttributeCreationFormCard', {
            dynamicAttributeId: selectedAttribute._id,
            deleteDynamicAttributeCallback: deleteDynamicAttributeCallback,
            saveDynamicAttributeCallback: saveDynamicAttributeCallback,
            closeCallback: closeDynamicAttributeCardCallback
        }, 'PERMISSION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function() {
            $scope.selectedAttribute = selectedAttribute;
        });
    };

    $scope.load = function(){
        $scope.modelName = $scope.params.modelName;
        $scope.title =  $scope.params.title;
        $scope.icon = $scope.params.icon;
        $http.get('/api/dynamicattributes/model/' + $scope.params.modelName).then(function(attributesFromDataBank){
            $scope.attributes = attributesFromDataBank.data;
        });
        // Check the permissions for the details page for handling button visibility
        $scope.canWriteDynamicAttributes = $rootScope.canWrite('PERMISSION_SETTINGS_CLIENT_DYNAMICATTRIBUTES');
    };

    $scope.load();
});