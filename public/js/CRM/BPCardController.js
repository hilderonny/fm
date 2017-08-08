app.controller('CRMBPCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {

    $scope.createPartner = function(){
        var sendpartner={
            name: $scope.partner.name,
            industry: $scope.partner.industry,
            rolle: $scope.partner.rolle,
            isJuristic: $scope.partner.isJuristic
        };
        $http.post('/api/businesspartners', sendpartner).then(function(response){
            var createdPartner = response.data;
            $scope.isNewPartner = false;
            $scope.partner._id = createdPartner._id;
            $scope.partnerName = $scope.partner.name;
            $scope.relationsEntity = { type:'businesspartners', id:createdPartner._id };
            if ($scope.params.createBPCallback) {
                $scope.params.createBPCallback(createdPartner);
            }
            $translate(['TRK_BUSINESSPARTNERS_BUSINESSPARTNER_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_BUSINESSPARTNERS_BUSINESSPARTNER_CREATED).hideDelay(1000).position('bottom right'));
            });           
            utils.setLocation('/businesspartners/' + createdPartner._id);
        });
    };

    $scope.savePartner= function(){
        var sendpartner = {
             name: $scope.partner.name,
             industry: $scope.partner.industry,
             rolle: $scope.partner.rolle,
             isJuristic: $scope.partner.isJuristic
        };        
        $http.put('/api/businesspartners/'+ $scope.partner._id, sendpartner).then(function(response){
            var savedPartner = response.data;
            $scope.partnerName = $scope.partner.name;
            if($scope.params.saveBPCallback){
                $scope.params.saveBPCallback(savedPartner);
            }
            $translate(['TRK_BUSINESSPARTNERS_CHANGES_SAVED']).then(function(translations){
                $mdToast.show($mdToast.simple().textContent(translations.TRK_BUSINESSPARTNERS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });
        });        
    };

    // Deleting existing partner
    $scope.deletePartner = function(){
         // confirming the deletion process
          $translate (['TRK_BUSINESSPARTNERS_BUSINESSPARTNER_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations){
              $translate('TRK_BUSINESSPARTNERS_REALLY_DELETE_BUSINESSPARTNER', {partnerName: $scope.partnerName}).then(function(TRK_BUSINESSPARTNERS_REALLY_DELETE_BUSINESSPARTNER){
                var confirm = $mdDialog.confirm()
                .title(TRK_BUSINESSPARTNERS_REALLY_DELETE_BUSINESSPARTNER)
                .ok(translations.TRK_YES)
                .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function(){
                    $http.delete('/api/businesspartners/'+ $scope.partner._id).then(function(response){
                        if ($scope.params.deleteBPCallback) {
                            $scope.params.deleteBPCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_BUSINESSPARTNERS_BUSINESSPARTNER_DELETED).hideDelay(1000).position('bottom right'));

                    });
                });
              });
          });
    };

    var createBPAddressCallback = function(createdPartnerAddress){
        $scope.partner.partnerAddresses.push(createdPartnerAddress);
        $scope.selectBPAddress(createdPartnerAddress);  
    };
    var saveBPAddressCallback= function(savedPartnerAddress){
        $scope.selectedBPAddress.street = savedPartnerAddress.street;
        $scope.selectedBPAddress.postcode = savedPartnerAddress.postcode;
        $scope.selectedBPAddress.city = savedPartnerAddress.city;
        $scope.selectedBPAddress.type = savedPartnerAddress.type;
    };
    var deleteBPAddressCallback = function() {
        $scope.partner.partnerAddresses.splice($scope.partner.partnerAddresses.indexOf($scope.selectedBPAddress), 1);
        closeBPAddressCardCallback();
    };
    var closeBPAddressCardCallback = function() {
        $scope.selectedBPAddress = null;
        utils.setLocation('/businesspartners/' + $scope.partner._id);
    };

    $scope.selectBPAddress = function(selectedBPAddress) {
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('CRM/BPAddressCard', {
            partnerAddressId: selectedBPAddress._id,
            saveBPAddressCallback: saveBPAddressCallback,
            deleteBPAddressCallback: deleteBPAddressCallback,        
            closeCallback: closeBPAddressCardCallback
        }, 'PERMISSION_CRM_BUSINESSPARTNERS').then(function() {
            $scope.selectedBPAddress = selectedBPAddress;
        });
    };

    // Clicking on add address opens a new card to assign new address to the current partner
    $scope.addAddress = function(){
        $scope.selectedBPAddress = null;
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('CRM/BPAddressCard',{
            partnerId: $scope.partner._id,
            createBPAddressCallback: createBPAddressCallback,
            closeCallback: closeBPAddressCardCallback
        }, 'PERMISSION_CRM_BUSINESSPARTNERS');
    };

    $scope.typeIcons = {
        'Primaryaddress' : 'drafts/icons/Rating.svg',
        'Postaddress': 'drafts/icons/Post Office.svg',
        'Delivaryaddress': 'drafts/icons/Truck.svg',
        'Billaddress': 'drafts/icons/Purchase Order.svg'
    }

    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    }; 

    $scope.load = function() {
        if($scope.params.partnerId)
        {
            $http.get('/api/businesspartners/' + $scope.params.partnerId).then(function(partnerResponse) {
                var completePartner = partnerResponse.data;
                $scope.isNewPartner = false;
                $scope.partner = completePartner;
                $scope.partnerName = completePartner.name;    
                $scope.relationsEntity = {type:'businesspartners', id:completePartner._id };
                $http.get('/api/partneraddresses?partnerId=' + completePartner._id).then(function(partnerAddressResponse){
                    completePartner.partnerAddresses = partnerAddressResponse.data;
                    utils.setLocation('/businesspartners/' + $scope.params.partnerId);
                });     
            });
        }else{
            $scope.isNewPartner = true;
            $scope.partner = { name: "", industry: "", isJuristic: false, rolle: "", partnerAddresses: [] };
        }    
        // Check the permissions for the details page for handling button visibility
        $scope.canWriteBusinessPartnerDetails = $rootScope.canWrite('PERMISSION_CRM_BUSINESSPARTNERS');
    };

    $scope.load();         
  
});

