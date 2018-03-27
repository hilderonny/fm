
app.directive('avtCard', function($compile) { 
    return {
        restrict: "A",
        scope: true,
        terminal: true, // see https://stackoverflow.com/a/19228302
        priority: 1000,
        compile: function compile(element, attrs) {
            element.attr('ng-cloak', 'ng-cloak');
            element.append(angular.element("<resize-handle></resize-handle>"));
            element.removeAttr("avt-card"); //remove the attribute to avoid indefinite loop
            return {
                pre: function preLink(scope, iElement, iAttrs, controller) {
                    if (scope.params.icon) element.attr("style", "background-image:url('/css/icons/office/"+ scope.params.icon + ".svg')");
                },
                post: function postLink(scope, iElement, iAttrs, controller) {  
                    $compile(iElement)(scope);
                }
            };
        }
    };
});