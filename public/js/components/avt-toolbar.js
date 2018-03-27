
app.directive('avtToolbar', function() { 
    return {
        restrict: "A",
        link: function(scope, element, attributes) {
            attributes.$set("class", "md-toolbar-tools md-accent");
        }
    }
});