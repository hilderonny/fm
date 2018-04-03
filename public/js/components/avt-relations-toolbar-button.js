
app.directive('avtRelationsToolbarButton', function($compile) { 
    return {
        restrict: "A",
        // templateUrl: "/partial/components/avt-toolbar-button.html",
        // priority: 2000,
        scope: false,
        link: function(scope, element, attr) {
            scope.icon = "/css/icons/material/Add Link.svg";
            scope.label = "TRK_RELATIONS_LINK";
            scope.tooltip = "TRK_RELATIONS_ADD_LINK";
            scope.onclick = function($event) {
                console.log("NOW OPEN A RELATIONS CREATION DIALOG!", scope.datatype, scope.dynamicobject, scope.$root.relationtypes, scope.$root.datatypes);
            }
        }
        // compile: function compile(element, attrs) {
        //     var islinked = false;
        //     element.removeAttr("avt-relations-toolbar-button");
        //     element.attr("icon", "TRK_RELATIONS_LINK");
        //     element.attr("label", "/css/icons/material/Add Link.svg");
        //     element.attr("tooltip", "TRK_RELATIONS_ADD_LINK");
        //     return function link(scope, iElement, iAttrs) {
        //         if (islinked) return;
        //         console.log("LINK", scope, iElement, iAttrs);
        //         islinked = true;
        //         $compile(iElement)(scope);
        //     };
        // }
    }
});