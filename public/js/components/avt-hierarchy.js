
app.directive('avtHierarchy', function($compile, $http, utils) { 
    var cardcontent = angular.element(
        '<script type="text/ng-template" id="hierarchylist">' +
        '   <md-list class="hierarchy">' +
        '        <md-list-item flex layout="column" ng-repeat="child in child.children | orderBy: \'label\'">' +
        '            <div flex layout="row" ng-class="{active:selectedchild==child}">' +
        '                <md-icon ng-click="openchild(child)" ng-if="!child.isopen" md-svg-src="/css/icons/material/Sort Right.svg"></md-icon>' +
        '                <md-icon ng-click="child.isopen=false" ng-if="child.isopen" md-svg-src="/css/icons/material/Sort Down.svg"></md-icon>' +
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
    );
    return {
        restrict: "A",
        scope: true,
        priority: 900,
        compile: function compile(element, attrs) {
            var relevantlist = attrs.avtHierarchy;
            element.removeAttr("avt-hierarchy"); //remove the attribute to avoid indefinite loop
            var resizehandle = element[0].querySelector("resize-handle");
            if (resizehandle) {
                element[0].insertBefore(cardcontent[0], resizehandle); // script
                element[0].insertBefore(cardcontent[1], resizehandle); // md-card-content
            } else {
                element.append(cardcontent);
            }
            return {
                pre: function preLink(scope, iElement, iAttrs, controller) {
                    scope.createrootelement = function() {
                        utils.removeCardsToTheRightOf(element);
                        utils.addCardWithPermission(iAttrs.avtDetailsCard, {
                        }, iAttrs.permission);
                    };
                    scope.loadrootelements = function() {
                        scope.$root.isLoading = true;
                        $http.get('/api/dynamic/rootelements/' + relevantlist).then(function(response) {
                            scope.child = { children: response.data };
                            scope.$root.isLoading = false;
                        });
                    };
                    scope.openchild = function(child) {
                        scope.$root.isLoading = true;
                        $http.get('/api/dynamic/children/' + child.datatypename + '/' + child.name).then(function(response) {
                            child.children = response.data;
                            child.isopen = true;
                            scope.$root.isLoading = false;
                        });
                    };
                    scope.selectchild = function(child) {
                        utils.removeCardsToTheRightOf(element);
                        utils.addCardWithPermission(iAttrs.avtDetailsCard, {
                            name: child.name,
                        }, iAttrs.permission).then(function() {
                            scope.selectedchild = child;
                        });
                    };
                },
                post: function postLink(scope, iElement, iAttrs, controller) {  
                    $compile(iElement)(scope);
                    scope.loadrootelements();
                }
            };
        }
    }
});