app.directive('avtUploadDocumentToolbarButton', function($rootScope, $compile, $translate, $mdToast, $http, utils) { 
    var template = 
        '<md-button ng-if="$parent.canwrite && (!$parent.params.datatypename || $parent.params.datatypename === \'folders\') && !$parent.isnew" avt-toolbar-button icon="/css/icons/material/Upload.svg" label="Hochladen" tooltip="Dokument hochladen">' +
        '   <input type="file" class="fileupload" onchange="angular.element(this).scope().uploadfile(this)" />' +
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
                scope.uploadfile = function(fileinput) {
                    var file = fileinput.files[0];
                    scope.progressmode = "determinate";
                    scope.progressvalue = 0;
                    scope.isinprogress = true;
                    // http://stackoverflow.com/q/13591345
                    var form = new FormData();
                    var xhr = new XMLHttpRequest;
                    // Additional POST variables required by the API script
                    form.append('parententityname', scope.params.entityname ? scope.params.entityname : "");
                    form.append('parentdatatypename', scope.params.datatypename ? scope.params.datatypename : "");
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
                    xhr.onreadystatechange = function(e) { // https://developer.mozilla.org/de/docs/Web/API/XMLHttpRequest
                        if (e.target.readyState === 4) {
                            scope.isinprogress = false;
                            var uploadeddocumentname = e.target.response;
                            $translate(['TRK_FOLDERS_DOCUMENT_UPLOADED']).then(function(translations) {
                                $mdToast.show($mdToast.simple().textContent(translations.TRK_FOLDERS_DOCUMENT_UPLOADED).hideDelay(1000).position('bottom right'));
                            });
                            utils.setLocation('/documents/' + uploadeddocumentname, true); // Force loading of details card
                        }
                    }
                    xhr.open('POST', 'api/documents?token=' + $http.defaults.headers.common['x-access-token']);
                    xhr.send(form);
                }
            };
        }
    }
});