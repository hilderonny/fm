
app.directive('avtPermissionsTab', function($compile, $translate, $mdDialog, $mdToast, $http, utils) {
    var tabtemplate = 
        '<md-tab ng-if="$parent.params.entityname" md-on-select="$parent.loadpermissions()">' +
        '   <md-tab-label>Berechtigungen</md-tab-label>' +
        '   <md-tab-body>' +
        '       <md-card-content>' +
        '           <md-list class="lines-beetween-items">' +
        '               <md-list-item ng-repeat="permission in permissions | orderBy: \'translationkey | translate\'">' +
        '                   <p translate="{{ permission.translationkey }}"></p>' +
        '                   <md-button ng-class="{\'md-icon-button\':true,disabled:!permission.canread}" ng-click="switchread(permission)"><md-icon md-svg-src="/css/icons/material/Search.svg"></md-icon></md-button>' +
        '                   <md-button ng-class="{\'md-icon-button\':true,disabled:!permission.canwrite}" ng-click="switchwrite(permission)"><md-icon md-svg-src="/css/icons/material/Edit.svg"></md-icon></md-button>' +
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
                var savepermission = function(permissiontosave, permissiontoupdate) {
                    $http.post('/api/permissions', permissiontosave).then(function(response) {
                        permissiontoupdate.canread = response.data.canread;
                        permissiontoupdate.canwrite = response.data.canwrite;
                    });
                };
                scope.loadpermissions = function() {
                    utils.getresponsedata("/api/permissions/forUserGroup/" + scope.params.entityname).then(function(permissions) {
                        scope.permissions = permissions;
                        permissions.forEach(function(permission) {
                            permission.translationkey = 'TRK_' + permission.key;
                        });
                    });
                };
                scope.switchread = function(permission) {
                    if (!scope.canwriteusergroup) return;  
                    var temppermission = {
                        key: permission.key,
                        usergroupname: permission.usergroupname,
                        canread: !permission.canread,
                        canwrite: permission.canread ? false : permission.canwrite
                    };
                    savepermission(temppermission, permission);
                };
                scope.switchwrite = function(permission) {
                    if (!scope.canwriteusergroup) return;
                    var temppermission = {
                        key: permission.key,
                        usergroupname: permission.usergroupname,
                        canwrite: !permission.canwrite,
                        canread: !permission.canwrite ? true : permission.canread
                    };
                    savepermission(temppermission, permission);
                };
            };
        }
    }
});