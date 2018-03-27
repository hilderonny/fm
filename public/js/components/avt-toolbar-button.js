
app.directive('avtToolbarButton', function($compile) { 
    return {
        restrict: "A",
        templateUrl: "/partial/components/avt-toolbar-button.html",
        terminal: true, // see https://stackoverflow.com/a/19228302
        priority: 1000,
        scope: true,
        compile: function compile(element, attrs) {
            element.attr('md-ink-ripple', 'md-ink-ripple');
            element.attr("class", "md-button");
            element.removeAttr("avt-toolbar-button"); //remove the attribute to avoid indefinite loop
            return {
                pre: function preLink(scope, iElement, iAttrs, controller) {
                    scope.icon = iAttrs.icon;
                    scope.label = iAttrs.label;
                    scope.tooltip = iAttrs.tooltip;
                    scope.canwrite = scope.$root.canWrite(scope.$parent.permission);
                },
                post: function postLink(scope, iElement, iAttrs, controller) {  
                    $compile(iElement)(scope);
                }
            };
        }
    }
});