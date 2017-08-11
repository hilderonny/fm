app.controller('CRMBPAddressCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {

    $scope.createBPAddress = function() {
        var BPAddressToSend = {
            partnerId: $scope.params.partnerId,
            addressee: $scope.partnerAddress.addressee,
            street:$scope.partnerAddress.street,
            postcode:$scope.partnerAddress.postcode,
            city:$scope.partnerAddress.city,
            type:$scope.partnerAddress.type 
        };
        $http.post('/api/partneraddresses', BPAddressToSend).then(function(response) {
            var createdPartnerAddress = response.data;           
            $scope.partnerAddress._id = createdPartnerAddress._id;
            $scope.addressAddressee = $scope.partnerAddress.addressee;
            $scope.isNewAddress = false;
            if ($scope.params.createBPAddressCallback) {
                $scope.params.createBPAddressCallback(createdPartnerAddress);
            }
            $translate(['TRK_BUSINESSPARTNERS_ADDRESS_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_BUSINESSPARTNERS_ADDRESS_CREATED).hideDelay(1000).position('bottom right'));
            });
        });
    }

    $scope.saveBPAddress = function(){
        var BPAddressToSend = {            
            addressee: $scope.partnerAddress.addressee,
            street:$scope.partnerAddress.street,
            postcode:$scope.partnerAddress.postcode,
            city:$scope.partnerAddress.city,
            type:$scope.partnerAddress.type 
        }; 
        utils.saveEntity($scope, 'partneraddresses', $scope.partnerAddress._id, '/api/partneraddresses/', BPAddressToSend).then(function(savedpartnerAddress) {
            $scope.addressAddressee = $scope.partnerAddress.addressee;
            if($scope.params.saveBPAddressCallback){
                $scope.params.saveBPAddressCallback(savedpartnerAddress);
            }
            $translate(['TRK_BUSINESSPARTNERS_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_BUSINESSPARTNERS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });            
        });
    }

    $scope.deleteBPAddress = function(){
        // confirming the deletion process
        $translate (['TRK_BUSINESSPARTNERS_ADDRESS_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations){
            $translate('TRK_BUSINESSPARTNERS_REALLY_DELETE_ADDRESS', {addressAddressee: $scope.addressAddressee}).then(function(TRK_BUSINESSPARTNERS_REALLY_DELETE_ADDRESS){
                var confirm = $mdDialog.confirm()
                .title(TRK_BUSINESSPARTNERS_REALLY_DELETE_ADDRESS)
                .ok(translations.TRK_YES)
                .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function(){
                    $http.delete('/api/partneraddresses/'+ $scope.partnerAddress._id).then(function(response){
                        if ($scope.params.deleteBPAddressCallback) {
                            $scope.params.deleteBPAddressCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_BUSINESSPARTNERS_ADDRESS_DELETED).hideDelay(1000).position('bottom right'));

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

    $scope.addressTypes = ['Primaryaddress','Postaddress','Delivaryaddress','Billaddress'];

    $scope.load = function(){
        if($scope.params.partnerAddressId){
            $http.get('/api/partneraddresses/' + $scope.params.partnerAddressId).then(function(response){               
                var completePartnerAddress = response.data;               
                $scope.partnerAddress = completePartnerAddress;              
                $scope.isNewAddress = false;
                $scope.addressAddressee = $scope.partnerAddress.addressee;
                utils.loadDynamicAttributes($scope, 'partneraddresses', $scope.params.partnerAddressId);
            });
        }else {
            $scope.isNewAddress = true;
            $scope.partnerAddress = { addressee:'', street:'', postcode: '', city: '', type: $scope.addressTypes[0] };
        }
    };

    $scope.load();

});
