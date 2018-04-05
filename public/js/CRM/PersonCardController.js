app.controller('CRMPersonCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {

    $scope.createPerson = function(){
        $rootScope.isLoading = true;
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
            $scope.params.datatypename = 'persons';
            $scope.params.entityname = createdPerson._id;
            if ($scope.params.createPersonCallback) {
                $scope.params.createPersonCallback(createdPerson);
            }
            $translate(['TRK_PERSONS_PERSON_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_PERSONS_PERSON_CREATED).hideDelay(1000).position('bottom right'));
            });           
            utils.setLocation('/persons/' + createdPerson._id);
            $rootScope.isLoading = false;
        });
    };

    $scope.savePerson= function(){
        $rootScope.isLoading =true;
        var sendperson={
            firstname: $scope.person.firstname,
            lastname:  $scope.person.lastname,
            description: $scope.person.description           
        };       
        utils.saveEntity($scope, 'persons', $scope.person._id, '/api/persons/', sendperson).then(function(savedPerson) {
            $scope.personFirstname= $scope.person.firstname;
            $scope.personLastname= $scope.person.lastname;
            if($scope.params.savePersonCallback){
                $scope.params.savePersonCallback(savedPerson);
            }
            $translate(['TRK_PERSONS_CHANGES_SAVED']).then(function(translations){
                $mdToast.show($mdToast.simple().textContent(translations.TRK_PERSONS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
                $rootScope.isLoading = false;
            });
        });        
    };

    $scope.deletePerson = function(){
        // confirming the deletion process
        $translate (['TRK_PERSONS_PERSON_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations){
            $translate('TRK_PERSONS_REALLY_DELETE_PERSON', {personLastname: $scope.personLastname, personFirstname: $scope.personFirstname}).then(function(TRK_PERSONS_REALLY_DELETE_PERSON){
                var confirm = $mdDialog.confirm()
                .title(TRK_PERSONS_REALLY_DELETE_PERSON)
                .ok(translations.TRK_YES)
                .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function(){
                    $rootScope.isLoading = true;
                    $http.delete('/api/persons/'+ $scope.person._id).then(function(response){
                        if ($scope.params.deletePersonCallback) {
                            $scope.params.deletePersonCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_PERSONS_PERSON_DELETED).hideDelay(1000).position('bottom right'));
                        $rootScope.isLoading = false;
                    });
                });
            });
        });
    };

    var createCommunicationCallback = function(createdCommunication){ 
        $scope.communications.push(createdCommunication);
        $scope.selectCommunication(createdCommunication);  
    };
    var saveCommunicationCallback= function(savedCommunication){
        $scope.selectedCommunication.selectedMediumName = savedCommunication.selectedMediumName;
        $scope.selectedCommunication.selectedTypeName = savedCommunication.selectedTypeName;
        $scope.selectedCommunication.contact = savedCommunication.contact;
    }; 
    var deleteCommunicationCallback = function(){
        $scope.communications.splice($scope.communications.indexOf($scope.selectedCommunication), 1);
        closeCommunicationCardCallback();
    };
    var closeCommunicationCardCallback = function() {
        $scope.selectedCommunication = null;
        utils.setLocation('/persons/' + $scope.person._id);
    };

    $scope.selectCommunication= function(selectedCommunication) {
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('CRM/CommunicationCard', {
            communicationId: selectedCommunication._id,
            saveCommunicationCallback: saveCommunicationCallback,
            deleteCommunicationCallback: deleteCommunicationCallback,       
            closeCallback: closeCommunicationCardCallback
        }, 'PERMISSION_CRM_PERSONS').then(function() {
            $scope.selectedCommunication = selectedCommunication;
        });
    };

    $scope.addCommunication = function(){
        $scope.selectedCommunication = null;
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('CRM/CommunicationCard',{
            personId: $scope.person._id,
            createCommunicationCallback: createCommunicationCallback,
            closeCallback: closeCommunicationCardCallback
        }, 'PERMISSION_CRM_PERSONS');
    };

    $scope.mediumIcons = {
        'phone' : '/css/icons/material/Phone.svg',
        'email': '/css/icons/material/Email.svg'
    }; 

    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    }; 

    $scope.load = function(){
        $rootScope.isLoading=true;
        if($scope.params.personId) {
            $http.get('/api/persons/' + $scope.params.personId).then(function(personResponse){
                var completePerson=personResponse.data;
                $scope.isNewPerson=false;
                $scope.person= completePerson;
                $scope.personLastname =completePerson.lastname;
                $scope.personFirstname =completePerson.firstname; 
                $scope.params.datatypename = 'persons';
                $scope.params.entityname = completePerson._id;
                $http.get('/api/communications/forPerson/'+$scope.person._id).then(function(communicationResponse){
                    $scope.communications = communicationResponse.data;
                    utils.loadDynamicAttributes($scope, 'persons', $scope.params.personId);
                    utils.setLocation('/persons/' + $scope.params.personId);
                    $rootScope.isLoading=false;
                }); 
            });
        } else {
            $scope.isNewPerson = true;
            $scope.person = { firstname: '', lastname: '', description: '' };
            $scope.communications = [];
            $rootScope.isLoading=false;
        }   
        // Check the permissions for the details page for handling button visibility
        $scope.canWritePersons = $rootScope.canWrite('PERMISSION_CRM_PERSONS');
    };

    $scope.load();         
  
});

