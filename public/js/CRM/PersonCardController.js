app.controller('CRMPersonCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translate, utils) {


    $scope.createPerson = function(){
        var sendperson={
            firstname: $scope.person.firstname,
            lastname:  $scope.person.lastname,
            description: $scope.person.description           
        };

        $http.post('/api/persons', sendperson).then(function(response){
            var createdPerson= response.data;
            $scope.isNewperson=false;
            $scope.person._id = createdPerson._id;
            $scope.personFirstname= $scope.person.firstname;
            $scope.personLastname= $scope.person.lastname;
            $scope.relationsEntity = { type:'persons', id:createdPerson._id };
            if ($scope.params.createPersonCallback) {
            $scope.params.createPersonCallback(createdPerson);
            }

        });
         $translate(['TRK_PERSONS_PERSON_CREATED']).then(function(translations) {
         $mdToast.show($mdToast.simple().textContent(translations.TRK_PERSONS_PERSON_CREATED).hideDelay(1000).position('bottom right'));
            });           
    };


    //save changes 

    $scope.savePerson= function(){
        var sendperson={
            firstname: $scope.person.firstname,
            lastname:  $scope.person.lastname,
            description: $scope.person.description           
        };       
        $http.put('/api/persons/'+ $scope.person._id, sendperson).then(function(response){

            var savedPerson= response.data;
            $scope.personFirstname= $scope.person.firstname;
            $scope.personLastname= $scope.person.lastname;
            if($scope.params.savePersonCallback){
                $scope.params.savePersonCallback(savedPerson);
            }
            $translate(['TRK_PERSONS_CHANGESSAVED']).then(function(translations){
                $mdToast.show($mdToast.simple().textContent(translations.TRK_PERSONS_CHANGESSAVED).hideDelay(1000).position('bottom right'));
            });
        });        
    };

    // Deleting existing partner
    $scope.deletePerson = function(){
         // confirming the deletion process
          $translate (['TRK_PERSONS_PERSON_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations){
              $translate('TRK_PERSONS_REALLYDELETEPERSON', {personLastname: $scope.personLastname, personFirstname: $scope.personFirstname}).then(function(TRK_PERSONS_REALLYDELETEPERSON){
                var confirm = $mdDialog.confirm()
                .title(TRK_PERSONS_REALLYDELETEPERSON)
                .ok(translations.TRK_YES)
                .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function(){
                    $http.delete('/api/persons/'+ $scope.person._id).then(function(response){
                        if ($scope.params.deletePersonCallback) {
                            $scope.params.deletePersonCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_PERSONS_PERSON_DELETED).hideDelay(1000).position('bottom right'));

                    });
                });
              });
          });
    };


    //*******Communication Mediums *******/

   var createCommunicationCallback = function(createdCommunication){ 
       createdCommunication.icon = getIconForName(createdCommunication.selectedMediumName);
       $scope.communications.push(createdCommunication);
       $scope.selectCommunication(createdCommunication);  
};

var saveCommunicationCallback= function(savedCommunication){
    $scope.selectedCommunication.selectedMediumName = savedCommunication.selectedMediumName;
    $scope.selectedCommunication.selectedTypeName = savedCommunication.selectedTypeName;
    $scope.selectedCommunication.contact = savedCommunication.contact;
    $scope.selectedCommunication.icon = getIconForName(savedCommunication.selectedMediumName);

}; 

var deleteCommunicationCallback = function(){
    for (var i = 0; i < $scope.communications.length; i++) {
            var comm = $scope.communications[i];
            if (comm._id === $scope.selectedCommunication._id) {
                $scope.communications.splice(i, 1);
                $scope.selectedCommunication = false;
                break;
            }
        }   
};

 // Showing address details by clicking on specific address
 $scope.selectCommunication= function(selectedCommunication) {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/CommunicationCard', {
            communicationId: selectedCommunication._id,
            saveCommunicationCallback: saveCommunicationCallback,
            deleteCommunicationCallback: deleteCommunicationCallback,       
            closeCallback: closeCommunicationCardCallback
        });
        $scope.selectedCommunication = selectedCommunication;
    };



     var closeCommunicationCardCallback = function() {
        $scope.selectedCommunication = false;
    };
// Clicking on add communication opens a new card to assign new communication medium to the current person
$scope.addCommunication = function(){
    utils.removeCardsToTheRightOf($element);
    utils.addCard('Administration/CommunicationCard',{
    personId: $scope.person._id,
    createCommunicationCallback: createCommunicationCallback
        
    });
};
//******************************************************************/
 // Geitng address icon denpending on its type
 var getIconForName = function(commname) {
        if ( commname == "PHONE"){

             return "drafts/icons/Phone.svg";

        }
        else if( commname == "EMAIL")
        {
            return "drafts/icons/Email.svg";
        }
        
    };
    // Client clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    }; 

   

$scope.load = function(){

    if($scope.params.personId)
    {
       $http.get('/api/persons/' + $scope.params.personId +'?fields = id+lastname+firstname')
.then(function(personResponse){
    var completePerson=personResponse.data;
    $scope.isNewPerson=false;
    $scope.person= completePerson;
    $scope.personLastname =completePerson.lastname;
    $scope.personFirstname =completePerson.firstname; 
    $scope.relationsEntity = { type:'persons', id:completePerson._id };
    $http.get('/api/communications?personId='+$scope.person._id).then(function(CommunicationResponse){
        $scope.communications = CommunicationResponse.data;
        $scope.communications.forEach(function(comm) {
           comm.icon = getIconForName(comm.selectedMediumName);
       });

    }); 
});
    }else{
        $scope.isNewPerson = true;
        $scope.person = [];
        $scope.communications = [];
                
    } ;   
};
  $scope.load();         
  
});

