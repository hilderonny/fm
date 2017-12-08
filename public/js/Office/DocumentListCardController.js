app.controller('OfficeDocumentListCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $mdPanel, $translate, utils) {
    
    var createFolderCallback = function(createdFolder) {
        var viewModel = {
            icon: 'material/Folder',
            name: createdFolder.name,
            type: 'folders',
            id: createdFolder._id,
            parentFolderId: createdFolder.parentFolderId,
            children: [],
            parentFolder: $scope.selectedElement
        };
        if ($scope.selectedElement) {
            $scope.selectedElement.children.push(viewModel);
            $scope.selectedElement.isOpen = true;
        } else {
            $scope.child.children.push(viewModel);
        }
        $scope.selectElement(viewModel);
    };

    var uploadDocumentCallback = function(uploadedDocument) {
        var viewModel = {
            icon: 'material/Document',
            name: uploadedDocument.name,
            type: 'documents',
            id: uploadedDocument._id,
            parentFolderId: uploadedDocument.parentFolderId,
            children: [],
            parentFolder: $scope.selectedElement
        };
        if ($scope.selectedElement) {
            $scope.selectedElement.children.push(viewModel);
            $scope.selectedElement.isOpen = true;
        } else {
            $scope.child.children.push(viewModel);
        }
        $scope.selectElement(viewModel);
    };

    var saveElementCallback = function(savedElement) {
        $scope.selectedElement.name = savedElement.name;
    };

    var deleteElementCallback = function() {
        var parentChildren = $scope.selectedElement.parentFolder ? $scope.selectedElement.parentFolder.children : $scope.child.children;
        parentChildren.splice(parentChildren.indexOf($scope.selectedElement), 1);
        closeElementCallback();
    };

    var extractDocumentCallback = function() {
        // Hierarchie einfach neu laden
        $scope.load();
    }

    var closeElementCallback = function() {
        $scope.selectedElement = false;
        utils.setLocation('/documents');
    };

    // Click on new folder button opens detail dialog with new folder data
    $scope.newFolder = function() {
        $scope.selectedElement = null;
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('Office/FolderCard', {
            parentFolderId: null,
            createFolderCallback: createFolderCallback,
            closeCallback: closeElementCallback
        }, 'PERMISSION_OFFICE_DOCUMENT');
    };

    $scope.selectElement = function(element) {
        utils.removeCardsToTheRightOf($element);
        if (element.type === 'folders') {
            utils.addCardWithPermission('Office/FolderCard', {
                folderId: element.id,
                createFolderCallback: createFolderCallback,
                saveFolderCallback: saveElementCallback,
                deleteFolderCallback: deleteElementCallback,
                uploadDocumentCallback: uploadDocumentCallback,
                closeCallback: closeElementCallback
            }, 'PERMISSION_OFFICE_DOCUMENT').then(function() {
                $scope.selectedElement = element;
            });
        } else {
            utils.addCardWithPermission('Office/DocumentCard', {
                documentId: element.id,
                saveDocumentCallback: saveElementCallback,
                deleteDocumentCallback: deleteElementCallback,
                extractDocumentCallback: extractDocumentCallback,
                closeCallback: closeElementCallback
            }, 'PERMISSION_OFFICE_DOCUMENT').then(function() {
                $scope.selectedElement = element;
            });
        }
        // Hierarchie aufklappen, wenn nötig
        var currentElement = element;
        while (currentElement.parentFolder && !currentElement.parentFolder.isOpen) {
            currentElement = currentElement.parentFolder;
            currentElement.isOpen = true;
        }
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
                $scope.selectedElement = null;
                uploadDocumentCallback(uploadedDocument);
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
        $http.get('/api/folders/allFoldersAndDocuments').then(function(response) {
            var folderOrDocument = response.data;
            var allFoldersAndDocuments = {};
            response.data.forEach(function(folderOrDocument) {
                var viewModel = {
                    icon: folderOrDocument.type === 'folder' ? 'material/Folder' : 'material/Document',
                    name: folderOrDocument.name,
                    type: folderOrDocument.type === 'folder' ? 'folders' : 'documents',
                    id: folderOrDocument._id,
                    parentFolderId: folderOrDocument.parentFolderId,
                    children: []
                }
                allFoldersAndDocuments[folderOrDocument._id] = viewModel;
            });
            var rootElement = { children: [] };
            Object.keys(allFoldersAndDocuments).forEach(function(key) {
                var folderOrDocument = allFoldersAndDocuments[key];
                if (folderOrDocument.parentFolderId) {
                    var parentFolder = allFoldersAndDocuments[folderOrDocument.parentFolderId];
                    parentFolder.children.push(folderOrDocument);
                    folderOrDocument.parentFolder = parentFolder;
                } else {
                    rootElement.children.push(folderOrDocument);
                }
            });
            $scope.child = rootElement;
            $scope.canWriteDocuments = $rootScope.canWrite('PERMISSION_OFFICE_DOCUMENT');
            if ($scope.params.preselection) {
                var elementToSelect = allFoldersAndDocuments[$scope.params.preselection];
                if (elementToSelect) $scope.selectElement(elementToSelect);
            } else {
                utils.setLocation('/documents');
            }
            $rootScope.isLoading = false;
        });
    };

    $scope.load();

});

app.directUrlMappings.documents = {
    mainMenu: 'TRK_MENU_OFFICE',
    subMenu: 'TRK_MENU_OFFICE_DOCUMENTS'
};
