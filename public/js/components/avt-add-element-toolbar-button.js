/*
$parent.detailscard könnte in dieses Attribut aufgenommen werden, damit ein Add User button beispielsweise
auch in die Detailkarte einer Benutzergruppe rein könnte. Dann müsste der Parameter datatypenames so aufgebohrt
werden, dass für jeden Datentypnamen die Detailkarte spezifiziert werden kann
*/
app.directive('avtAddElementToolbarButton', function($rootScope, $compile, utils) { 
    var template = '<md-button ng-if="$parent.canwrite && $parent.detailscard" avt-toolbar-button ng-click="createelement($event)" icon="/css/icons/material/Plus Math.svg" label="Element" tooltip="Neues Element erstellen"></md-button>';
    return {
        restrict: "A",
        priority: 890,
        scope: false,
        compile: function compile(element, attrs) {
            if (element.length < 1 || !element[0].toolbar || !attrs.avtAddElementToolbarButton) return;
            var params = JSON.parse(attrs.avtAddElementToolbarButton);
            element.removeAttr("avt-add-element-toolbar-button");
            var toolbar = element[0].toolbar;
            var button = angular.element(template);
            toolbar.append(button);
            if (params.label && params.tooltip) {
                button.attr("label", params.label);
                button.attr("tooltip", params.tooltip);
            } else if (params.datatypenames && params.datatypenames.length < 2) {
                var datatypelabel = $rootScope.datatypes[params.datatypenames[0]].label;
                button.attr("label", datatypelabel);
                button.attr("tooltip", datatypelabel + " erstellen");
            }
            return function link(scope) {
                if (params.detailscard) scope.detailscard = params.detailscard; // For add buttons within details cards
                scope.createelement = function($event) {
                    function opendetailscard(datatypename) {
                        if (scope.onbeforecreateelement) scope.onbeforecreateelement($event); // "Before" handling in hierarchy roots
                        utils.removeCardsToTheRightOf(element);
                        utils.adddetailscard(scope, datatypename, undefined, scope.params.permission, scope.params.datatypename, scope.params.entityname); // Forward actual element to parents of child creation card
                    }
                    if (params.datatypenamelist) {
                        var datatypes = Object.keys(scope.$root.datatypes).map(function(k) { return scope.$root.datatypes[k]; }).filter(function(dt) { return dt.lists && dt.lists.indexOf(params.datatypenamelist) >= 0; });
                        utils.showselectionpanel($event, datatypes, function(selecteddatatype) {
                            opendetailscard(selecteddatatype.name);
                        });
                    } else if (params.datatypenames.length > 1) {
                        var datatypes = params.datatypenames.map(function(dtn) { return $rootScope.datatypes[dtn]; });
                        utils.showselectionpanel($event, datatypes, function(selecteddatatype) {
                            opendetailscard(selecteddatatype.name);
                        });
                    } else {
                        opendetailscard(params.datatypenames[0]);
                    }
                };
            };
        }
    }
});