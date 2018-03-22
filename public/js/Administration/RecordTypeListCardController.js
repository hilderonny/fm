app.controller('AdministrationRecordTypeListCardController', function($scope, $rootScope, $http, $mdDialog, $element, $translate, utils) {

    $scope.closecard = function() { utils.closecard($scope, $element); };

    var savecallback = function(recordtype) {
        $scope.selectedrecordtype.label = recordtype.label;
    };
    var deletecallback = function() {
        $scope.recordtypes.splice($scope.recordtypes.indexOf($scope.selectedrecordtype), 1);
        closecallback();
    };
    var createcallback = function(recordtype) {
        $scope.recordtypes.push(recordtype);
        $scope.selectrecordtype(recordtype);
    };
    var closecallback = function() {
        $scope.selectedrecordtype = false;
    };

    // Click on recordtype in recordtype list shows recordtype details
    $scope.selectrecordtype = function(selectedrecordtype) {
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('Administration/RecordTypeDetailsCard', {
            recordtypename: selectedrecordtype.name,
            savecallback: savecallback,
            deletecallback: deletecallback,
            closecallback: closecallback
        }, 'PERMISSION_SETTINGS_CLIENT_RECORDTYPES').then(function() {
            $scope.selectedrecordtype = selectedrecordtype;
        });
    }

    // Click on new recordtype button opens detail dialog with new recordtype data
    $scope.newrecordtype = function() {
        $scope.selectedrecordtype = null;
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('Administration/RecordTypeDetailsCard', {
            createcallback: createcallback,
            closecallback: closecallback
        }, 'PERMISSION_SETTINGS_CLIENT_RECORDTYPES');
    };

    $scope.load = function() {
        $rootScope.isLoading = true;
        $scope.selectedrecordtype = false;
        $http.get('/api/recordtypes').then(function (response) {
            $scope.recordtypes = response.data;
            if ($scope.params.selectedrecordtypename) {
                for (var i = 0; i < $scope.recordtypes.length; i++) {
                    var recordtype = $scope.recordtypes[i];
                    if (recordtype._id === $scope.params.selectedrecordtypename) {
                        $scope.selectedrecordtype = recordtype;
                        break;
                    }
                }
            }
            $scope.canwriterecordtypes = $rootScope.canWrite('PERMISSION_SETTINGS_CLIENT_RECORDTYPES');
            utils.setLocation('/settings/TRK_SETTINGSET_RECORDTYPES');
            $rootScope.isLoading = false;
        });
    }

    $scope.load();
});
