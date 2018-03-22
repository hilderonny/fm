app.controller('AdministrationRecordTypeDetailsCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {

    $scope.resetnameerror = function() {
        if ($scope.recordtypeform) $scope.recordtypeform.name.$setValidity('nameinvalid', true);
    }

    $scope.create = function() {
        $rootScope.isLoading = true;
        var recordtype = { 
            name: $scope.recordtype.name, 
            label: $scope.recordtype.label
        };
        $http.post('/api/recordtypes', recordtype).then(function(response) {
            if (response.status === 400) {
                $scope.recordtypeform.name.$setValidity('nameinvalid', false);
                return;
            }
            $scope.isnew = false;
            $scope.label = $scope.recordtype.label;
            if ($scope.params.createcallback) {
                $scope.params.createcallback(recordtype);
            }
            $translate(['TRK_RECORDTYPES_RECORDTYPE_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_RECORDTYPES_RECORDTYPE_CREATED).hideDelay(1000).position('bottom right'));
            });
            $rootScope.isLoading = false;
        });
    }

    // // Click on Save-button to save an existing user
    // $scope.saveUser = function() {
    //     $rootScope.isLoading = true;
    //     var userToSend = { 
    //         pass: $scope.user.pass, 
    //         isAdmin: $scope.user.isAdmin, 
    //         userGroupId: $scope.user.userGroup._id 
    //     };
    //      utils.saveEntity($scope, 'users', $scope.user._id, '/api/users/', userToSend).then(function(savedUser) {
    //         $scope.user.pass = '';
    //         $scope.user.pass2 = '';
    //         if ($scope.params.saveUserCallback) {
    //             $scope.params.saveUserCallback(savedUser);
    //         }
    //         $translate(['TRK_USERS_CHANGES_SAVED']).then(function(translations) {
    //             $mdToast.show($mdToast.simple().textContent(translations.TRK_USERS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
    //             $rootScope.isLoading = false;
    //         });
    //     }, function errorCallback(response) {
    //         // Username is in use by another one
    //         if (response.status === 409) {
    //             $scope.usersForm.un.$setValidity('nameInUse', false);
    //         }
            
    //     });
    // }

    // // Click on delete button to delete an existing user
    // $scope.deleteUser = function() {
    //     $translate(['TRK_USERS_USER_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations) {
    //         $translate('TRK_USERS_REALLY_DELETE_USER', { userName: $scope.userName }).then(function(TRK_USERS_REALLY_DELETE_USER) {
    //             var confirm = $mdDialog.confirm()
    //                 .title(TRK_USERS_REALLY_DELETE_USER)
    //                 .ok(translations.TRK_YES)
    //                 .cancel(translations.TRK_NO);
    //             $mdDialog.show(confirm).then(function() {
    //                 $rootScope.isLoading = true;
    //                 $http.delete('/api/users/' + $scope.user._id).then(function(response) {
    //                     if ($scope.params.deleteUserCallback) {
    //                         $scope.params.deleteUserCallback();
    //                     }
    //                     utils.removeCardsToTheRightOf($element);
    //                     utils.removeCard($element);
    //                     $mdToast.show($mdToast.simple().textContent(translations.TRK_USERS_USER_DELETED).hideDelay(1000).position('bottom right'));
    //                     $rootScope.isLoading = false;
    //                 });
    //             });
    //         });
    //     });
    // }

    $scope.closecard = function() { utils.closecard($scope, $element); };

    $scope.load = function() {
        $rootScope.isLoading= true;
        if ($scope.params.recordtypename) {
            $http.get('/api/recordtypes/' + $scope.params.recordtypename).then(function(response) {
                $scope.recordtype = response.data;
                $scope.label = $scope.recordtype.label;
                $scope.isnew = false;
                $rootScope.isLoading= false;
            });
        } else {
            $scope.isnew = true;
            $scope.recordtype = { name: "", label: "" };
            $rootScope.isLoading= false;
        }
        // Check the permissions for the details page for handling button visibility
        $scope.canwrite = $rootScope.canWrite('PERMISSION_SETTINGS_CLIENT_RECORDTYPES');
    }

    $scope.load();

});
