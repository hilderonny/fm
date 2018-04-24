app.directive('avtGeneratelicensekeyButton', function($compile, utils) { 
    var template = 
        '<md-card-actions layout="row" layout-align="end center">' +
        '   <md-button class="md-raised md-accent" ng-click="generatelicensekey()">Lizenzschlüssel generieren</md-button>' +
        '</md-card-actions>'
        ;
    return {
        restrict: "A",
        priority: 880,
        scope: false,
        compile: function compile(element, attrs) {
            if (element.length < 1 || !element[0].form) return;
            var form = element[0].form;
            var generatebutton = angular.element(template);
            var cardactions = form.find("md-card-actions")[0];
            form[0].insertBefore(generatebutton[0], cardactions);
            return function link(scope) {
                scope.generatelicensekey = function() {
                    utils.getresponsedata("/api/portals/newkey").then(function(licensekey) {
                        scope.dynamicobject.licensekey = licensekey;
                    });
                };
                scope.$watch("dynamicobject", function(dynamicobject) {
                    if (!dynamicobject || scope.params.entityname) return;
                    if (!dynamicobject.licensekey) {
                        scope.generatelicensekey();
                    }
                });
            }
        }
    }
});