
app.directive('avtCardPreview', function($compile, $rootScope, utils) {
    var buttontemplate = '<md-button avt-toolbar-button ng-click="openpreviewcard()" icon="/css/icons/material/icons8-file-preview.svg" label="Vorschau" tooltip="Vorschau der Karte anzeigen"></md-button>';
    return {
        restrict: "A",
        priority: 877,
        scope: false,
        compile: function compile(element) {
            if (element.length < 1 || !element[0].toolbar) return;
            element.removeAttr("avt-card-preview");
            var toolbar = element[0].toolbar;
            var button = angular.element(buttontemplate);
            toolbar.append(button);
            return function link(scope) {
                scope.openpreviewcard = function() {
                    utils.removeCardsToTheRightOf(element);
                    var content = scope.dynamicobject.content;
                    var previousContent = content;
                    scope.cardCanvas = angular.element(document.querySelector('#cardcanvas'));
                    scope.previewcard = angular.element(content);
                    scope.domCard = scope.previewcard[0];
                    scope.cardCanvas.append(scope.previewcard);
                    scope.newScope = $rootScope.$new(true);
                    scope.newScope.params = {
                        permission: scope.params.permission
                    };
                    $compile(scope.previewcard)(scope.newScope);
                    window.getComputedStyle(scope.domCard).borderColor;
                    utils.waitForOffsetAndScroll(scope.domCard, scope.cardCanvas, 50).then(function() { utils.scrollToAnchor(scope.domCard, scope.cardCanvas, 50); });
                    if (!scope.interval) scope.interval = setInterval(function() {
                        if (previousContent === scope.dynamicobject.content) return;
                        previousContent = scope.dynamicobject.content;
                        scope.openpreviewcard();
                    }, 1000);
                };
            };
        }
    }
});