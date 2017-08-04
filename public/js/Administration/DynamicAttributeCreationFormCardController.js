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
            name_en: $scope.dynamicattribute.name_en, 
            modelName: $scope.params.modelName,
            type: $scope.dynamicattribute.type
        };
        $http.post('/api/dynamicattributes', attributeToSend).then(function successCallback(response) {
            if (response.status === 409) {
                //$scope.usersForm.un.$setValidity('nameInUse', false);
                return;
            }
            var createdAttribute = response.data;
            $scope.isNewAttribute = false;
            $scope.dynamicattribute._id = createdAttribute._id;
            $scope.dynamicattribute.name_en = createdAttribute.name_en;
            //$scope.relationsEntity = { type:'dynamicattributes', id:createdAttribute._id };
            if ($scope.params.createDynamicAttributeCallback) {
                $scope.params.createDynamicAttributeCallback(createdAttribute);
            }
            //TODO use the right translation key
            $translate(['TRK_USERS_USER_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_USERS_USER_CREATED).hideDelay(1000).position('bottom right'));
            });
        });
    };

    $scope.saveAttribute = function(){
        var attributeToSend = { name_en: $scope.dynamicattribute.name_en };
        $http.put('/api/dynamicattributes/' + $scope.dynamicattribute._id, attributeToSend).then(function(response) {
            var savedAttribute = response.data;
            $scope.attributeName = $scope.dynamicattribute.name_en;
            if ($scope.params.saveDynamicAttributeCallback) {
                $scope.params.saveDynamicAttributeCallback(savedAttribute);
            }
            //TODO use the right translation key
            $translate(['TRK_USERGROUPS_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_USERGROUPS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });
        });
    };

    $scope.deleteAttribute = function(){
        $translate(['TRK_USERGROUPS_USERGROUP_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations) {
            $translate('TRK_USERGROUPS_REALLY_DELETE_USERGROUP', { attributeName: $scope.attributeName }).then(function(TRK_USERGROUPS_REALLY_DELETE_USERGROUP) {
                var confirm = $mdDialog.confirm()
                    .title(TRK_USERGROUPS_REALLY_DELETE_USERGROUP)
                    .ok(translations.TRK_YES)
                    .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function() {
                    $http.delete('/api/dynamicattributes/' + $scope.params.dynamicAttributeId).then(function(response) {
                        if ($scope.params.deletDynamicAttributeCallback) {
                            $scope.params.deletDynamicAttributeCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        //TODO use the right translation key
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_USERGROUPS_USERGROUP_DELETED).hideDelay(1000).position('bottom right'));
                    });
                });
            });
        });
    };

    $scope.newAttributeElement = function(){
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
        utils.addCard('Administration/DynamicAttributeElementCard', {
            dynamicAttributeId: $scope.params.dynamicAttributeId
        });
    };
    $scope.selectAttributeElement = function(selectedAttributeElement){
        utils.removeCardsToTheRightOf($element);
        //utils.removeCard($element);
        utils.addCard('Administration/DynamicAttributeElementCard', {
          dynamicAttributeElementId: selectedAttributeElement._id,
          dynamicAttributeId: $scope.params.dynamicAttributeId
        });
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
    $http.get('/api/permissions/canWrite/PERMISSION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function (response) {
        $scope.canWriteAttributeDetails = response.data;
    });


    //TODO have a look at UsergroupCardController.js
    //Loads dynamicAttribute details or prepares for an empty dialog for a new dynamicAttribute
    //Params:
    //... 
    // - $scope.params.createDynamicAttributeCallback : Callback function when a new attribute was created. Gets the attribute as parameter
    // - $scope.params.saveDynamicAttributeCallback : Callback function when an existing attribute was saved. Gets the updated attribute as parameter
    // - $scope.params.deletDynamicAttributeCallback : Callback function when an existing attribute was deleted. No parameters
    // - $scope.params.closeDynamicAttributeCallback : Callback function when the card gets closed via button. No parameters
    //
    $scope.load = function(){
        //Switch between creation of a new dynamicAttribute and loading of an existing one
        if($scope.params.dynamicAttributeId){
            //Existing dynamicAttribute
            $http.get('/api/dynamicattributes/' + $scope.params.dynamicAttributeId).then(function(response){
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
            $scope.dynamicattribute = {name_en: '', type: 'text'};
        }
        $scope.modelName = 'users';
    };

    $scope.loadElements = function(){
        //Get list of existing attribute options (so-called elements)
        if($scope.params.dynamicAttributeId){
        $http.get('/api/dynamicattributes/options/' + $scope.params.dynamicAttributeId).then(function(attributeOptionsFromDataBank){
            $scope.elements = attributeOptionsFromDataBank.data;
            console.log(attributeOptionsFromDataBank.data);
        }); 
        }
    }
    $scope.loadElements();
    $scope.load();

});