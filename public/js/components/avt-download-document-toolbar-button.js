app.directive('avtDownloadDocumentToolbarButton', function($compile, utils) { 
    var template = '<md-button ng-if="$parent.params.datatypename === \'documents\' && !$parent.isnew" avt-toolbar-button ng-click="downloaddocument()" icon="/css/icons/material/Download.svg" label="Herunterladen" tooltip="Dokument herunterladen"></md-button>';
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
                scope.downloaddocument = function() {
                    window.open('/api/documents/preview/' + scope.dynamicobject.name + '?token=' + scope.token, "_blank");
                }
            };
        }
    }
});