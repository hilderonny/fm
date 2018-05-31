
app.directive('avtBimDin277Card', function ($compile) {
    var template = '<md-card-content>Hallo Welt!</md-card-content>';
    return {
        restrict: "A",
        terminal: true,
        scope: true,
        priority: 900,
        compile: function compile(element, attrs) {
            element.removeAttr("avt-bim-din277-card");
            element.attr("class", "areas-card");
            var resizehandle = element[0].querySelector("resize-handle");
            var cardelement = angular.element(template);
            element.append(cardelement);
            if (resizehandle) element.append(resizehandle);
            return function link(scope, iElement) {
                $compile(element)(scope);
            }
        }
    };
});