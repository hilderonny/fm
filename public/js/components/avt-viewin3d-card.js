app.directive('avtViewin3dCard', function ($compile, $http, utils) {
    var toolbartemplate = '<md-toolbar avt-toolbar></md-toolbar>';
    var cardcontenttemplate =
        '<a-scene embedded>' +
        '   <a-sky color="#ECECFF"></a-sky>' +
        '   <a-camera mouse-wheel></a-camera>' +
        '   <a-entity look-at="src: a-camera" material="depthTest:false" id="info-plane" position="-1 1.5 -3" rotation="0 45 0">' +
        '   </a-entity>' +
        '</a-scene>';
    return {
        restrict: "A",
        scope: false,
        terminal: true,
        priority: 900,
        compile: function compile(element) {
            if (element.length < 1) return;
            element.removeAttr("avt-viewin3d-card");
            var resizehandle = element[0].resizehandle || element[0].querySelector("resize-handle");
            element[0].toolbar = angular.element(toolbartemplate);
            element[0].cardcontent = angular.element(cardcontenttemplate);
            element.append(element[0].toolbar);
            element.append(element[0].cardcontent);
            if (resizehandle) element.append(resizehandle);
            return function link(scope, iElement) {
                $compile(iElement)(scope);
                utils.loaddynamicobject("documents", scope.params.documentname).then(function(doc) {
                    var scene = document.querySelector('a-scene');
                    var entity = document.createElement('a-entity');
                    entity.setAttribute("position", "0 -.3 0");
                    scene.appendChild(entity);
                    var modelTypeAttributes = {
                        'model/vnd.collada+xml': 'collada-model',
                        'application/x-tgif': 'obj-model',
                        'model/gltf+json': 'gltf-model',
                    };
                    entity.doc = doc;
                    entity.setAttribute(modelTypeAttributes[doc.type], '/api/documents/preview/' + doc.name + '?token=' + $http.defaults.headers.common['x-access-token']);
                });
            };
        }
    }
});