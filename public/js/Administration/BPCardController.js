app.controller('AdministrationBPCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translate, utils) {


    $scope.createPartner = function(){
        var sendpartner={
            name: $scope.partner.name
        };

        $http.post('/api/busniesspartner', sendpartner).then(function(response){
            var createdPartner= response.data;
            $scope.isNewPartner=false;
            $scope.partner._id = createdPartner._id;
            $scope.partnerName= $scope.partner.name;
            if ($scope.params.createBPCallback) {
            $scope.params.createBPCallback(createdPartner);
            }

        });
         $translate(['TRK_BP_CLIENTCREATED']).then(function(translations) {
         $mdToast.show($mdToast.simple().textContent(translations.TRK_BP_CLIENTCREATED).hideDelay(1000).position('bottom right'));
            });           
    };


    //save changes 

    $scope.savePartner= function(){
        var sendpartner = {
             name: $scope.partner.name
        };        
        $http.put('/api/busniesspartner/'+ $scope.partner._id, sendpartner).then(function(response){

            var savedPartner= response.data;
            $scope.partnerName= $scope.partner.name;
            if($scope.params.saveBPCallback){
                $scope.params.saveBPCallback(savedPartner);
            }
            $translate(['TRK_BP_CHANGESSAVED']).then(function(translations){
                $mdToast.show($mdToast.simple().textContent(translations.TRK_BP_CHANGESSAVED).hideDelay(1000).position('bottom right'));
            });
        });        
    };

    // Deleting existing partner
    $scope.deletePartner = function(){
         // confirming the deletion process
          $translate (['TRK_BP_BPDELETED', 'YES', 'NO']).then(function(translations){
              $translate('TRK_BP_REALLYDELETEPARTNER', {partnerName: $scope.partnerName}).then(function(TRK_BP_REALLYDELETEPARTNER){
                var confirm = $mdDialog.confirm()
                .title(TRK_BP_REALLYDELETEPARTNER)
                .ok(translations.YES)
                .cancel(translations.NO);
                $mdDialog.show(confirm).then(function(){
                    $http.delete('/api/busniesspartner/'+ $scope.partner._id).then(function(response){
                        if ($scope.params.deleteBPCallback) {
                            $scope.params.deleteBPCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_BP_BPDELETED).hideDelay(1000).position('bottom right'));

                    });
                });
              });
          });
    };

//
var createBPAddressCallback = function(createdPartnerAddress){
  $scope.partnerAddresses.push(createdPartnerAddress);
};

var saveBPAddressCallback= function(savedPartnerAddress){
    $scope.selectedBPAddress.street = savedPartnerAddress.street;
    $scope.selectedBPAddress.postcode = savedPartnerAddress.postcode;
    $scope.selectedBPAddress.city = savedPartnerAddress.city;
    $scope.selectedBPAddress.type = savedPartnerAddress.type;
    $scope.selectedBPAddress.icon = getIconForType(savedPartnerAddress.type);

};
var deleteBPAddressCallback = function(){
    for (var i = 0; i < $scope.partnerAddresses.length; i++) {
            var clientModule = $scope.partnerAddresses[i];
            if (clientModule._id === $scope.selectedBPAddress._id) {
                $scope.partnerAddresses.splice(i, 1);
                $scope.selectedBPAddress = false;
                break;
            }
        }
};
 // Showing address details by clicking on specific address
 $scope.selectBPAddress= function(selectedBPAddress) {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/BPAddressCard', {
            partnerAddressId: selectedBPAddress._id,
            saveBPAddressCallback: saveBPAddressCallback,
            deleteBPAddressCallback: deleteBPAddressCallback,        
            closeCallback: closeBPAddressCardCallback
        });
        $scope.selectedBPAddress = selectedBPAddress;
    };

    var closeBPAddressCardCallback = function() {
        $scope.selectedBPAddress = false;
    };

// Clicking on add address opens a new card to assign new address to the current partner
$scope.addAddress = function(){
    utils.removeCardsToTheRightOf($element);
    utils.addCard('Administration/BPAddressCard',{
    partnerId: $scope.partner._id,
    createBPAddressCallback: createBPAddressCallback
        
    });
};
 
    // Client clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    }; 

   var getIconForType = function(addresstype) {
       console.log(addresstype);
        if ( addresstype == "Primaryaddress"){

             return "drafts/icons/Rating.svg";

        }
        else if( addresstype == "Postaddress")
        {
            return "drafts/icons/Post Office.svg";
        }
        else if( addresstype == "Delivaryaddress")
        {
            return "drafts/icons/Truck.svg";
        }
        else if( addresstype == "Billaddress")
        {
            return "drafts/icons/Purchase Order.svg";
        }

    }

$scope.load = function(){

    if($scope.params.partnerId)
    {
        $http.get('/api/busniesspartner/' + $scope.params.partnerId +'?fields = id+name')
.then(function(partnerResponse){
    var completePartner=partnerResponse.data;
    $scope.isNewPartner=false;
    $scope.partner= completePartner;
    $scope.partnerName =completePartner.name;    
   $http.get('/api/partneraddress?partnerId=' + $scope.partner._id).then(function(partnerAddressResponse){
        $scope.partnerAddresses = partnerAddressResponse.data;
        $scope.partnerAddresses.forEach(function(addr) {
           addr.icon = getIconForType(addr.type);
       });

    });     
});
    }else{
        $scope.isNewPartner = true;
        $scope.partner = {name:""};
        $scope.partnerAddresses =[];           
    }    
};
  $scope.load();         
  
});

