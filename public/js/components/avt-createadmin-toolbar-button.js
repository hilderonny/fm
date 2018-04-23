app.directive('avtCreateadminToolbarButton', function($compile, $http, $mdDialog, $mdToast, utils) { 
    var buttontemplate = '<md-button ng-if="canwrite" avt-toolbar-button ng-click="createadmin()" icon="/css/icons/material/Add User Male.svg" label="Administrator" tooltip="Neuen Administrator erstellen"></md-button>';
    var dialogtemplate = 
        '<h2>Neuer Administrator</h2>' +
        '<form name="administratorsForm" layout="column">' +
        '   <md-input-container flex>' +
        '       <label>Benutzername</label>' +
        '       <input ng-model="newclientadministrator.name" name="name" ng-required="true" ng-change="administratorsForm.name.$setValidity(\'nameInUse\', true);updateokbuttonvisibility();">' +
        '       <div ng-messages="administratorsForm.name.$error">' +
        '           <div ng-message="required">Bitte geben Sie einen Benutzernamen und ein Passwort an</div>' +
        '           <div ng-message="nameInUse">Der Benutzername ist bereits vergeben</div>' +
        '       </div>' +
        '   </md-input-container>' +
        '   <md-input-container flex>' +
        '       <label>Passwort</label>' +
        '       <input type="password" name="pass" ng-required="true" ng-model="newclientadministrator.password">' +
        '       <div ng-messages="administratorsForm.name.$error">' +
        '           <div ng-message="required">Bitte geben Sie einen Benutzernamen und ein Passwort an</div>' +
        '       </div>' +
        '   </md-input-container>' +
        '   <p>Bitte notieren Sie sich den Benutzernamen und das Passwort des neuen Administrators, <b>BEVOR</b> Sie auf \"Erstellen\" klicken. Diese Daten werden anschließend nicht noch einmal angezeigt.</p>' +
        '   <p>Beim Erstellen wird gleichzeitig eine Benutzergruppe mit demselben Namen erstellt.</p>' +
        '</form>'
    ;
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
                    var newscope = scope.$new(false);
                    newscope.newclientadministrator = { name: "", password: "", clientname: scope.params.entityname };
                    var okbutton = { label: "Erstellen", ishidden: true, onclick: function() {
                        console.log(newscope.newclientadministrator);
                        $http.post('/api/clients/newadmin', newscope.newclientadministrator).then(function(response) {
                            if (response.status !== 200) {
                                newscope.administratorsForm.name.$setValidity('nameInUse', false);
                                return;
                            }
                            $mdToast.show($mdToast.simple().textContent("Administrator erstellt").hideDelay(1000).position('bottom right'));
                            $mdDialog.hide();
                        });
                        return false;
                    }};
                    newscope.updateokbuttonvisibility = function() {
                        okbutton.ishidden = !newscope.newclientadministrator.name && !newscope.newclientadministrator.password;
                    };
                    utils.showdialog(newscope, dialogtemplate, [
                        okbutton,
                        { label: "Abbrechen" }
                    ]);
                }
            };
        }
    }
});