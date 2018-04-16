
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
        '    <md-input-container flex ng-repeat="recordtypefield in recordtypefields">' +
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
                scope.onbeforecreateelement = function($event) {
                    utils.removeCard(element);
                };
                // Events for sub elements forwarded to hierarchy
                scope.ondetailscardclosed = scope.params.onclose;
                scope.onelementcreated = scope.params.oncreate;
                scope.create = function() {
                    // var objecttosend = {};
                    // scope.datatypefields.forEach(function(dtf) {
                    //     if (dtf.fieldtype === "formula") return;
                    //     objecttosend[dtf.name] = scope.dynamicobject[dtf.name];
                    // });
                    // var createdelementname;
                    // utils.createdynamicobject(scope.datatype.name, objecttosend).then(function(elementname) {
                    //     createdelementname = elementname;
                    //     if (!scope.params.parentdatatypename || !scope.params.parententityname) return;
                    //     var childrelation = {
                    //         datatype1name: scope.params.parentdatatypename,
                    //         datatype2name: scope.datatype.name,
                    //         name1: scope.params.parententityname,
                    //         name2: createdelementname,
                    //         relationtypename: "parentchild"
                    //     };
                    //     return utils.createrelation(childrelation);
                    // }).then(function() {
                    //     if (scope.params.oncreate) {
                    //         scope.params.oncreate(scope.datatype, createdelementname);
                    //     }
                    //     $translate(["TRK_DETAILS_ELEMENT_CREATED"]).then(function(translations) {
                    //         $mdToast.show($mdToast.simple().textContent(translations.TRK_DETAILS_ELEMENT_CREATED).hideDelay(1000).position("bottom right"));
                    //     });
                    // }, function(statuscode) {
                    //     if (statuscode === 409 && scope.datatype.candefinename) {
                    //         $mdDialog.show($mdDialog.alert().title("Der Name ist bereits vergeben und kann nicht verwendet werden.").ok("OK"));
                    //     }
                    // });
                };
                scope.delete = function() {
                    // function showsuccess(message) {
                    //     if (scope.params.ondelete) scope.params.ondelete();
                    //     utils.removeCardsToTheRightOf(element);
                    //     utils.removeCard(element);
                    //     $mdToast.show($mdToast.simple().textContent(message).hideDelay(1000).position('bottom right'));
                    //     utils.setLocation("/" + scope.datatype.name, false);
                    // }
                    // utils.showdialog(scope.$new(true), "<p>Soll das Element wirklich gelöscht werden?</p>", [
                    //     { label: "Ja", onclick: function() {
                    //         utils.deletedynamicobject(scope.datatype.name, scope.dynamicobject.name).then(function() { showsuccess("Das Element wurde gelöscht"); });
                    //     } },
                    //     // Erst implementieren, wenn die Berechtigungsthematik mit den Unterelementen gelärt ist
                    //     // { label: "Ja, mit Kindelementen", onclick: function() {
                    //     //     utils.deletedynamicobject(scope.datatype.name, scope.dynamicobject.name, true).then(function() { showsuccess("Das Element und alle Kindelemente wurden gelöscht"); });
                    //     // } },
                    //     { label: "Nein" }
                    // ]);
                },
                scope.load = function() {
                    var recordtypetitlefields = [ ];
                    scope.recordtype = { titlefield: "name", fields: [ { name: "name", label: "Name" } ] };
                    var recordtypename = scope.params.entityname;
                    if (!recordtypename) scope.isnew = true; // For add element toolbar button
                    scope.recordtypefields = [
                        { name: "name", label: "Name", fieldtype: "text", iseditable: false, isrequired: true, isreadonlywhenpredefined: true, tooltip: "API Name des Datentyps, kann nur beim Erstellen definiert aber anschließend nicht mehr geändert werden" },
                        { name: "label", label: "Bezeichnung (Einzahl)", fieldtype: "text", iseditable: true, tooltip: "Bezeichnung in der Einzahl zur Anzeige in Überschriften und Listen" },
                        { name: "plurallabel", label: "Bezeichnung (Mehrzahl)", fieldtype: "text", iseditable: true, tooltip: "Bezeichnung in der Mehrzahl zur Anzeige in Überschriften und Listen" },
                        { name: "titlefield", label: "Titelfeld", fieldtype: "picklist", options: recordtypetitlefields, iseditable: true, tooltip: "Feld, welches den Titel des Datensatzes darstellt" },
                        { name: "icon", label: "Symbol", fieldtype: "text", iseditable: true, tooltip: "URL des Symbols des Datentyps" },
                        { name: "permissionkey", label: "Berechtigungsschlüssel", fieldtype: "picklist", iseditable: true, isreadonlywhenpredefined: true, tooltip: "Schlüssel der Berechtigung, die notwendig ist, um auf Elemente des Datentyps zuzugreifen" },
                        { name: "canhaverelations", label: "Kann Verknüpfungen haben", fieldtype: "boolean", iseditable: true, isreadonlywhenpredefined: true, tooltip: "Gibt an, ob dem Datentypen Verknüpfungen zugeordnet werden können" },
                        { name: "candefinename", label: "Name kann festgelegt werden", fieldtype: "boolean", iseditable: true, isreadonlywhenpredefined: true, tooltip: "Gibt an, ob beim Erstellen eines Datensatzes der Datensatzname festgelegt werden kann" }
                    ];
                    (recordtypename ? utils.getresponsedata('/api/recordtypes/' + recordtypename).then(function(recordtype) { scope.recordtype = recordtype; }) : Promise.resolve()).then(function() {
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
                    // var datatypename = scope.params.datatypename;
                    // var entityname = scope.params.entityname;
                    // var dynamicattributes = scope.dynamicattributes;
                    // Promise.all([
                    //     utils.savedynamicobject(scope.datatype, scope.dynamicobject),
                    //     dynamicattributes && dynamicattributes.length > 0 ? utils.savedynamicattributes(datatypename, entityname, dynamicattributes) : Promise.resolve(),
                    // ]).then(function() {
                    //     return scope.load(); // To update changed formula results
                    // }).then(function() {
                    //     return $translate(["TRK_DETAILS_CHANGES_SAVED"]).then(function(translations) {
                    //         $mdToast.show($mdToast.simple().textContent(translations.TRK_DETAILS_CHANGES_SAVED).hideDelay(1000).position("bottom right"));
                    //     });
                    // }).then(function() {
                    //     if (scope.params.onsave) {
                    //         scope.params.onsave(scope.dynamicobject);
                    //     }
                    // });
                };
                $compile(iElement)(scope);
                scope.load();
            };
        }
    }
});