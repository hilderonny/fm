app.directive('avtViewin3dToolbarButton', function($compile, $translate, $http, $mdToast, utils) { 
    var template = '<md-button ng-if="$parent.params.datatypename === \'documents\' && $parent.dynamicobject && [\'application/x-tgif\',\'model/vnd.collada+xml\',\'model/gltf+json\'].indexOf($parent.dynamicobject.type) >= 0" avt-toolbar-button ng-click="viewin3d()" icon="/css/icons/material/Virtual Reality.svg" label="3D Anzeige" tooltip="In 3D anzeigen"></md-button>';
    return {
        restrict: "A",
        priority: 880,
        scope: false,
        compile: function compile(element, attrs) {
            if (element.length < 1 || !element[0].toolbar) return;
            var toolbar = element[0].toolbar;
            var button = angular.element(template);
            toolbar.append(button);
            return function link(scope) {
                scope.viewin3d = function() {
                    utils.removeCardsToTheRightOf(element);
                    utils.addCardWithPermission('ronnyseins/3DCard', {
                        documentId: scope.dynamicobject.name
                    }, 'PERMISSION_OFFICE_DOCUMENT');
                }
            };
        }
    }
});