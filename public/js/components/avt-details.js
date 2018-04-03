
app.directive('avtDetails', function($compile, $http, $mdToast, $translate, $mdDialog, utils) { 
    var cardcontent = 
        '<md-card-title flex="none">' +
        '   <md-card-title-text>' +
        '       <span class="md-headline" ng-show="params.entityname" ng-bind="dynamicobject.label"></span>' +
        '       <span class="md-headline" ng-if="!params.entityname"><span translate>TRK_DETAILS_NEW_ELEMENT</span> ({{datatype.label}})</span>' +
        '       <span class="breadcrumbs" ng-show="breadcrumbs" ng-bind="breadcrumbs">BC</span>' +
        '   </md-card-title-text>' +
        '</md-card-title>' +
        '<md-tabs flex>' +
        '   <md-tab>' +
        '       <md-tab-label><span translate>TRK_DETAILS_DETAILS</span></md-tab-label>' +
        '       <md-tab-body>' +
        '           <md-card-content layout="column">' +
        '               <form name="detailsform">' +
        '                   <md-input-container flex ng-repeat="datatypefield in datatypefields | orderBy: \'label\'" ng-if="params.entityname || datatypefield.fieldtype !== \'formula\'">' +
        '                       <label ng-if="[\'text\', \'decimal\', \'formula\', \'reference\'].indexOf(datatypefield.fieldtype) >= 0">{{datatypefield.label}}</label>' +
        '                       <input ng-model="dynamicobject[datatypefield.name]" ng-if="datatypefield.fieldtype === \'text\'">' +
        '                       <input ng-model="dynamicobject[datatypefield.name]" type="number" ng-if="datatypefield.fieldtype === \'decimal\'">' +
        '                       <input ng-value="dynamicobject[datatypefield.name] || 0" ng-if="datatypefield.fieldtype === \'formula\'" type="number" disabled>' +
        '                       <md-checkbox ng-model="dynamicobject[datatypefield.name]" ng-if="datatypefield.fieldtype === \'boolean\'"><span ng-bind="datatypefield.label"></span></md-checkbox>' +
        '                       <img ng-if="datatypefield.name === \'previewimagedocumentname\' && dynamicobject[datatypefield.name]" ng-src="/api/documents/{{dynamicobject[datatypefield.name]}}?action=download&token={{token}}"/>' + // Special handle previewimagedocumentname
        '                       <md-select ng-model="dynamicobject[datatypefield.name]" ng-if="datatypefield.fieldtype === \'reference\'">' +
        '                           <md-option ng-value="reference.name" ng-repeat="reference in references[datatypefield.reference] | orderBy: [\'label\', \'name\']">' +
        '                               <span>{{reference.label || reference.name}}</span>' +
        '                           </md-option>' +
        '                       </md-select>' +
        '                   </md-input-container>' +
        '                   <md-input-container flex ng-repeat="attribute in dynamicattributes | orderBy: \'type.name_en\'">' +
        '                       <label ng-bind="attribute.type[\'name_\' + $root.currentLanguage]" ng-if="attribute.type.type === \'text\' || attribute.type.type === \'picklist\'"></label>' +
        '                       <input ng-model="attribute.value" ng-if="attribute.type.type === \'text\'">' +
        '                       <md-checkbox ng-model="attribute.value" ng-if="attribute.type.type === \'boolean\'"><span ng-bind="attribute.type[\'name_\' + $root.currentLanguage]"></span></md-checkbox>' +
        '                       <md-select ng-model="attribute.value" ng-if="attribute.type.type === \'picklist\'">' +
        '                           <md-option ng-value="option[\'_id\']" ng-repeat="option in attribute.options | orderBy: \'text_en\' track by $index">' +
        '                               <span ng-bind="option[\'text_\' + $root.currentLanguage]"></span>' +
        '                           </md-option>' +
        '                       </md-select>' +
        '                   </md-input-container>' +
        '                   <md-card-actions layout="row" layout-align="space-between center">' +
        '                       <md-button class="md-raised md-warn" ng-if="params.entityname && canwrite" ng-click="delete()"><span translate>TRK_DETAILS_DELETE</span></md-button>' +
        '                       <div flex></div>' +
        '                       <md-button class="md-raised md-accent" ng-if="!params.entityname && canwrite" ng-click="create()"><span translate>TRK_DETAILS_CREATE</span></md-button>' +
        '                       <md-button class="md-raised md-accent" ng-if="params.entityname && canwrite" ng-click="save()"><span translate>TRK_DETAILS_SAVE</span></md-button>' +
        '                   </md-card-actions>' +
        '               </form>' +
        '           </md-card-content>' +
        '       </md-tab-body>' +
        '   </md-tab>' +
        '   <md-tab ng-if="canreadrelations" md-on-select="loadrelations()">' +
        '       <md-tab-label><span translate>TRK_RELATIONS_RELATIONS</span></md-tab-label>' +
        '       <md-tab-body>' +
        '           <md-card-content>' +
        '               <section ng-repeat="relationsection in relationsections | orderBy:\'label\'">' +
        '                   <md-subheader class="md-no-sticky">{{relationsection.label}}</md-subheader>' +
        '                   <md-list class="lines-beetween-items">' +
        '                       <md-list-item ng-repeat="entity in relationsection.entities | orderBy:\'label\'" ng-click="selectrelation(entity.relation)" ng-class="selectedElement === entity ? \'active\' : false">' +
        '                           <md-icon md-svg-src="{{entity.datatype.icon}}"></md-icon>' +
        '                           <div class="md-list-item-text multiline"><p>{{entity.label}}</p><p>{{entity.datatype.label}}</p></div>' +
        '                           <md-button ng-if="canwriterelations" class="md-icon-button md-accent"><md-icon ng-click="deleterelation(entity.relation)" md-svg-src="/css/icons/material/Delete.svg"></md-icon></md-button>' +
        '                       </md-list-item>' +
        '                   </md-list>' +
        '               </section>' +
        '           </md-card-content>' +
        '       </md-tab-body>' +
        '   </md-tab>' +
        '</md-tabs>'
    ;
    return {
        restrict: "A",
        terminal: true,
        scope: true,
        priority: 900,
        compile: function compile(element, attrs) {
            element.removeAttr("avt-details");
            element.attr("class", "list-details-details");
            var resizehandle = element[0].querySelector("resize-handle");
            element.append(angular.element(cardcontent));
            if (resizehandle) element.append(resizehandle);
            return function link(scope, iElement) {
                scope.createchildelement = function($event) {
                    // Show selection panel for child types
                    utils.showselectionpanel($event, "/api/datatypes?forlist=" + scope.params.listfilter, function(selecteddatatype) {
                        utils.removeCard(element);
                        utils.addCardWithPermission("components/DetailsCard", {
                            parentdatatypename: scope.params.datatypename,
                            parententityname: scope.params.entityname,
                            datatypename: selecteddatatype.name,
                            onclose: function() {
                                if (scope.params.onclose) scope.params.onclose(); // Hierarchy handles close
                            },
                            oncreate: function(datatype, elementname) {
                                if (scope.params.oncreate) scope.params.oncreate(datatype, elementname); // Hierarchy handles creation callback
                            },
                        }, scope.params.permission);
                    });
                };
                scope.create = function() {
                    var objecttosend = {};
                    scope.datatypefields.forEach(function(dtf) {
                        if (dtf.name === "name" || dtf.fieldtype === "formula") return;
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
                    });
                },
                scope.deleterelation = function(relation) {
                    $translate(['TRK_RELATIONS_DELETED', 'TRK_YES', 'TRK_NO', 'TRK_RELATIONS_REALLY_DELETE_RELATION']).then(function(translations) {
                        var confirm = $mdDialog.confirm()
                            .title(translations.TRK_RELATIONS_REALLY_DELETE_RELATION)
                            .ok(translations.TRK_YES)
                            .cancel(translations.TRK_NO);
                        $mdDialog.show(confirm).then(function() {
                            return utils.deletedynamicobject("relations", relation.relationname);
                        }).then(function() {
                            utils.removeCardsToTheRightOf(element);
                            $mdToast.show($mdToast.simple().textContent(translations.TRK_RELATIONS_DELETED).hideDelay(1000).position('bottom right'));
                            scope.loadrelations();
                        });
                    });
                },
                scope.load = function() {
                    scope.dynamicobject = {}; // For new
                    scope.references = {};
                    scope.token = $http.defaults.headers.common["x-access-token"]; // For preview image downloads
                    var datatypename = scope.params.datatypename;
                    var entityname = scope.params.entityname;
                    scope.datatype = scope.$root.datatypes[datatypename];
                    scope.datatypefields = scope.datatype.fields.filter(function(f) { return f.name !== "name"});
                    return Promise.all([
                        entityname ? utils.loaddynamicobject(datatypename, entityname).then(function(dynamicobject) { scope.dynamicobject = dynamicobject; }) : Promise.resolve(),
                        entityname ? utils.loaddynamicattributes(datatypename, entityname).then(function(dynamicattributes) { scope.dynamicattributes = dynamicattributes; }) : Promise.resolve(), // TODO: Irrelevant in the future
                        entityname ? utils.loadparentlabels(datatypename, entityname).then(function(parentlabels) { scope.breadcrumbs = parentlabels.join(' » '); }) : Promise.resolve(),
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
                        scope.canwriterelations = scope.$root.canWrite('PERMISSION_CORE_RELATIONS');
                        scope.canreadrelations = scope.$root.canRead('PERMISSION_CORE_RELATIONS');
                    });
                };
                scope.loadrelations = function() {
                    var entitiestofetch = {};
                    return utils.loadrelations(scope.params.datatypename, scope.params.entityname).then(function(relations) { 
                        scope.relationsections = [];
                        relations.forEach(function(r) {
                            var relationtype = scope.$root.relationtypes.find(function(rt) { return rt.name === r.relationtypename; });
                            if (!relationtype) relationtype = { name: null, labelfrom1to2: "Unspezifische Verknüpfungen", labelfrom2to1: "Unspezifische Verknüpfungen" }; // From older relations which had no type
                            var relationsection = scope.relationsections.find(function(rs) { return rs.name === relationtype.name && (rs.is1 === r.is1 || [null, "looselycoupled"].indexOf(relationtype.name) >= 0) });
                            if (!relationsection) {
                                relationsection = { name: relationtype.name, is1: r.is1, label: r.is1 ? relationtype.labelfrom1to2: relationtype.labelfrom2to1, entities: [] };
                                scope.relationsections.push(relationsection);
                            }
                            if (!entitiestofetch[r.datatypename]) entitiestofetch[r.datatypename] = {};
                            entitiestofetch[r.datatypename][r.name] = { section: relationsection, relation: r };
                        });
                        // Load relevant datatype information
                        return utils.getresponsedata("/api/datatypes");
                    }).then(function(datatypes) {
                        // Load entities
                        var fetchpromises = Object.keys(entitiestofetch).map(function(k) {
                            var entitiestofetchfordatatype = entitiestofetch[k];
                            return utils.getresponsedata("/api/dynamic/" + k + "?name=[" + Object.keys(entitiestofetchfordatatype).map(function(e) { return '"' + e + '"'; }).join(",") + "]").then(function(entities) {
                                entities.forEach(function(e) {
                                    e.datatype = datatypes.find(function(dt) { return dt.name === k; });
                                    var mapper = entitiestofetchfordatatype[e.name];
                                    e.relation = mapper.relation;
                                    mapper.section.entities.push(e);
                                });
                            });
                        });
                        return Promise.all(fetchpromises);
                    });
                };
                scope.onrelationcreated = scope.loadrelations;
                scope.save = function() {
                    var datatypename = scope.params.datatypename;
                    var entityname = scope.params.entityname;
                    var dynamicattributes = scope.dynamicattributes;
                    Promise.all([
                        utils.savedynamicobject(datatypename, scope.dynamicobject),
                        dynamicattributes && dynamicattributes.length > 0 ? utils.savedynamicattributes(datatypename, entityname, dynamicattributes) : Promise.resolve(),
                    ]).then(function() {
                        if (scope.params.onsave) {
                            scope.params.onsave(scope.dynamicobject);
                        }
                        return scope.load(); // To update changed formula results
                    }).then(function() {
                        $translate(["TRK_DETAILS_CHANGES_SAVED"]).then(function(translations) {
                            $mdToast.show($mdToast.simple().textContent(translations.TRK_DETAILS_CHANGES_SAVED).hideDelay(1000).position("bottom right"));
                        });
                    });
                };
                scope.selectrelation = function(relation) {
                    utils.setLocation("/" + relation.datatypename + "/" + relation.name, true);
                };
                $compile(iElement)(scope);
                scope.load();
            };
        }
    }
});