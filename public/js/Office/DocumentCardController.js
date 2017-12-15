app.controller('OfficeDocumentCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $translate, $location, utils) {

    // Click on Download-document-button
    $scope.downloadDocument = function() {
        window.location.href = '/api/documents/' + $scope.document._id + '?action=download&token=' + $http.defaults.headers.common['x-access-token'];
    }
    
    // Click on Save-button to save an existing document
    $scope.saveDocument = function() {
        $rootScope.isLoading = true;
        var documentToSend = { name: $scope.document.name, isShared: $scope.document.isShared, description: $scope.document.description };
        utils.saveEntity($scope, 'documents', $scope.document._id, '/api/documents/', documentToSend).then(function(savedDocument) {
            $scope.documentName = savedDocument.name;
            if ($scope.params.saveDocumentCallback) {
                $scope.params.saveDocumentCallback(savedDocument);
            }
            $translate(['TRK_DOCUMENTS_CHANGES_SAVED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_DOCUMENTS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
                $rootScope.isLoading = false;
            });
            
        });
    }

    // Click on delete button to delete an existing document
    $scope.deleteDocument = function() {
        $translate(['TRK_DOCUMENTS_DOCUMENT_DELETED', 'TRK_YES', 'TRK_NO']).then(function(translations) {
            $translate('TRK_DOCUMENTS_REALLY_DELETE_DOCUMENT', { documentName: $scope.documentName }).then(function(TRK_DOCUMENTS_REALLY_DELETE_DOCUMENT) {
                var confirm = $mdDialog.confirm()
                    .title(TRK_DOCUMENTS_REALLY_DELETE_DOCUMENT)
                    .ok(translations.TRK_YES)
                    .cancel(translations.TRK_NO);
                $mdDialog.show(confirm).then(function() {
                    $rootScope.isLoading = true;
                    $http.delete('/api/documents/' + $scope.document._id).then(function(response) {
                        if ($scope.params.deleteDocumentCallback) {
                            $scope.params.deleteDocumentCallback();
                        }
                        utils.removeCardsToTheRightOf($element);
                        utils.removeCard($element);
                        $mdToast.show($mdToast.simple().textContent(translations.TRK_DOCUMENTS_DOCUMENT_DELETED).hideDelay(1000).position('bottom right'));
                        $rootScope.isLoading = false;
                    });
                });
            });
        });
    }

    // Click on Entpacken - button
    $scope.extractDocument = function() {
        $scope.isExtracting = true;
        $http.get('/api/extractdocument/' + $scope.document._id).then(function(response) {
            var newBaseFolderContent = response.data;
            $scope.isExtracting = false;
            if ($scope.params.extractDocumentCallback) {
                $scope.params.extractDocumentCallback(newBaseFolderContent);
            }
            $translate(['TRK_DOCUMENTS_FILE_EXTRACTED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_DOCUMENTS_FILE_EXTRACTED).hideDelay(1000).position('bottom right'));
            });
        })
    }

    $scope.viewInAR = function() {
        utils.removeCardsToTheRightOf($element);
        utils.addCardWithPermission('ronnyseins/3DCard', {
            documentId: $scope.document._id
        }, 'PERMISSION_OFFICE_DOCUMENT');
    };

    // User clicks on close button
    $scope.closeCard = function() {
        if ($scope.params.closeCallback) {
            $scope.params.closeCallback();
        }
        utils.removeCardsToTheRightOf($element);
        utils.removeCard($element);
    }

    // Loads the folder details or prepares the empty dialog for a new folder
    // Params:
    // - $scope.params.documentId : ID of the document to load
    // - $scope.params.parentFolderId : ID of the parent folder, when a new document is to be created. When not set, the root folder will get the parent folder
    // - $scope.params.saveDocumentCallback : Callback function when an existing document was saved. Gets the updated document as parameter
    // - $scope.params.deleteDocumentCallback : Callback function when an existing document was deleted. No parameters
    // - $scope.params.extractDocumentCallback : Callback function when an existing document was extracted. No parameters
    // - $scope.params.closeCallback : Callback function when the card gets closed via button. No parameters
    $scope.load = function() {
        $rootScope.isLoading = true;
        // When no documentId is given, there is an error. So do nothing (Lass ihn dumm sterben, wahaha!)
        if (!$scope.params.documentId) {
            return;
        }
        $http.get('/api/documents/' + $scope.params.documentId).then(function(response) {
            var document = response.data;
            $scope.document = document;
            $scope.documentName = document.name;
            $scope.documentUrl = window.location.origin + '/api/documents/share/' + $scope.params.documentId;
            $scope.is3Dmodel =  document.extension === '.dae' || document.extension === '.obj';
            $scope.isPreviewable = [
                'application/vnd.ms-pki.stl'
            ].indexOf(document.type) >= 0;          
            $scope.breadcrumbs = document.path.map(function(pathElement){
                return pathElement.name;
            }).join(' » ');
            // Information über das Dokument für Verknüpfungen-Tab bereit stellen
            $scope.relationsEntity = { type:'documents', id:document._id };
            // Berechtigungen ermitteln
            $scope.canWriteDocuments = $rootScope.canWrite('PERMISSION_OFFICE_DOCUMENT');
            utils.loadDynamicAttributes($scope, 'documents', $scope.params.documentId);
            if ($location.search().view3D) $scope.viewInAR();
            utils.setLocation('/documents/' + $scope.params.documentId);
            $rootScope.isLoading = false;
        });
    }

    $scope.load();

});
