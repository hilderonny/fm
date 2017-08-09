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
            dynamicAttributeId: $scope.params.dynamicAttributeId
        };
        Object.keys($scope.attributeelement).forEach(function(key) {
            if (key.indexOf('text_') === 0) {
                optionToSend[key] = $scope.attributeelement[key];
            }
        });
        $http.post('/api/dynamicattributes/option', optionToSend).then(function successCallback(response) {
            var createdElement = response.data;
            $scope.isNewElement = false;
            $scope.attributeelement._id = createdElement._id;
            $scope.elementText = createdElement.text_en;
            if ($scope.params.createDynamicAttributeElementCallback) {
                $scope.params.createDynamicAttributeElementCallback(createdElement);
            }
            $translate(['TRK_DYNAMICATTRIBUTES_ATTRIBUTEELEMENT_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_DYNAMICATTRIBUTES_ATTRIBUTEELEMENT_CREATED).hideDelay(1000).position('bottom right'));
            });
        });
    };

    $scope.saveAttributeElement = function(){
        var elementToSend = { };
        Object.keys($scope.attributeelement).forEach(function(key) {
            if (key.indexOf('text_') === 0) {
                elementToSend[key] = $scope.attributeelement[key];
            }
        });
        $http.put('/api/dynamicattributes/option/' + $scope.params.dynamicAttributeElementId, elementToSend).then(function(response) {
            var savedAttributeElement = response.data;
            $scope.elementText = $scope.attributeelement.text_en;
            if ($scope.params.saveDynamicAttributeElementCallback) {
                $scope.params.saveDynamicAttributeElementCallback(savedAttributeElement);
            }
            $translate(['TRK_DYNAMICATTRIBUTES_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_DYNAMICATTRIBUTES_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });
        });
    };

    $scope.deleteAttributeElement = function(){
        $translate(['TRK_DYNAMICATTRIBUTES_ATTRIBUTEELEMENT_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations) {
            $translate('TRK_DYNAMICATTRIBUTES_REALLY_DELETE_ATTRIBUTEELEMENT', { elementText: $scope.elementText }).then(function(TRK_DYNAMICATTRIBUTES_REALLY_DELETE_ATTRIBUTEELEMENT) {
                var confirm = $mdDialog.confirm()
                    .title(TRK_DYNAMICATTRIBUTES_REALLY_DELETE_ATTRIBUTEELEMENT)
                    .ok(translations.TRK_YES)
                    .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function() {
                    $http.delete('/api/dynamicattributes/option/' + $scope.params.dynamicAttributeElementId).then(function(response) {
                        if ($scope.params.deleteDynamicAttributeElementCallback) {
                            $scope.params.deleteDynamicAttributeElementCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_DYNAMICATTRIBUTES_ATTRIBUTEELEMENT_DELETED).hideDelay(1000).position('bottom right'));
                    });
                });
            });
        });
    };

    $scope.languages = $rootScope.languages;

    $scope.load = function() {
        //Switch between creation of a new attribute option (element) and loading of an existing one
        if($scope.params.dynamicAttributeElementId){
            //Existing attribute option/element
            $scope.isNewElement = false;
            $http.get('/api/dynamicattributes/option/' + $scope.params.dynamicAttributeElementId).then(function(attributeOptionFromDataBank){
                $scope.attributeelement = attributeOptionFromDataBank.data;
                $scope.elementText = $scope.attributeelement.text_en; 
            });
        } else {
            $scope.isNewElement = true;
            $scope.attributeelement = { };
            $scope.languages.forEach(function(language) {
                $scope.attributeelement['text_' + language] = '';
            });
        }
        // Check the permissions for the details page for handling button visibility
        $scope.canWriteDynamicAttributes = $rootScope.canWrite('PERMISSION_SETTINGS_CLIENT_DYNAMICATTRIBUTES');
    };

    $scope.load();

});