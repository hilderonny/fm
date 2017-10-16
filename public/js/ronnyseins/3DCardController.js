app.controller('ronnyseins3DCardController', function($scope, $http, $mdDialog, $element, $compile, $mdConstant, $timeout, $translate, utils) {

    window.addWayPoint = function(position) {
        var scene = document.querySelector('a-scene');
        var entity = document.createElement('a-entity');
        scene.appendChild(entity);
        entity.setAttribute('geometry', { primitive: 'octahedron' });                
        entity.setAttribute('position', { x: position.x, y: position.y, z: position.z });
        entity.setAttribute('scale', { x: 0.2, y: 0.5, z: 0.2 });
        entity.setAttribute('material', { opacity:0.5, color: '#00ff00', emissive: '#00ff00' });
    };
        
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    }

    $scope.setCameraPosition = function(waypoint, withRotation) {
        var camera = document.querySelector('a-camera');
        var position = { x: waypoint.x, y: waypoint.y, z: waypoint.z };
        var rotation = { x: waypoint.rx, y: waypoint.ry, z: 0 };
        camera.setAttribute('position', position);
        if (withRotation) camera.setAttribute('rotation', rotation);
    };

    $http.get('/api/documents/' + $scope.params.documentId).then(function(response) {
        $scope.document = response.data;
        window.currentScope = $scope;
        window.utils = utils;
        if (!$scope.document.waypoints) $scope.document.waypoints = [];
        console.log($scope.document.waypoints);
        $scope.document.waypoints.forEach(window.addWayPoint);
        if ($scope.document.waypoints.length > 0) {
            var camera = document.querySelector('a-camera');
            $scope.setCameraPosition($scope.document.waypoints[0], true);
        }
        $scope.extension = $scope.document.extension;
        $scope.documentSrc = '/api/documents/' + $scope.params.documentId + '?action=download&token=' + $http.defaults.headers.common['x-access-token'];
    });

});

AFRAME.registerComponent('mouse-wheel', {

    init: function () {
        var mouseWheelTarget = this.el;
        this.handleMouseWheel = function(evt) {
            var position = mouseWheelTarget.getAttribute('position');
            position.y += evt.deltaY / 500;
            mouseWheelTarget.setAttribute('position', position);
        }
        window.addEventListener('mousewheel', this.handleMouseWheel);
    },

    remove: function() {
        window.removeEventListener('mousewheel', this.handleMouseWheel);
    }
});

AFRAME.registerComponent('waypoint-editor', {
    init: function () {
        var el = this.el;
        this.handleKeyUp = function(evt) {
            if (evt.key !== 't') return;
            if (!window.currentScope) return;
            var position = el.getAttribute('position');
            var rotation = el.getAttribute('rotation');
            window.currentScope.document.waypoints.push({ x: position.x, y: position.y, z: position.z, rx: rotation.x, ry: rotation.y });
            console.log(window.currentScope.document.waypoints);
            var documentToSend = { waypoints: window.currentScope.document.waypoints };
            window.utils.saveEntity(window.currentScope, 'documents', window.currentScope.document._id, '/api/documents/', documentToSend).then(function(savedDocument) {
                window.addWayPoint(position);
            });
        };
        window.addEventListener('keyup', this.handleKeyUp);
    },
    
    remove: function() {
        window.removeEventListener('keyup', this.handleKeyUp);
    }
});
