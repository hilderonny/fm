
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
        '                       <label ng-if="[\'text\', \'formula\', \'reference\'].indexOf(datatypefield.fieldtype) >= 0">{{datatypefield.label}}</label>' +
        '                       <input ng-model="dynamicobject[datatypefield.name]" ng-if="datatypefield.fieldtype === \'text\'">' +
        '                       <input ng-value="dynamicobject[datatypefield.name] || 0" ng-if="datatypefield.fieldtype === \'formula\'" type="number" disabled>' +
        '                       <md-checkbox ng-model="dynamicobject[datatypefield.name]" ng-if="datatypefield.fieldtype === \'boolean\'"><span ng-bind="datatypefield.label"></span></md-checkbox>' +
        '                       <img ng-if="datatypefield.name === \'previewimagedocumentname\' && dynamicobject[datatypefield.name]" ng-src="/api/documents/{{dynamicobject[datatypefield.name]}}?action=download&token={{token}}"/>' + // Special handle previewimagedocumentname
        '                       <md-select ng-model="dynamicobject[datatypefield.name]" ng-if="datatypefield.fieldtype === \'reference\'">' +
        '                           <md-option ng-value="reference.name" ng-repeat="reference in references[datatypefield.reference] | orderBy: [\'label\', \'name\']">' +
        '                               <span>{{reference.label || reference.name}}</span>' +
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
                    $http.post("/api/dynamic/" + scope.datatype.name, objecttosend).then(function(response) {
                        createdelementname = response.data;
                        var childrelation = {
                            datatype1name: scope.params.parentdatatypename,
                            datatype2name: scope.datatype.name,
                            name1: scope.params.parententityname,
                            name2: createdelementname,
                            relationtypename: "parentchild"
                        }
                        return $http.post("/api/dynamic/relations", childrelation);
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
                        return $http.delete("/api/dynamic/" + scope.datatype.name + "/" + scope.dynamicobject.name);
                    }).then(function() {
                        if (scope.params.ondelete) scope.params.ondelete();
                        utils.removeCardsToTheRightOf(element);
                        utils.removeCard(element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_DETAILS_ELEMENT_DELETED).hideDelay(1000).position('bottom right'));
                    });
                },
                scope.load = function() {
                    scope.dynamicobject = {}; // For new
                    scope.references = {};
                    scope.token = $http.defaults.headers.common["x-access-token"]; // For preview image downloads
                    var datatypename = scope.params.datatypename;
                    var entityname = scope.params.entityname;
                    Promise.all([
                        utils.loaddatatype(datatypename).then(function(datatype) { scope.datatype = datatype; }),
                        utils.loaddatatypefields(datatypename).then(function(datatypefields) { scope.datatypefields = datatypefields.filter(function(f) { return f.name !== "name"}); }), // Do not show the entity name
                        entityname ? utils.loadrelationtypes().then(function(relationtypes) { scope.relationtypes = relationtypes; }) : Promise.resolve(),
                        entityname ? utils.loaddynamicobject(datatypename, entityname).then(function(dynamicobject) { scope.dynamicobject = dynamicobject; }) : Promise.resolve(),
                        entityname ? utils.loaddynamicattributes(datatypename, entityname).then(function(dynamicattributes) { scope.dynamicattributes = dynamicattributes; }) : Promise.resolve(), // TODO: Irrelevant in the future
                        entityname ? utils.loadrelations(datatypename, entityname).then(function(relations) { scope.relations = relations; }) : Promise.resolve(),
                        entityname ? utils.loadparentlabels(datatypename, entityname).then(function(parentlabels) { scope.breadcrumbs = parentlabels.join(' » '); }) : Promise.resolve(),
                    ]).then(function() {
                        // Collect references
                        var promises = scope.datatypefields.filter(function(f) { return f.fieldtype === "reference"; }).map(function(f) {
                            // Special handle preview images
                            var filter = (f.name === "previewimagedocumentname") ? "?type=image%2F%25" : "";
                            return utils.getresponsedata("/api/dynamic/" + f.reference + filter).then(function(references) { scope.references[f.reference] = references; });
                        });
                        return Promise.all(promises);
                    }).then(function() {
                        scope.canwrite = scope.$root.canWrite(scope.requiredPermission);
                    });
                };
                $compile(iElement)(scope);
                scope.load();
            };
        }
    }
});