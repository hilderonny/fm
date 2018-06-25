
app.directive('avtBimDin277Card', function ($compile, utils) {
    var toolbartemplate = '<md-toolbar avt-toolbar></md-toolbar>';
    var cardtitletemplate = '<md-card-title flex="none"><md-card-title-text><span class="md-headline">Flächen nach DIN 277</span></md-card-title-text></md-card-title>';
    var cardcontenttemplate = 
        '<md-card-content>' +
        '   <table class="areas">' +
        '       <thead><tr>' +
        '           <th>Name</th>' +
        '           <th>Flächenart</th>' +
        '           <th>Fläche (m²)</th>' +
        '       </tr></thead>' +
        '       <tfoot><tr>' +
        '           <td></td>' +
        '           <td></td>' +
        '           <td ng-bind="areasum | number:2"></td>' +
        '       </tr></tfoot>' +
        '       <tbody>' +
        '           <tr ng-repeat="area in areas | orderBy: \'areatypenumber\'" ng-class="{active:selectedarea===area}">' +
        '               <td ng-click="showareadetails(area)" ng-bind="area[datatype.titlefield] || area.name"></td>' +
        '               <td class="left" ng-bind="area.areatypenumber"></td>' +
        '               <td ng-bind="area.f | number:2"></td>' +
        '           </tr>' +
        '       </tbody>' +
        '   </table>' +
        '</md-card-content>';
    return {
        restrict: "A",
        terminal: true,
        scope: true,
        priority: 900,
        compile: (element, attrs) => {
            var params = attrs.avtBimDin277Card ? JSON.parse(attrs.avtBimDin277Card) : {};
            element.removeAttr("avt-bim-din277-card");
            element.attr("class", "flex2-card");
            var resizehandle = element[0].querySelector("resize-handle");
            element[0].toolbar = angular.element(toolbartemplate);
            element[0].cardtitle = angular.element(cardtitletemplate);
            var cardelement = angular.element(cardcontenttemplate);
            element.append(element[0].toolbar);
            element.append(element[0].cardtitle);
            element.append(cardelement);
            if (resizehandle) element.append(resizehandle);
            return (scope) => {
                scope.detailscard = params.detailscard;
                scope.ondetailscardclosed = () => {
                    delete scope.selectedarea;
                };
                scope.onelementdeleted = async() => {
                    delete scope.selectedarea;
                    await scope.load();
                };
                scope.onelementupdated = async() => {
                    await scope.load();
                    scope.selectedarea = scope.areas.find(a => a.name === scope.selectedarea.name);
                };
                scope.load = async() => {
                    scope.datatype = scope.$root.datatypes.areas;
                    var entityname = scope.params.entityname;
                    scope.areas = await utils.getresponsedata("/api/areas/din277/" + entityname);
                    scope.areasum = 0;
                    scope.areas.forEach(a => { scope.areasum += a.f });
                };
                scope.showareadetails = async(area) => {
                    if (!scope.detailscard) return;
                    utils.removeCardsToTheRightOf(element);
                    await utils.adddetailscard(scope, "areas", area.name, scope.params.permission, undefined, undefined, "areas");
                    scope.selectedarea = area;
                };
                $compile(element)(scope);
                scope.load();
            }
        }
    };
});