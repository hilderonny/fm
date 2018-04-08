
app.directive('avtPermissionsTab', function($compile, $translate, $mdDialog, $mdToast, utils) {
    var tabtemplate = 
        '<md-tab ng-if="$parent.params.entityname" md-on-select="$parent.loadpermissions()">' +
        '   <md-tab-label>Berechtigungen</md-tab-label>' +
        '   <md-tab-body>' +
        '       <md-card-content>' +
        '           <md-list class="lines-beetween-items">' +
        '               <md-list-item ng-repeat="permission in permissions">' +
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
            element.removeAttr("avt-permissions-tab");
            var tabs = element[0].tabs;
            if (tabs) {
                var tab = angular.element(tabtemplate);
                tabs.append(tab);
            }
            return function link(scope) {
                scope.canwriteusergroup = scope.$root.canWrite('PERMISSION_ADMINISTRATION_USERGROUP');
                scope.loadpermissions = function() {
                };
            };
        }
    }
});