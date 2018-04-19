
app.directive('avtRecordtypeDetailsCard', function($compile, $http, $mdToast, $translate, $mdDialog, utils) { 
    var toolbartemplate = 
        '<md-toolbar avt-toolbar>' +
        '</md-toolbar>';
    var cardtitletemplate =
        '<md-card-title flex="none">' +
        '   <md-card-title-text>' +
        '       <span class="md-headline" ng-show="params.entityname" ng-bind="recordtype.label"></span>' +
        '       <span class="md-headline" ng-if="!params.entityname">Datentyp erstellen</span>' +
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
        '    <md-input-container flex ng-repeat="recordtypefield in recordtypeattributes" ng-if="recordtypefield.fieldtype !== \'picklist\' || recordtypefield.options.length > 0">' +
        '        <label ng-if="[\'text\', \'picklist\'].indexOf(recordtypefield.fieldtype) >= 0">{{recordtypefield.label}}</label>' +
        '        <input ng-model="recordtype[recordtypefield.name]" ng-if="recordtypefield.fieldtype === \'text\'" ng-required="recordtypefield.isrequired" ng-disabled="params.entityname && (!recordtypefield.iseditable || recordtypefield.isreadonlywhenpredefined)">' +
        '        <md-checkbox ng-model="recordtype[recordtypefield.name]" ng-if="recordtypefield.fieldtype === \'boolean\'" ng-disabled="params.entityname && (!recordtypefield.iseditable || recordtypefield.isreadonlywhenpredefined)"><span ng-bind="recordtypefield.label"></span></md-checkbox>' +
        '        <md-select ng-model="recordtype[recordtypefield.name]" ng-if="recordtypefield.fieldtype === \'picklist\'" ng-disabled="params.entityname && (!recordtypefield.iseditable || recordtypefield.isreadonlywhenpredefined)">' +
        '            <md-option ng-value="option[\'name\']" ng-repeat="option in recordtypefield.options | orderBy: \'label\'">' +
        '                <span ng-bind="option[\'label\']"></span>' +
        '            </md-option>' +
        '        </md-select>' +
        '    </md-input-container>' +
        '    <md-card-actions layout="row" layout-align="space-between center">' +
        '        <md-button class="md-raised md-warn" ng-if="params.entityname && canwrite && !ispredefined" ng-click="delete()">Löschen</md-button>' +
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
            element.removeAttr("avt-recordtype-details-card");
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
                    var recordtypetosend = {
                        name: scope.recordtype.name,
                        permissionkey: scope.recordtype.permissionkey,
                        canhaverelations: !!scope.recordtype.canhaverelations,
                        candefinename: !!scope.recordtype.candefinename
                    };
                    $http.post("/api/recordtypes", recordtypetosend).then(function(response) {
                        if (response.status === 409) {
                            $mdDialog.show($mdDialog.alert().title("Der Name ist bereits vergeben und kann nicht verwendet werden.").ok("OK"));
                            return;
                        }
                        if (scope.params.oncreate) {
                            scope.params.oncreate(scope.recordtype.name);
                        }
                        $mdToast.show($mdToast.simple().textContent("Datentyp erstellt").hideDelay(1000).position("bottom right"));
                    });
                };
                scope.delete = function() {
                    utils.showdialog(scope.$new(true), "<p>Soll der Datentyp wirklich gelöscht werden?</p>", [
                        { label: "Ja", onclick: function() {
                            $http.delete("/api/recordtypes/" + scope.recordtype.name).then(function() { 
                                if (scope.params.ondelete) scope.params.ondelete();
                                utils.removeCardsToTheRightOf(element);
                                utils.removeCard(element);
                                $mdToast.show($mdToast.simple().textContent("Der Datentyp wurde gelöscht").hideDelay(1000).position('bottom right'));
                            });
                        } },
                        { label: "Nein" }
                    ]);
                },
                scope.load = function() {
                    var recordtypetitlefields = [];
                    var recordtypepermissions = [];
                    scope.recordtype = { titlefield: "name", fields: [], permissionkey: null };
                    var recordtypename = scope.params.entityname;
                    if (!recordtypename) scope.isnew = true; // For add element toolbar button
                    scope.recordtypeattributes = [
                        { name: "name", label: "Name", fieldtype: "text", iseditable: false, isrequired: true, isreadonlywhenpredefined: true, tooltip: "API Name des Datentyps, kann nur beim Erstellen definiert aber anschließend nicht mehr geändert werden" },
                        { name: "label", label: "Bezeichnung (Einzahl)", fieldtype: "text", iseditable: true, tooltip: "Bezeichnung in der Einzahl zur Anzeige in Überschriften und Listen" },
                        { name: "plurallabel", label: "Bezeichnung (Mehrzahl)", fieldtype: "text", iseditable: true, tooltip: "Bezeichnung in der Mehrzahl zur Anzeige in Überschriften und Listen" },
                        { name: "titlefield", label: "Titelfeld", fieldtype: "picklist", options: recordtypetitlefields, iseditable: true, tooltip: "Feld, welches den Titel des Datensatzes darstellt" },
                        { name: "icon", label: "Symbol", fieldtype: "text", iseditable: true, tooltip: "URL des Symbols des Datentyps" },
                        { name: "permissionkey", label: "Berechtigungsschlüssel", fieldtype: "picklist", options: recordtypepermissions, iseditable: true, isreadonlywhenpredefined: true, tooltip: "Schlüssel der Berechtigung, die notwendig ist, um auf Elemente des Datentyps zuzugreifen" },
                        { name: "canhaverelations", label: "Kann Verknüpfungen haben", fieldtype: "boolean", iseditable: true, isreadonlywhenpredefined: true, tooltip: "Gibt an, ob dem Datentypen Verknüpfungen zugeordnet werden können" },
                        { name: "candefinename", label: "Name kann festgelegt werden", fieldtype: "boolean", iseditable: true, isreadonlywhenpredefined: true, tooltip: "Gibt an, ob beim Erstellen eines Datensatzes der Datensatzname festgelegt werden kann" }
                    ];
                    Promise.all([
                        utils.getresponsedata('/api/permissions/forclient/').then(function(permissions) { 
                            return permissions.map(function(p) { return "TRK_" + p; });
                        }).then($translate).then(function(translations) {
                            recordtypepermissions.length = 0;
                            recordtypepermissions.push({ name: null, label: "- keine Berechtigung -" });
                            Object.keys(translations).forEach(function(k) {
                                recordtypepermissions.push({ name: k.substring(4), label: translations[k] });
                            });
                        }),
                        (recordtypename ? utils.getresponsedata('/api/recordtypes/' + recordtypename).then(function(recordtype) { scope.recordtype = recordtype; }) : Promise.resolve()),
                    ]).then(function() {
                        recordtypetitlefields.length = 0;
                        scope.recordtype.fields.forEach(function(f) {
                            recordtypetitlefields.push(f);
                            if (!f.label) f.label = f.name;
                        });
                        scope.canwrite = scope.$root.canWrite(scope.requiredPermission);
                        scope.ispredefined = scope.recordtype.ispredefined;
                    });
                };
                scope.save = function() {
                    return $http.put("/api/recordtypes/" + scope.recordtype.name, scope.recordtype).then(function() {
                        $mdToast.show($mdToast.simple().textContent("Änderungen gespeichert").hideDelay(1000).position("bottom right"));
                        if (scope.params.onsave) {
                            scope.params.onsave(scope.recordtype);
                        }
                        scope.$root.titlefields[scope.recordtype.name] = scope.recordtype.titlefield;
                    });
                };
                $compile(iElement)(scope);
                scope.load();
            };
        }
    }
});