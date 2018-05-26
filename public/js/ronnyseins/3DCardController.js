app.controller('ronnyseins3DCardController', function($scope, $http, $mdDialog, $element, $compile, $mdConstant, $timeout, $translate, utils) {

    window.addWayPoint = function(waypoint) {
        var scene = document.querySelector('a-scene');
        var entity = document.createElement('a-entity');
        scene.appendChild(entity);
        entity.waypoint = { x: waypoint.x, y: waypoint.y, z: waypoint.z, rx: waypoint.rx, ry: waypoint.ry };
        entity.setAttribute('geometry', { primitive: 'octahedron' });                
        entity.setAttribute('position', { x: waypoint.x, y: waypoint.y, z: waypoint.z });
        entity.setAttribute('scale', { x: 0.1, y: 0.2, z: 0.1 });
        entity.setAttribute('material', { opacity:0.3, color: '#00ff00', emissive: '#006600' });
        entity.addEventListener('mouseenter', function() {
            entity.setAttribute('material', { opacity:1, color: '#00ff00', emissive: '#00ff00' });
            entity.fuseTimeout = window.setTimeout(function() {
                $scope.setCameraPosition(entity.waypoint, false);
            }, 1500);
        });
        entity.addEventListener('mouseleave', function() {
            window.clearTimeout(entity.fuseTimeout);
            entity.setAttribute('material', { opacity:0.3, color: '#00ff00', emissive: '#006600' });
        });
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

    $scope.loadDocument = function(doc) {
        var scene = document.querySelector('a-scene');
        var entity = document.createElement('a-entity');
        scene.appendChild(entity);
        var modelTypeAttributes = {
            'model/vnd.collada+xml': 'collada-model',
            'application/x-tgif': 'obj-model'
        
        };
        entity.doc = doc;
        entity.setAttribute(modelTypeAttributes[doc.type], '/api/documents/download/' + doc._id + '?token=' + $http.defaults.headers.common['x-access-token']);
        if (!doc.waypoints) doc.waypoints = [];
        doc.waypoints.forEach(window.addWayPoint);
        if (doc.description) {
            /*
            entity.addEventListener('raycaster-intersected', function(evt) {
                var point = evt.detail.intersection.point;
                console.log(point);
                var infoPlaneText = document.querySelector('#info-plane-text');
                var text = infoPlaneText.getAttribute('text');
                text.value = doc.description;
                console.log(text.value);
                infoPlaneText.setAttribute('text', text);
                var infoPlane = document.querySelector('#info-plane');
                infoPlane.setAttribute('visible', true);
                infoPlane.setAttribute('position', {
                    x: point.x - .6,
                    y: point.y + .6,
                    z: point.z + .5
                });
                evt.preventDefault();
                evt.stopPropagation();
                return false;
            });
            //entity.setAttribute('info-dingens', doc.description);
            */
        }
    };

    $http.get('/api/documents/' + $scope.params.documentId).then(function(response) {
        var documentId = $scope.params.documentId;
        window.currentScope = $scope;
        window.utils = utils;
        $scope.document = response.data;
        $scope.loadDocument($scope.document);
        if ($scope.document.waypoints.length > 0) {
            var camera = document.querySelector('a-camera');
            $scope.setCameraPosition($scope.document.waypoints[0], true);
        }

        $http.get('/api/relations/documents/' + documentId).then(function(response) {
            var relations = response.data;
            var relationIdsToLoad = [];
            relations.forEach(function(relation) {
                if (relation.id1 === documentId) {
                    if (relation.type2 !== 'documents') return;
                    relationIdsToLoad.push(relation.id2);
                } else {
                    if (relation.type1 !== 'documents') return;
                    relationIdsToLoad.push(relation.id1);
                }
            });
            $http.get('/api/documents/forIds?ids=' + relationIdsToLoad.join(',')).then(function(response) {
                response.data.forEach(function(doc) {
                    if (doc.extension === '.dae' || doc.extension === '.obj') {
                        $scope.loadDocument(doc);
                    }
                })
            });
        });


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

AFRAME.registerComponent('info-dingens', {
    schema: { type: 'string' },
    init: function () {
        var el = this.el;
        var infoDinges = this;
        el.addEventListener('raycaster-intersection', function(evt) {
            var intersections = evt.detail.intersections;
            for (var i = 0; i < intersections.length; i++) {
                var intersection = intersections[i];
                var el = intersection.object.el;
                if (el.doc) {
                    var infoPlane = document.querySelector('#info-plane');
                    if (!el.doc.description) {
                        infoPlane.setAttribute('visible', false);
                        break;
                    }
                    var point = intersection.point;
                    var infoPlaneText = document.querySelector('#info-plane-text');
                    var text = infoPlaneText.getAttribute('text');
                    text.value = el.doc.description;
                    infoPlaneText.setAttribute('text', text);
                    infoPlane.setAttribute('visible', true);
                    infoPlane.setAttribute('position', {
                        x: point.x - .6,
                        y: point.y + .6,
                        z: point.z + .5
                    });
                    break;
                }
            }
        });
        el.addEventListener('raycaster-intersection-cleared', function(evt) {
            var infoPlane = document.querySelector('#info-plane');
            infoPlane.setAttribute('visible', false);
        });
        this.refreshRaycaster = window.setInterval(function() {
            el.components.raycaster.refreshObjects();
        }, 100);
    },
    remove: function() {
        window.clearInterval(this.refreshRaycaster);
    }
});