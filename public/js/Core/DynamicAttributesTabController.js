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

    $scope.loadAttributeElements = function(dynamicAttributeId) {
            $http.get('/api/dynamicattributes/options/' + dynamicAttributeId).then(function(response){
            $scope.options = response.data;
            $scope.options._id = dynamicAttributeId;
            console.log($scope.options);
        });
    };

    $scope.PrepareAttributeElements = function(){ 
        //TODO: fix problem with asynchomous function execution!
        console.log(Array.from($scope.attributesArray));
        // forEach() operates only on arrays 
        Array.from($scope.attributesArray).forEach(function(attributeInstance) {
            console.log("Doing something here");
            if(attributeInstance[type] == "DYNAMICATTRIBUTES_TYPE_PICKLIST"){
                $scope.loadAttributeElements(attributeInstance._id);
            }
        });
    }

    $scope.PrepareAttributeElements();

    $scope.attributeOptionsArray = function() {    
        return $scope.options ? Object.keys($scope.options).map(function(key) {
                return $scope.options[key]; }) : [];
    }
});
