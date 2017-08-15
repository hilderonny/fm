app.controller('CRMPersonListCardController', function($scope, $rootScope, $http, $mdDialog, $element,$translate, utils){


    var savePersonCallback = function(savedPerson) {
        $scope.selectedPerson.lastname = savedPerson.lastname;
        $scope.selectedPerson.firstname = savedPerson.firstname;
    };

    var  deletePersonCallback = function() {
        $scope.persons.splice($scope.persons.indexOf($scope.selectedPerson), 1);
        closePersonCardCallback();
    };   

    var createPersonCallback = function(createdPerson) {    
        $scope.persons.push(createdPerson);
        $scope.selectPerson(createdPerson);
    };

    var closePersonCardCallback = function(){
        $scope.selectedPerson = false;
        utils.setLocation('/persons');
    };

    $scope.newPerson = function(){
        $scope.selectedPerson = false;
        utils.removeCardsToTheRightOf($element);  
        utils.addCardWithPermission('CRM/PersonCard',{
            createPersonCallback: createPersonCallback,
            closeCallback: closePersonCardCallback   
        }, 'PERMISSION_CRM_PERSONS');
    }

    // Click on client in client list shows client details
    $scope.selectPerson = function(selectedPerson) {
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('CRM/PersonCard', {
            personId: selectedPerson._id,
            savePersonCallback: savePersonCallback,
            deletePersonCallback: deletePersonCallback,
            closeCallback: closePersonCardCallback   
        }, 'PERMISSION_CRM_PERSONS').then(function() {
            $scope.selectedPerson = selectedPerson;
        });
    }

    $scope.load = function(){
        $scope.selectedPerson = false; 
        $http.get('/api/persons').then(function(response){
            $scope.persons = response.data;   
            // Check the permissions for the details page for handling button visibility
            $scope.canWritePersons = $rootScope.canWrite('PERMISSION_CRM_PERSONS');
            // Check preselection
            utils.handlePreselection($scope, $scope.persons, $scope.selectPerson);
            if (!$scope.params.preselection) utils.setLocation('/persons');
        });
    };

     $scope.load();
});
    
app.directUrlMappings.persons = {
    mainMenu: 'TRK_MENU_CRM',
    subMenu: 'TRK_MENU_CRM_PERSONS'
};
