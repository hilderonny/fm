
app.directive('avtToolbarButton', function($compile) { 
    return {
        restrict: "A",
        templateUrl: "/partial/components/avt-toolbar-button.html",
        priority: 1000,
        scope: true,
        compile: function compile(element, attrs) {
            var onclickhandler = attrs.avtOnClick;
            var islinked = false;
            element.removeAttr("avt-toolbar-button"); //remove the attribute to avoid indefinite loop
            element.removeAttr("avt-on-click");
            element.attr("ng-click", "onclick($event)");
            return function link(scope, iElement, iAttrs) {
                if (islinked) return; // For some reason this is called twice
                scope.icon = iAttrs.icon;
                scope.label = iAttrs.label;
                scope.tooltip = iAttrs.tooltip;
                scope.canwrite = scope.$root.canWrite(scope.$parent.permission);
                scope.onclick = scope.$parent[onclickhandler];
                islinked = true;
                $compile(iElement)(scope);
            };
        }
    }
});