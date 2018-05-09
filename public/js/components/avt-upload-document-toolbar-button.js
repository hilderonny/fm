app.directive('avtUploadDocumentToolbarButton', function ($rootScope, $compile, $translate, $mdToast, $mdPanel, $mdDialog, $http, utils) {
    var template =
        '<md-button ng-if="$parent.canwrite && (!$parent.params.datatypename || $parent.params.datatypename === \'folders\') && !$parent.isnew" avt-toolbar-button icon="/css/icons/material/Upload.svg" label="Hochladen" tooltip="Dokument hochladen" ng-click="onClickUploadButton($event)"></md-button>' +
        '<script type="text/ng-template" id="uploadMethodChoice.html">' +
        '   <md-list class="context-menu" role="list">' +
        '       <md-list-item ng-click="parentScope.uploadFromFile()"><img ng-src="/css/icons/material/Upload.svg"/><p><span translate="TRK_FOLDERS_FILE_UPLOAD"></span></p></md-list-item>' +
        '       <md-list-item ng-click="parentScope.uploadFromURL()"><img ng-src="/css/icons/material/icons8-website.svg"/><p><span translate="TRK_FOLDERS_URL_UPLOAD"></span></p></md-list-item>' +
        '   </md-list>' +
        '</script>';
    var urluploaddialogcontent =
        '<md-input-container flex>' +
        '    <label translate>TRK_FOLDERS_ENTER_URL</label>' +
        '    <input type="text" ng-model="url">' +
        '</md-input-container>';
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
                // scope.onCancelClick = function () {
                //     $mdDialog.cancel();
                // };
                scope.onClickUploadButton = function (evt) {
                    var nodeToHandle = evt.currentTarget;
                    var position = $mdPanel.newPanelPosition().relativeTo(nodeToHandle).addPanelPosition($mdPanel.xPosition.ALIGN_START, $mdPanel.yPosition.BELOW);
                    var parentScope = scope;
                    $mdPanel.open({
                        attachTo: angular.element(document.body),
                        controller: function ($scope) { $scope.parentScope = parentScope; }, // https://github.com/angular/material/issues/1531#issuecomment-74640529
                        templateUrl: 'uploadMethodChoice.html',
                        panelClass: 'select-type-menu',
                        position: position,
                        openFrom: evt,
                        clickOutsideToClose: true,
                        escapeToClose: true,
                        focusOnOpen: true,
                        zIndex: 2
                    }).then(function (panelRef) { //Nach Auswahl
                        scope.menuPanel = panelRef;
                    });
                };
                scope.uploadfile = function (fileinput) {
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
                    xhr.upload.onprogress = function (e) {
                        // Event listener for when the file is uploading
                        if (e.lengthComputable) {
                            var progress = Math.round(e.loaded / e.total * 100);
                            scope.progressvalue = progress;
                        } else {
                            scope.progressmode = 'indeterminate';
                        }
                    }
                    xhr.onreadystatechange = function (e) { // https://developer.mozilla.org/de/docs/Web/API/XMLHttpRequest
                        if (e.target.readyState === 4) {
                            scope.isinprogress = false;
                            var uploadeddocumentname = e.target.response;
                            $translate(['TRK_FOLDERS_DOCUMENT_UPLOADED']).then(function (translations) {
                                $mdToast.show($mdToast.simple().textContent(translations.TRK_FOLDERS_DOCUMENT_UPLOADED).hideDelay(1000).position('bottom right'));
                            });
                            utils.setLocation('/documents/' + uploadeddocumentname, true); // Force loading of details card
                        }
                    }
                    xhr.open('POST', 'api/documents?token=' + $http.defaults.headers.common['x-access-token']);
                    xhr.send(form);
                };
                scope.uploadFromFile = function () {
                    scope.menuPanel.close();
                    var input = document.createElement("input");
                    input.type = "file";
                    input.click();
                    input.onchange = function (event) {
                        scope.uploadfile(event.target);
                        return;
                    }
                };
                //Opens the URL input dialogue
                scope.uploadFromURL = function () {
                    scope.menuPanel.close();
                    var dialogscope = scope.$new(false);
                    dialogscope.url = "";
                    var urluploadokbutton = {
                        label: "OK", onclick: function () {
                            var datatosend = { 
                                url: dialogscope.url
                            };
                            if (scope.params.entityname && scope.params.datatypename) {
                                datatosend.parentdatatypename = scope.params.datatypename;
                                datatosend.parententityname = scope.params.entityname;
                            }
                            scope.progressmode = 'indeterminate';
                            scope.isinprogress = true;
                            $http.post('/api/documents/urlupload', datatosend).then(function(response) {
                                scope.isinprogress = false;
                                if (response.status === 409) return;
                                if (response.status === 400) {
                                    return $translate('TRK_FOLDERS_URL_INVALID_MESSAGE').then(function (message) {
                                        var alert = $mdDialog.alert().textContent(message).ok('OK');
                                        $mdDialog.show(alert);
                                    });
                                }
                                if (response.status === 301) return $scope.onSubmitURL(response.url);
                                var uploadeddocumentname = response.data;
                                $translate(['TRK_FOLDERS_DOCUMENT_UPLOADED']).then(function (translations) {
                                    $mdToast.show($mdToast.simple().textContent(translations.TRK_FOLDERS_DOCUMENT_UPLOADED).hideDelay(1000).position('bottom right'));
                                });
                                utils.setLocation('/documents/' + uploadeddocumentname, true); // Force loading of details card
                            });
                        }
                    };
                    utils.showdialog(dialogscope, urluploaddialogcontent, [
                        urluploadokbutton,
                        { label: "Abbrechen" }
                    ]);
                };
            };
        }
    }
});