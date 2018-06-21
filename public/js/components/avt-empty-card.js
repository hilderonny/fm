app.directive('avtEmptyCard', function($compile) { 
    var toolbartemplate = '<md-toolbar avt-toolbar></md-toolbar>';
    var cardcontenttemplate ='<md-card-content></md-card-content>';
    return {
        restrict: "A",
        scope: false,
        terminal: true,
        priority: 900,
        compile: function compile(element) {
            if (element.length < 1) return;
            element.removeAttr("avt-empty-card");
            var resizehandle = element[0].resizehandle || element[0].querySelector("resize-handle");
            element[0].toolbar = angular.element(toolbartemplate);
            element[0].cardcontent = angular.element(cardcontenttemplate);
            element.append(element[0].toolbar);
            element.append(element[0].cardcontent);
            if (resizehandle) element.append(resizehandle);
            return function link(scope, iElement) {
                $compile(iElement)(scope);
            };
        }
    }
});