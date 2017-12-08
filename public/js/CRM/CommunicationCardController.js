app.controller('CRMCommunicationCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {

    $scope.createCommunication = function() {
        $rootScope.isLoading = true;
        var CommToSend = {
            personId: $scope.params.personId,
            contact: $scope.communication.contact,
            selectedMediumName:$scope.communication.selectedMedium.name,
            selectedTypeName:$scope.communication.selectedType.name
        };
        $http.post('/api/communications', CommToSend).then(function(response) {
            var createdCommunication = response.data;           
            $scope.communication._id =createdCommunication._id;
            $scope.contact = $scope.communication.contact;
            $scope.isNewComm = false;
            if ($scope.params.createCommunicationCallback) {
                $scope.params.createCommunicationCallback(createdCommunication);
            }
            $translate(['TRK_PERSONS_PERSON_COMMUNICATION_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_PERSONS_PERSON_COMMUNICATION_CREATED).hideDelay(1000).position('bottom right'));
            });
            $rootScope.isLoading = false;
        });
    }

    $scope.saveCommunication = function(){
        $rootScope.isLoading = true;
        var CommToSend = {            
            contact: $scope.communication.contact,
            selectedMediumName:$scope.communication.selectedMedium.name,
            selectedTypeName:$scope.communication.selectedType.name
        }; 
        utils.saveEntity($scope, 'communications', $scope.communication._id, '/api/communications/', CommToSend).then(function(savedCommunication) {
            $scope.contact = $scope.communication.contact;
            if($scope.params.saveCommunicationCallback){
                $scope.params.saveCommunicationCallback(savedCommunication);
            }
            $translate(['TRK_PERSONS_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_PERSONS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            }); 
            $rootScope.isLoading = false;           
        });
    };

    $scope.deleteCommunication = function(){
        // confirming the deletion process
        $translate (['TRK_PERSONS_PERSON_COMMUNICATION_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations){
            $translate('TRK_PERSONS_REALLY_DELETE_PERSON_COMMUNICATION', { selectedMediumName: $scope.communication.selectedMedium.name}).then(function(TRK_PERSONS_REALLY_DELETE_PERSON_COMMUNICATION){
                var confirm = $mdDialog.confirm()
                .title(TRK_PERSONS_REALLY_DELETE_PERSON_COMMUNICATION)
                .ok(translations.TRK_YES)
                .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function(){
                    $rootScope.isLoading = true;
                    $http.delete('/api/communications/'+ $scope.communication._id).then(function(response){
                        if ($scope.params.deleteCommunicationCallback) {
                            $scope.params.deleteCommunicationCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_PERSONS_PERSON_COMMUNICATION_DELETED).hideDelay(1000).position('bottom right'));
                        $rootScope.isLoading = false;
                    });
                });
            });
        });
    };

    // Permission clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    $scope.communicationMediums = [
        {
            name: 'phone',
            types: [
                { name: 'work' },
                { name: 'mobile' },
                { name: 'other' },
            ]
        },
        {
            name: 'email',
            types: [
                { name: 'work' },
                { name: 'other' }
            ]
        }
    ];

    $scope.load = function(){
        $rootScope.isLoading   = true;      
        $scope.$watch('communication.selectedMedium', function(newValue, oldValue){
            if ($scope.communication) $scope.communication.selectedType = $scope.communication.selectedMedium.types[0];
        });
        if($scope.params.communicationId){
            $http.get('/api/communications/' + $scope.params.communicationId).then(function(response){               
                $scope.communication = response.data;
                $scope.communication.selectedMedium = $scope.communicationMediums.find(function(medium) { return medium.name === $scope.communication.selectedMediumName; });
                $scope.communication.selectedType = $scope.communication.selectedMedium.types.find(function(type) { return type.name === $scope.communication.selectedTypeName; });
                $scope.isNewComm = false;     
                utils.loadDynamicAttributes($scope, 'communications', $scope.params.communicationId);
                $rootScope.isLoading=false;
            });           
        }else {
            $scope.isNewComm = true;    
            $scope.communication = { selectedMedium: $scope.communicationMediums[0], selectedType: $scope.communicationMediums[0].types[0], contact: ''};
            $rootScope.isLoading=false;
        };
        // Check the permissions for the details page for handling button visibility
        $scope.canWritePersons = $rootScope.canWrite('PERMISSION_CRM_PERSONS');
    };

    $scope.load();
    
});
