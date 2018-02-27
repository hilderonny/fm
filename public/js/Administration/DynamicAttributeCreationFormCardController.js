app.controller('AdministrationAttributeCreationCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
    
    var saveDynamicAttributeElementCallback = function(updatedElement) {
        $scope.selectedElement.text_en = updatedElement.text_en;
    };

    var createDynamicAttributeElementCallback = function(createdElement) {
        $scope.elements.push(createdElement);
        $scope.selectAttributeElement(createdElement);
    };

    var deleteDynamicAttributeElementCallback = function() {
        $scope.elements.splice($scope.elements.indexOf($scope.selectedElement), 1);
        closeDynamicAttributeElementCardCallback();
    };

    var closeDynamicAttributeElementCardCallback = function() {
        $scope.selectedElement = null;
    };

    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    $scope.createAttribute = function(){
        $rootScope.isLoading=true;
        var attributeToSend = { 
            modelName: $scope.params.modelName,
            type: $scope.dynamicattribute.type
        };
        Object.keys($scope.dynamicattribute).forEach(function(key) {
            if (key.indexOf('name_') === 0) {
                attributeToSend[key] = $scope.dynamicattribute[key];
            }
        });
        $http.post('/api/dynamicattributes', attributeToSend).then(function successCallback(response) {
            var createdAttribute = response.data;
            $scope.isNewAttribute = false;
            $scope.dynamicattribute._id = createdAttribute._id;
            $scope.attributeName = createdAttribute.name_en;
            $scope.attributeType = createdAttribute.type;
            if ($scope.params.createDynamicAttributeCallback) {
                $scope.params.createDynamicAttributeCallback(createdAttribute);
            }
            $translate(['TRK_DYNAMICATTRIBUTES_ATTRIBUTE_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_DYNAMICATTRIBUTES_ATTRIBUTE_CREATED).hideDelay(1000).position('bottom right'));
            });$rootScope.isLoading=false;
        });
    };

    $scope.saveAttribute = function(){
        $rootScope.isLoading=true;
        var attributeToSend = { };
        Object.keys($scope.dynamicattribute).forEach(function(key) {
            if (key.indexOf('name_') === 0) {
                attributeToSend[key] = $scope.dynamicattribute[key];
            }
        });
        $http.put('/api/dynamicattributes/' + $scope.dynamicattribute._id, attributeToSend).then(function(response) {
            var savedAttribute = response.data;
            $scope.attributeName = $scope.dynamicattribute.name_en;
            if ($scope.params.saveDynamicAttributeCallback) {
                $scope.params.saveDynamicAttributeCallback(savedAttribute);
            }
            $translate(['TRK_DYNAMICATTRIBUTES_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_DYNAMICATTRIBUTES_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });$rootScope.isLoading=false;
        });
    };

    $scope.deleteAttribute = function(){
        $translate(['TRK_DYNAMICATTRIBUTES_ATTRIBUTE_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations) {
            $translate('TRK_DYNAMICATTRIBUTES_REALLY_DELETE_ATTRIBUTE', { attributeName: $scope.attributeName }).then(function(TRK_DYNAMICATTRIBUTES_REALLY_DELETE_ATTRIBUTE) {
                var confirm = $mdDialog.confirm()
                    .title(TRK_DYNAMICATTRIBUTES_REALLY_DELETE_ATTRIBUTE)
                    .ok(translations.TRK_YES)
                    .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function() {
                    $rootScope.isLoading=true;
                    $http.delete('/api/dynamicattributes/' + $scope.params.dynamicAttributeId).then(function(response) {
                        if ($scope.params.deleteDynamicAttributeCallback) {
                            $scope.params.deleteDynamicAttributeCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_DYNAMICATTRIBUTES_ATTRIBUTE_DELETED).hideDelay(1000).position('bottom right'));
                        $rootScope.isLoading=false;
                    });
                });
            });
        });
    };

    $scope.toogleVisibility = function(){
        if($scope.attributeVisibility == true){
             var updatedVisibility = false;
        }else {
            var updatedVisibility = true;
        }
        var attributeToSend = {isVisible: updatedVisibility};
        $http.put('/api/dynamicattributes/' + $scope.params.dynamicAttributeId, attributeToSend).then(function(response){
            $translate(['TRK_DYNAMICATTRIBUTES_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_DYNAMICATTRIBUTES_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            })
           $scope.attributeVisibility = updatedVisibility;
        });        
    };
    $scope.newAttributeElement = function(){
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('Administration/DynamicAttributeElementCard', {
            dynamicAttributeId: $scope.params.dynamicAttributeId,
            createDynamicAttributeElementCallback: createDynamicAttributeElementCallback,
            closeCallback: closeDynamicAttributeElementCardCallback
        }, 'PERMISSION_SETTINGS_CLIENT_DYNAMICATTRIBUTES');
    };

    $scope.selectAttributeElement = function(selectedAttributeElement){
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('Administration/DynamicAttributeElementCard', {
            dynamicAttributeElementId: selectedAttributeElement._id,
            saveDynamicAttributeElementCallback: saveDynamicAttributeElementCallback,
            deleteDynamicAttributeElementCallback: deleteDynamicAttributeElementCallback,
            closeCallback: closeDynamicAttributeElementCardCallback
        }, 'PERMISSION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function() {
            $scope.selectedElement = selectedAttributeElement;
        });
    };

    $scope.types = [ 'text', 'boolean', 'picklist' ];

    $scope.languages = $rootScope.languages;

    //Loads dynamicAttribute details or prepares for an empty dialog for a new dynamicAttribute
    //Params:
    //... 
    // - $scope.params.createDynamicAttributeCallback : Callback function when a new attribute was created. Gets the attribute as parameter
    // - $scope.params.saveDynamicAttributeCallback : Callback function when an existing attribute was saved. Gets the updated attribute as parameter
    // - $scope.params.deletDynamicAttributeCallback : Callback function when an existing attribute was deleted. No parameters
    // - $scope.params.closeDynamicAttributeCallback : Callback function when the card gets closed via button. No parameters
    //
    $scope.load = function(){
        $rootScope.isLoading=true;
        //Switch between creation of a new dynamicAttribute and loading of an existing one
        if($scope.params.dynamicAttributeId){
            //Existing dynamicAttribute
            $http.get('/api/dynamicattributes/' + $scope.params.dynamicAttributeId).then(function(response){
                $scope.isNewAttribute = false;
                var completeAttribute = response.data;
                $scope.dynamicattribute = completeAttribute;
                $scope.attributeName = completeAttribute.name_en; 
                $scope.attributeType = completeAttribute.type;
                $scope.attributeVisibility = completeAttribute.isVisible;
                if ($scope.attributeType === 'picklist') {
                    $http.get('/api/dynamicattributes/options/' + $scope.params.dynamicAttributeId).then(function(attributeOptionsFromDataBank){
                        $scope.elements = attributeOptionsFromDataBank.data;
                    }); 
                }$rootScope.isLoading=false;
            });
        } else {
            //new dynamicAttribute
            $scope.isNewAttribute = true;
            $scope.dynamicattribute = {type: $scope.types[0]};
            $scope.languages.forEach(function(language) {
                $scope.dynamicattribute['name_' + language] = '';
                $rootScope.isLoading=false;
            });
        }
        // Check the permissions for the details page for handling button visibility
        $scope.canWriteDynamicAttributes = $rootScope.canWrite('PERMISSION_SETTINGS_CLIENT_DYNAMICATTRIBUTES');
    };

    $scope.load();

});