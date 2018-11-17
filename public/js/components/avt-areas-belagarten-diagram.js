app.directive('avtAreasBelagartenDiagram', function (utils) {
    var canvastemplate = '<canvas class="piechart"></canvas>';
    var colors = [
        'rgb(255, 99, 132)',
        'rgb(255, 159, 64)',
        'rgb(255, 205, 86)',
        'rgb(75, 192, 192)',
        'rgb(54, 162, 235)',
        'rgb(153, 102, 255)',
        'rgb(201, 203, 207)'
    ];
    return {
        restrict: "A",
        scope: false,
        priority: 840,
        compile: (element) => {
            if (element.length < 1 || !element[0].cardcontent) return;
            element.removeAttr("avt-areas-belagarten-diagram");
            var canvaselement = angular.element(canvastemplate);
            element[0].cardcontent.append(canvaselement);
            return (scope) => {
                scope.load = async() => {
                    // When the usage state was loaded by another component, use this one
                    if (!scope.usagestates) {
                        var entityname = scope.params.entityname;
                        scope.belagarten = await utils.getresponsedata("/api/areas/belagarten/" + entityname);
                    }
                    var ctx = canvaselement[0].getContext("2d");
                    var data = [], labels = [], chartcolors = [];
                    var config = {
                        type: "pie",
                        data: { datasets: [{ data: data, backgroundColor: chartcolors }], labels: labels },
                        options: {
                            legend: { position: "right" }
                        }
                    }
                    for (var i = 0; i < scope.belagarten.length; i++) {
                        var us = scope.belagarten[i];
                        data.push(us.f);
                        labels.push(us.label);
                        chartcolors.push(colors[i % colors.length]);
                    }
                    new Chart(ctx, config);
                };
                scope.load();
            }
        }
    };
});