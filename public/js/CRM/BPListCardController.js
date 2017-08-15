app.controller('CRMBPListCardController', function($scope, $rootScope, $http, $mdDialog, $element,$translate, utils){


    var saveBPCallback = function(savedPartner) {
        $scope.selectedPartner.name = savedPartner.name;
    };

    var  deleteBPCallback = function() {
        $scope.partners.splice($scope.partners.indexOf($scope.selectedPartner), 1);
        closeBPCardCallback();
    };   

    var createBPCallback = function(createdPartner) {
        $scope.partners.push(createdPartner);
        $scope.selectPartner(createdPartner);
    };

    var closeBPCardCallback = function(){
        $scope.selectedPartner = false;
        utils.setLocation('/businesspartners');
    };

    $scope.newBP = function(){
        $scope.selectedPartner = null;
        utils.removeCardsToTheRightOf($element);  
        utils.addCardWithPermission('CRM/BPCard',{
            createBPCallback: createBPCallback,
            closeCallback: closeBPCardCallback   
        }, 'PERMISSION_CRM_BUSINESSPARTNERS');
    }

    // Click on client in client list shows client details
    $scope.selectPartner = function(selectedPartner) {
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('CRM/BPCard', {
            partnerId: selectedPartner._id,
            saveBPCallback: saveBPCallback,
            deleteBPCallback: deleteBPCallback,
            closeCallback: closeBPCardCallback   
        }, 'PERMISSION_CRM_BUSINESSPARTNERS').then(function() {
            $scope.selectedPartner = selectedPartner;
        });
    }

    $scope.load = function() {
        $scope.selectedPartner = false;
        $http.get('/api/businesspartners').then(function (response) {
            $scope.partners = response.data;
            // Check the permissions for the details page for handling button visibility
            $scope.canWritePartnerDetails = $rootScope.canWrite('PERMISSION_CRM_BUSINESSPARTNERS');
            // Check preselection
            utils.handlePreselection($scope, $scope.partners, $scope.selectPartner);
            if (!$scope.params.preselection) utils.setLocation('/businesspartners');
        });
    };

    $scope.load();
});

app.directUrlMappings.businesspartners = {
    mainMenu: 'TRK_MENU_CRM',
    subMenu: 'TRK_MENU_CRM_BUSINESSPARTNERS'
};
