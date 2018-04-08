
app.directive('avtCloseToolbarButton', function($compile, utils) { 
    var template = '<md-button avt-toolbar-button ng-click="onclose()" icon="/css/icons/material/Delete.svg"></md-button>';
    return {
        restrict: "A",
        priority: 800,
        scope: false,
        compile: function compile(element, attrs) {
            if (element.length < 1 || !element[0].toolbar) return;
            element.removeAttr("avt-close-toolbar-button");
            var toolbar = element[0].toolbar;
            var button = angular.element(template);
            toolbar.append(angular.element("<div flex></div>"));
            toolbar.append(button);
            // return function link(scope) {
            //     scope.close = scope.params.onclose;
            // };
        }
    }
});