app.controller('AdministrationUsergroupCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {

    $scope.getPermissions = function() {
        return $http.get('/api/permissions/forUserGroup/' + $scope.userGroup._id).then(function(permissionsResponse) {
            $scope.userGroup.permissions = permissionsResponse.data;
            $scope.userGroup.permissions.forEach(function(permission) {
                permission.translationKey = 'TRK_' + permission.key;
            });
            return Promise.resolve();
        });
    };

    // Click on Create-button to create a new userGroup
    $scope.createUserGroup = function() {
        var userGroupToSend = { name: $scope.userGroup.name };
        var createdUserGroup;
        $http.post('/api/usergroups', userGroupToSend).then(function(response) {
            createdUserGroup = response.data;
            $scope.isNewUserGroup = false;
            $scope.userGroup._id = createdUserGroup._id;
            $scope.userGroupName = $scope.userGroup.name;
            $scope.relationsEntity = { type:'usergroups', id:createdUserGroup._id };
            return $scope.getPermissions();
        }).then(function() {
            if ($scope.params.createUserGroupCallback) {
                $scope.params.createUserGroupCallback(createdUserGroup);
            }
            return $translate(['TRK_USERGROUPS_USERGROUP_CREATED']);
        }).then(function(translations) {
            $mdToast.show($mdToast.simple().textContent(translations.TRK_USERGROUPS_USERGROUP_CREATED).hideDelay(1000).position('bottom right'));
            utils.setLocation('/usergroups/' + $scope.userGroup._id);
        });
    }

    // Click on Save-button to save an existing userGroup
    $scope.saveUserGroup = function() {
        var userGroupToSend = { name: $scope.userGroup.name };
        utils.saveEntity($scope, 'usergroups', $scope.userGroup._id, '/api/usergroups/', userGroupToSend).then(function(savedUsergroup) {
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
        utils.setLocation('/users/' + selectedUser._id, true);
    };

    $scope.savePermission = function(permissionToSave, permissionToUpdate) {
        if (permissionToSave._id) {
            if (permissionToSave.canRead || permissionToSave.canWrite) {
                $http.put('/api/permissions/' + permissionToSave._id, permissionToSave).then(function(response) {
                    permissionToUpdate.canRead = response.data.canRead;
                    permissionToUpdate.canWrite = response.data.canWrite;
                });
            } else {
                $http.delete('/api/permissions/' + permissionToSave._id).then(function() {
                    delete permissionToUpdate._id;
                    permissionToUpdate.canRead = false;
                    permissionToUpdate.canWrite = false;
                });
            }
        } else {
            $http.post('/api/permissions', permissionToSave).then(function(response) {
                permissionToUpdate._id = response.data._id;
                permissionToUpdate.canRead = response.data.canRead;
                permissionToUpdate.canWrite = response.data.canWrite;
            });
        }
    };

    $scope.switchRead = function(permission) {
        if (!$scope.canWriteUserGroup) return;
        var tempPermission = JSON.parse(JSON.stringify(permission));
        tempPermission.canRead = !tempPermission.canRead;
        if (!tempPermission.canRead) tempPermission.canWrite = false;
        $scope.savePermission(tempPermission, permission);
    };

    $scope.switchWrite = function(permission) {
        if (!$scope.canWriteUserGroup) return;
        var tempPermission = JSON.parse(JSON.stringify(permission))
        tempPermission.canWrite = !tempPermission.canWrite;
        if (tempPermission.canWrite) tempPermission.canRead = true;
        $scope.savePermission(tempPermission, permission);
    };

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
            $http.get('/api/usergroups/' + $scope.params.userGroupId).then(function(userGroupsResponse) {
                $scope.userGroup = userGroupsResponse.data;
                $scope.isNewUserGroup = false;
                $scope.userGroupName = $scope.userGroup.name; // Prevent updating the label when changing the name input value
                $scope.relationsEntity = { type:'usergroups', id:$scope.userGroup._id };
                return $http.get('/api/users/?userGroupId=' + $scope.params.userGroupId + '#ignore403');
            }).then(function(usersResponse) {
                $scope.userGroup.users = usersResponse.data;
                return $scope.getPermissions();
            }).then(function() {
                utils.loadDynamicAttributes($scope, 'usergroups', $scope.params.userGroupId);
                utils.setLocation('/usergroups/' + $scope.params.userGroupId);
            });
        } else {
            // New userGroup
            $scope.isNewUserGroup = true;
            $scope.userGroup = { name : "" };
        }
        // Check the permissions for the details page for handling button visibility
        $scope.canWriteUserGroup = $rootScope.canWrite('PERMISSION_ADMINISTRATION_USERGROUP');
        $scope.canReadUser = $rootScope.canRead('PERMISSION_ADMINISTRATION_USER');
    }

    $scope.load();

});
