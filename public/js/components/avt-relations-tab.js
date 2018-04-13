/// OBSOLET

app.directive('avtRelationsTab', function($compile, $translate, $mdDialog, $mdToast, utils) {
    var template = 
        '<md-tab-label><span translate>TRK_RELATIONS_RELATIONS</span></md-tab-label>' +
        '<md-tab-body>' +
        '    <md-card-content>' +
        '        <section ng-repeat="relationsection in relationsections | orderBy:\'label\'">' +
        '            <md-subheader class="md-no-sticky">{{relationsection.label}}</md-subheader>' +
        '            <md-list class="lines-beetween-items">' +
        '                <md-list-item ng-repeat="entity in relationsection.entities | orderBy:\'label\'" ng-click="selectrelation(entity.relation)" ng-class="selectedElement === entity ? \'active\' : false">' +
        '                    <md-icon md-svg-src="{{entity.datatype.icon}}"></md-icon>' +
        '                    <div class="md-list-item-text multiline"><p>{{entity.label}}</p><p>{{entity.datatype.label}}</p></div>' +
        '                    <md-button ng-if="canwriterelations" class="md-icon-button md-accent"><md-icon ng-click="deleterelation(entity.relation)" md-svg-src="/css/icons/material/Delete.svg"></md-icon></md-button>' +
        '                </md-list-item>' +
        '            </md-list>' +
        '        </section>' +
        '    </md-card-content>' +
        '</md-tab-body>';
    return {
        restrict: "A",
        terminal: true,
        priority: 1000,
        scope: true,
        compile: function compile(element, attrs) {
            var onselecthandler = attrs.avtOnSelect;
            element.removeAttr("avt-relations-tab"); //remove the attribute to avoid indefinite loop
            element.attr("md-on-select", "loadrelations()");
            element.append(angular.element(template));
            return function link(scope, iElement, iAttrs) {
                scope.canwriterelations = scope.$root.canWrite('PERMISSION_CORE_RELATIONS');
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
                        // Load entities
                        var fetchpromises = Object.keys(entitiestofetch).map(function(k) {
                            var entitiestofetchfordatatype = entitiestofetch[k];
                            return utils.getresponsedata("/api/dynamic/" + k + "?name=[" + Object.keys(entitiestofetchfordatatype).map(function(e) { return '"' + e + '"'; }).join(",") + "]").then(function(entities) {
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
                scope.selectrelation = function(relation) {
                    utils.setLocation("/" + relation.datatypename + "/" + relation.name, true);
                };
                $compile(iElement)(scope);
            };
        }
    }
});