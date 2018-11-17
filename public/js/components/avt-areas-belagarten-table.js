app.directive('avtAreasBelagartenTable', function (utils) {
    var tabletemplate = 
        '<table class="belagarten">' +
        '    <thead><tr>' +
        '        <th    n</th>' +
        '        <th>Fläche (m²)</th>' +
        '        <th>Anteil</th>' +
        '    </tr></thead>' +
        '    <tfoot><tr>' +
        '        <td></td>' +
        '        <td ng-bind="areasum | number:2"></td>' +
        '        <td></td>' +
        '    </tr></tfoot>' +
        '    <tbody>' +
        '        <tr ng-repeat="belagarten in belagarten | orderBy: \'label\'">' +
        '            <td ng-bind="belagarten.label"></td>' +
        '            <td ng-bind="belagarten.f | number:2"></td>' +
        '            <td>{{belagarten.percent | number:0}} %</td>' +
        '        </tr>' +
        '    </tbody>' +
        '</table>';
    return {
        restrict: "A",
        scope: false,
        priority: 850,
        compile: (element) => {
            if (element.length < 1 || !element[0].cardcontent) return;
            element.removeAttr("avt-areas-belagarten-table");
            var tableelement = angular.element(tabletemplate);
            element[0].cardcontent.append(tableelement);
            return (scope) => {
                scope.load = async() => {
                    // When the usage state was loaded by another component, use this one
                    if (!scope.belagarten) {
                        var entityname = scope.params.entityname;
                        scope.belagarten = await utils.getresponsedata("/api/areas/belagarten/" + entityname);
                    }
                    if (!scope.areasum) {
                        scope.areasum = 0;
                        scope.belagarten.forEach(s => { scope.areasum += s.f }); // Calculate sum
                        scope.belagarten.forEach(s => { s.percent = s.f * 100 / scope.areasum }); // Calculate percentage
                    }
                };
                scope.load();
            }
        }
    };
});