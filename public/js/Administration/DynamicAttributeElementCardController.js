app.controller('AdministrationAttributeElementCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
    
    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    $scope.createAttributeElement = function(){
        //Required properties are dynamicAttributeId and text_en
        var optionToSend = { 
            text_en: $scope.dynamicattribute.text_en,
            dynamicAttributeId: $scope.params.dynamicAttributeId._id
        };
        $http.post('/api/dynamicattribute/option', optionToSend).then(function successCallback(response) {
            if (response.status === 409) {
                //$scope.usersForm.un.$setValidity('nameInUse', false);
                return;
            }
            var createdAttribute = response.data;
            $scope.isNewElement = false;
            //$scope.dynamicattribute._id = createdAttribute._id;
           // $scope.dynamicattribute.name_en = createdAttribute.name_en;
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

    $scope.saveAttributeElement = function(){
        var elementToSend = { text_en: $scope.attributeelement.text_en,
                              dynamicAttributeId: $scope.params.dynamicAttributeId};
        $http.put('/api/dynamicattribute/options' + $scope.params.dynamicAttributeElementId, elementToSend).then(function(response) {
            var savedAttributeElement = response.data;
            $scope.elementName = $scope.attributeelement.text_en;
            if ($scope.params.saveDynamicAttributeCallback) {
                $scope.params.saveDynamicAttributeCallback(savedAttribute);
            }
            //TODO use the right translation key
            $translate(['TRK_USERGROUPS_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_USERGROUPS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });
        });
    };

    $scope.deleteAttributeElement = function(){
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
        //Switch between creation of a new attribute option (element) and loading of an existing one
        if($scope.params.dynamicAttributeElementId){
            //Existing attribute option/element
            $scope.isNewElement = false;
            $http.get('/api/dynamicattributes/option/' + $scope.params.dynamicAttributeElementId).then(function(attributeOptionFromDataBank){
                $scope.attributeelement = attributeOptionFromDataBank.data;
            });
        }
        else{
            //new dynamicAttribute
            $scope.isNewElement = true;
            $scope.attributeelement = {text_en: ''};
        }
        $scope.modelName = 'users';
    };

    $scope.load();

});