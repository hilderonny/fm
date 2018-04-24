
app.directive('avtClientmodulesTab', function($compile, $mdDialog, $mdToast, $http, utils) {
    var tabtemplate = 
        '<md-tab ng-if="$parent.params.entityname" md-on-select="$parent.loadclientmodules()">' +
        '   <md-tab-label>Module</md-tab-label>' +
        '   <md-tab-body>' +
        '       <md-card-content>' +
        '           <md-list class="lines-beetween-items">' +
        '               <md-list-item ng-repeat="clientmodule in clientmodules | orderBy: \'translationkey | translate\'">' +
        '                   <md-icon md-svg-src="/css/icons/material/Module.svg"></md-icon>' +
        '                   <p translate="{{ clientmodule.translationkey }}"></p>' +
        '                   <md-button class="md-icon-button" ng-click="switchclientmoduleactive(clientmodule)">' +
        '                       <md-icon ng-if="clientmodule.active" md-svg-src="/css/icons/material/Checkmark.svg"></md-icon>' +
        '                       <md-icon class="grayedout" ng-if="!clientmodule.active" md-svg-src="/css/icons/material/Unavailable.svg"></md-icon>' +
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
            element.removeAttr("avt-clientmodules-tab");
            var tabs = element[0].tabs;
            if (tabs) {
                var tab = angular.element(tabtemplate);
                tabs.append(tab);
            }
            return function link(scope) {
                scope.loadclientmodules = function() {
                    utils.getresponsedata("/api/clientmodules/forClient/" + scope.params.entityname).then(function(clientmodules) {
                        scope.clientmodules = clientmodules;
                        clientmodules.forEach(function(clientmodule) {
                            clientmodule.translationkey = 'TRK_MODULE_' + clientmodule.module + '_NAME';
                        });
                    });
                };
                scope.switchclientmoduleactive = function(clientmodule) {
                    if (!scope.canwrite) return;
                    if (!clientmodule.active) {
                        $http.post('/api/clientmodules', { clientname: clientmodule.clientname, module: clientmodule.module }).then(function() {
                            clientmodule.active = true;
                        });
                    } else {
                        $http.delete('/api/clientmodules/' + clientmodule.clientname + "/" + clientmodule.module).then(function() {
                            clientmodule.active = false;
                        });
                    }
                };
            };
        }
    }
});