app.controller('AdministrationUserCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translate, utils) {

    $scope.resetUserNameError = function() {
        $scope.usersForm.un.$setValidity('nameInUse', true);
    }

    // Click on Create-button to create a new user
    $scope.createUser = function() {
        var userToSend = { 
            name: $scope.user.name, 
            pass: $scope.user.pass, 
            isAdmin: $scope.user.isAdmin, 
            userGroupId: $scope.user.userGroup._id 
        };
        $http.post('/api/users', userToSend).then(function successCallback(response) {
            if (response.status === 409) {
                $scope.usersForm.un.$setValidity('nameInUse', false);
                return;
            }
            var createdUser = response.data;
            $scope.isNewUser = false;
            $scope.user._id = createdUser._id;
            $scope.user.pass = '';
            $scope.user.pass2 = '';
            $scope.userName = $scope.user.name;
            $scope.relationsEntity = { type:'users', id:createdUser._id };
            if ($scope.params.createUserCallback) {
                $scope.params.createUserCallback(createdUser);
            }
            $translate(['TRK_USERS_USER_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_USERS_USER_CREATED).hideDelay(1000).position('bottom right'));
            });
        });
    }

    // Click on Save-button to save an existing user
    $scope.saveUser = function() {
        var userToSend = { 
            name: $scope.user.name, 
            pass: $scope.user.pass, 
            isAdmin: $scope.user.isAdmin, 
            userGroupId: $scope.user.userGroup._id 
        };
        $http.put('/api/users/' + $scope.user._id, userToSend).then(function(response) {
            var savedUser = response.data;
            $scope.user.pass = '';
            $scope.user.pass2 = '';
            $scope.userName = $scope.user.name;
            if ($scope.params.saveUserCallback) {
                $scope.params.saveUserCallback(savedUser);
            }
            $translate(['TRK_USERS_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_USERS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });
        }, function errorCallback(response) {
            // Username is in use by another one
            if (response.status === 409) {
                $scope.usersForm.un.$setValidity('nameInUse', false);
            }
        });
    }

    // Click on delete button to delete an existing user
    $scope.deleteUser = function() {
        $translate(['TRK_USERS_USER_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations) {
            $translate('TRK_USERS_REALLY_DELETE_USER', { userName: $scope.userName }).then(function(TRK_USERS_REALLY_DELETE_USER) {
                var confirm = $mdDialog.confirm()
                    .title(TRK_USERS_REALLY_DELETE_USER)
                    .ok(translations.TRK_YES)
                    .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function() {
                    $http.delete('/api/users/' + $scope.user._id).then(function(response) {
                        if ($scope.params.deleteUserCallback) {
                            $scope.params.deleteUserCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_USERS_USER_DELETED).hideDelay(1000).position('bottom right'));
                    });
                });
            });
        });
    }

    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    }

    // Loads the user details or prepares the empty dialog for a new user
    // Params:
    // - $scope.params.userId : ID of the user to load, when not set, a new user is to be created
    // - $scope.params.createUserCallback : Callback function when a new user was created. Gets the user as parameter
    // - $scope.params.saveUserCallback : Callback function when an existing user was saved. Gets the updated user as parameter
    // - $scope.params.deleteUserCallback : Callback function when an existing user was deleted. No parameters
    // - $scope.params.closeCallback : Callback function when the card gets closed via button. No parameters
    $scope.load = function() {
        // Switch between creation of a new user and loading of an existing user
        if ($scope.params.userId) {
            // Existing user
            $http.get('/api/users/' + $scope.params.userId + '?fields=_id+name+isAdmin+userGroupId').then(function(response) {
                var completeUser = response.data;
                // Load available userGroups
                $http.get('/api/usergroups?fields=_id+name').then(function(response) {
                    $scope.userGroups = response.data;
                    $scope.isNewUser = false;
                    $scope.user = completeUser;
                    $scope.userName = completeUser.name; // Prevent updating the label when changing the name input value
                    $scope.relationsEntity = { type:'users', id:completeUser._id };
                    for (var i = 0; i < $scope.userGroups.length; i++) {
                        var userGroup = $scope.userGroups[i];
                        if (userGroup._id === completeUser.userGroupId) {
                            $scope.user.userGroup = userGroup;
                            break;
                        }
                    }
                    utils.setLocation('users/' + $scope.params.userId);
                });
            });
        } else {
            // New user
            // Check available userGroups
            $http.get('/api/usergroups?fields=_id+name').then(function(response) {
                $scope.userGroups = response.data;
                $scope.isNewUser = true;
                $scope.user = { name : "", pass : "", userGroup : $scope.userGroups[0] };
            });
        }
        // Check the permissions for the details page for handling button visibility
        $http.get('/api/permissions/canWrite/PERMISSION_ADMINISTRATION_USER').then(function (response) {
            $scope.canWriteUserDetails = response.data;
        });
    }

    $scope.load();

});
