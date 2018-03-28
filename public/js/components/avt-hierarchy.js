
app.directive('avtHierarchy', function($compile, $http, utils) { 
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
        priority: 900,
        compile: function compile(element, attrs) {
            element.removeAttr("avt-hierarchy"); //remove the attribute to avoid indefinite loop
            var resizehandle = element[0].querySelector("resize-handle");
            element.append(angular.element(cardcontent));
            if (resizehandle) element.append(resizehandle);
            return {
                pre: function(scope, iElement) {
                    var closedetails = function() {
                        delete scope.selectedchild;
                    };
                    scope.createrootelement = function($event) {
                        // Show selection panel for child types
                        utils.showselectionpanel($event, "/api/datatypes?forlist=" + scope.params.listfilter, function(selectlistedelement) {
                            utils.removeCardsToTheRightOf(element);
                            utils.addCardWithPermission("components/DetailsCard", {
                                icon: scope.params.icon,
                                datatypename: selectlistedelement.name,
                                onclose: closedetails,
                                oncreate: function(elementname) {
                                    if (!scope.selectedchild) { // Root element was created
                                        utils.loaddynamicobject(selectlistedelement.name, elementname).then(function(newrootelement) {
                                            newrootelement.datatypename = selectlistedelement.name;
                                            newrootelement.icon = selectlistedelement.icon;
                                            newrootelement.children = [];
                                            console.log(newrootelement);
                                            scope.child.children.push(newrootelement);
                                            scope.selectchild(newrootelement);
                                        });
                                    }
                                }
                            }, scope.params.permission);
                            delete scope.selectedchild;
                        });
                    };
                    scope.loadrootelements = function() {
                        $http.get('/api/dynamic/rootelements/' + scope.params.listfilter).then(function(response) {
                            scope.child = { children: response.data };
                        });
                    };
                    scope.openchild = function(child) {
                        $http.get('/api/dynamic/children/' + child.datatypename + '/' + child.name).then(function(response) {
                            child.children = response.data;
                            child.isopen = true;
                        });
                    };
                    scope.selectchild = function(child) {
                        utils.removeCardsToTheRightOf(element);
                        utils.addCardWithPermission("components/DetailsCard", {
                            icon: scope.params.icon,
                            datatypename: child.datatypename,
                            entityname: child.name,
                            onclose: closedetails
                        }, scope.params.permission).then(function() {
                            scope.selectedchild = child;
                        });
                    };
                },
                post: function(scope, iElement) {  
                    $compile(iElement)(scope);
                    scope.loadrootelements();
                }
            };
        }
    }
});