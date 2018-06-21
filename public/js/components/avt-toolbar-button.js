
app.directive('avtToolbarButton', function($compile) {
    var template = 
        '<md-tooltip ng-if="tooltip" md-direction="bottom"><span translate="{{tooltip}}"></span></md-tooltip>' +
        '<md-icon ng-if="icon" md-svg-src="{{icon}}"></md-icon>' +
        '<p ng-if="label" translate="{{label}}"></p>';
    return {
        restrict: "A",
        terminal: true,
        priority: 1000,
        scope: true,
        compile: function compile(element, attrs) {
            var onclickhandler = attrs.avtOnClick;
            element.removeAttr("avt-toolbar-button"); //remove the attribute to avoid indefinite loop
            element.append(angular.element(template));
            return function link(scope, iElement, iAttrs) {
                scope.icon = iAttrs.icon;
                scope.label = iAttrs.label;
                scope.tooltip = iAttrs.tooltip;
                scope.canwrite = scope.$root.canWrite(scope.$parent.permission);
                scope.onclick = scope.$parent[onclickhandler];
                $compile(iElement)(scope);
            };
        }
    }
});