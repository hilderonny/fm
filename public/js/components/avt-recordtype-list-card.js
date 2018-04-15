
app.directive('avtRecordtypeListCard', function($compile, $location, utils) { 
    var toolbartemplate = 
        '<md-toolbar avt-toolbar>' +
        '</md-toolbar>';
    var cardcontenttemplate =
        '<md-card-content>' +
        '   <md-list class="lines-beetween-items">' +
        '       <md-list-item ng-repeat="recordtype in recordtypes | orderBy: \'label\'" ng-click="selectelement(recordtype)" ng-class="selectedrecordtype === recordtype ? \'active\' : false">' +
        '          <md-icon md-svg-src="{{recordtype.icon}}"></md-icon>' +
        '          <p ng-bind="recordtype.label"></p>' +
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
            element.removeAttr("avt-recordtype-list-card");
            var resizehandle = element[0].querySelector("resize-handle");
            element[0].toolbar = angular.element(toolbartemplate);
            element[0].cardcontent = angular.element(cardcontenttemplate);
            element.append(element[0].toolbar);
            element.append(element[0].cardcontent);
            if (resizehandle) element.append(resizehandle);
            return function link(scope, iElement) {
                scope.onbeforecreateelement = function($event) {
                    delete scope.selectedrecordtype;
                };
                scope.ondetailscardclosed = function() {
                    if (!scope.selectedrecordtype) return; // when new recordtype card is open
                    var datatypename = scope.selectedrecordtype.datatypename;
                    delete scope.selectedrecordtype;
                };
                scope.onelementcreated = function(datatype, createdelementname) {
                    utils.loaddynamicobject(datatype.name, createdelementname).then(function(newelement) {
                        newelement.datatypename = datatype.name;
                        newelement.icon = datatype.icon;
                        if (!newelement.label) newelement.label =  newelement[scope.$root.titlefields[newelement.datatypename]];
                        scope.recordtypes.push(newelement);
                        scope.selectelement(newelement);
                    });
                };
                scope.onelementdeleted = function() {
                    scope.recordtypes.splice(scope.recordtypes.indexOf(scope.selectedrecordtype), 1);
                    delete scope.selectedrecordtype;
                };
                scope.onelementupdated = function(updatedelement) {
                    scope.selectedrecordtype.label = updatedelement.label ? updatedelement.label : updatedelement[scope.$root.titlefields[updatedelement.datatypename]];
                };
                scope.loadelements = function() {
                    return utils.getresponsedata("/api/recordtypes/").then(function(recordtypes) {
                        scope.recordtypes = Object.keys(recordtypes).map(function(k) { return recordtypes[k]; });;
                        console.log(recordtypes);
                        scope.recordtypes.forEach(function(rt) {
                            if (!rt.label) rt.label = rt.name;
                        });
                    });
                };
                scope.selectelement = function(e) {
                    utils.removeCardsToTheRightOf(element);
                    console.log(e);
                    // utils.adddetailscard(scope, e.datatypename, e.name, scope.params.permission).then(function() {
                    //     scope.selectedrecordtype = e;
                    // });
                };
                $compile(iElement)(scope);
                scope.loadelements();
            };
        }
    }
});