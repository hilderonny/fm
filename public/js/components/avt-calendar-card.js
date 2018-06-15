app.directive('avtCalendarCard', function($compile, $location, utils) { 
    var toolbartemplate = 
        '<md-toolbar avt-toolbar>' +
        '</md-toolbar>';
    var cardcontenttemplate =
        '<md-tabs md-selected="selectedtab">' +
        '   <md-tab label="Heute"></md-tab>' +
        '   <md-tab label="Überfällig"></md-tab>' +
        '   <md-tab label="Alle"></md-tab>' +
        '   <md-tab label="Laufende Woche"></md-tab>' +
        '   <md-tab label="Laufender Monat"></md-tab>' +
        '   <md-tab label="Nächste 7 Tage"></md-tab>' +
        '   <md-tab label="Nächste 30 Tage"></md-tab>' +
        '</md-tabs>' +
        '<md-card-content>' +
        '   <md-list class="lines-beetween-items activities-3">' +
        '       <md-list-item ng-repeat="element in elements | filter:filteractivities | orderBy: [\'date\',\'label\']" ng-click="selectelement(element)" ng-class="{active:selectedelement === element,strikethrough:element.isdone}">' +
        '           <img ng-src="{{element.icon}}" />' +
        '           <div class="md-list-item-text">' +
        '               <h3 ng-bind="element.label"></h3>' +
        '               <h4 ng-bind="activitytypes[element.activitytypename]"></h4>' +
        '               <p ng-bind="element.date | amDateFormat: \'L\'"></p>' +
        '           </div>' +
        '       </md-list-item>' +
        '   </md-list>' +
        '</md-card-content>';
    return {
        restrict: "A",
        scope: false,
        terminal: true,
        priority: 900,
        compile: function compile(element, attrs) {
            element.removeAttr("avt-calendar-card");
            var resizehandle = element[0].querySelector("resize-handle");
            element[0].toolbar = angular.element(toolbartemplate);
            element[0].cardcontent = angular.element(cardcontenttemplate);
            element.append(element[0].toolbar);
            element.append(element[0].cardcontent);
            if (resizehandle) element.append(resizehandle);
            return function link(scope, iElement) {
                scope.detailscard = 'Office/ActivityCard';
                scope.selectedtab = 0;
                var now = new Date();
                var urknall = new Date(-8000000000000000);
                var endofdays = new Date(8000000000000000);
                var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                var tomorrow = new Date(today); // http://stackoverflow.com/a/19691491
                tomorrow.setDate(tomorrow.getDate() + 1);
                var monday = new Date(today);
                monday.setDate(monday.getDate() - ((monday.getDay() - 1) % 7));
                var nextMonday = new Date(monday);
                nextMonday.setDate(nextMonday.getDate() + 7);
                var firstInMonth = new Date(today);
                firstInMonth.setDate(1);
                var firstInNextMonth = new Date(today);
                firstInNextMonth.setDate(28);
                while(firstInNextMonth.getMonth() === today.getMonth()) {
                    firstInNextMonth.setDate(firstInNextMonth.getDate() + 1);
                }
                var after7Days = new Date(today);
                after7Days.setDate(after7Days.getDate() + 7);
                var after30Days = new Date(today);
                after30Days.setDate(after30Days.getDate() + 30);
                scope.filteractivities = function(activity) {
                    var from, to, showdone = false;
                    switch (scope.selectedtab) {
                        // Heute
                        case 0: from = today; to = tomorrow; break;
                        // Überfällig
                        case 1: from = urknall; to = today; break;
                        // Alle
                        default:
                        case 2: showdone = true; from = urknall; to = endofdays; break;
                        // Laufende Woche
                        case 3: from = monday; to = nextMonday; break;
                        // Laufender Monat
                        case 4: from = firstInMonth; to = firstInNextMonth; break;
                        // Nächste 7 Tage
                        case 5: from = today; to = after7Days; break;
                        // Nächste 30 Tage
                        case 6: from = today; to = after30Days; break;
                    }
                    return (!activity.isdone || showdone) && from <= activity._date && activity._date < to;
                }
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
                    scope.selectedelement.isdone = updatedelement.isdone;
                    scope.selectedelement.activitytypename = updatedelement.activitytypename;
                    scope.selectedelement.date = updatedelement.date;
                    scope.selectedelement._date = new Date(updatedelement.date);
                    if (updatedelement.icon) scope.selectedelement.icon = updatedelement.icon;
                };
                scope.loadelements = function() {
                    return utils.getresponsedata("/api/dynamic/activitytypes").then(function(activitytypes) {
                        scope.activitytypes = {};
                        activitytypes.forEach(function(at) {
                            scope.activitytypes[at.name] = at.label;
                        });
                        return utils.getresponsedata("/api/dynamic/rootelements/activities");
                    }).then(function(elements) {
                        scope.elements = elements;
                        elements.forEach(function(e) {
                            e.label = e[scope.$root.titlefields[e.datatypename]] || e.name;
                            e._date = new Date(e.date);
                        });
                        var pathparts = $location.path().split("/");
                        if (pathparts.length > 2) scope.selectelement(elements.find(function(e) { return e.name === pathparts[2];}));
                    });
                };
                scope.selectelement = function(e) {
                    if (!e || !scope.detailscard) return;
                    utils.removeCardsToTheRightOf(element);
                    utils.adddetailscard(scope, e.datatypename, e.name, "PERMISSION_OFFICE_ACTIVITY").then(function() {
                        scope.selectedelement = e;
                    });
                };
                $compile(iElement)(scope);
                scope.loadelements();
            };
        }
    }
});