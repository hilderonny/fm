
app.directive('avtHierarchy', function($compile, $http, $location, utils) { 
    var cardcontent = 
        '<script type="text/ng-template" id="hierarchylist">' +
        '   <md-list class="hierarchy">' +
        '        <md-list-item flex layout="column" ng-repeat="child in child.children | orderBy: \'label\'">' +
        '            <div flex layout="row" ng-class="{active:selectedchild==child}">' +
        '                <md-icon ng-click="openchild(child)" ng-if="!child.isopen && child.haschildren" md-svg-src="/css/icons/material/Sort Right.svg"></md-icon>' +
        '                <md-icon ng-click="child.isopen=false" ng-if="child.isopen && child.haschildren" md-svg-src="/css/icons/material/Sort Down.svg"></md-icon>' +
        '                <md-icon ng-if="!child.haschildren"></md-icon>' +
        '                <img ng-click="selectchild(child)" ng-src="{{child.icon}}" />' +
        '                <p class="nowrap" ng-bind="child.label" ng-click="selectchild(child)"></p>' +
        '            </div>' +
        '            <ng-include flex src="\'hierarchylist\'" ng-if="child.isopen"></ng-include>' +
        '        </md-list-item>' +
        '    </md-list>' +
        '</script>' +
        '<md-card-content>' +
        '    <ng-include flex src="\'hierarchylist\'"></ng-include>' +
        '</md-card-content>'
    ;
    return {
        restrict: "A",
        scope: true,
        terminal: true,
        priority: 900,
        compile: function compile(element, attrs) {
            element.removeAttr("avt-hierarchy"); //remove the attribute to avoid indefinite loop
            var resizehandle = element[0].querySelector("resize-handle");
            element.append(angular.element(cardcontent));
            if (resizehandle) element.append(resizehandle);
            return function link(scope, iElement) {
                var closedetails = function() {
                    delete scope.selectedchild;
                };
                scope.createrootelement = function($event) {
                    // Show selection panel for child types
                    var datatypes = Object.keys(scope.$root.datatypes).map(function(k) { return scope.$root.datatypes[k]; }).filter(function(dt) { return dt.lists.indexOf(scope.params.listfilter) >= 0; });
                    utils.showselectionpanel($event, datatypes, function(selecteddatatype) {
                        utils.removeCardsToTheRightOf(element);
                        utils.addCardWithPermission("components/DetailsCard", {
                            datatypename: selecteddatatype.name,
                            onclose: closedetails,
                            oncreate: function(datatype, elementname) { // Root element was created
                                utils.loaddynamicobject(datatype.name, elementname).then(function(newrootelement) {
                                    newrootelement.datatypename = datatype.name;
                                    newrootelement.icon = datatype.icon;
                                    if (!scope.child.children) scope.child.children = [];
                                    newrootelement.parent = scope.child;
                                    scope.child.children.push(newrootelement);
                                    scope.selectchild(newrootelement);
                                });
                            }
                        }, scope.params.permission);
                        delete scope.selectedchild;
                    });
                };
                scope.loadelementsfordirectaccess = function(datatypename, entityname) {
                    return utils.getresponsedata("/api/dynamic/hierarchytoelement/" + scope.params.listfilter + "/" + datatypename + "/" + entityname).then(function(rootelements) {
                        scope.child = { children: rootelements };
                        var setparentofchildrenrecursively = function(child) {
                            if (child.name === entityname) scope.selectchild(child);
                            if (child.children) child.children.forEach(function(c) {
                                c.parent = child;
                                setparentofchildrenrecursively(c);
                            });
                        };
                        setparentofchildrenrecursively(scope.child);
                    });
                };
                scope.loadrootelements = function() {
                    return utils.getresponsedata("/api/dynamic/rootelements/" + scope.params.listfilter).then(function(rootelements) {
                        if (!scope.child) { // Fresh load after card opening
                            scope.child = { children: rootelements };
                            scope.child.children.forEach(function(c) {
                                c.parent = scope.child;
                            });
                        } else { // Refresh after deletion of subelements which result in moving sub-sub-childs to the root
                            rootelements.forEach(function(c) {
                                if (!scope.child.children.find(function(sc) { return sc.name === c.name; })) {
                                    // Here we have a moved child
                                    scope.child.children.push(c);
                                    c.parent = scope.child;
                                }
                            });
                        }
                    });
                };
                scope.openchild = function(child) {
                    return utils.getresponsedata("/api/dynamic/children/" + scope.params.listfilter + "/" + child.datatypename + "/" + child.name).then(function(children) {
                        child.children = children;
                        child.children.forEach(function(cc) {
                            cc.parent = child;
                        });
                        child.isopen = true;
                    });
                };
                scope.selectchild = function(child) {
                    utils.removeCardsToTheRightOf(element);
                    utils.addCardWithPermission("components/DetailsCard", {
                        datatypename: child.datatypename,
                        entityname: child.name,
                        icon: scope.params.icon,
                        listfilter: scope.params.listfilter, // For adding childs
                        onclose: closedetails,
                        oncreate: function(datatype, elementname) { // child element was created
                            utils.loaddynamicobject(datatype.name, elementname).then(function(newchild) {
                                newchild.datatypename = datatype.name;
                                newchild.icon = datatype.icon;
                                if (!scope.selectedchild.children) scope.selectedchild.children = [];
                                scope.selectedchild.children.push(newchild);
                                newchild.parent = scope.selectedchild;
                                scope.selectedchild.haschildren = true;
                                scope.selectedchild.isopen = true;
                                scope.selectchild(newchild);
                            });
                        },
                        ondelete: function() {
                            var parentchild = scope.selectedchild.parent;
                            // Remove deleted element
                            parentchild.children.splice(parentchild.children.indexOf(scope.selectedchild), 1);
                            if (parentchild.children.length < 1) parentchild.haschildren = false;
                            scope.loadrootelements();
                            delete scope.selectedchild;
                        },
                        onsave: function(updatedentity) {
                            child.label = updatedentity.label;
                        }
                }, scope.params.permission).then(function() {
                        scope.selectedchild = child;
                    });
                };
                $compile(iElement)(scope);
                // Distinguish direct URLs between general menu clicks (without id)  and direct entity calls (with id)
                var pathparts = $location.path().split("/");
                if (pathparts.length > 2) { // [0] is empty because path starts with "/"
                    // direct access to any child of the hierarchy, so load the hierarchy down to the child
                    scope.loadelementsfordirectaccess(pathparts[1], pathparts[2]);
                } else {
                    // general access, load the root elements only
                    scope.loadrootelements();
                }
            };
        }
    }
});