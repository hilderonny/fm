
app.directive('avtListCard', function($compile, $location, utils) { 
    var toolbartemplate = 
        '<md-toolbar avt-toolbar>' +
        '</md-toolbar>';
    var cardcontenttemplate =
        '<md-card-content>' +
        '   <md-list class="lines-beetween-items">' +
        '       <md-list-item ng-repeat="element in elements | orderBy: \'label\'" ng-click="selectelement(element)" ng-class="selectedelement === element ? \'active\' : false">' +
        '          <img ng-src="{{element.icon}}" />' +
        '          <p ng-bind="element.label"></p>' +
        '       </md-list-item>' +
        '   </md-list>' +
        '</md-card-content>';
    return {
        restrict: "A",
        scope: false,
        terminal: true,
        priority: 900,
        compile: function compile(element, attrs) {
            var params = attrs.avtListCard ? JSON.parse(attrs.avtListCard) : {};
            element.removeAttr("avt-list-card");
            var resizehandle = element[0].querySelector("resize-handle");
            element[0].toolbar = angular.element(toolbartemplate);
            element[0].cardcontent = angular.element(cardcontenttemplate);
            element.append(element[0].toolbar);
            element.append(element[0].cardcontent);
            if (resizehandle) element.append(resizehandle);
            return function link(scope, iElement) {
                scope.detailscard = params.detailscard;
                scope.onbeforecreateelement = function($event) {
                    delete scope.selectedelement;
                };
                scope.ondetailscardclosed = function() {
                    if (!scope.selectedelement) return; // when new element card is open
                    var datatypename = scope.selectedelement.datatypename;
                    delete scope.selectedelement;
                    utils.setLocation('/' + datatypename);
                };
                scope.onelementcreated = function(datatype, createdelementname) {
                    utils.loaddynamicobject(datatype.name, createdelementname).then(function(newelement) {
                        newelement.datatypename = datatype.name;
                        newelement.icon = datatype.icon;
                        newelement.label =  newelement[scope.$root.titlefields[newelement.datatypename]] || newelement.name;
                        scope.elements.push(newelement);
                        scope.selectelement(newelement);
                    });
                };
                scope.onelementdeleted = function() {
                    scope.elements.splice(scope.elements.indexOf(scope.selectedelement), 1);
                    delete scope.selectedelement;
                };
                scope.onelementupdated = function(updatedelement) {
                    scope.selectedelement.label = updatedelement[scope.$root.titlefields[scope.selectedelement.datatypename]] || updatedelement.name;
                };
                scope.loadelements = function() {
                    var api = params.api ? params.api : "/api/dynamic/rootelements/" + params.listfilter;
                    return utils.getresponsedata(api).then(function(elements) {
                        scope.elements = elements;
                        elements.forEach(function(e) {
                            e.label = e[scope.$root.titlefields[e.datatypename]] || e.name;
                        });
                        var pathparts = $location.path().split("/");
                        if (pathparts.length > 2) scope.selectelement(elements.find(function(e) { return e.name === pathparts[2];}));
                    });
                };
                scope.selectelement = function(e) {
                    if (!e || !scope.detailscard) return;
                    utils.removeCardsToTheRightOf(element);
                    utils.adddetailscard(scope, e.datatypename, e.name, scope.params.permission).then(function() {
                        scope.selectedelement = e;
                    });
                };
                $compile(iElement)(scope);
                scope.loadelements();
            };
        }
    }
});