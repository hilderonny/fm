/*
$parent.detailscard könnte in dieses Attribut aufgenommen werden, damit ein Add User button beispielsweise
auch in die Detailkarte einer Benutzergruppe rein könnte. Dann müsste der Parameter datatypenames so aufgebohrt
werden, dass für jeden Datentypnamen die Detailkarte spezifiziert werden kann
*/
app.directive('avtAddElementToolbarButton', function($rootScope, utils) { 
    var template = '<md-button ng-if="canwrite && (detailscard || detailscardname) && !isnew && showaddtoolbarbutton" avt-toolbar-button ng-click="createelement($event)" icon="/css/icons/material/Plus Math.svg" label="Element" tooltip="Neues Element erstellen"></md-button>';
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
            if (params.icon) button.attr("icon", params.icon);
            return function link(scope) {
                if (params.detailscard) scope.detailscard = params.detailscard; // For add buttons within details cards
                if (params.detailscardname) scope.detailscardname = params.detailscardname;
                // Check whether the datatype of the shown element matches
                scope.showaddtoolbarbutton = !params.availableondatatypenames || params.availableondatatypenames.indexOf(scope.params.datatypename) >= 0;
                scope.createelement = function($event) {
                    function opendetailscard(datatypename) {
                        if (scope.onbeforecreateelement) scope.onbeforecreateelement($event); // "Before" handling in hierarchy roots
                        utils.removeCardsToTheRightOf(element);
                        if (scope.detailscard) {
                            utils.adddetailscard(scope, datatypename, undefined, scope.params.permission, scope.params.datatypename, scope.params.entityname); // Forward actual element to parents of child creation card
                        } else if (scope.detailscardname) {
                            utils.addcardbyname(scope.detailscardname, {
                                datatypename: datatypename,
                                permission: scope.params.permission,
                                onclose: scope.ondetailscardclosed,
                                oncreate: scope.onelementcreated,
                                ondelete: scope.onelementdeleted,
                                onsave: scope.onelementupdated
                            });
                        }
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