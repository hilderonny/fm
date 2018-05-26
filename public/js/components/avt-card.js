
app.directive('avtCard', function($compile, utils) { 
    return {
        restrict: "A",
        scope: true,
        terminal: true, // see https://stackoverflow.com/a/19228302
        priority: 1000,
        compile: function compile(element, attrs) {
            element.attr('ng-cloak', 'ng-cloak');
            element[0].classList.add("ng-cloak");
            element.append(angular.element("<resize-handle></resize-handle>"));
            element.removeAttr("avt-card"); //remove the attribute to avoid indefinite loop
            return function link(scope) {
                scope.canread = scope.$root.canRead(scope.params.permission);
                scope.canwrite = scope.$root.canWrite(scope.params.permission);
                if (scope.params.icon) element.attr("style", "background-image:url('"+ scope.params.icon.replace(/\/material\//g, "/office/") + "')");
                scope.onclose = function() {
                    if (scope.params.onclose) scope.params.onclose();
                    utils.removeCardsToTheRightOf(element);
                    utils.removeCard(element);
                }
                $compile(element)(scope);
            };
        }
    };
});