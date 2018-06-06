
app.directive('avtReferenceSelect', function($compile, utils) {
    var selecttemplate = 
        '<script type="text/ng-template" id="hierarchylist">' +
        '   <md-list class="hierarchy">' +
        '        <md-list-item flex layout="column" ng-repeat="child in child.children | orderBy: \'label\'">' +
        '            <div flex layout="row" ng-class="{active:selectedchild==child}">' +
        '                <md-icon ng-click="openchild(child)" ng-if="!child.isopen && child.haschildren" md-svg-src="/css/icons/material/Sort Right.svg"></md-icon>' +
        '                <md-icon ng-click="child.isopen=false" ng-if="child.isopen && child.haschildren" md-svg-src="/css/icons/material/Sort Down.svg"></md-icon>' +
        '                <md-icon ng-if="!child.haschildren"></md-icon>' +
        '                <img ng-click="selectchild(child)" ng-src="{{child.icon}}" ng-if="child.icon" />' +
        '                <p class="nowrap" ng-click="selectchild(child)">{{child[titlefield] || child.name}}</p>' +
        '                <md-icon></md-icon>' +
        '            </div>' +
        '            <ng-include flex src="\'hierarchylist\'" ng-if="child.isopen"></ng-include>' +
        '        </md-list-item>' +
        '    </md-list>' +
        '</script>' +
        '<ng-include flex src="\'hierarchylist\'"></ng-include>'
    ;
    return {
        restrict: "A",
        scope: true,
        terminal: false,
        priority: 1000,
        compile: function compile(element, attrs) {
            element.removeAttr("avt-reference-select");
            return {
                pre: function(scope, iElement, iAttr) {
                    if (scope.datatypefield.fieldtype !== "reference") return iElement.remove();
                    iElement.parent().addClass("md-input-has-value"); // For styling label
                    iElement.addClass("avt-reference-select");
                    scope.titlefield = scope.$root.titlefields[scope.datatypefield.reference];
                    var buttoncontent = angular.element('<span ng-click="openselectiondialog()"><span>{{selectedreference[titlefield] || selectedreference.name}}</span><md-icon md-svg-src="/css/icons/material/icons8-more.svg"></md-icon></span>');
                    iElement.append(buttoncontent);
                    $compile(buttoncontent)(scope);
                    scope.selectchild = function(child) {
                        scope.selectedchild = child;
                    };
                    scope.openselectiondialog = function() {
                        var datatypefield = scope.datatypefield;
                        var entityname = scope.dynamicobject[datatypefield.name];
                        utils.getresponsedata("/api/dynamic/hierarchytoelement/" + datatypefield.reference + "/" + datatypefield.reference + "/" + entityname).then(function(rootelements) {
                            scope.child = { children: rootelements };
                            var setparentofchildrenrecursively = function(child) {
                                if (child.name && child.name === entityname) {
                                    scope.selectedreference = child;
                                }
                                if (child.children) child.children.forEach(function(c) {
                                    c.parent = child;
                                    setparentofchildrenrecursively(c);
                                });
                            };
                            setparentofchildrenrecursively(scope.child);
                            var newscope = scope.$new(false);
                            newscope.titlefield = scope.titlefield;
                            newscope.selectedchild = scope.selectedreference;
                            var okbutton = { label: "OK", ishidden: true, onclick: function() {
                                scope.selectedreference = newscope.selectedchild;
                                scope.dynamicobject[scope.datatypefield.name] = scope.selectedreference.name;
                            }};
                            newscope.openchild = function(child) {
                                return utils.getresponsedata("/api/dynamic/children/" + scope.datatypefield.reference + "/" + child.datatypename + "/" + child.name).then(function(children) {
                                    child.children = children;
                                    child.isopen = true;
                                });
                            };
                            newscope.selectchild = function(child) {
                                newscope.selectedchild = child;
                            };
                            newscope.$watch("selectedchild", function(selectedchild) {
                                okbutton.ishidden = !selectedchild;
                            });
                            utils.showdialog(newscope, selecttemplate, [
                                okbutton,
                                { label: "Abbrechen" }
                            ]);
                        });
                    };
                    scope.$watch("dynamicobject", function(dynamicobject) {
                        if (!dynamicobject || Object.keys(dynamicobject).length < 1) return;
                        var datatypefield = scope.datatypefield;
                        if (dynamicobject[datatypefield.name]) utils.getresponsedata("/api/dynamic/" + datatypefield.reference + "/" + dynamicobject[datatypefield.name]).then(function(selectedreference) {
                            if (!selectedreference.label) selectedreference.label = selectedreference[scope.$root.titlefields[datatypefield.reference]];
                            scope.selectedreference = selectedreference;
                        });
                    });
                }
            }
        }
    };
});