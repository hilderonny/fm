
app.directive('avtListCard', function($compile, $http, $location, utils) { 
    var cardcontent = 
        '<md-card-content>' +
        '   <md-list class="lines-beetween-items">' +
        '       <md-list-item ng-repeat="element in elements | orderBy: \'label\'" ng-click="selectelement(element)" ng-class="selectedelement === element ? \'active\' : false">' +
        '          <md-icon md-svg-src="{{element.icon}}"></md-icon>' +
        '          <p ng-bind="element.label"></p>' +
        '       </md-list-item>' +
        '   </md-list>' +
        '</md-card-content>'
    ;
    return {
        restrict: "A",
        scope: true,
        terminal: true,
        priority: 900,
        compile: function compile(element, attrs) {
            element.removeAttr("avt-list-card");
            var resizehandle = element[0].querySelector("resize-handle");
            element.append(angular.element(cardcontent));
            if (resizehandle) element.append(resizehandle);
            return function link(scope, iElement) {
                var titlefields = {};
                Object.keys(scope.$root.datatypes).forEach(function(k) {
                    var dt = scope.$root.datatypes[k];
                    titlefields[k] = dt.titlefield ? dt.titlefield : "name";
                });
                var closedetails = function() {
                    var datatypename = scope.selectedchild.datatypename;
                    delete scope.selectedchild;
                    utils.setLocation('/' + datatypename);
                };
                scope.createelement = function($event) {
                    // Show selection panel for element types
                    var datatypes = Object.keys(scope.$root.datatypes).map(function(k) { return scope.$root.datatypes[k]; }).filter(function(dt) { return dt.lists.indexOf(scope.params.listfilter) >= 0; });
                    utils.showselectionpanel($event, datatypes, function(selecteddatatype) {
                        utils.removeCardsToTheRightOf(element);
                        utils.addCardWithPermission("components/DetailsCard", {
                            datatypename: selecteddatatype.name,
                            onclose: closedetails,
                            oncreate: function(datatype, elementname) { // Root element was created
                                utils.loaddynamicobject(datatype.name, elementname).then(function(newelement) {
                                    newelement.datatypename = datatype.name;
                                    newelement.icon = datatype.icon;
                                    if (!newelement.label) newelement.label =  newelement[titlefields[newelement.datatypename]];
                                    scope.elements.push(newelement);
                                    scope.selectelement(newelement);
                                });
                            }
                        }, scope.params.permission);
                        delete scope.selectedelement;
                    });
                };
                scope.loadelements = function() {
                    return utils.getresponsedata("/api/dynamic/rootelements/" + scope.params.listfilter).then(function(elements) {
                        scope.elements = elements;
                        elements.forEach(function(e) {
                            if (!e.label) e.label = e[titlefields[e.datatypename]];
                        });
                        var pathparts = $location.path().split("/");
                        if (pathparts.length > 2) scope.selectelement(elements.find(function(e) { return e.name === pathparts[2];}));
                    });
                };
                scope.selectelement = function(e) {
                    utils.removeCardsToTheRightOf(element);
                    utils.addCardWithPermission("components/DetailsCard", {
                        datatypename: e.datatypename,
                        entityname: e.name,
                        icon: scope.$root.datatypes[e.datatypename].icon,
                        onclose: closedetails,
                        ondelete: function() {
                            // Remove deleted element
                            scope.elements.splice(scope.elements.indexOf(scope.selectedelement), 1);
                            delete scope.selectedelement;
                        },
                        onsave: function(updatedentity) {
                            if (updatedentity.label) {
                                e.label = updatedentity.label;
                            } else {
                                e.label =  updatedentity[titlefields[updatedentity.datatypename]];
                            }
                        }
                    }, scope.params.permission).then(function() {
                        scope.selectedelement = e;
                    });
                };
                $compile(iElement)(scope);
                scope.loadelements();
            };
        }
    }
});