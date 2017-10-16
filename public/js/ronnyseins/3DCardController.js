app.controller('ronnyseins3DCardController', function($scope, $http, $mdDialog, $element, $compile, $mdConstant, $timeout, $translate, utils) {
    
    AFRAME.registerComponent('mouse-wheel', {
        schema: {
          enabled:           { default: true },
          debug:             { default: false }
        },
      
        init: function () {
            var el = this.el;
            window.addEventListener('mousewheel', function(evt) {
                var position = el.getAttribute('position');
                position.y += evt.deltaY / 500;
                el.setAttribute('position', position);
            });
        }
    });
    
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    }

    $http.get('/api/documents/' + $scope.params.documentId).then(function(response) {
        var document = response.data;
        $scope.extension = document.extension;
        $scope.documentSrc = '/api/documents/' + $scope.params.documentId + '?action=download&token=' + $http.defaults.headers.common['x-access-token'];
    });

});