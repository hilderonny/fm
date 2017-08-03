app.controller('CoreDynamicAttributesTabController', function($scope, $http, $translate, $mdDialog, $mdToast, $element, $filter, utils) {

    /**
     * Lädt die Verknüpfungen des aktuellen Objekts vom Server und füllt die Liste
     */
    $scope.loadAttributes = function() {
        if(!$scope.relationsEntity){console.log('NO relationsEntity');}
        var modelname = $scope.$parent.relationsEntity.type;
        var entityId = $scope.relationsEntity.id;
        $http.get('/api/dynamicattributes/values/' + modelname + '/' + entityId).then(function(response){
            $scope.attributes = Object.keys(response.data).map(function(key) {
                return response.data[key]; });
            console.log($scope.attributes);
        });
    };
    $scope.loadAttributes();
  
    var origSaveUserGroup = $scope.$parent.$parent.$parent.saveUserGroup;
    // Click on Save-button to save an existing userGroup
    $scope.$parent.$parent.$parent.saveUserGroup = function() {
        origSaveUserGroup();
        console.log('Speichere Dynamische Attribute');
        // ....
    }
});
