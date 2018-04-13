
app.directive('avtDetailsCard', function($compile, $http, $mdToast, $translate, $mdDialog, utils) { 
    var toolbartemplate = 
        '<md-toolbar avt-toolbar>' +
        '</md-toolbar>';
    var cardtitletemplate =
        '<md-card-title flex="none">' +
        '   <md-card-title-text>' +
        '       <span class="md-headline" ng-show="params.entityname" ng-bind="dynamicobject.label"></span>' +
        '       <span class="md-headline" ng-if="!params.entityname">{{datatype.label}} erstellen</span>' +
        '       <span class="breadcrumbs" ng-show="breadcrumbs" ng-bind="breadcrumbs">BC</span>' +
        '   </md-card-title-text>' +
        '</md-card-title>';
        var tabstemplate = 
        '<md-tabs flex>' +
        '   <md-tab>' +
        '       <md-tab-label><span translate>TRK_DETAILS_DETAILS</span></md-tab-label>' +
        '       <md-tab-body>' +
        '           <md-card-content layout="column"></md-card-content>' +
        '       </md-tab-body>' +
        '   </md-tab>' +
        '</md-tabs>'
    ;
    var formtemplate = 
        '<form name="detailsform">' +
        '    <md-input-container flex ng-repeat="datatypefield in datatypefields | orderBy: \'label\'" ng-if="params.entityname || datatypefield.fieldtype !== \'formula\'">' +
        '        <label ng-if="[\'text\', \'decimal\', \'formula\', \'password\', \'reference\'].indexOf(datatypefield.fieldtype) >= 0">{{datatypefield.label}}</label>' +
        '        <input ng-model="dynamicobject[datatypefield.name]" ng-if="datatypefield.fieldtype === \'text\' && (datatypefield.name !== \'name\' || !params.entityname)" ng-required="datatypefield.isrequired">' +
        '        <input ng-model="dynamicobject[datatypefield.name]" ng-if="datatypefield.fieldtype === \'text\' && datatypefield.name === \'name\' && params.entityname" disabled>' +
        '        <input ng-model="dynamicobject[datatypefield.name]" ng-if="datatypefield.fieldtype === \'password\'" type="password" ng-required="datatypefield.isrequired">' +
        '        <input ng-model="dynamicobject[datatypefield.name]" type="number" ng-if="datatypefield.fieldtype === \'decimal\'" ng-required="datatypefield.isrequired">' +
        '        <input ng-value="dynamicobject[datatypefield.name] || 0" ng-if="datatypefield.fieldtype === \'formula\'" type="number" disabled>' +
        '        <md-checkbox ng-model="dynamicobject[datatypefield.name]" ng-if="datatypefield.fieldtype === \'boolean\'"><span ng-bind="datatypefield.label"></span></md-checkbox>' +
        '        <img ng-if="datatypefield.name === \'previewimagedocumentname\' && dynamicobject[datatypefield.name]" ng-src="/api/documents/{{dynamicobject[datatypefield.name]}}?action=preview&token={{token}}" ng-click="openpreviewimage(datatypefield.name)"/>' + // Special handle previewimagedocumentname
        '        <md-button ng-required="datatypefield.isrequired" avt-reference-select></md-button>' +
        '    </md-input-container>' +
        '    <md-input-container flex ng-repeat="attribute in dynamicattributes | orderBy: \'type.name_en\'">' +
        '        <label ng-bind="attribute.type[\'name_\' + $root.currentLanguage]" ng-if="attribute.type.type === \'text\' || attribute.type.type === \'picklist\'"></label>' +
        '        <input ng-model="attribute.value" ng-if="attribute.type.type === \'text\'">' +
        '        <md-checkbox ng-model="attribute.value" ng-if="attribute.type.type === \'boolean\'"><span ng-bind="attribute.type[\'name_\' + $root.currentLanguage]"></span></md-checkbox>' +
        '        <md-select ng-model="attribute.value" ng-if="attribute.type.type === \'picklist\'">' +
        '            <md-option ng-value="option[\'_id\']" ng-repeat="option in attribute.options | orderBy: \'text_en\' track by $index">' +
        '                <span ng-bind="option[\'text_\' + $root.currentLanguage]"></span>' +
        '            </md-option>' +
        '        </md-select>' +
        '    </md-input-container>' +
        '    <md-card-actions layout="row" layout-align="space-between center">' +
        '        <md-button class="md-raised md-warn" ng-if="params.entityname && canwrite" ng-disabled="!candelete" ng-click="delete()"><span translate>TRK_DETAILS_DELETE</span></md-button>' +
        '        <div flex></div>' +
        '        <md-button class="md-raised md-accent" ng-if="!params.entityname && canwrite" ng-disabled="detailsform.$invalid" ng-click="create()"><span translate>TRK_DETAILS_CREATE</span></md-button>' +
        '        <md-button class="md-raised md-accent" ng-if="params.entityname && canwrite" ng-disabled="detailsform.$invalid" ng-click="save()"><span translate>TRK_DETAILS_SAVE</span></md-button>' +
        '    </md-card-actions>' +
        '</form>'
;
    return {
        restrict: "A",
        terminal: true,
        scope: true,
        priority: 900,
        compile: function compile(element, attrs) {
            element.removeAttr("avt-details-card");
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
                scope.onbeforecreateelement = function($event) { // When child elements are to be created, remove this card here
                    utils.removeCard(element);
                };
                // Events for sub elements forwarded to hierarchy
                scope.ondetailscardclosed = scope.params.onclose;
                scope.onelementcreated = scope.params.oncreate;
                scope.create = function() {
                    var objecttosend = {};
                    scope.datatypefields.forEach(function(dtf) {
                        if (dtf.fieldtype === "formula") return;
                        objecttosend[dtf.name] = scope.dynamicobject[dtf.name];
                    });
                    var createdelementname;
                    utils.createdynamicobject(scope.datatype.name, objecttosend).then(function(elementname) {
                        createdelementname = elementname;
                        if (!scope.params.parentdatatypename || !scope.params.parententityname) return;
                        var childrelation = {
                            datatype1name: scope.params.parentdatatypename,
                            datatype2name: scope.datatype.name,
                            name1: scope.params.parententityname,
                            name2: createdelementname,
                            relationtypename: "parentchild"
                        };
                        return utils.createrelation(childrelation);
                    }).then(function() {
                        if (scope.params.oncreate) {
                            scope.params.oncreate(scope.datatype, createdelementname);
                        }
                        $translate(["TRK_DETAILS_ELEMENT_CREATED"]).then(function(translations) {
                            $mdToast.show($mdToast.simple().textContent(translations.TRK_DETAILS_ELEMENT_CREATED).hideDelay(1000).position("bottom right"));
                        });
                    }, function(statuscode) {
                        if (statuscode === 409 && scope.datatype.candefinename) {
                            $mdDialog.show($mdDialog.alert().title("Der Name ist bereits vergeben und kann nicht verwendet werden.").ok("OK"));
                        }
                    });
                };
                scope.delete = function() {
                    var translations;
                    $translate(['TRK_DETAILS_ELEMENT_DELETED', 'TRK_DETAILS_REALLY_DELETE_ELEMENT', 'TRK_YES', 'TRK_NO']).then(function(t) {
                        translations = t;
                        var confirm = $mdDialog
                            .confirm()
                            .title(translations.TRK_DETAILS_REALLY_DELETE_ELEMENT)
                            .ok(translations.TRK_YES)
                            .cancel(translations.TRK_NO);
                        return $mdDialog.show(confirm);
                    }).then(function() {
                        return utils.deletedynamicobject(scope.datatype.name, scope.dynamicobject.name);
                    }).then(function() {
                        if (scope.params.ondelete) scope.params.ondelete();
                        utils.removeCardsToTheRightOf(element);
                        utils.removeCard(element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_DETAILS_ELEMENT_DELETED).hideDelay(1000).position('bottom right'));
                        utils.setLocation("/" + scope.datatype.name, false);
                    });
                },
                scope.load = function() {
                    scope.dynamicobject = {}; // For new
                    scope.references = {};
                    scope.token = $http.defaults.headers.common["x-access-token"]; // For preview image downloads
                    scope.candelete = true; // For deletio prevention of extensions like usergroups
                    var datatypename = scope.params.datatypename;
                    var entityname = scope.params.entityname;
                    if (!entityname) scope.isnew = true; // For add element toolbar button
                    scope.datatype = scope.$root.datatypes[datatypename];
                    var fieldnames = Object.keys(scope.datatype.fields);
                    if (!scope.datatype.candefinename) fieldnames = fieldnames.filter(function(k) { return k !== "name" });
                    scope.datatypefields = fieldnames.map(function(fn) { return scope.datatype.fields[fn]; }).filter(function(f) { return !f.ishidden; });
                    return Promise.all([
                        entityname ? utils.loaddynamicobject(datatypename, entityname).then(function(dynamicobject) { scope.dynamicobject = dynamicobject; }) : Promise.resolve(),
                        entityname ? utils.loaddynamicattributes(datatypename, entityname).then(function(dynamicattributes) { scope.dynamicattributes = dynamicattributes; }) : Promise.resolve(), // TODO: Irrelevant in the future
                        entityname ? utils.loadparentlabels(scope.params.listfilter, datatypename, entityname).then(function(parentlabels) { scope.breadcrumbs = parentlabels.join(' » '); }) : Promise.resolve(),
                    ]).then(function() {
                        // Collect references
                        var promises = scope.datatypefields.filter(function(f) { return f.fieldtype === "reference"; }).map(function(f) {
                            // Special handle preview images
                            var filter = (f.name === "previewimagedocumentname") ? "?type=image%2F%25" : "";
                            return utils.getresponsedata("/api/dynamic/" + f.reference + filter).then(function(references) {
                                if (f.isnullable) references.push({ name: null, label: "" }); // Nullable references like preview images
                                scope.references[f.reference] = references;
                            });
                        });
                        return Promise.all(promises);
                    }).then(function() {
                        scope.canwrite = scope.$root.canWrite(scope.requiredPermission);
                        utils.setLocation("/" + datatypename + (entityname ? "/" + entityname : ""), false);
                    });
                };
                scope.openpreviewimage = function(datatypefieldname) {
                    window.open('/api/documents/' + scope.dynamicobject[datatypefieldname] + '?action=preview&token=' + scope.token, "_blank");
                };
                scope.save = function() {
                    var datatypename = scope.params.datatypename;
                    var entityname = scope.params.entityname;
                    var dynamicattributes = scope.dynamicattributes;
                    Promise.all([
                        utils.savedynamicobject(scope.datatype, scope.dynamicobject),
                        dynamicattributes && dynamicattributes.length > 0 ? utils.savedynamicattributes(datatypename, entityname, dynamicattributes) : Promise.resolve(),
                    ]).then(function() {
                        return scope.load(); // To update changed formula results
                    }).then(function() {
                        return $translate(["TRK_DETAILS_CHANGES_SAVED"]).then(function(translations) {
                            $mdToast.show($mdToast.simple().textContent(translations.TRK_DETAILS_CHANGES_SAVED).hideDelay(1000).position("bottom right"));
                        });
                    }).then(function() {
                        if (scope.params.onsave) {
                            scope.params.onsave(scope.dynamicobject);
                        }
                    });
                };
                $compile(iElement)(scope);
                scope.load();
            };
        }
    }
});