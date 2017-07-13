app.controller('CoreDynamicAttributesTabController', function($scope, $http, $translate, $mdDialog, $mdToast, $element, $filter, utils) {

    /**
     * Lädt die Verknüpfungen des aktuellen Objekts vom Server und füllt die Liste
     */
    $scope.loadAttributes = function() {
       // $scope.attributes.title  =  '$scope.relationsEntity.type';
    };

    $scope.$on('load', function() {
        console.log('DA');
        if(!$scope.relationsEntity){console.log('NO relationsEntity');}
        var modelname = $scope.$parent.relationsEntity.type;
        var entityId = $scope.relationsEntity.id;
        console.log(entityId);
        console.log(modelname);
        $http.get('/api/dynamicattributes/values/' + modelname + '/' + entityId).then(function(response){
            $scope.attributes = response.data;
            console.log($scope.attributes);
        });
    });

    //$scope.loadAttributes();
    /**
     * Hilfsfunktionen zum Umwandeln der Verknüpfungen in ein Feld, das sortiert
     * werden kann.
     */
    $scope.attributesArray = function() {
        return $scope.attributes ? Object.keys($scope.attributes).map(function(key) { return $scope.attributes[key]; }) : [];
    }
    $scope.attributesArray();

    /**
     * Filterfunktion, um für orderBy-Klauseln von Verknüpfungen die
     * einzelnen Abschnitte nach den übersetzten Titeln zu sortieren.
     * Siehe: https://angular-translate.github.io/docs/#/api/pascalprecht.translate.$translate und
     * http://stackoverflow.com/a/26460244/5964970
     */
    $scope.translateTitle = function(attribute) {
        return $filter('translate')('TRK_' + attribute.name_en);
    }
});
