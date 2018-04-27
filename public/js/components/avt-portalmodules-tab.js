
app.directive('avtPortalmodulesTab', function($compile, $mdDialog, $mdToast, $http, utils) {
    var tabtemplate = 
        '<md-tab ng-if="$parent.params.entityname">' +
        '   <md-tab-label>Module</md-tab-label>' +
        '   <md-tab-body>' +
        '       <md-card-content>' +
        '           <md-list class="lines-beetween-items">' +
        '               <md-list-item ng-repeat="portalmodule in portalmodules | orderBy: \'translationkey | translate\'">' +
        '                   <md-icon md-svg-src="/css/icons/material/Module.svg"></md-icon>' +
        '                   <p translate="{{ portalmodule.translationkey }}"></p>' +
        '                   <md-button class="md-icon-button" ng-click="switchportalmoduleactive(portalmodule)">' +
        '                       <md-icon ng-if="portalmodule.active" md-svg-src="/css/icons/material/Checkmark.svg"></md-icon>' +
        '                       <md-icon class="grayedout" ng-if="!portalmodule.active" md-svg-src="/css/icons/material/Unavailable.svg"></md-icon>' +
        '                   </md-button>' +
        '               </md-list-item>' +
        '           </md-list>' +
        '       </md-card-content>' +
        '   </md-tab-body>' +
        '</md-tab>';
    return {
        restrict: "A",
        priority: 877,
        scope: false,
        compile: function compile(element, attrs) {
            if (element.length < 1 || !element[0].tabs) return;
            element.removeAttr("avt-portalmodules-tab");
            var tabs = element[0].tabs;
            if (tabs) {
                var tab = angular.element(tabtemplate);
                tabs.append(tab);
            }
            return function link(scope) {
                scope.loadportalmodules = function() {
                    utils.getresponsedata('/api/portalmodules/forportal/' + scope.params.entityname).then(function(portalmodules) {
                        scope.portalmodules = portalmodules;
                        portalmodules.forEach(function(portalmodule) {
                            portalmodule.translationkey = 'TRK_MODULE_' + portalmodule.module + '_NAME';
                        });
                    });
                };
                scope.switchportalmoduleactive = function(portalmodule) {
                    if (!scope.canwrite) return;
                    if (!portalmodule.active) {
                        $http.post('/api/portalmodules', { portalname: portalmodule.portalname, module: portalmodule.module }).then(function() {
                            portalmodule.active = true;
                        });
                    } else {
                        $http.delete('/api/portalmodules/' + portalmodule.portalname + "/" + portalmodule.module).then(function() {
                            portalmodule.active = false;
                        });
                    }
                };
                scope.loadportalmodules();
            };
        }
    }
});