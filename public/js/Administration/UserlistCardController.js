app.controller('AdministrationUserlistCardController', function($scope, $rootScope, $http, $mdDialog, $element, utils) {
    
    var saveUserCallback = function(savedUser) {
        $scope.selectedUser.name = savedUser.name;
    };
    var deleteUserCallback = function() {
        $scope.users.splice($scope.users.indexOf($scope.selectedUser), 1);
        closeUserCardCallback();
    };
    var createUserCallback = function(createdUser) {
        $scope.users.push(createdUser);
        $scope.selectedUser = createdUser;
    };
    var closeUserCardCallback = function() {
        $scope.selectedUser = false;
        utils.setLocation('/users');
    };

    // Click on user in user list shows user details
    $scope.selectUser = function(selectedUser) {
        if (!$scope.canReadUserDetails) return;
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('Administration/UserCard', {
            userId: selectedUser._id,
            saveUserCallback: saveUserCallback,
            deleteUserCallback: deleteUserCallback,
            closeCallback: closeUserCardCallback
        }, 'PERMISSION_ADMINISTRATION_USER').then(function() {
            $scope.selectedUser = selectedUser;
        });
    }

    // Click on new user button opens detail dialog with new user data
    $scope.newUser = function() {
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('Administration/UserCard', {
            createUserCallback: createUserCallback,
            saveUserCallback: saveUserCallback,
            deleteUserCallback: deleteUserCallback,
            closeCallback: closeUserCardCallback
        }, 'PERMISSION_ADMINISTRATION_USER');
    }

    // Loads the users list from the server
    // Params:
    // - $scope.params.preselection : ID of the user to select in the list
    $scope.load = function() {
        $scope.selectedUser = false;
        $http.get('/api/users?fields=_id+name').then(function (response) {
            $scope.users = response.data;
            // Check the permissions for the details page for handling button visibility
            $scope.canWriteUserDetails = $rootScope.canWrite('PERMISSION_ADMINISTRATION_USER');
            $scope.canReadUserDetails = $rootScope.canRead('PERMISSION_ADMINISTRATION_USER');
            // Check preselection
            utils.handlePreselection($scope, $scope.users, $scope.selectUser);
            if (!$scope.params.preselection) utils.setLocation('/users');
        });
    }

    $scope.load();
});

app.directUrlMappings.users = {
    mainMenu: 'TRK_MENU_ADMINISTRATION',
    subMenu: 'TRK_MENU_ADMINISTRATION_USERS',
    additionalCard: 'Administration/UserCard'
};
