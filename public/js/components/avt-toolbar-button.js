
app.directive('avtToolbarButton', function($compile) { 
    return {
        restrict: "A",
        templateUrl: "/partial/components/avt-toolbar-button.html",
        priority: 1000,
        scope: true,
        compile: function compile(element, attrs) {
            element.removeAttr("avt-toolbar-button"); //remove the attribute to avoid indefinite loop
            element.attr("ng-click", "onclick($event)");
            return {
                pre: function preLink(scope, iElement, iAttrs, controller) {
                    scope.icon = iAttrs.icon;
                    scope.label = iAttrs.label;
                    scope.tooltip = iAttrs.tooltip;
                    scope.canwrite = scope.$root.canWrite(scope.$parent.permission); // TODO: Move to current scope
                    scope.onclick = scope.$parent[iAttrs.avtOnClick];
                },
                post: function postLink(scope, iElement, iAttrs, controller) {  
                    $compile(iElement)(scope);
                }
            };
        }
    }
});