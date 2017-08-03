app.controller('AdministrationBPListCardController', function($scope, $http, $mdDialog, $element,$translate, utils){


var saveBPCallback = function(savedPartner) {
        $scope.selectedPartner.name = savedPartner.name;
    };

var  deleteBPCallback = function() {
    for(var i= 0; i< $scope.partners.length; i++){
        var partner = $scope.partners[i];
        if(partner._id ===$scope.selectedPartner._id){
            $scope.partners.splice(i,1);
            $scope.selectedPartner = false;
            break;
        }
    }        
};   

var createBPCallback = function(createdPartner) {
    $scope.partners.push(createdPartner);
    $scope.selectedPartner = createdPartner;
};

var closeBPCardCallback = function(){
    $scope.selectedPartner = false;
    
};

$scope.newBP = function(){
    utils.removeCardsToTheRightOf($element);  
    utils.addCard('Administration/BPCard',{
        createBPCallback: createBPCallback,
        saveBPCallback: saveBPCallback,
        deleteBPCallback: deleteBPCallback,
        closeCallback: closeBPCardCallback   
    
   });
    }

 // Click on client in client list shows client details
    $scope.selectPartner = function(selectedPartner) {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/BPCard', {
            partnerId: selectedPartner._id,
            saveBPCallback: saveBPCallback,
            deleteBPCallback: deleteBPCallback,
            closeCallback: closeBPCardCallback   
        });
        $scope.selectedPartner = selectedPartner;
    }

$scope.load = function(){
    $scope.selectedPartner= false;    
    //retrieve data from db
   $http.get('/api/busniesspartner?fields=_id+name').then(function(response){
       $scope.partners = response.data;   
        if ($scope.params.selectedPartnerId) {
                for (var i = 0; i < $scope.partners.length; i++) {
                    var partner = $scope.partners[i];
                    if (partner._id === $scope.params.selectedPartnerId) {
                        $scope.selectedPartner = partner;
                        break;
                    }
                }
            }

    });
}
     $scope.load();
});