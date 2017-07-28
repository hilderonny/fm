app.controller('OfficeFolderCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $mdPanel, $translate, utils) {
    
    var createFolderCallback = function(createdFolder) {
        $scope.folder.folders.push(createdFolder);
        $scope.selectFolder(createdFolder);
    };
    var saveFolderCallback = function(savedFolder) {
        $scope.selectedFolder.name = savedFolder.name;
    };
    var deleteFolderCallback = function() {
        for (var i = 0; i < $scope.folder.folders.length; i++) {
            var folder = $scope.folder.folders[i];
            if (folder._id === $scope.selectedFolder._id) {
                $scope.folder.folders.splice(i, 1);
                $scope.selectedFolder = false;
                break;
            }
        }
    };
    var closeFolderCardCallback = function() {
        $scope.selectedFolder = false;
    };
    var saveDocumentCallback = function(savedDocument) {
        $scope.selectedDocument.name = savedDocument.name;
    };
    var extractDocumentCallback = function(newBaseFolderDocument) {
        if (newBaseFolderDocument.folders.length > 0) {
            Array.prototype.push.apply($scope.folder.folders, newBaseFolderDocument.folders); // https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Array/push#Zwei_Arrays_Zusammenführen
        }
        if (newBaseFolderDocument.documents.length > 0) {
            Array.prototype.push.apply($scope.folder.documents, newBaseFolderDocument.documents); // https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Array/push#Zwei_Arrays_Zusammenführen
        }
    };
    var deleteDocumentCallback = function() {
        for (var i = 0; i < $scope.folder.documents.length; i++) {
            var document = $scope.folder.documents[i];
            if (document._id === $scope.selectedDocument._id) {
                $scope.folder.documents.splice(i, 1);
                $scope.selectedDocument = false;
                break;
            }
        }
    };
    var closeDocumentCardCallback = function() {
        $scope.selectedDocument = false;
    };

    // Click on Create-button to create a new folder
    $scope.createFolder = function() {
        var folderToSend = { name: $scope.folder.name };
        if (!$scope.isRootFolder) {
            folderToSend.parentFolderId = $scope.parentFolderId;
        }
        $http.post('/api/folders', folderToSend).then(function(response) {
            var createdFolder = response.data;
            $scope.isNewFolder = false;
            $scope.folder._id = createdFolder._id;
            $scope.folder.folders = [];
            $scope.folder.documents = [];
            $scope.folderName = $scope.folder.name;
            // Information über neuen Ordner für Verknüpfungen-Tab bereit stellen
            $scope.relationsEntity = { type:'folders', id:createdFolder._id };
            if ($scope.params.createFolderCallback) {
                $scope.params.createFolderCallback(createdFolder);
            }
            $mdToast.show($mdToast.simple().textContent('Verzeichnis erstellt').hideDelay(1000).position('bottom right'));
        });
    };

    // Click on Save-button to save an existing folder
    $scope.saveFolder = function() {
        var folderToSend = { name: $scope.folder.name };
        $http.put('/api/folders/' + $scope.folder._id, folderToSend).then(function(response) {
            var savedFolder = response.data;
            $scope.folderName = $scope.folder.name;
            if ($scope.params.saveFolderCallback) {
                $scope.params.saveFolderCallback(savedFolder);
            }
            $mdToast.show($mdToast.simple().textContent('Änderungen gespeichert').hideDelay(1000).position('bottom right'));
        });
    };

    // Click on delete button to delete an existing folder
    $scope.deleteFolder = function() {
        var confirm = $mdDialog.confirm()
            .title('Soll das Verzeichnis "' + $scope.folderName + '" samt Inhalt wirklich gelöscht werden?')
            .ok('Ja')
            .cancel('Nein');
        $mdDialog.show(confirm).then(function() {
            $http.delete('/api/folders/' + $scope.folder._id).then(function(response) {
                if ($scope.params.deleteFolderCallback) {
                    $scope.params.deleteFolderCallback();
                }
                utils.removeCardsToTheRightOf($element);
                utils.removeCard($element);
                $mdToast.show($mdToast.simple().textContent('Verzeichnis gelöscht').hideDelay(1000).position('bottom right'));
            });
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

    // User selects subfolder which gets shown in new card
    $scope.selectFolder = function(selectedFolder) {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Office/FolderCard', {
            folderId: selectedFolder._id,
            saveFolderCallback: saveFolderCallback,
            deleteFolderCallback: deleteFolderCallback,
            closeCallback: closeFolderCardCallback
        });
        $scope.selectedFolder = selectedFolder;
        $scope.selectedDocument = false;
    };

    // Click on new folder button opens detail dialog with new folder data
    $scope.newFolder = function() {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Office/FolderCard', {
            createNewFolder: true,
            parentFolderId: $scope.isRootFolder ? null : $scope.folder._id,
            createFolderCallback: createFolderCallback,
            saveFolderCallback: saveFolderCallback,
            deleteFolderCallback: deleteFolderCallback,
            closeCallback: closeFolderCardCallback
        });
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
                $scope.folder.documents.push(uploadedDocument);
                $scope.selectDocument(uploadedDocument);
                if ($scope.params.uploadDocumentCallback) {
                    $scope.params.uploadDocumentCallback(uploadedDocument);
                }
                $mdToast.show($mdToast.simple().textContent('Dokument hochgeladen').hideDelay(1000).position('bottom right'));
            }
        }
        xhr.responseType = 'json';

        xhr.open('POST', 'api/documents?token=' + $http.defaults.headers.common['x-access-token']);
        xhr.send(form);
    };

    // User selects document which gets shown in new card
    $scope.selectDocument = function(selectedDocument) {
        utils.removeCardsToTheRightOf($element);
        utils.addCard('Office/DocumentCard', {
            documentId: selectedDocument._id,
            saveDocumentCallback: saveDocumentCallback,
            deleteDocumentCallback: deleteDocumentCallback,
            extractDocumentCallback: extractDocumentCallback,
            closeCallback: closeDocumentCardCallback
        });
        $scope.selectedFolder = false;
        $scope.selectedDocument = selectedDocument;
    };

    /**
     * Ermittelt Berechtigungen für diverse Buttons vom Server
     */
    $scope.checkPermission = function() {
        $scope.canWriteDocuments = $rootScope.canWrite('PERMISSION_OFFICE_DOCUMENT');
    };

    // Loads the folder details or prepares the empty dialog for a new folder
    // Params:
    // - $scope.params.createNewFolder : When true, a new folder is to be created and folderId is ignored
    // - $scope.params.folderId : ID of the folder to load, when not set, the root folder is returned
    // - $scope.params.parentFolderId : ID of the parent folder, when a new folder is to be created. When not set, the root folder will get the parent folder
    // - $scope.params.createFolderCallback : Callback function when a new folder was created. Gets the folder as parameter
    // - $scope.params.saveFolderCallback : Callback function when an existing folder was saved. Gets the updated folder as parameter
    // - $scope.params.deleteFolderCallback : Callback function when an existing folder was deleted. No parameters
    // - $scope.params.uploadDocumentCallback : Callback function when a new document was uploaded. Gets the document as parameter
    // - $scope.params.closeCallback : Callback function when the card gets closed via button. No parameters
    $scope.load = function() {
        // First check whether to show the root folder
        if (!$scope.params.folderId && !$scope.params.createNewFolder) {
            $http.get('/api/folders').then(function(response) {
                var rootFolder = response.data;
                $scope.isNewFolder = false;
                $scope.isRootFolder = true;
                $scope.folder = rootFolder;
                $scope.checkPermission();
            });
        } else {
            $scope.parentFolderId = $scope.params.parentFolderId;
            // No root folder, check whether to create a new folder or load an exiting one
            if (!$scope.params.createNewFolder) {
                // Folderid exists, load it
                $http.get('/api/folders/' + $scope.params.folderId).then(function(response) {
                    var folder = response.data;
                    $scope.isNewFolder = false;
                    $scope.isRootFolder = false;
                    $scope.folder = folder;
                    $scope.folderName = folder.name;
                    // Information über den geladenen Ordner für Verknüpfungen-Tab bereit stellen
                    $scope.relationsEntity = { type:'folders', id:folder._id };
                    $scope.checkPermission();
                });
            } else {
                // No folderId, create new folder
                $scope.isNewFolder = true;
                $scope.isRootFolder = false;
                $scope.folder = { name: '' };
            }
        }
    };

    $scope.load();

});
