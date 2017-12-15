app.controller('OfficeFolderCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $mdPanel, $translate, utils) {

    $scope.selectElement = function(element) {
        utils.setLocation('/documents/' + element._id, true);
    };

    // Click on Create-button to create a new folder
    $scope.createFolder = function() {
       $rootScope.isLoading = true;
        var folderToSend = { 
            name: $scope.folder.name, 
            parentFolderId: $scope.folder.parentFolderId
        };
        $http.post('/api/folders', folderToSend).then(function(response) {
            var createdFolder = response.data;
            $scope.isNewFolder = false;
            $scope.folder._id = createdFolder._id;
            $scope.folderName = $scope.folder.name;
            // Information über neuen Ordner für Verknüpfungen-Tab bereit stellen
            $scope.relationsEntity = { type:'folders', id:createdFolder._id };
            if ($scope.params.createFolderCallback) {
                $scope.params.createFolderCallback(createdFolder);
            }
            $translate(['TRK_FOLDERS_FOLDER_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_FOLDERS_FOLDER_CREATED).hideDelay(1000).position('bottom right'));
            });
            $rootScope.isLoading = false;
        });
    };

    // Click on Save-button to save an existing folder
    $scope.saveFolder = function() {
        $rootScope.isLoading = true;
        var folderToSend = { name: $scope.folder.name };
        utils.saveEntity($scope, 'folders', $scope.folder._id, '/api/folders/', folderToSend).then(function(savedFolder) {
            $scope.folderName = $scope.folder.name;
            if ($scope.params.saveFolderCallback) {
                $scope.params.saveFolderCallback(savedFolder);
            }
            $translate(['TRK_FOLDERS_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_FOLDERS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
                $rootScope.isLoading = false;
            });
            
        });
       
    };

    // Click on delete button to delete an existing folder
    $scope.deleteFolder = function() {
        var translations;
        $translate(['TRK_FOLDERS_FOLDER_DELETED', 'TRK_YES', 'TRK_NO']).then(function(t) {
            translations = t;
            return $translate('TRK_FOLDERS_REALLY_DELETE_FOLDER', { folderName: $scope.folderName });
        }).then(function(TRK_FOLDERS_REALLY_DELETE_FOLDER) {
            var confirm = $mdDialog.confirm()
                .title(TRK_FOLDERS_REALLY_DELETE_FOLDER)
                .ok(translations.TRK_YES)
                .cancel(translations.TRK_NO);
            return $mdDialog.show(confirm);
        }).then(function() {         
            $rootScope.isLoading = true;  
            return $http.delete('/api/folders/' + $scope.folder._id);
        }).then(function(response) {
            if ($scope.params.deleteFolderCallback) {
                $scope.params.deleteFolderCallback();
            }
            utils.removeCardsToTheRightOf($element);
            utils.removeCard($element);
            $mdToast.show($mdToast.simple().textContent(translations.TRK_FOLDERS_FOLDER_DELETED).hideDelay(1000).position('bottom right'));
            $rootScope.isLoading = false;
        });
    };

    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    };

    // Neuen Ornder in dem selektierten erstellen
    $scope.newFolder = function() {
        utils.removeCard($element);
        utils.addCardWithPermission('Office/FolderCard', {
            parentFolderId: $scope.folder._id,
            createFolderCallback: $scope.params.createFolderCallback,
            closeCallback: $scope.params.closeElementCallback
        }, 'PERMISSION_OFFICE_DOCUMENT');
    };

    // Performs the upload of the selected file
    $scope.uploadFile = function(fileinput) { // http://stackoverflow.com/a/17923521
        var file = fileinput.files[0];

        $scope.isUploading = true;
        $scope.uploadProgress = 0;
        $scope.uploadMode = 'determinate';

        // http://stackoverflow.com/q/13591345
        var form = new FormData();
        var xhr = new XMLHttpRequest;
        // Additional POST variables required by the API script
        form.append('parentFolderId', $scope.folder._id);
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
                var uploadedDocument = e.target.response;
                $scope.folder.elements.push(uploadedDocument);
                $scope.selectElement(uploadedDocument);
                if ($scope.params.uploadDocumentCallback) {
                    $scope.params.uploadDocumentCallback(uploadedDocument);
                }
                $translate(['TRK_FOLDERS_DOCUMENT_UPLOADED']).then(function(translations) {
                    $mdToast.show($mdToast.simple().textContent(translations.TRK_FOLDERS_DOCUMENT_UPLOADED).hideDelay(1000).position('bottom right'));
                });
            }
        }
        xhr.responseType = 'json';

        xhr.open('POST', 'api/documents?token=' + $http.defaults.headers.common['x-access-token']);
        xhr.send(form);
    };

    $scope.load = function() {
        $rootScope.isLoading = true;
        if ($scope.params.folderId) {
            $http.get('/api/folders/' + $scope.params.folderId).then(function(folderResponse) {
                var completeFolder = folderResponse.data;
                $scope.isNewFolder = false;
                $scope.folder = completeFolder;
                $scope.folderName = completeFolder.name; // Prevent updating the label when changing the name input value
                $scope.breadcrumbs = completeFolder.path.map(function(pathElement){
                    return pathElement.name;
                }).join(' » ');
                $scope.relationsEntity = { type:'folders', id:completeFolder._id };
                $rootScope.isLoading = false;
            }).then(function() {
                utils.loadDynamicAttributes($scope, 'folders', $scope.params.folderId);
                utils.setLocation('/documents/' + $scope.params.folderId);
            });
        } else {
            $scope.isNewFolder = true;
            $scope.folder = { name : "", parentFolderId: $scope.params.parentFolderId, folders: [], documents: [] };
            $rootScope.isLoading = false;
        }
        $scope.canWriteDocuments = $rootScope.canWrite('PERMISSION_OFFICE_DOCUMENT');
    };

    $scope.load();

});
