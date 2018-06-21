app.directive('avtAreasUsagestateTable', function (utils) {
    var tabletemplate = 
        '<table class="usagestate">' +
        '    <thead><tr>' +
        '        <th>Nutzungsstatus</th>' +
        '        <th>Fläche (m²)</th>' +
        '        <th>Anteil</th>' +
        '    </tr></thead>' +
        '    <tfoot><tr>' +
        '        <td></td>' +
        '        <td ng-bind="areasum | number:2"></td>' +
        '        <td></td>' +
        '    </tr></tfoot>' +
        '    <tbody>' +
        '        <tr ng-repeat="usagestate in usagestates | orderBy: \'label\'">' +
        '            <td ng-bind="usagestate.label"></td>' +
        '            <td ng-bind="usagestate.f | number:2"></td>' +
        '            <td>{{usagestate.percent | number:0}} %</td>' +
        '        </tr>' +
        '    </tbody>' +
        '</table>';
    return {
        restrict: "A",
        scope: false,
        priority: 850,
        compile: (element) => {
            if (element.length < 1 || !element[0].cardcontent) return;
            element.removeAttr("avt-areas-usagestate-table");
            var tableelement = angular.element(tabletemplate);
            element[0].cardcontent.append(tableelement);
            return (scope) => {
                scope.load = async() => {
                    // When the usage state was loaded by another component, use this one
                    if (!scope.usagestates) {
                        var entityname = scope.params.entityname;
                        scope.usagestates = await utils.getresponsedata("/api/areas/usagestate/" + entityname);
                    }
                    if (!scope.areasum) {
                        scope.areasum = 0;
                        scope.usagestates.forEach(s => { scope.areasum += s.f }); // Calculate sum
                        scope.usagestates.forEach(s => { s.percent = s.f * 100 / scope.areasum }); // Calculate percentage
                    }
                };
                scope.load();
            }
        }
    };
});