app.controller('AdministrationUsergrouplistCardController', function($scope, $http, $mdDialog, $element, utils) {
    
    var saveUserGroupCallback = function(savedUserGroup) {
        $scope.selectedUserGroup.name = savedUserGroup.name;
    };
    var deleteUserGroupCallback = function() {
        for (var i = 0; i < $scope.userGroups.length; i++) {
            var userGroup = $scope.userGroups[i];
            if (userGroup._id === $scope.selectedUserGroup._id) {
                $scope.userGroups.splice(i, 1);
                $scope.selectedUserGroup = false;
                break;
            }
        }
    };
    var createUserGroupCallback = function(createdUserGroup) {
        $scope.userGroups.push(createdUserGroup);
        $scope.selectedUserGroup = createdUserGroup;
    };
    var closeUserGroupCardCallback = function() {
        $scope.selectedUserGroup = false;
    };

    // Click on userGroup in userGroup list shows userGroup details
    $scope.selectUserGroup = function(selectedUserGroup) {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/UsergroupCard', {
            userGroupId: selectedUserGroup._id,
            saveUserGroupCallback: saveUserGroupCallback,
            deleteUserGroupCallback: deleteUserGroupCallback,
            closeCallback: closeUserGroupCardCallback
        });
        $scope.selectedUserGroup = selectedUserGroup;
    }

    // Click on new userGroup button opens detail dialog with new userGroup data
    $scope.newUsergroup = function() {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Administration/UsergroupCard', {
            createUserGroupCallback: createUserGroupCallback,
            saveUserGroupCallback: saveUserGroupCallback,
            deleteUserGroupCallback: deleteUserGroupCallback,
            closeCallback: closeUserGroupCardCallback
        });
    }

    // Loads the userGroups list from the server
    // Params:
    // - $scope.params.preselection : ID of the userGroup to select in the list
    $scope.load = function() {
        $scope.selectedUserGroup = false;
        $http.get('/api/usergroups?fields=_id+name').then(function (response) {
            $scope.userGroups = response.data;
            // Check preselection
            utils.handlePreselection($scope, $scope.userGroups, $scope.selectUserGroup);
            if (!$scope.params.preselection) utils.setLocation('/usergroups');
        });
    }

    $scope.load();

});
