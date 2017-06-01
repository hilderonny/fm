app.controller('AdministrationUsergroupCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translate, utils) {
    var saveUserCallback = function(savedUser) {
        if (savedUser.userGroupId !== $scope.userGroup._id) {
            deleteUserCallback(); // Remove user from list because he was assigned to another userGroup
            utils.removeCardsToTheRightOf($element);
        } else {
            $scope.selectedUser.name = savedUser.name;
        }
    };
    var deleteUserCallback = function() {
        for (var i = 0; i < $scope.userGroup.users.length; i++) {
            var user = $scope.userGroup.users[i];
            if (user._id === $scope.selectedUser._id) {
                $scope.userGroup.users.splice(i, 1);
                $scope.selectedUser = false;
                break;
            }
        }
    };
    var closeUserCardCallback = function() {
        $scope.selectedUser = false;
    };
    
    var createPermissionCallback = function(createdPermission) {
        $scope.userGroup.permissions.push(createdPermission);
        $scope.selectPermission(createdPermission);
        checkCanAddPermission();
    };
    
    var savePermissionCallback = function(savedPermission) {
        $scope.selectedPermission.key = savedPermission.key;
        $scope.selectedPermission.canRead = savedPermission.canRead;
        $scope.selectedPermission.canWrite = savedPermission.canWrite;
    };
    
    var deletePermissionCallback = function() {
        for (var i = 0; i < $scope.userGroup.permissions.length; i++) {
            var permission = $scope.userGroup.permissions[i];
            if (permission._id === $scope.selectedPermission._id) {
                $scope.userGroup.permissions.splice(i, 1);
                $scope.selectedPermission = false;
                break;
            }
        }
        checkCanAddPermission();
    };
    var closePermissionCardCallback = function() {
        $scope.selectedPermission = false;
    };

    var checkCanAddPermission = function() {
        $http.get('/api/permissions/available/' + $scope.userGroup._id).then(function(response) {
            $scope.canAddPermission = response.data.length > 0;
        });
    };

    // Click on Create-button to create a new userGroup
    $scope.createUserGroup = function() {
        var userGroupToSend = { name: $scope.userGroup.name };
        $http.post('/api/usergroups', userGroupToSend).then(function(response) {
            var createdUserGroup = response.data;
            $scope.isNewUserGroup = false;
            $scope.userGroup._id = createdUserGroup._id;
            $scope.userGroupName = $scope.userGroup.name;
            $scope.relationsEntity = { type:'usergroups', id:createdUserGroup._id };
            checkCanAddPermission();
            if ($scope.params.createUserGroupCallback) {
                $scope.params.createUserGroupCallback(createdUserGroup);
            }
            $translate(['TRK_USERGROUPS_USERGROUP_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_USERGROUPS_USERGROUP_CREATED).hideDelay(1000).position('bottom right'));
            });
        });
    }

    // Click on Save-button to save an existing userGroup
    $scope.saveUserGroup = function() {
        var userGroupToSend = { name: $scope.userGroup.name };
        $http.put('/api/usergroups/' + $scope.userGroup._id, userGroupToSend).then(function(response) {
            var savedUsergroup = response.data;
            $scope.userGroupName = $scope.userGroup.name;
            if ($scope.params.saveUserGroupCallback) {
                $scope.params.saveUserGroupCallback(savedUsergroup);
            }
            $translate(['TRK_USERGROUPS_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_USERGROUPS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });
        });
    }

    // Click on delete button to delete an existing userGroup
    $scope.deleteUserGroup = function() {
        $translate(['TRK_USERGROUPS_USERGROUP_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations) {
            $translate('TRK_USERGROUPS_REALLY_DELETE_USERGROUP', { userGroupName: $scope.userGroupName }).then(function(TRK_USERGROUPS_REALLY_DELETE_USERGROUP) {
                var confirm = $mdDialog.confirm()
                    .title(TRK_USERGROUPS_REALLY_DELETE_USERGROUP)
                    .ok(translations.TRK_YES)
                    .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function() {
                    $http.delete('/api/usergroups/' + $scope.userGroup._id).then(function(response) {
                        if ($scope.params.deleteUserGroupCallback) {
                            $scope.params.deleteUserGroupCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_USERGROUPS_USERGROUP_DELETED).hideDelay(1000).position('bottom right'));
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

    // User selects an user in the User tab
    $scope.selectUser = function(selectedUser) {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/UserCard', {
            userId: selectedUser._id,
            saveUserCallback: saveUserCallback,
            deleteUserCallback: deleteUserCallback,
            closeCallback: closeUserCardCallback
        });
        $scope.selectedUser = selectedUser;
    }

    // Click on permission in permission list shows permission details
    $scope.selectPermission = function(selectedPermission) {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/PermissionCard', {
            permissionId: selectedPermission._id,
            userGroupId: $scope.userGroup._id, // Also needed for API call
            savePermissionCallback: savePermissionCallback,
            deletePermissionCallback: deletePermissionCallback,
            closeCallback: closePermissionCardCallback
        });
        $scope.selectedPermission = selectedPermission;
    }

    // Click on new user button opens detail dialog with new user data
    $scope.newPermission = function() {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/PermissionCard', {
            userGroupId: $scope.userGroup._id,
            createPermissionCallback: createPermissionCallback,
            savePermissionCallback: savePermissionCallback,
            deletePermissionCallback: deletePermissionCallback,
            closeCallback: closePermissionCardCallback
        });
    }

    // Loads the userGroup details or prepares the empty dialog for a new userGroup
    // Params:
    // - $scope.params.userGroupId : ID of the userGroup to load, when not set, a new userGroup is to be created
    // - $scope.params.createUserGroupCallback : Callback function when a new userGroup was created. Gets the userGroup as parameter
    // - $scope.params.saveUserGroupCallback : Callback function when an existing userGroup was saved. Gets the updated userGroup as parameter
    // - $scope.params.deleteUserGroupCallback : Callback function when an existing userGroup was deleted. No parameters
    // - $scope.params.closeUserGroupCallback : Callback function when the card gets closed via button. No parameters
    $scope.load = function() {
        // Switch between creation of a new userGroup and loading of an existing userGroup
        if ($scope.params.userGroupId) {
            // Existing userGroup
            $http.get('/api/usergroups/' + $scope.params.userGroupId + '?fields=_id+name').then(function(userGroupsResponse) {
                var userGroup = userGroupsResponse.data;
                $scope.isNewUserGroup = false;
                $scope.userGroup = userGroup;
                $scope.userGroupName = userGroup.name; // Prevent updating the label when changing the name input value
                $scope.relationsEntity = { type:'usergroups', id:userGroup._id };
                $http.get('/api/users/?fields=_id+name&userGroupId=' + $scope.params.userGroupId).then(function(usersResponse) {
                    userGroup.users = usersResponse.data;
                });
                $http.get('/api/permissions/assigned/' + $scope.params.userGroupId).then(function(permissionsResponse) {
                    userGroup.permissions = permissionsResponse.data;
                });
                checkCanAddPermission();
            });
        } else {
            // New userGroup
            $scope.isNewUserGroup = true;
            $scope.userGroup = { name : "" };
        }
    }

    $scope.load();

});
