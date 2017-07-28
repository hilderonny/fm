app.controller('CoreDynamicAttributesTabController', function($scope, $http, $translate, $mdDialog, $mdToast, $element, $filter, utils) {

    /**
     * Lädt die Verknüpfungen des aktuellen Objekts vom Server und füllt die Liste
     */
    $scope.loadAttributes = function() {
        if(!$scope.relationsEntity){console.log('NO relationsEntity');}
        var modelname = $scope.$parent.relationsEntity.type;
        var entityId = $scope.relationsEntity.id;
        $http.get('/api/dynamicattributes/values/' + modelname + '/' + entityId).then(function(response){
            $scope.attributes = response.data;
            console.log($scope.attributes);
        });
    };
    $scope.loadAttributes();
  
    /**
     * Hilfsfunktionen zum Umwandeln der Verknüpfungen in ein Feld, das sortiert
     * werden kann.
     */
    $scope.attributesArray = function() {
        
        return $scope.attributes ? Object.keys($scope.attributes).map(function(key) {
                return $scope.attributes[key]; }) : [];
    }
    
    $scope.attributesArray();
});
