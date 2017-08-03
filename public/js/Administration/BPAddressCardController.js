app.controller('AdministrationBPAddressCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translate, utils) {

 // Click on Create-button to create a new address
    $scope.createBPAddress = function() {
        var BPAddressToSend = {
            partnerId: $scope.params.partnerId,
            description: $scope.partnerAddress.description,
            street:$scope.partnerAddress.street,
            postcode:$scope.partnerAddress.postcode,
            city:$scope.partnerAddress.city,
            type:$scope.partnerAddress.type 
        };
        $http.post('/api/partneraddress', BPAddressToSend).then(function(response) {
            var createdPartnerAddress = response.data;           
            $scope.partnerAddress._id = createdPartnerAddress._id;
            $scope.isNewAddress = false;
            if ($scope.params.createBPAddressCallback) {
                $scope.params.createBPAddressCallback(createdPartnerAddress);
            }
            $translate(['TRK_BP_BP_ADDRESS_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_BP_BP_ADDRESS_CREATED).hideDelay(1000).position('bottom right'));
            });
        });
    }

    $scope.saveBPAddress = function(){
        var BPAddressToSend = {            
            description: $scope.partnerAddress.description,
            street:$scope.partnerAddress.street,
            postcode:$scope.partnerAddress.postcode,
            city:$scope.partnerAddress.city,
            type:$scope.partnerAddress.type 
        }; 
        $http.put('/api/partneraddress/'+$scope.partnerAddress._id, BPAddressToSend).then(function(response){
            var savedpartnerAddress = response.data;
            if($scope.params.saveBPAddressCallback){
                $scope.params.saveBPAddressCallback(savedpartnerAddress);
            }
            $translate(['TRK_BP_CHANGESSAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_BP_CHANGESSAVED).hideDelay(1000).position('bottom right'));
            });            
        });
    }

    $scope.deleteBPAddress = function(){
        // confirming the deletion process
          $translate (['TRK_BP_BP_ADDRESS_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations){
              $translate('TRK_BP_REALLY_DELETE_BP_ADDRESS', {partnerAddress: $scope.partnerAddress}).then(function(TRK_BP_REALLY_DELETE_BP_ADDRESS){
                var confirm = $mdDialog.confirm()
                .title(TRK_BP_REALLY_DELETE_BP_ADDRESS)
                .ok(translations.TRK_YES)
                .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function(){
                    $http.delete('/api/partneraddress/'+ $scope.partnerAddress._id).then(function(response){
                        if ($scope.params.deleteBPAddressCallback) {
                            $scope.params.deleteBPAddressCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_BP_BP_ADDRESS_DELETED).hideDelay(1000).position('bottom right'));

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
        $scope.addressTypes = ['Primaryaddress','Postaddress','Delivaryaddress','Billaddress'];
       if($scope.params.partnerAddressId){
           $http.get('/api/partneraddress/' + $scope.params.partnerAddressId).then(function(response){               
               var completePartnerAddress = response.data;               
               $scope.partnerAddress = completePartnerAddress;              
               $scope.isNewAddress = false;
           });
       }else {
           $scope.isNewAddress = true;
           $scope.partnerAddresses = [];             
           $scope.partnerAddress = {
           type: $scope.addressTypes[0]
         };
       }
   };
    $scope.load();

});
