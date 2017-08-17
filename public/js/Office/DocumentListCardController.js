app.controller('OfficeDocumentListCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $mdPanel, $translate, utils) {
    
    var createFolderCallback = function(createdFolder) {
        var folderElement = {
            _id: createdFolder._id,
            type: 'f',
            name: createdFolder.name,
            children: []
        };
        if ($scope.selectedElement) {
            if (!$scope.selectedElement.children) $scope.selectedElement.children = [];
            var indexToInsert = $scope.elements.indexOf($scope.selectedElement) + 1;
            while ($scope.elements[indexToInsert] && $scope.elements[indexToInsert].level > $scope.selectedElement.level) indexToInsert++;
            $scope.elements.splice(indexToInsert, 0, folderElement);
            $scope.selectedElement.children.push(folderElement);
            folderElement.level = $scope.selectedElement.level + 1;
        } else {
            folderElement.level = 0;
            $scope.elements.push(folderElement);
        }
        $scope.selectElement(folderElement);
    };

    var uploadDocumentCallback = function(uploadedDocument) {
        var documentElement = {
            _id: uploadedDocument._id,
            type: 'd',
            name: uploadedDocument.name
        };
        if ($scope.selectedElement) {
            if (!$scope.selectedElement.children) $scope.selectedElement.children = [];
            var indexToInsert = $scope.elements.indexOf($scope.selectedElement) + 1;
            while ($scope.elements[indexToInsert] && $scope.elements[indexToInsert].level > $scope.selectedElement.level) indexToInsert++;
            $scope.elements.splice(indexToInsert, 0, documentElement);
            $scope.selectedElement.children.push(documentElement);
            documentElement.level = $scope.selectedElement.level + 1;
        } else {
            documentElement.level = 0;
            $scope.elements.push(documentElement);
        }
        $scope.selectElement(documentElement);
    };

    var saveElementCallback = function(savedElement) {
        $scope.selectedElement.name = savedElement.name;
    };

    var deleteElementCallback = function() {
        var index = $scope.elements.indexOf($scope.selectedElement);
        var deleteCount = 1;
        for (var i = index + 1; i < $scope.elements.length; i++) {
            if ($scope.elements[i].level > $scope.selectedElement.level) {
                deleteCount++;
            } else {
                break; //Wichtig, da sonst Unterelemente in kommenden Pfaden ebenfalls gelöscht würden
            }
        }
        $scope.elements.splice($scope.elements.indexOf($scope.selectedElement), deleteCount);
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
        if (element.type === 'f') {
            utils.addCardWithPermission('Office/FolderCard', {
                folderId: element._id,
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
                documentId: element._id,
                saveDocumentCallback: saveElementCallback,
                deleteDocumentCallback: deleteElementCallback,
                extractDocumentCallback: extractDocumentCallback,
                closeCallback: closeElementCallback
            }, 'PERMISSION_OFFICE_DOCUMENT').then(function() {
                $scope.selectedElement = element;
            });
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
                $scope.elements.push(uploadedDocument);
                $scope.selectElement(uploadedDocument);
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
        $http.get('/api/folders').then(function(response) {
            var rootElements = response.data;
            $scope.elements = [];
            var flattenElements = function(element, level) {
                $scope.elements.push(element);
                element.level = level;
                if (element.children) element.children.forEach(function(e) { flattenElements(e, level + 1) });
            };
            rootElements.forEach(function(e) {
                flattenElements(e, 0);
            });
            $scope.canWriteDocuments = $rootScope.canWrite('PERMISSION_OFFICE_DOCUMENT');
            utils.handlePreselection($scope, $scope.elements, $scope.selectElement);
            if (!$scope.params.preselection) utils.setLocation('/documents');
        });
    };

    $scope.load();

});

app.directUrlMappings.documents = {
    mainMenu: 'TRK_MENU_OFFICE',
    subMenu: 'TRK_MENU_OFFICE_DOCUMENTS'
};