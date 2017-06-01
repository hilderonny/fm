app.controller('AdministrationAttributeCreationCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
    
    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    $scope.createAttribute = function(){

    };

    $scope.saveAttribute = function(){

    };

    $scope.deleteAttribute = function(){

    };


    //TODO check if needed 
    //try unisng utils instead???
    $scope.types = [
        'DYNAMICATTRIBUTES_TYPE_TEXT',
        'DYNAMICATTRIBUTES_TYPE_BOOLEAN',
        'DYNAMICATTRIBUTES_TYPE_PICKLIST'
    ];

    $scope.languages = $rootScope.languages;

    // Check the permissions for the details page for handling button visibility
    //TODO ask if this permission check is not pointless in this case!?
    $http.get('/api/permissions/canWrite/PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function (response) {
        $scope.canWriteUserDetails = response.data;
    });


    //Loads dynamicAttribute details or prepares for an empty dialog for a new dynamicAttribute
    //Params:
    //... 
   /* $scope.load = function(){
        //Switch between creation of a new dynamicAttribute and loading of an existing one
        if($scope.params.dynamicAttributeId){
            //Existing dynamicAttribute
        }
    };*/

   // $scope.load();

});