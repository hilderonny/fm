
app.directive('avtDetails', function($compile, $http, utils) { 
    var cardcontent = angular.element(
        '<md-card-content>' +
        '</md-card-content>'
    );
    return {
        restrict: "A",
        scope: true,
        priority: 900,
        compile: function compile(element, attrs) {
            element.removeAttr("avt-details");
            element.attr("class", "list-details-details");
            var resizehandle = element[0].querySelector("resize-handle");
            if (resizehandle) {
                element[0].insertBefore(cardcontent[0], resizehandle);
            } else {
                element.append(cardcontent);
            }
            return function link(scope, iElement) {
                scope.loaddetails = function() {
                    console.log("LOADING DETAILS");
                }
                $compile(iElement)(scope);
                scope.loaddetails();
            };
        }
    }
});