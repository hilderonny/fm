app.directive('avtExtractDocumentToolbarButton', function($compile, $translate, $http, $mdToast, utils) { 
    var template = '<md-button ng-if="$parent.params.datatypename === \'documents\' && !$parent.isnew && $parent.dynamicobject && [\'application/zip\',\'application/x-zip-compressed\'].indexOf($parent.dynamicobject.type) >= 0" avt-toolbar-button ng-click="extractdocument()" icon="/css/icons/material/icons8-open-archive.svg" label="Entpacken" tooltip="Archiv entpacken"></md-button>';
    return {
        restrict: "A",
        priority: 880,
        scope: false,
        compile: function compile(element, attrs) {
            if (element.length < 1 || !element[0].toolbar) return;
            var toolbar = element[0].toolbar;
            var button = angular.element(template);
            toolbar.append(button);
            return function link(scope) {
                scope.extractdocument = function() {
                    scope.progressmode = "indeterminate";
                    scope.isinprogress = true;
                    $http.get('/api/extractdocument/' + scope.dynamicobject.name).then(function(response) {
                        scope.isinprogress = false;
                        if (scope.params.oncreate) {
                            scope.params.oncreate(); // Without parameters to force entire reload
                        }
                        $translate(['TRK_DOCUMENTS_FILE_EXTRACTED']).then(function(translations) {
                            $mdToast.show($mdToast.simple().textContent(translations.TRK_DOCUMENTS_FILE_EXTRACTED).hideDelay(1000).position('bottom right'));
                        });
                    })
                }
            };
        }
    }
});