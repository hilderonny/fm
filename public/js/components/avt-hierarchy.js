
app.directive('avtHierarchy', function($compile, $http, utils) { 
    var cardcontent = angular.element(
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
    );
    return {
        restrict: "A",
        scope: true,
        priority: 900,
        compile: function compile(element, attrs) {
            element.removeAttr("avt-hierarchy"); //remove the attribute to avoid indefinite loop
            var resizehandle = element[0].querySelector("resize-handle");
            if (resizehandle) {
                element[0].insertBefore(cardcontent[0], resizehandle); // script
                element[0].insertBefore(cardcontent[1], resizehandle); // md-card-content
            } else {
                element.append(cardcontent);
            }
            return {
                pre: function preLink(scope, iElement) {
                    scope.createrootelement = function($event) {
                        // Show selection panel for child types
                        utils.showselectionpanel($event, "/api/datatypes?forlist=" + scope.params.listfilter, function(selectedelement) {
                            var datatypename = selectedelement.name;
                            utils.removeCardsToTheRightOf(element);
                            // TODO: Show details card with datatype as parameter. Parameters: datatypename, parentdatatypename, parententityname
                            // utils.addCardWithPermission(scope.params.detailscard, {
                            // }, scope.params.permission);
                        });
                    };
                    scope.loadrootelements = function() {
                        scope.$root.isLoading = true;
                        $http.get('/api/dynamic/rootelements/' + scope.params.listfilter).then(function(response) {
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
                        // TODO: Show details card. Parameters: datatypename, entityname
                        // utils.addCardWithPermission(scope.params.detailscard, {
                        //     name: child.name,
                        // }, scope.params.permission).then(function() {
                        //     scope.selectedchild = child;
                        // });
                    };
                },
                post: function postLink(scope, iElement) {  
                    $compile(iElement)(scope);
                    scope.loadrootelements();
                }
            };
        }
    }
});