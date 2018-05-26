app.directive('avtDownloadportalpackageToolbarButton', function($compile, $http, utils) { 
    var template = '<md-button ng-if="!$parent.isnew && candownloadportalpackage()" avt-toolbar-button ng-click="downloadportalpackage()" icon="/css/icons/material/Download.svg" label="Paket" tooltip="Installationspaket herunterladen"></md-button>';
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
                scope.downloadportalpackage = function() {
                    window.open('/api/update/download?licenseKey=' + scope.dynamicobject.licensekey + '&token=' + $http.defaults.headers.common['x-access-token'], "_blank");
                }
                scope.candownloadportalpackage = function() {
                    return scope.dynamicobject && scope.dynamicobject.isactive && scope.portalmodules && !!scope.portalmodules.find(function(pm) { return pm.active; });
                }
            };
        }
    }
});