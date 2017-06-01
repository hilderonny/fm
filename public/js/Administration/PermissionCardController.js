app.controller('AdministrationPermissionCardController', function($scope, $http, $mdDialog, $element, $mdToast, $translate, utils) {

    // Click on Create-button to create a new permission
    $scope.createPermission = function() {
        var permissionToSend = {
            userGroupId: $scope.permission.userGroupId, 
            key: $scope.permission.key, 
            canRead: $scope.permission.canRead, 
            canWrite: $scope.permission.canWrite 
        };
        $http.post('/api/permissions', permissionToSend).then(function(response) {
            var createdPermission = response.data;
            $scope.isNewPermission = false;
            $scope.permission._id = createdPermission._id;
            $scope.permissionKey = $scope.permission.key; // Prevent updating the label when changing the name input value
            if ($scope.params.createPermissionCallback) {
                $scope.params.createPermissionCallback(createdPermission);
            }
            $translate(['TRK_USERGROUPS_PERMISSION_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_USERGROUPS_PERMISSION_CREATED).hideDelay(1000).position('bottom right'));
            });
        });
    }

    // Click on Save-button to save an existing permission
    $scope.savePermission = function() {
        var permissionToSend = { 
            key: $scope.permission.key, 
            canRead: $scope.permission.canRead, 
            canWrite: $scope.permission.canWrite 
        };
        $http.put('/api/permissions/' + $scope.permission._id, permissionToSend).then(function(response) {
            var savedPermission = response.data;
            $scope.permissionKey = $scope.permission.key; // Prevent updating the label when changing the name input value
            if ($scope.params.savePermissionCallback) {
                $scope.params.savePermissionCallback(savedPermission);
            }
            $translate(['TRK_USERGROUPS_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_USERGROUPS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });
        });
    }

    // Click on delete button to delete an existing permission
    $scope.deletePermission = function() {
        var permissionTranslationKey = 'TRK_' + $scope.permissionKey;
        $translate(['TRK_USERGROUPS_PERMISSION_DELETED', 'TRK_YES', 'TRK_NO', permissionTranslationKey]).then(function(translations) {
            $translate('TRK_USERGROUPS_REALLY_DELETE_PERMISSION', { permission: translations[permissionTranslationKey] }).then(function(TRK_USERGROUPS_REALLY_DELETE_PERMISSION) {
                var confirm = $mdDialog.confirm()
                    .title(TRK_USERGROUPS_REALLY_DELETE_PERMISSION)
                    .ok(translations.TRK_YES)
                    .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function() {
                    $http.delete('/api/permissions/' + $scope.permission._id).then(function(response) {
                        if ($scope.params.deletePermissionCallback) {
                            $scope.params.deletePermissionCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_USERGROUPS_PERMISSION_DELETED).hideDelay(1000).position('bottom right'));
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

    // Loads the permission details or prepares the empty dialog for a new permission
    // Params:
    // - $scope.params.permissionId : ID of the permission to load, when not set, a new permission is to be created
    // - $scope.params.userGroupId : ID of the user group the permission belongs to
    // - $scope.params.createPermissionCallback : Callback function when a new permission was created. Gets the permission as parameter
    // - $scope.params.savePermissionCallback : Callback function when an existing permission was saved. Gets the updated permission as parameter
    // - $scope.params.deletePermissionCallback : Callback function when an existing permission was deleted. No parameters
    // - $scope.params.closeCallback : Callback function when the card gets closed via button. No parameters
    $scope.load = function() {
        var loadPermissionList = function(existingPermission) {
            // Load all existing permissions for selecting in dropdown
            var permissionParam = existingPermission ? '?selectedPermissionKey=' + existingPermission.key : '';
            $http.get('/api/permissions/available/' + $scope.params.userGroupId + permissionParam).then(function(response) {
                $scope.allPermissionKeys = response.data;
                if (existingPermission) {
                    $scope.permission = existingPermission;
                    $scope.isNewPermission = false;
                    $scope.permissionKey = existingPermission.key; // Prevent updating the label when changing the name input value
                } else {
                    $scope.isNewPermission = true;
                    $scope.permission = { userGroupId: $scope.params.userGroupId, canRead: true, canWrite: false, key: $scope.allPermissionKeys[0] };
                }
            });
        };
        // Switch between creation of a new permission and loading of an existing permission
        if ($scope.params.permissionId) {
            // Existing permission
            $http.get('/api/permissions/' + $scope.params.permissionId).then(function(response) {
                loadPermissionList(response.data);
            });
        } else {
            // New permission
            loadPermissionList();
        }
    }

    $scope.load();

});
