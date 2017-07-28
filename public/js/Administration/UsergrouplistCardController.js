app.controller('AdministrationUsergrouplistCardController', function($scope, $rootScope, $http, $mdDialog, $element, utils) {
    
    var saveUserGroupCallback = function(savedUserGroup) {
        $scope.selectedUserGroup.name = savedUserGroup.name;
    };
    var deleteUserGroupCallback = function() {
        $scope.userGroups.splice($scope.userGroups.indexOf($scope.selectedUserGroup), 1);
        closeUserGroupCardCallback();
    };
    var createUserGroupCallback = function(createdUserGroup) {
        $scope.userGroups.push(createdUserGroup);
        $scope.selectedUserGroup = createdUserGroup;
    };
    var closeUserGroupCardCallback = function() {
        $scope.selectedUserGroup = false;
        utils.setLocation('/usergroups');
    };

    // Click on userGroup in userGroup list shows userGroup details
    $scope.selectUserGroup = function(selectedUserGroup) {
        if (!$scope.canReadUserGroupDetails) return;
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('Administration/UsergroupCard', {
            userGroupId: selectedUserGroup._id,
            saveUserGroupCallback: saveUserGroupCallback,
            deleteUserGroupCallback: deleteUserGroupCallback,
            closeCallback: closeUserGroupCardCallback
        }, 'PERMISSION_ADMINISTRATION_USERGROUP').then(function() {
            $scope.selectedUserGroup = selectedUserGroup;
        });
    }

    // Click on new userGroup button opens detail dialog with new userGroup data
    $scope.newUsergroup = function() {
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('Administration/UsergroupCard', {
            createUserGroupCallback: createUserGroupCallback,
            saveUserGroupCallback: saveUserGroupCallback,
            deleteUserGroupCallback: deleteUserGroupCallback,
            closeCallback: closeUserGroupCardCallback
        }, 'PERMISSION_ADMINISTRATION_USERGROUP');
    }

    // Loads the userGroups list from the server
    // Params:
    // - $scope.params.preselection : ID of the userGroup to select in the list
    $scope.load = function() {
        $scope.selectedUserGroup = false;
        $http.get('/api/usergroups').then(function (response) {
            $scope.userGroups = response.data;
            // Check the permissions for the details page for handling button visibility
            $scope.canWriteUserGroupDetails = $rootScope.canWrite('PERMISSION_ADMINISTRATION_USERGROUP');
            $scope.canReadUserGroupDetails = $rootScope.canRead('PERMISSION_ADMINISTRATION_USERGROUP');
            // Check preselection
            utils.handlePreselection($scope, $scope.userGroups, $scope.selectUserGroup);
            if (!$scope.params.preselection) utils.setLocation('/usergroups');
        });
    }

    $scope.load();

});

app.directUrlMappings.usergroups = {
    mainMenu: 'TRK_MENU_ADMINISTRATION',
    subMenu: 'TRK_MENU_ADMINISTRATION_USERGROUPS'
};
