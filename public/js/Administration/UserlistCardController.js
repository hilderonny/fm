app.controller('AdministrationUserlistCardController', function($scope, $http, $mdDialog, $element, utils) {
    
    var saveUserCallback = function(savedUser) {
        $scope.selectedUser.name = savedUser.name;
    };
    var deleteUserCallback = function() {
        for (var i = 0; i < $scope.users.length; i++) {
            var user = $scope.users[i];
            if (user._id === $scope.selectedUser._id) {
                $scope.users.splice(i, 1);
                $scope.selectedUser = false;
                break;
            }
        }
    };
    var createUserCallback = function(createdUser) {
        $scope.users.push(createdUser);
        $scope.selectedUser = createdUser;
    };
    var closeUserCardCallback = function() {
        $scope.selectedUser = false;
    };

    // Click on user in user list shows user details
    $scope.selectUser = function(selectedUser) {
        if (!$scope.canReadUserDetails) return;
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/UserCard', {
            userId: selectedUser._id,
            saveUserCallback: saveUserCallback,
            deleteUserCallback: deleteUserCallback,
            closeCallback: closeUserCardCallback
        });
        $scope.selectedUser = selectedUser;
    }

    // Click on new user button opens detail dialog with new user data
    $scope.newUser = function() {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/UserCard', {
            createUserCallback: createUserCallback,
            saveUserCallback: saveUserCallback,
            deleteUserCallback: deleteUserCallback,
            closeCallback: closeUserCardCallback
        });
    }

    // Loads the users list from the server
    // Params:
    // - $scope.params.preselection : ID of the user to select in the list
    $scope.load = function() {
        $scope.selectedUser = false;
        $http.get('/api/users?fields=_id+name').then(function (response) {
            $scope.users = response.data;
            // Check the permissions for the details page for handling button visibility
            return $http.get('/api/permissions/canRead/PERMISSION_ADMINISTRATION_USER');
        }).then(function (response) {
            $scope.canReadUserDetails = response.data;
            return $http.get('/api/permissions/canWrite/PERMISSION_ADMINISTRATION_USER');
        }).then(function (response) {
            $scope.canWriteUserDetails = response.data;
            // Check preselection
            utils.handlePreselection($scope, $scope.users, $scope.selectUser);
            if (!$scope.params.preselection) utils.setLocation('/users');
        });
    }

    $scope.load();
});
