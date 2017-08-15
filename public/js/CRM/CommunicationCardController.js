app.controller('CRMCommunicationCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translate, utils) {

// Click on Create-button to create a new address
    $scope.createCommunication = function() {
        var CommToSend = {
            personId: $scope.params.personId,
            contact: $scope.communication.contact,
            selectedMediumName:$scope.communication.selectedMedium.name,
            selectedTypeName:$scope.communication.selectedType.name
        };
        $http.post('/api/communications', CommToSend).then(function(response) {
            var createdCommunication = response.data;           
            $scope.communication._id =createdCommunication._id;
            $scope.isNewComm = false;
            if ($scope.params.createCommunicationCallback) {
                $scope.params.createCommunicationCallback(createdCommunication);
            }
            $translate(['TRK_PERSONS_PERSON_COMM_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_PERSONS_PERSON_COMM_CREATED).hideDelay(1000).position('bottom right'));
            });
        });
    }

    $scope.saveCommunication = function(){
        var CommToSend = {            
            contact: $scope.communication.contact,
            selectedMediumName:$scope.communication.selectedMedium.name,
            selectedTypeName:$scope.communication.selectedType.name
        }; 
        $http.put('/api/communications/'+$scope.communication._id,CommToSend).then(function(response){
            var savedCommunication = response.data;            
            if($scope.params.saveCommunicationCallback){
                $scope.params.saveCommunicationCallback(savedCommunication);
            }
            $translate(['TRK_PERSONS_CHANGESSAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_PERSONS_CHANGESSAVED).hideDelay(1000).position('bottom right'));
            });            
        });
    }

   $scope.deleteCommunication = function(){
       // confirming the deletion process
          $translate (['TRK_PERSONS_PERSON_COMM_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations){
              $translate('TRK_PERSONS_REALLY_DELETE_PERSON_COMM', { selectedMediumName: $scope.communication.selectedMedium.name}).then(function(TRK_PERSONS_REALLY_DELETE_PERSON_COMM){
                var confirm = $mdDialog.confirm()
                .title(TRK_PERSONS_REALLY_DELETE_PERSON_COMM)
                .ok(translations.TRK_YES)
                .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function(){
                    $http.delete('/api/communications/'+ $scope.communication._id).then(function(response){
                        if ($scope.params.deleteCommunicationCallback) {
                            $scope.params.deleteCommunicationCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_PERSONS_PERSON_COMM_DELETED).hideDelay(1000).position('bottom right'));

                    });
                });
              });
          });
    }

    // Permission clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    }

   $scope.load = function(){
     $scope.communicationMediums = [
         {
             name: 'PHONE',
             types: [
                 { name: 'WORK' },
                 { name: 'MOBILE' },
                 { name: 'OTHER' },
             ]
         },
         {
             name: 'EMAIL',
             types: [
                 { name: 'WORK' },
                 { name: 'OTHER' }
             ]
         }
     ];
        $scope.$watch('communication.selectedMedium', function(newValue, oldValue){
            console.log('HIER');
            if ($scope.communication) $scope.communication.selectedType = $scope.communication.selectedMedium.types[0];
        });
       if($scope.params.communicationId){
           $http.get('/api/communications/' + $scope.params.communicationId).then(function(response){               
              $scope.communication = response.data;
              $scope.communication.selectedMedium = $scope.communicationMediums.find(function(medium) { return medium.name === $scope.communication.selectedMediumName; });
              $scope.communication.selectedType = $scope.communication.selectedMedium.types.find(function(type) { 
                  return type.name === $scope.communication.selectedTypeName; 
                });

               $scope.isNewComm = false;     
           });           
       }else {
           $scope.isNewComm = true;    
           $scope.communication = {
                    selectedMedium: $scope.communicationMediums[0],
                    selectedType: $scope.communicationMediums[0].types[0],
                    contact: ""                
         };
       };
   };
    $scope.load();
});
