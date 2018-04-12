
app.directive('avtReferenceSelect', function($compile, utils) {
    var selecttemplate = 
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
        '<ng-include flex src="\'hierarchylist\'"></ng-include>'
    ;
    return {
        restrict: "A",
        scope: true,
        terminal: false,
        priority: 1000,
        compile: function compile(element, attrs) {
            if (!attrs.avtReferenceSelect) return;
            var datatypefieldscopename = attrs.avtReferenceSelect;
            element.removeAttr("avt-reference-select");
            element.attr("ng-click", "$parent.showselectdialog()");
            element.append(angular.element("<span>HU{{$parent.dynamicobject.name}}PE</span>"));
            return function link(scope, iElement) {
                var datatypefield = scope[datatypefieldscopename];
                console.log(datatypefield);
                scope.showselectdialog = function() {
                    return utils.getresponsedata("/api/dynamic/rootelements/" + scope.datatypefield.reference).then(function(rootelements) {
                        console.log(rootelements);
                        scope.child = { children: rootelements };
                        scope.child.children.forEach(function(c) {
                            if (!c.label) c.label = c[titlefields[c.datatypename]];
                        });
                        utils.showdialog(scope, selecttemplate, [
                            { label: "TRK_OK" },
                            { label: "TRK_CANCEL" }
                        ]);
                    });
                };
                scope.onreferenceclick = function() {
                    console.log(scope);
                };
                scope.openchild = function(child) {
                    console.log(child);
                    return utils.getresponsedata("/api/dynamic/children/" + scope.datatypefield.reference + "/" + child.datatypename + "/" + child.name).then(function(children) {
                        child.children = children;
                        child.isopen = true;
                    });
                };
                $compile(iElement)(scope);
            };
        }
    };
});