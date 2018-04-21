app.directive('avtCreateadminToolbarButton', function($compile, $translate, $http, $mdToast, utils) { 
    var buttontemplate = '<md-button ng-if="canwrite" avt-toolbar-button ng-click="createadmin()" icon="/css/icons/material/Add User Mal.svg" label="Administrator" tooltip="Neuen Administrator erstellen"></md-button>';
    return {
        restrict: "A",
        priority: 880,
        scope: false,
        compile: function compile(element, attrs) {
            if (element.length < 1 || !element[0].toolbar) return;
            var toolbar = element[0].toolbar;
            var button = angular.element(buttontemplate);
            toolbar.append(button);
            return function link(scope) {
                scope.createadmin = function() {
                    // utils.removeCardsToTheRightOf(element);
                    // utils.addCardWithPermission('ronnyseins/3DCard', {
                    //     documentId: scope.dynamicobject.name
                    // }, 'PERMISSION_OFFICE_DOCUMENT');
                }
            };
        }
    }
});