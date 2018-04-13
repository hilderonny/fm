app.directive('avtDocumentShareLink', function($compile, utils) { 
    var template = '<p ng-if="dynamicobject && dynamicobject.isshared"><a href="{{sharelinkprefix}}{{dynamicobject.name}}" target="_blank" class="share-link">{{sharelinkprefix}}{{dynamicobject.name}}</a></p>';
    return {
        restrict: "A",
        priority: 880,
        scope: false,
        compile: function compile(element, attrs) {
            if (element.length < 1 || !element[0].form) return;
            var form = element[0].form;
            var sharelink = angular.element(template);
            var cardactions = form.find("md-card-actions")[0];
            form[0].insertBefore(sharelink[0], cardactions);
            return function link(scope) {
                scope.sharelinkprefix = window.location.origin + '/api/documents/share/';
            }
        }
    }
});