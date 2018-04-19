
app.directive('avtRecordtypefieldDetailsCard', function($compile, $http, $mdToast, $translate, $mdDialog, utils) { 
    var toolbartemplate = 
        '<md-toolbar avt-toolbar>' +
        '</md-toolbar>';
    var cardtitletemplate =
        '<md-card-title flex="none">' +
        '   <md-card-title-text>' +
        '       <span class="md-headline" ng-show="params.entityname" ng-bind="recordtypefield.label"></span>' +
        '       <span class="md-headline" ng-if="!params.entityname">Datentypfeld erstellen</span>' +
        '   </md-card-title-text>' +
        '</md-card-title>';
    var tabstemplate = 
        '<md-tabs flex>' +
        '   <md-tab>' +
        '       <md-tab-label>Details</md-tab-label>' +
        '       <md-tab-body>' +
        '           <md-card-content layout="column"></md-card-content>' +
        '       </md-tab-body>' +
        '   </md-tab>' +
        '</md-tabs>'
    ;
    var formtemplate = 
        '<form name="detailsform">' +
        '    <md-input-container flex ng-repeat="fieldattribute in fieldattributes" ng-if="!fieldattribute.showonlywhentypeis || fieldattribute.showonlywhentypeis === recordtypefield.fieldtype">' +
        '        <label ng-if="[\'text\', \'decimal\', \'picklist\'].indexOf(fieldattribute.type) >= 0">{{fieldattribute.label}}</label>' +
        '        <input ng-model="recordtypefield[fieldattribute.name]" ng-if="fieldattribute.type === \'text\' && (fieldattribute.name !== \'name\' || !params.entityname)" ng-required="fieldattribute.isrequired" ng-disabled="params.entityname && (!fieldattribute.iseditable || fieldattribute.isreadonlywhenpredefined)">' +
        '        <input ng-model="recordtypefield[fieldattribute.name]" ng-if="fieldattribute.type === \'text\' && fieldattribute.name === \'name\' && params.entityname" disabled>' +
        '        <input ng-model="recordtypefield[fieldattribute.name]" type="number" ng-if="fieldattribute.type === \'decimal\'" ng-required="fieldattribute.isrequired" ng-disabled="params.entityname && (!fieldattribute.iseditable || fieldattribute.isreadonlywhenpredefined)">' +
        '        <md-checkbox ng-model="recordtypefield[fieldattribute.name]" ng-if="fieldattribute.type === \'boolean\'" ng-disabled="params.entityname && (!fieldattribute.iseditable || fieldattribute.isreadonlywhenpredefined)"><span ng-bind="fieldattribute.label"></span></md-checkbox>' +
        '        <md-select ng-model="recordtypefield[fieldattribute.name]" ng-if="fieldattribute.type === \'picklist\'" ng-disabled="params.entityname && (!fieldattribute.iseditable || fieldattribute.isreadonlywhenpredefined)">' +
        '            <md-option ng-value="option[\'name\']" ng-repeat="option in fieldattribute.options | orderBy: \'label\'">' +
        '                <span ng-bind="option[\'label\']"></span>' +
        '            </md-option>' +
        '        </md-select>' +
        '    </md-input-container>' +
        '    <md-card-actions layout="row" layout-align="space-between center">' +
        '        <md-button class="md-raised md-warn" ng-if="params.entityname && canwrite && !recordtypefield.ispredefined" ng-click="delete()">Löschen</md-button>' +
        '        <div flex></div>' +
        '        <md-button class="md-raised md-accent" ng-if="!params.entityname && canwrite" ng-disabled="detailsform.$invalid" ng-click="create()">Erstellen</md-button>' +
        '        <md-button class="md-raised md-accent" ng-if="params.entityname && canwrite" ng-disabled="detailsform.$invalid" ng-click="save()">Speichern</md-button>' +
        '    </md-card-actions>' +
        '</form>'
;
    return {
        restrict: "A",
        terminal: true,
        scope: true,
        priority: 900,
        compile: function compile(element, attrs) {
            element.removeAttr("avt-recordtypefield-details-card");
            element.attr("class", "list-details-details");
            var resizehandle = element[0].querySelector("resize-handle");
            element[0].toolbar = angular.element(toolbartemplate);
            element[0].cardtitle = angular.element(cardtitletemplate);
            var tabs = angular.element(tabstemplate);
            element[0].tabs = tabs;
            var form = angular.element(formtemplate);
            element[0].form = form;
            angular.element(tabs[0].lastElementChild.lastElementChild.lastElementChild).append(form);
            element.append(element[0].toolbar);
            element.append(element[0].cardtitle);
            element.append(element[0].tabs);
            if (resizehandle) element.append(resizehandle);
            return function link(scope, iElement) {
                scope.create = function() {
                    // console.log(scope.recordtype);
                    // var recordtypetosend = {
                    //     name: scope.recordtype.name,
                    //     permissionkey: scope.recordtype.permissionkey,
                    //     canhaverelations: !!scope.recordtype.canhaverelations,
                    //     candefinename: !!scope.recordtype.candefinename
                    // };
                    // $http.post("/api/recordtypes", recordtypetosend).then(function(response) {
                    //     if (response.status === 409) {
                    //         $mdDialog.show($mdDialog.alert().title("Der Name ist bereits vergeben und kann nicht verwendet werden.").ok("OK"));
                    //         return;
                    //     }
                    //     if (scope.params.oncreate) {
                    //         scope.params.oncreate(scope.recordtype.name);
                    //     }
                    //     $mdToast.show($mdToast.simple().textContent("Datentyp erstellt").hideDelay(1000).position("bottom right"));
                    // });
                };
                scope.delete = function() {
                    // utils.showdialog(scope.$new(true), "<p>Soll der Datentyp wirklich gelöscht werden?</p>", [
                    //     { label: "Ja", onclick: function() {
                    //         $http.delete("/api/recordtypes/" + scope.recordtype.name).then(function() { 
                    //             if (scope.params.ondelete) scope.params.ondelete();
                    //             utils.removeCardsToTheRightOf(element);
                    //             utils.removeCard(element);
                    //             $mdToast.show($mdToast.simple().textContent("Der Datentyp wurde gelöscht").hideDelay(1000).position('bottom right'));
                    //         });
                    //     } },
                    //     { label: "Nein" }
                    // ]);
                },
                scope.load = function() {
                    var recordtypename = scope.params.datatypename;
                    var fieldname = scope.params.entityname;
                    scope.recordtypefield = { fieldtype: "text", formulaindex: 0 };
                    var fieldtypes = [
                        { name: "boolean", label: "Wahrheitswert" },
                        { name: "datetime", label: "Datum / Uhrzeit" },
                        { name: "decimal", label: "Zahl" },
                        { name: "formula", label: "Formel" },
                        { name: "password", label: "Passwort" },
                        { name: "reference", label: "Verweis" },
                        { name: "text", label: "Text" }
                    ];
                    var datatypes = Object.keys(scope.$root.datatypes).map(function(k) { 
                        var dt = scope.$root.datatypes[k];
                        return { 
                            name: dt.name, 
                            label: dt.label ? dt.label : dt.name
                        };
                    });
                    scope.fieldattributes = [
                        { name: "name", label: "Name", type: "text", iseditable: false, isrequired: true, tooltip: "API Name des Datentypfeldes, kann nur beim Erstellen definiert aber anschließend nicht mehr geändert werden" },
                        { name: "label", label: "Bezeichnung", type: "text", iseditable: true, tooltip: "Bezeichnung zur Anzeige an der Oberfläche" },
                        { name: "fieldtype", label: "Feldtyp", type: "picklist", options: fieldtypes, iseditable: true, isreadonlywhenpredefined: true, tooltip: "Typ des Feldinhaltes" },
                        { name: "formula", label: "Formel", type: "text", iseditable: true, isreadonlywhenpredefined: true, tooltip: "Berechnungsformel", showonlywhentypeis: "formula" },
                        { name: "formulaindex", label: "Formelindex", type: "decimal", iseditable: true, isreadonlywhenpredefined: true, tooltip: "Index des Formelfeldes. Bestimmt die Reihenfolge der Formelberechnung", showonlywhentypeis: "formula" },
                        { name: "reference", label: "Verwiesener Datentyp", type: "picklist", options: datatypes, iseditable: true, isreadonlywhenpredefined: true, tooltip: "Datentyp, auf den der Verweis zeigt", showonlywhentypeis: "reference" },
                        { name: "ishidden", label: "Versteckt", type: "boolean", iseditable: true, tooltip: "Gibt an, ob das Feld in Detailseiten angezeigt wird" },
                        { name: "isnullable", label: "Nullwerte zulassen", type: "boolean", iseditable: true, isreadonlywhenpredefined: true, tooltip: "Gibt an, ob NULL als Wert zugelassen ist" },
                        { name: "isrequired", label: "Erforderlich", type: "boolean", iseditable: true, isreadonlywhenpredefined: true, tooltip: "Gibt an, ob eine Eingabe für das Feld zwingend erforderlich ist" }
                    ];
                    if (fieldname) utils.getresponsedata('/api/recordtypes/field/' + recordtypename + "/" + fieldname).then(function(field) {
                        scope.recordtypefield = field;
                        scope.canwrite = scope.$root.canWrite(scope.params.permission);
                    });
                };
                scope.save = function() {
                    // return $http.put("/api/recordtypes/" + scope.recordtype.name, scope.recordtype).then(function() {
                    //     $mdToast.show($mdToast.simple().textContent("Änderungen gespeichert").hideDelay(1000).position("bottom right"));
                    //     if (scope.params.onsave) {
                    //         scope.params.onsave(scope.recordtype);
                    //     }
                    //     scope.$root.titlefields[scope.recordtype.name] = scope.recordtype.titlefield;
                    // });
                };
                $compile(iElement)(scope);
                scope.load();
            };
        }
    }
});