
app.directive('avtHierarchyCard', function($compile, $http, $location, utils) { 
    var toolbartemplate = 
        '<md-toolbar avt-toolbar>' +
        '</md-toolbar>';
    var hierarchylisttemplate = 
        '<script type="text/ng-template" id="hierarchylist">' +
        '   <md-list class="hierarchy">' +
        '        <md-list-item flex layout="column" ng-repeat="child in child.children | orderBy: \'label\'">' +
        '            <div flex layout="row" ng-class="{active:selectedchild==child}">' +
        '                <md-icon ng-click="openchild(child)" ng-if="!child.isopen && child.haschildren" md-svg-src="/css/icons/material/Sort Right.svg"></md-icon>' +
        '                <md-icon ng-click="child.isopen=false" ng-if="child.isopen && child.haschildren" md-svg-src="/css/icons/material/Sort Down.svg"></md-icon>' +
        '                <md-icon ng-if="!child.haschildren"></md-icon>' +
        '                <img ng-click="selectchild(child)" ng-src="{{child.icon}}" ng-if="!params.hideicons" />' +
        '                <p class="nowrap" ng-bind="child.label" ng-click="selectchild(child)"></p>' +
        '            </div>' +
        '            <ng-include flex src="\'hierarchylist\'" ng-if="child.isopen"></ng-include>' +
        '        </md-list-item>' +
        '    </md-list>' +
        '</script>';
    var cardcontenttemplate =
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
            var params = attrs.avtHierarchyCard ? JSON.parse(attrs.avtHierarchyCard) : {};
            element.removeAttr("avt-hierarchy-card"); //remove the attribute to avoid indefinite loop
            var resizehandle = element[0].querySelector("resize-handle");
            element[0].toolbar = angular.element(toolbartemplate);
            element[0].hierarchylist = angular.element(hierarchylisttemplate);
            element[0].cardcontent = angular.element(cardcontenttemplate);
            element.append(element[0].toolbar);
            element.append(element[0].hierarchylist);
            element.append(element[0].cardcontent);
            if (resizehandle) element.append(resizehandle);
            return function link(scope, iElement) {
                scope.params = params;
                scope.detailscard = params.detailscard;
                scope.ondetailscardclosed = function() {
                    if (!scope.selectedchild) return; // when new element card is open
                    var datatypename = scope.selectedchild.datatypename;
                    delete scope.selectedchild;
                    utils.setLocation('/' + datatypename);
                };
                scope.onbeforecreateelement = function($event) {
                    delete scope.selectedchild;
                };
                scope.onelementcreated = function(datatype, createdelementname) {
                    if ((!datatype || !createdelementname) && scope.selectedchild) { // Document was extracted
                        scope.loadelementsfordirectaccess(scope.selectedchild.datatypename, scope.selectedchild.name);
                        return;
                    }
                    utils.loaddynamicobject(datatype.name, createdelementname).then(function(newelement) {
                        var selectedchild = scope.selectedchild ? scope.selectedchild : scope.child;
                        newelement.datatypename = datatype.name;
                        newelement.icon = datatype.icon;
                        newelement.parent = selectedchild;
                        newelement.label =  newelement[scope.$root.titlefields[newelement.datatypename]] || newelement.name;
                        if (!selectedchild.children) selectedchild.children = [];
                        selectedchild.children.push(newelement);
                        selectedchild.haschildren = true;
                        selectedchild.isopen = true;
                        scope.selectchild(newelement);
                    });
                };
                scope.onelementdeleted = function() {
                    var parentchild = scope.selectedchild.parent;
                    // Remove deleted element
                    parentchild.children.splice(parentchild.children.indexOf(scope.selectedchild), 1);
                    if (parentchild.children.length < 1) parentchild.haschildren = false;
                    if (scope.selectedchild.haschildren) scope.loadrootelements(); // For the case that children of the deleted element were moved
                    delete scope.selectedchild;
                };
                scope.onelementupdated = function(updatedelement) {
                    scope.selectedchild.label = updatedelement[scope.$root.titlefields[scope.selectedchild.datatypename]] || scope.selectedchild.name;
                    if (updatedelement.icon) scope.selectedchild.icon = updatedelement.icon;
                };
                scope.loadelementsfordirectaccess = function(datatypename, entityname) {
                    return utils.getresponsedata("/api/dynamic/hierarchytoelement/" + params.listfilter + "/" + datatypename + "/" + entityname).then(function(rootelements) {
                        scope.child = { children: rootelements };
                        var isselected = false;
                        var setparentofchildrenrecursively = function(child) {
                            if (child.name === entityname) {
                                scope.selectchild(child);
                                isselected = true;
                            }
                            if (child.children) child.children.forEach(function(c) {
                                c.parent = child;
                                c.label = c[scope.$root.titlefields[c.datatypename]] || c.name;
                                setparentofchildrenrecursively(c);
                            });
                        };
                        setparentofchildrenrecursively(scope.child);
                        if (!isselected) scope.selectchild({datatypename:datatypename, name: entityname}); // When hierarchy cannot be opened until the child (missing permission)
                    });
                };
                scope.loadrootelements = function() {
                    return utils.getresponsedata("/api/dynamic/rootelements/" + params.listfilter).then(function(rootelements) {
                        if (!scope.child) { // Fresh load after card opening
                            scope.child = { children: rootelements };
                            scope.child.children.forEach(function(c) {
                                c.parent = scope.child;
                                c.label = c[scope.$root.titlefields[c.datatypename]] || c.name;
                            });
                        } else { // Refresh after deletion of subelements which result in moving sub-sub-childs to the root
                            rootelements.forEach(function(c) {
                                if (!scope.child.children.find(function(sc) { return sc.name === c.name; })) {
                                    // Here we have a moved child
                                    scope.child.children.push(c);
                                    c.parent = scope.child;
                                    c.label = c[scope.$root.titlefields[c.datatypename]] || c.name;
                                }
                            });
                        }
                    });
                };
                scope.openchild = function(child) {
                    return utils.getresponsedata("/api/dynamic/children/" + params.listfilter + "/" + child.datatypename + "/" + child.name).then(function(children) {
                        child.children = children;
                        child.children.forEach(function(cc) {
                            cc.parent = child;
                            cc.label =  cc[scope.$root.titlefields[cc.datatypename]] || cc.name;
                        });
                        child.isopen = true;
                    });
                };
                scope.selectchild = function(child) {
                    if (!scope.detailscard) return;
                    utils.removeCardsToTheRightOf(element);
                    utils.adddetailscard(scope, child.datatypename, child.name, scope.params.permission, undefined, undefined, params.listfilter).then(function() {
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