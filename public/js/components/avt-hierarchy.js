
var hierarchyDirective = {
    link: function(scope) {
        scope.content = "INHALT";
    }
}

app.directive('avtHierarchy', function() { return hierarchyDirective; });