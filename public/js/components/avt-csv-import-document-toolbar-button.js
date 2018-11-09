app.directive('avtCsvImportDocumentToolbarButton', function($compile, $translate, $http, $mdToast, utils) {    
    var template = '<md-button ng-if="$parent.params.datatypename === \'documents\' && !$parent.isnew && $parent.dynamicobject && [\'text/csv\'].indexOf($parent.dynamicobject.type) >= 0" avt-toolbar-button ng-click="importto($event)" icon="/css/icons/material/icons8-open-archive.svg" label="Importieren"></md-button>';
    var createdialogcontent = 
        '<md-input-container flex>' +
        '    <label translate>TRK_DATATYPES_DATATYPE</label>' +
        '    <md-select ng-model="createdialogtargetdatatype" ng-change="createdialogondatatypechange()">' +
        '        <md-option ng-value="datatype" ng-repeat="datatype in createdialogdatatypes | orderBy: \'label\'" ng-bind="datatype.label"></md-option>' +
        '    </md-select>' +
        '</md-input-container>';
    return {
        restrict: "A",
        priority: 880,
        scope: false,
        compile: function compile(element, attrs) {
            if (element.length < 1 || !element[0].toolbar) return;
            var toolbar = element[0].toolbar;
            var button = angular.element(template);
            toolbar.append(button);
            return function link(scope) {                
                scope.importto = function($event) {
                    var dialogscope = scope.$new(false);
                    dialogscope.createdialogdatatypes = Object.keys(scope.$root.datatypes).map(function(k) { return scope.$root.datatypes[k]; }).filter(function(dt) { return dt.canhaverelations; });
                    
                    dialogscope.createdialogondatatypechange = function() {
                        console.log(dialogscope);
                        delete dialogscope.createdialogtargetelement;
                        dialogscope.createdialogupdateokbuttonvisibility();
                        utils.loaddynamicobjects(dialogscope.createdialogtargetdatatype.name).then(function(elements) {
                            dialogscope.createdialogtargetelements = elements;
                            var titlefield = dialogscope.createdialogtargetdatatype.titlefield;
                            elements.sort((a, b) => (a[titlefield] || a.name).localeCompare(b[titlefield] || b.name));
                        });
                    };
                    dialogscope.createdialogupdateokbuttonvisibility = function() {
                        createdialogokbutton.ishidden = !dialogscope.createdialogdatatypes;                      
                    };
                    var createdialogokbutton = { label: "OK", ishidden: true , onclick: function() {
                     console.log("ok is clicked");
                     console.log("target",dialogscope.createdialogtargetdatatype.name);
                     $http.get('/api/csvimport/' + scope.dynamicobject.name + '/' + dialogscope.createdialogtargetdatatype.name).then(function(response) {                        
                        var imported_data = response.data;            
                        scope.isinprogress = false;
                        if (scope.params.oncreate) {
                            scope.params.oncreate(); // Without parameters to force entire reload
                        }
                        $translate(['TRK_DOCUMENTS_CSV_FILE_IMPORTED'],{rows: imported_data.length}).then(function(translations) {
                            $mdToast.show($mdToast.simple().textContent(translations.TRK_DOCUMENTS_CSV_FILE_IMPORTED).hideDelay(1000).position('bottom right'));
                        });
                      });
                    }};
                    utils.showdialog(dialogscope, createdialogcontent, [
                        createdialogokbutton,
                        { label: "Abbrechen" }
                    ]);
                };
            };
        }
    }
});