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
        var attributeToSend = { 
            name_en: $scope.attribute.name, 
            modelName: $scope.params.modelName,
            type: $scope.attribute.type
        };
        $http.post('/api/dynamicattributes', attributeToSend).then(function successCallback(response) {
            if (response.status === 409) {
                //$scope.usersForm.un.$setValidity('nameInUse', false);
                return;
            }
            var createdAttribute = response.data;
            $scope.isNewAttribute = false;
            $scope.dynamicattribute._id = createdAttribute._id;
            $scope.attribute.name = createdAttribute.name_en;
            //$scope.relationsEntity = { type:'dynamicattributes', id:createdAttribute._id };
            if ($scope.params.createAttributeCallback) {
                $scope.params.createAttributeCallback(createdAttribute);
            }
            //TODO use the right translation key
            /*$translate(['TRK_USERS_USER_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_USERS_USER_CREATED).hideDelay(1000).position('bottom right'));
            });*/
        });
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
        $scope.canWriteAttributeDetails = response.data;
    });


    //TODO have a look at UsergroupCardController.js
    //Loads dynamicAttribute details or prepares for an empty dialog for a new dynamicAttribute
    //Params:
    //... 
    $scope.load = function(){
        //Switch between creation of a new dynamicAttribute and loading of an existing one
        if($scope.params.dynamicAttributeId){
            //Existing dynamicAttribute
            $http.get(`/api/dynamicattributes/${$scope.params.dynamicAttributeId}`).then(function(response){
                $scope.isNewAttribute = false;
                var completeAttribute = response.data;
                $scope.dynamicattribute = completeAttribute;
                $scope.attributeName = completeAttribute.name_en;
                $scope.attributeType = completeAttribute.type;

            });
        }
        else{
            //new dynamicAttribute
            $scope.isNewAttribute = true;
            $scope.dynamicattribute = {name_en: ''};
            /*$scope.attributeName = 'Haha';
            $scope.attributeType = 'text'; //TODO check how to use global types $scope.attributeType = ???
            $scope.modelName = $scope.params.name;*/
        }
        $scope.modelName = 'users';
    };

    $scope.load();

});