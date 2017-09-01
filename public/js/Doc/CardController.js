app.controller('DocCardController', function($scope, $element, utils) {

    // User clicks on close button
    $scope.closeCard = function() {
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
        utils.setLocation('/doc/');
    }

});
