app.controller('CRMPersonListCardController', function($scope, $http, $mdDialog, $element,$translate, utils){


var savePersonCallback = function(savedPerson) {
        $scope.selectedPerson.lastname = savedPerson.lastname;
        $scope.selectedPerson.firstname = savedPerson.firstname;
    };

var  deletePersonCallback = function() {
    for(var i= 0; i< $scope.persons.length; i++){
        var person = $scope.persons[i];
        if(person._id ===$scope.selectedPerson._id){
            $scope.persons.splice(i,1);
            $scope.selectedPerson = false;
            break;
        }
    }        
};   

var createPersonCallback = function(createdPerson) {    
    $scope.persons.push(createdPerson);
    $scope.selectPerson(createdPerson);
};

var closePersonCardCallback = function(){
    $scope.selectedPerson = false;
    
};

$scope.newPerson = function(){
    utils.removeCardsToTheRightOf($element);  
    utils.addCard('Administration/PersonCard',{
        createPersonCallback: createPersonCallback,
        savePersonCallback: savePersonCallback,
        deletePersonCallback: deletePersonCallback,
        closeCallback: closePersonCardCallback   
    
   });
    }

 // Click on client in client list shows client details
    $scope.selectPerson = function(selectedPerson) {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/PersonCard', {
            personId: selectedPerson._id,
            savePersonCallback: savePersonCallback,
            deletePersonCallback: deletePersonCallback,
            closeCallback: closePersonCardCallback   
        });
        $scope.selectedPerson = selectedPerson;
    }

$scope.load = function(){
    $scope.selectedPerson = false; 
    //retrieve data from db
   $http.get('/api/persons?fields=_id+firstname+lastname').then(function(response){
       $scope.persons = response.data;   
        if ($scope.params.selectedPersonId) {
                for (var i = 0; i < $scope.persons.length; i++) {
                    var person= $scope.persons[i];
                    if (person._id === $scope.params.selectedPersonId) {
                        $scope.selectedPerson = person;
                        break;
                    }
                }
            }

    });
}
     $scope.load();
});