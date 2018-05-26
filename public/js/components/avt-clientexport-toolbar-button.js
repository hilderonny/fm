app.directive('avtClientexportToolbarButton', function($compile, $http, $mdDialog, $mdToast, utils) { 
    var buttontemplate = '<md-button ng-if="canread" avt-toolbar-button ng-click="exportclient()" icon="/css/icons/material/icons8-database-export.svg" label="Export" tooltip="Mandanten in ZIP-Datei exportieren"></md-button>';
    var dialogtemplate = 
        '<h2>Mandantenexport</h2>' +
        '<form name="clientexportform" layout="column">' +
        '   <p>Bitte wählen Sie die Inhalte, die exportiert werden sollen.</p>' +
        '   <md-input-container flex>' +
        '       <md-checkbox ng-model="settings.datatypes" name="datatypes"><span>Datentypen</span></md-checkbox>' +
        '   </md-input-container>' +
        '   <md-input-container flex>' +
        '       <md-checkbox ng-model="settings.content" name="content"><span>Datenbankinhalte</span></md-checkbox>' +
        '   </md-input-container>' +
        '   <md-input-container flex>' +
        '       <md-checkbox ng-model="settings.files" name="files"><span>Dateien</span></md-checkbox>' +
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
                scope.exportclient = function() {
                    var newscope = scope.$new(false);
                    newscope.settings = { datatypes: true, content: true, files: true };
                    var okbutton = { label: "Exportieren", onclick: function() {
                        console.log(newscope.settings);
                        window.open('/api/clients/export/' + scope.params.entityname + '?token=' + scope.token + "&datatypes=" + newscope.settings.datatypes + "&content=" + newscope.settings.content + "&files=" + newscope.settings.files, "_blank");
                        $mdDialog.hide();
                        return false;
                    }};
                    utils.showdialog(newscope, dialogtemplate, [
                        okbutton,
                        { label: "Abbrechen" }
                    ]);
                };
            };
        }
    }
});