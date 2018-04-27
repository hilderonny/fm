
app.directive('avtRecordtypevalues', function($rootScope, $compile, $mdDialog, $translate, $mdToast, utils) { 
    var toolbarbuttontemplate = '<md-button ng-if="params.entityname && canwritevalue" avt-toolbar-button ng-click="createrecordtypevalue()" icon="/css/icons/material/Plus Math.svg" label="Objekt" tooltip="Objekt des Datentyps erstellen"></md-button>';
    var tabtemplate = 
        '<md-tab ng-if="params.entityname" md-on-select="loadrecordtypevalues()">' +
        '   <md-tab-label>Objekte</md-tab-label>' +
        '   <md-tab-body>' +
        '       <md-card-content>' +
        '           <md-list class="lines-beetween-items">' +
        '               <md-list-item ng-repeat="value in recordtypevalues | orderBy:\'label\'" ng-click="tabselectvalue(value)" ng-class="selectedrecordtypevalue === value ? \'active\' : false">' +
        '                  <img ng-src="{{recordtype.icon}}"/>' +
        '                  <p>{{value.label}}</p>' +
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
            var params = attrs.avtRecordtypevalues ? JSON.parse(attrs.avtRecordtypevalues) : {};
            if (element.length < 1 || !element[0].toolbar) return;
            element.removeAttr("avt-recordtypevalues");
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
                scope.canwritevalue = true; // TODO: Auf konkreten Datentyp prüfen, die Permission ist nicht dieselbe wie die zum Bearbeiten der Datentypen
                // Scope for detailscard
                var newscope = scope.$new(true);
                newscope.params = params || {}; // Pass paremters to the scope to have access to it in the controller instance
                newscope.detailscard = params.detailscard;
                // Toolbar button part
                scope.createrecordtypevalue = function() {
                    delete scope.selectedrecordtypevalue;
                    utils.removeCardsToTheRightOf(element);
                    utils.adddetailscard(newscope, scope.recordtype.name, undefined, scope.params.permission);
                };
                // Tab part
                scope.tabselectvalue = function(value) {
                    utils.removeCardsToTheRightOf(element);
                    console.log(scope.recordtype.name, value.name, newscope.detailscard);
                    utils.adddetailscard(newscope, scope.recordtype.name, value.name, scope.params.permission).then(function() {
                        scope.selectedrecordtypevalue = value;
                    });
                };
                scope.loadrecordtypevalues = function() {
                    utils.getresponsedata("/api/dynamic/" + scope.recordtype.name).then(function(values) {
                        values.forEach(function(v) {
                            if (!v.label) v.label = v.name;
                        });
                        scope.recordtypevalues = values;
                    });
                };
                newscope.onelementcreated = function(datatype, createdelementname) {
                    utils.loaddynamicobject(datatype.name, createdelementname).then(function(newelement) {
                        newelement.datatypename = datatype.name;
                        newelement.icon = datatype.icon;
                        newelement.label =  newelement[scope.$root.titlefields[newelement.datatypename]] || newelement.name;
                        scope.recordtypevalues.push(newelement);
                        scope.tabselectvalue(newelement);
                    });
                };
                newscope.onelementdeleted = function() {
                    scope.recordtypevalues.splice(scope.recordtypevalues.indexOf(scope.selectedrecordtypevalue), 1);
                    delete scope.selectedrecordtypevalue;
                };
                newscope.onelementupdated = function(updatedelement) {
                    scope.selectedrecordtypevalue.label = updatedelement[scope.$root.titlefields[scope.recordtype.name]] || updatedelement.name;
                };
            };
        }
    }
});