
app.directive('avtRelationsToolbarButton', function($compile, $mdDialog, $translate, $mdToast, utils) { 
    var dialogcontent = 
    '<md-input-container flex>' +
    '    <label translate>TRK_RELATIONS_TYPE</label>' +
    '    <md-select name="tp" ng-model="parentscope.relationtype" ng-change="parentscope.updateokbuttonvisibility()">' +
    '        <md-option ng-value="relationtype" ng-repeat="relationtype in parentscope.relationtypes | orderBy: \'label\'" ng-bind="relationtype.label"></md-option>' +
    '    </md-select>' +
    '</md-input-container>' +
    '<md-input-container flex>' +
    '    <label translate>TRK_DATATYPES_DATATYPE</label>' +
    '    <md-select name="tp" ng-model="parentscope.targetdatatype" ng-change="parentscope.ondatatypechange()">' +
    '        <md-option ng-value="datatype" ng-repeat="datatype in parentscope.datatypes | orderBy: \'label\'" ng-bind="datatype.label"></md-option>' +
    '    </md-select>' +
    '</md-input-container>' +
    '<md-input-container flex ng-if="parentscope.targetdatatype">' +
    '    <label>{{parentscope.targetdatatype.label}}</label>' +
    '    <md-select name="tp" ng-model="parentscope.targetelement" ng-change="parentscope.updateokbuttonvisibility()">' +
    '        <md-option ng-value="element" ng-repeat="element in parentscope.targetelements | orderBy: \'label\'" ng-bind="element.label"></md-option>' +
    '    </md-select>' +
    '</md-input-container>'
    ;
    return {
        restrict: "A",
        scope: false,
        link: function(scope, element, attr) {
            scope.icon = "/css/icons/material/Add Link.svg";
            scope.label = "TRK_RELATIONS_RELATION";
            scope.tooltip = "TRK_RELATIONS_ADD_RELATION";
            scope.relationtypes = scope.$root.relationtypes.reduce(function(arr, elem) {
                arr.push({ name: elem.name, label: elem.labelfrom1to2, is1: true });
                if (elem.name !== "looselycoupled") arr.push({ name: elem.name, label: elem.labelfrom2to1, is1: false });
                return arr;
            }, []);
            scope.datatypes = Object.keys(scope.$root.datatypes).map(function(k) { return scope.$root.datatypes[k]; }).filter(function(dt) { return dt.canhaverelations; });
            var okbutton = { label: "TRK_OK", ishidden: true , onclick: function() {
                var newrelation = {
                    relationtypename: scope.relationtype.name,
                    datatype1name: scope.relationtype.is1 ? scope.params.datatypename : scope.targetdatatype.name,
                    name1: scope.relationtype.is1 ? scope.params.entityname : scope.targetelement.name,
                    datatype2name: scope.relationtype.is1 ? scope.targetdatatype.name : scope.params.datatypename,
                    name2: scope.relationtype.is1 ? scope.targetelement.name : scope.params.entityname
                };
                utils.createrelation(newrelation).then(function() {
                    if (scope.$root.onrelationcreated) {
                        scope.$root.onrelationcreated();
                    }
                    $translate(['TRK_RELATIONS_RELATION_CREATED']).then(function(translations) {
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_RELATIONS_RELATION_CREATED).hideDelay(1000).position('bottom right'));
                    });
                });
            }};
            scope.onclick = function($event) {
                delete scope.relationtype;
                delete scope.targetdatatype;
                delete scope.targetelement;
                utils.showdialog(scope, dialogcontent, [
                    okbutton,
                    { label: "TRK_CANCEL" }
                ]);
            };
            scope.ondatatypechange = function() {
                delete scope.targetelement;
                scope.updateokbuttonvisibility();
                utils.loaddynamicobjects(scope.targetdatatype.name).then(function(elements) {
                    scope.targetelements = elements;
                    elements.forEach(function(e) {
                        if (!e.label) {
                            var titlefield = scope.targetdatatype.titlefield ? scope.targetdatatype.titlefield : "name";
                            e.label = e[titlefield].substring(0, 100);
                        }
                    });
                });
            };
            scope.updateokbuttonvisibility = function() {
                okbutton.ishidden = !scope.targetdatatype || !scope.relationtype || !scope.targetelement;
            };
        }
    }
});