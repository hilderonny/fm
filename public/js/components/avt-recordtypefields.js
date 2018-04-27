
app.directive('avtRecordtypefields', function($rootScope, $compile, $mdDialog, $translate, $mdToast, utils) { 
    var toolbarbuttontemplate = '<md-button ng-if="params.entityname && canwrite" avt-toolbar-button ng-click="createrecordtypefield()" icon="/css/icons/material/Plus Math.svg" label="Feld" tooltip="Feld erstellen"></md-button>';
    var tabtemplate = 
        '<md-tab ng-if="params.entityname">' +
        '   <md-tab-label>Felder</md-tab-label>' +
        '   <md-tab-body>' +
        '       <md-card-content>' +
        '           <md-list class="lines-beetween-items">' +
        '               <md-list-item ng-repeat="field in recordtype.fields | orderBy:\'label\'" ng-click="tabselectfield(field)" ng-class="selectedrecordtypefield === field ? \'active\' : false">' +
        '                  <md-icon md-svg-src="/css/icons/fieldtypes/{{field.fieldtype}}.svg"></md-icon>' +
        '                  <div class="md-list-item-text multiline"><p>{{field.label}}</p><p>{{field.name}}</p></div>' +
        '                  <md-icon class="hint" ng-if="field.ispredefined" md-svg-src="/css/icons/material/icons8-lock.svg"></md-icon>' +
        '               </md-list-item>' +
        '           </md-list>' +
        '       </md-card-content>' +
        '   </md-tab-body>' +
        '</md-tab>';
    return {
        restrict: "A",
        priority: 870,
        scope: true,
        compile: function compile(element, attrs) {
            var params = attrs.avtRecordtypefields ? JSON.parse(attrs.avtRecordtypefields) : {};
            if (element.length < 1 || !element[0].toolbar) return;
            element.removeAttr("avt-recordtypefields");
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
                scope.detailscard = params.detailscard;
                // Toolbar button part
                scope.createrecordtypefield = function() {
                    delete scope.selectedrecordtypefield;
                    utils.removeCardsToTheRightOf(element);
                    utils.adddetailscard(scope, scope.recordtype.name, undefined, scope.params.permission);
                };
                // Tab part
                scope.tabselectfield = function(field) {
                    utils.removeCardsToTheRightOf(element);
                    utils.adddetailscard(scope, scope.recordtype.name, field.name, scope.params.permission).then(function() {
                        scope.selectedrecordtypefield = field;
                    });
                };
                scope.onelementcreated = function(createdfield) {
                    scope.recordtype.fields.push(createdfield);
                    scope.tabselectfield(createdfield);
                    if (scope.recordtypetitlefields) scope.recordtypetitlefields.push(createdfield);
                };
                scope.onelementdeleted = function() {
                    scope.recordtype.fields.splice(scope.recordtype.fields.indexOf(scope.selectedrecordtypefield), 1);
                    delete scope.selectedrecordtypefield;
                    if (scope.recordtypetitlefields) scope.recordtypetitlefields.splice(scope.recordtypetitlefields.indexOf(scope.selectedrecordtypefield), 1);
                };
                scope.onelementupdated = function(updatedfield) {
                    scope.selectedrecordtypefield.label = updatedfield.label;
                };
            };
        }
    }
});