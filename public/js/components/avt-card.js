
app.directive('avtCard', function($compile, utils) { 
    return {
        restrict: "A",
        scope: true,
        terminal: true, // see https://stackoverflow.com/a/19228302
        priority: 1000,
        compile: function compile(element, attrs) {
            element.attr('ng-cloak', 'ng-cloak');
            element.append(angular.element("<resize-handle></resize-handle>"));
            element.removeAttr("avt-card"); //remove the attribute to avoid indefinite loop
            return function link(scope, iElement, iAttrs) {
                if (scope.params.icon) element.attr("style", "background-image:url('/css/icons/office/"+ scope.params.icon + ".svg')");
                scope.closecard = function() {
                    if (scope.params.onclose) scope.params.onclose();
                    utils.removeCardsToTheRightOf(iElement);
                    utils.removeCard(iElement);
                }
                $compile(iElement)(scope);
            };
        }
    };
});