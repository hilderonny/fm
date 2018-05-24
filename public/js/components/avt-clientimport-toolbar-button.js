app.directive('avtClientimportToolbarButton', function ($compile, $http, $mdDialog, $mdToast, utils) {
    var buttontemplate = '<md-button ng-if="canwrite" avt-toolbar-button ng-click="importclient()" icon="/css/icons/material/icons8-database-import.svg" label="Import" tooltip="Mandanten aus ZIP-Datei importieren"></md-button>';
    var dialogtemplate =
        '<h2>Mandantenimport</h2>' +
        '<form name="clientimportform" layout="column">' +
        '   <p>Bitte wählen Sie die ZIP-Datei sowie die Inhalte, die importiert werden sollen.</p>' +
        '   <md-input-container flex class="md-input-has-placeholder">' +
        '       <label>ZIP-Datei</label>' +
        '       <input ng-model="settings.zipfile" name="zipfile" type="file"accept=".zip" onchange="angular.element(this).scope().validateform(this);">' +
        '   </md-input-container>' +
        '   <md-input-container flex>' +
        '       <label>Neuer Name des neuen Mandanten</label>' +
        '       <input ng-model="settings.label" name="label">' +
        '   </md-input-container>' +
        '</form>'
        ;
    return {
        restrict: "A",
        priority: 860,
        scope: false,
        compile: function compile(element, attrs) {
            if (element.length < 1 || !element[0].toolbar) return;
            var toolbar = element[0].toolbar;
            var button = angular.element(buttontemplate);
            toolbar.append(button);
            return function link(scope) {
                scope.importclient = function () {
                    var newscope = scope.$new(false);
                    newscope.settings = { zipfile: null, label: "" };
                    var okbutton = {
                        label: "Importieren", ishidden: true, onclick: function () {
                            console.log(newscope.settings);
                            var url = 'api/clients/import?label=' + encodeURIComponent(newscope.settings.label) + '&token=' + $http.defaults.headers.common['x-access-token'];
                            utils.uploadfile(scope, newscope.settings.fileinput.files[0], null, null, url, true).then(function (clientname) {
                                if (clientname === "Error") { // Some errors occured
                                    $mdDialog.show($mdDialog.alert()
                                        .clickOutsideToClose(true)
                                        .title("Import fehlgeschlagen")
                                        .textContent("Der Inhalt der ZIP-Datei ist ungültig.")
                                        .ok("OK")
                                    );
                                } else {
                                    $mdToast.show($mdToast.simple().textContent("Mandant importiert").hideDelay(1000).position('bottom right'));
                                    utils.setLocation('/clients/' + clientname, true); // Force loading of details card
                                }
                            });
                            $mdDialog.hide();
                            return false;
                        }
                    };
                    newscope.validateform = function (element) {
                        newscope.settings.zipfile = element.value; // File inputs must be handled manually
                        newscope.settings.fileinput = element;
                        okbutton.ishidden = !element.value;
                        element.blur(); // Force refreshing the button visibility by unfocussing the input field
                        console.log(element.value, !element.value, okbutton.ishidden);
                    };
                    utils.showdialog(newscope, dialogtemplate, [
                        okbutton,
                        { label: "Abbrechen" }
                    ]);
                };
            };
        }
    }
});