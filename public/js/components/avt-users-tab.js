
app.directive('avtUsersTab', function($compile, $translate, $mdDialog, $mdToast, utils) {
    var tabtemplate = 
        '<md-tab ng-if="$parent.params.entityname && canreadusers">' +
        '   <md-tab-label>Benutzer</md-tab-label>' +
        '   <md-tab-body>' +
        '       <md-card-content>' +
        '           <md-list class="lines-beetween-items">' +
        '               <md-list-item ng-repeat="user in users | orderBy:\'label\'" ng-click="selectuser(user)">' +
        '                   <md-icon md-svg-src="/css/icons/material/User.svg"></md-icon>' +
        '                   <p>{{user.label || user.name}}</p>' +
        '               </md-list-item>' +
        '           </md-list>' +
        '       </md-card-content>' +
        '   </md-tab-body>' +
        '</md-tab>';
    return {
        restrict: "A",
        priority: 875,
        scope: false,
        compile: function compile(element, attrs) {
            if (element.length < 1 || !element[0].tabs) return;
            element.removeAttr("avt-users-tab");
            var tabs = element[0].tabs;
            if (tabs) {
                var tab = angular.element(tabtemplate);
                tabs.append(tab);
            }
            return function link(scope) {
                scope.canreadusers = scope.$root.canRead('PERMISSION_ADMINISTRATION_USER');
                scope.loadusers = function() {
                    utils.getresponsedata("/api/dynamic/users?usergroupname=" + scope.params.entityname).then(function(users) {
                        scope.users = users;
                        if (users && users.length > 0) scope.candelete = false; // prevent deletion of usergroups with users
                    });
                };
                scope.selectuser = function(user) {
                    utils.setLocation("/users/" + user.name, true);
                };
                scope.loadusers();
            };
        }
    }
});