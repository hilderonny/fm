
app.directive('avtProgressSpinner', function($compile, utils) { 
    var template = '<div class="progress-panel" ng-if="isinprogress"><md-progress-circular md-mode="{{progressmode}}" value="{{progressvalue}}"></md-progress-circular><span>{{progressvalue}} %</span></div>';
    return {
        restrict: "A",
        scope: false,
        compile: function compile(element, attrs) {
            var spinner = angular.element(template);
            element.append(spinner);
        }
    };
});