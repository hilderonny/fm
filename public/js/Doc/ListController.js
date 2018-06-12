app.controller('DocListController', function($scope, $rootScope, $http, $mdDialog, $element, $location, utils) {

    // Click on user in user list shows user details
    $scope.selectMenuItem = function(menuItem, preserveHash) {
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('Doc/' + menuItem.docCard, {
            closeCallback: function() { $scope.selectedMenuItem = null; }
        }).then(function() {
            if (!preserveHash) utils.setLocation('/doc/' + menuItem.docCard);
            $scope.selectedMenuItem = menuItem;
        });
    }

    /**
     * Lädt die Menüstruktur der Dokumentation vom Server.
     * Parameter:
     * - $scope.params.preselection: Menüpunkt bzw. Seite, die angezeigt werden soll
     * - $scope.params.anchor: Anker auf der Seite, der angesprungen werden soll
     */
    $scope.load = function() {
        $http.get('/api/doc').then(function(response) {
            $scope.menu = response.data;
            // Check preselection
            if ($scope.params.preselection) {
                var elementToSelect = null;
                if ($scope.params.anchor) {
                    var elementToSelect = $scope.menu.find(function(e) { return e.docCard === $scope.params.preselection + "#" + $scope.params.anchor; });
                } else {
                    var elementToSelect = $scope.menu.find(function(e) { return e.docCard.split("#")[0] === $scope.params.preselection; });
                }
                if (elementToSelect) $scope.selectMenuItem(elementToSelect, true);
            } else {
                utils.setLocation('/doc/');
            }
        });
    }

    $scope.load();
});
