
app.directive('avtRelations', function($rootScope, $compile, $mdDialog, $translate, $mdToast, utils) { 
    var toolbarbuttontemplate = '<md-button ng-if="$parent.params.entityname && $parent.canwriterelations" avt-toolbar-button ng-click="opencreatedialog($event)" icon="/css/icons/material/Add Link.svg" label="Verknüpfung" tooltip="Verknüpfung erstellen"></md-button>';
    var createdialogcontent = 
        '<md-input-container flex>' +
        '    <label translate>TRK_RELATIONS_TYPE</label>' +
        '    <md-select name="tp" ng-model="parentscope.createdialogrelationtype" ng-change="parentscope.createdialogupdateokbuttonvisibility()">' +
        '        <md-option ng-value="relationtype" ng-repeat="relationtype in parentscope.createdialogrelationtypes | orderBy: \'label\'" ng-bind="relationtype.label"></md-option>' +
        '    </md-select>' +
        '</md-input-container>' +
        '<md-input-container flex>' +
        '    <label translate>TRK_DATATYPES_DATATYPE</label>' +
        '    <md-select name="tp" ng-model="parentscope.createdialogtargetdatatype" ng-change="parentscope.createdialogondatatypechange()">' +
        '        <md-option ng-value="datatype" ng-repeat="datatype in parentscope.createdialogdatatypes | orderBy: \'label\'" ng-bind="datatype.label"></md-option>' +
        '    </md-select>' +
        '</md-input-container>' +
        '<md-input-container flex ng-if="parentscope.createdialogtargetdatatype">' +
        '    <label>{{parentscope.createdialogtargetdatatype.label}}</label>' +
        '    <md-select name="tp" ng-model="parentscope.createdialogtargetelement" ng-change="parentscope.createdialogupdateokbuttonvisibility()">' +
        '        <md-option ng-value="element" ng-repeat="element in parentscope.createdialogtargetelements | orderBy: \'label\'" ng-bind="element.label"></md-option>' +
        '    </md-select>' +
        '</md-input-container>';
    var tabtemplate = 
        '<md-tab ng-if="$parent.params.entityname && canreadrelations" md-on-select="$parent.tabloadrelations()">' +
        '   <md-tab-label><span translate>TRK_RELATIONS_RELATIONS</span></md-tab-label>' +
        '   <md-tab-body>' +
        '       <md-card-content>' +
        '           <section ng-repeat="relationsection in $parent.tabrelationsections | orderBy:\'label\'">' +
        '               <md-subheader class="md-no-sticky">{{relationsection.label}}</md-subheader>' +
        '               <md-list class="lines-beetween-items">' +
        '                   <md-list-item ng-repeat="entity in relationsection.entities | orderBy:\'label\'" ng-click="$parent.tabselectrelation(entity.relation)">' +
        '                       <md-icon md-svg-src="{{entity.datatype.icon}}"></md-icon>' +
        '                       <div class="md-list-item-text multiline"><p>{{entity.label}}</p><p>{{entity.datatype.label}}</p></div>' +
        '                       <md-button ng-if="$parent.canwriterelations" class="md-icon-button md-accent"><md-icon ng-click="$parent.tabdeleterelation(entity.relation)" md-svg-src="/css/icons/material/Delete.svg"></md-icon></md-button>' +
        '                   </md-list-item>' +
        '               </md-list>' +
        '           </section>' +
        '       </md-card-content>' +
        '   </md-tab-body>' +
        '</md-tab>';
    return {
        restrict: "A",
        priority: 870,
        scope: false,
        compile: function compile(element, attrs) {
            if (element.length < 1 || !element[0].toolbar) return;
            element.removeAttr("avt-relations");
            var toolbar = element[0].toolbar;
            if (toolbar) {
                var toolbarbutton = angular.element(toolbarbuttontemplate);
                toolbar.append(toolbarbutton);
            }
            var tabs = element[0].tabs;
            if (tabs) {
                var tab = angular.element(tabtemplate);
                tabs.append(tab);
            }
            return function link(scope) {
                scope.canwriterelations = scope.$root.canWrite('PERMISSION_CORE_RELATIONS');
                scope.canreadrelations = scope.$root.canRead('PERMISSION_CORE_RELATIONS');
                // Toolbar button part
                scope.createdialogrelationtypes = scope.$root.relationtypes.reduce(function(arr, elem) {
                    arr.push({ name: elem.name, label: elem.labelfrom1to2, is1: true });
                    if (elem.name !== "looselycoupled") arr.push({ name: elem.name, label: elem.labelfrom2to1, is1: false });
                    return arr;
                }, []);
                scope.createdialogdatatypes = Object.keys(scope.$root.datatypes).map(function(k) { return scope.$root.datatypes[k]; }).filter(function(dt) { return dt.canhaverelations; });
                var createdialogokbutton = { label: "TRK_OK", ishidden: true , onclick: function() {
                    var newrelation = {
                        relationtypename: scope.createdialogrelationtype.name,
                        datatype1name: scope.createdialogrelationtype.is1 ? scope.params.datatypename : scope.createdialogtargetdatatype.name,
                        name1: scope.createdialogrelationtype.is1 ? scope.params.entityname : scope.createdialogtargetelement.name,
                        datatype2name: scope.createdialogrelationtype.is1 ? scope.createdialogtargetdatatype.name : scope.params.datatypename,
                        name2: scope.createdialogrelationtype.is1 ? scope.createdialogtargetelement.name : scope.params.entityname
                    };
                    utils.createrelation(newrelation).then(function() {
                        if (tabs) scope.tabloadrelations();
                        $translate(['TRK_RELATIONS_RELATION_CREATED']).then(function(translations) {
                            $mdToast.show($mdToast.simple().textContent(translations.TRK_RELATIONS_RELATION_CREATED).hideDelay(1000).position('bottom right'));
                        });
                    });
                }};
                scope.opencreatedialog = function($event) {
                    delete scope.createdialogrelationtype;
                    delete scope.createdialogtargetdatatype;
                    delete scope.createdialogtargetelement;
                    utils.showdialog(scope, createdialogcontent, [
                        createdialogokbutton,
                        { label: "TRK_CANCEL" }
                    ]);
                };
                scope.createdialogondatatypechange = function() {
                    delete scope.createdialogtargetelement;
                    scope.createdialogupdateokbuttonvisibility();
                    utils.loaddynamicobjects(scope.createdialogtargetdatatype.name).then(function(elements) {
                        scope.createdialogtargetelements = elements;
                        elements.forEach(function(e) {
                            if (!e.label) {
                                var titlefield = scope.createdialogtargetdatatype.titlefield ? scope.createdialogtargetdatatype.titlefield : "name";
                                e.label = e[titlefield].substring(0, 100);
                            }
                        });
                    });
                };
                scope.createdialogupdateokbuttonvisibility = function() {
                    createdialogokbutton.ishidden = !scope.createdialogtargetdatatype || !scope.createdialogrelationtype || !scope.createdialogtargetelement;
                };
                // Tab part
                scope.tabdeleterelation = function(relation) {
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
                            scope.tabloadrelations();
                        });
                    });
                },
                scope.tabloadrelations = function() {
                    var entitiestofetch = {};
                    return utils.loadrelations(scope.params.datatypename, scope.params.entityname).then(function(relations) { 
                        scope.tabrelationsections = [];
                        relations.forEach(function(r) {
                            var relationtype = scope.$root.relationtypes.find(function(rt) { return rt.name === r.relationtypename; });
                            if (!relationtype) relationtype = { name: null, labelfrom1to2: "Unspezifische Verknüpfungen", labelfrom2to1: "Unspezifische Verknüpfungen" }; // From older relations which had no type
                            var relationsection = scope.tabrelationsections.find(function(rs) { return rs.name === relationtype.name && (rs.is1 === r.is1 || [null, "looselycoupled"].indexOf(relationtype.name) >= 0) });
                            if (!relationsection) {
                                relationsection = { name: relationtype.name, is1: r.is1, label: r.is1 ? relationtype.labelfrom1to2: relationtype.labelfrom2to1, entities: [] };
                                scope.tabrelationsections.push(relationsection);
                            }
                            if (!entitiestofetch[r.datatypename]) entitiestofetch[r.datatypename] = {};
                            entitiestofetch[r.datatypename][r.name] = { section: relationsection, relation: r };
                        });
                        // Load entities
                        var fetchpromises = Object.keys(entitiestofetch).map(function(k) {
                            var entitiestofetchfordatatype = entitiestofetch[k];
                            return utils.getresponsedata("/api/dynamic/" + k + "?name=[" + Object.keys(entitiestofetchfordatatype).map(function(e) { return '"' + e + '"'; }).join(",") + "]#ignore403").then(function(entities) {
                                if (!Array.isArray(entities)) return;
                                entities.forEach(function(e) {
                                    e.datatype = scope.$root.datatypes[k];
                                    var mapper = entitiestofetchfordatatype[e.name];
                                    e.relation = mapper.relation;
                                    if (!e.label) {
                                        var titlefield = e.datatype.titlefield ? e.datatype.titlefield : "name";
                                        e.label = e[titlefield].substring(0, 100);
                                    }
                                    mapper.section.entities.push(e);
                                });
                            });
                        });
                        return Promise.all(fetchpromises);
                    });
                };
                scope.$root.onrelationcreated = scope.loadrelations; // To react to toolbar button action
                scope.tabselectrelation = function(relation) {
                    utils.setLocation("/" + relation.datatypename + "/" + relation.name, true);
                };
            };
        }
    }
});