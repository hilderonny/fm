
var cardController = {

    init: function($scope) {
        console.log("CardController");
        $scope.hello = "World";
    }

};

app.controller('CardController', cardController.init);