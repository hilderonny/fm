
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
                scope.load = function() {
                    console.log("LOADING ...");
                    console.log(scope.params);
                    scope.$root.isLoading = true;
                    Promise.all([
                        utils.loaddatatypefields(scope.params.datatypename).then(function(datatypefields) { scope.datatypefields = datatypefields; }),
                        utils.loadrelationtypes().then(function(relationtypes) { scope.relationtypes = relationtypes; }),
                        scope.params.entityname ? utils.loaddynamicobject(scope.params.datatypename, scope.params.entityname).then(function(dynamicobject) { scope.dynamicobject = dynamicobject; }) : Promise.resolve(),
                        scope.params.entityname ? utils.loaddynamicattributes(scope.params.datatypename, scope.params.entityname).then(function(dynamicattributes) { scope.dynamicattributes = dynamicattributes; }) : Promise.resolve(), // TODO: Irrelevant in the future
                        scope.params.entityname ? utils.loadrelations(scope.params.datatypename, scope.params.entityname).then(function(relations) { scope.relations = relations; }) : Promise.resolve(),
                    ]).then(function() {
                        scope.$root.isLoading = false;
                        console.log(
                            scope.datatypefields, 
                            scope.relationtypes, 
                            scope.dynamicobject, 
                            scope.dynamicattributes, 
                            scope.relations, 
                            "LOADING DONE.");
                    });
                };
                $compile(iElement)(scope);
                scope.load();
            };
        }
    }
});