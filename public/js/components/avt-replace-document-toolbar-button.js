app.directive('avtReplaceDocumentToolbarButton', function($rootScope, $compile, $translate, $mdToast, $http, utils) { 
    var template = 
        '<md-button ng-if="$parent.params.datatypename === \'documents\' && !$parent.isnew" avt-toolbar-button icon="/css/icons/material/icons8-symlink-file.svg" label="Ersetzen" tooltip="Dokument durch neue Datei ersetzen">' +
        '   <input type="file" class="fileupload" onchange="angular.element(this).scope().replacefile(this)" />' +
        '</md-button>';
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
                scope.replacefile = function(fileinput) {
                    var file = fileinput.files[0];
                    scope.progressmode = "determinate";
                    scope.progressvalue = 0;
                    scope.isinprogress = true;
                    var form = new FormData();
                    var xhr = new XMLHttpRequest;
                    // Additional POST variables required by the API script
                    form.append('file', file);
                    xhr.upload.onprogress = function(e) {
                        // Event listener for when the file is uploading
                        if (e.lengthComputable) {
                            var progress = Math.round(e.loaded / e.total * 100);
                            scope.progressvalue = progress;
                        } else {
                            scope.progressmode = 'indeterminate';
                        }
                    }
                    xhr.onreadystatechange = function(e) {
                        if (e.target.readyState === 4) {
                            scope.isinprogress = false;
                            var uploadeddocumentname = e.target.response;
                            $mdToast.show($mdToast.simple().textContent("Dokument hochgeladen und ersetzt.").hideDelay(1000).position('bottom right'));
                        }
                    }
                    xhr.open('POST', 'api/documents/' + scope.dynamicobject.name + '?token=' + $http.defaults.headers.common['x-access-token']);
                    xhr.send(form);
                }
            };
        }
    }
});