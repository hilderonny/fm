app.controller('AdministrationPortalSettingsCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, utils) {

    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    }

    // Stores the settings by sending them to the server
    $scope.saveSettings = function() {
        $rootScope.isLoading=true;
        var settingsToSend = { 
            licenseserverurl: $scope.settings.licenseServer, 
            licensekey: $scope.settings.licenseKey 
        };
        $http.put('/api/portalmanagement/', settingsToSend).then(function(response) {
            $translate(['TRK_SETTINGS_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_SETTINGS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
            });$rootScope.isLoading=false;
        });
    };

    // Trigger asking the license server for updates
    $scope.checkForUpdates = function() {
        $rootScope.isLoading=true;
        $http.get('/api/portalmanagement/checkforupdate/').then(function(response) {
            $scope.versionOnServer = response.data.serverVersion;
            $scope.localVersion = response.data.localVersion;
            $scope.updatesChecked = true;
            $rootScope.isLoading=false;
        });
    };

    // Triggers the update process and shows information about that
    $scope.downloadAndInstallUpdate = function() {
        $scope.updatesChecked = false;
        $scope.updateInProgress = true;
        $http.post('/api/portalmanagement/triggerupdate/');
    };

    // Uploads an update file and extracts it
    $scope.uploadFile = function(fileinput) { // http://stackoverflow.com/a/17923521
        var file = fileinput.files[0];

        $scope.isUploading = true;
        $scope.uploadProgress = 0;
        $scope.uploadMode = 'determinate';

        // http://stackoverflow.com/q/13591345
        var form = new FormData();
        var xhr = new XMLHttpRequest;
        // Additional POST variables required by the API script
        form.append('secret', 'hubbele bubbele');
        form.append('file', file);

        xhr.upload.onprogress = function(e) {
            // Event listener for when the file is uploading
            if (e.lengthComputable) {
                var progress = Math.round(e.loaded / e.total * 100);
                $scope.uploadProgress = progress;
            } else {
                $scope.uploadMode = 'indeterminate';
            }
        };

        xhr.onreadystatechange = function(e) { // https://developer.mozilla.org/de/docs/Web/API/XMLHttpRequest
            if (e.target.readyState === 4) {
                $scope.isUploading = false;
                $translate(['TRK_SETTINGS_FILE_UPLODAED']).then(function(translations) {
                    $mdToast.show($mdToast.simple().textContent(translations.TRK_SETTINGS_FILE_UPLODAED).hideDelay(1000).position('bottom right'));
                });
            }
        }
        xhr.responseType = 'json';

        xhr.open('POST', 'api/triggerUpdate?token=' + $http.defaults.headers.common['x-access-token']);
        xhr.send(form);
    };


    // Loads the actual settings from the localconfig.json file
    $scope.load = function() {
        $rootScope.isLoading=true;
        $http.get('/api/portalmanagement/').then(function(response) {
            $scope.settings = { 
                licenseServer: response.data.licenseserverurl, 
                licenseKey: response.data.licensekey 
            };
            $scope.canWritePortalSettings = $rootScope.canWrite('PERMISSION_SETTINGS_PORTAL');
            utils.setLocation('/settings/TRK_SETTINGSET_PORTAL_GENERAL');
            $rootScope.isLoading=false;
        });
    };

    $scope.load();

});
