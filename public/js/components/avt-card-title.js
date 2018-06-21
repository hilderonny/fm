app.directive('avtCardTitle', function(utils) { 
    var cardtitletemplate =
        '<md-card-title flex="none">' +
        '   <md-card-title-text>' +
        '       <span class="md-headline">{{title}}</span>' +
        '   </md-card-title-text>' +
        '</md-card-title>';
    return {
        restrict: "A",
        priority: 890,
        compile: function compile(element, attrs) {
            if (element.length < 1 || !element[0].cardcontent) return;
            var params = attrs.avtCardTitle ? JSON.parse(attrs.avtCardTitle) : {};
            element.removeAttr("avt-card-title");
            var titleelement = angular.element(cardtitletemplate);
            element[0].cardcontent.append(titleelement);
            return (scope) => {
                scope.title = params.title ? params.title : "";
                if (params.showentitylabel) {
                    utils.loaddynamicobject(scope.params.datatypename, scope.params.entityname).then(function(dynamicobject) {
                        scope.title = [scope.title, dynamicobject.label].join(" ");
                    })
                }
            };
        }
    }
});