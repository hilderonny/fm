app.controller('BIMFmobjectCardController', function($scope, $rootScope, $http, $mdDialog, $element, $mdToast, $mdPanel, $translate, $mdDialog, utils) {

    $scope.types = [
        'FMOBJECTS_TYPE_PROJECT',
        'FMOBJECTS_TYPE_PROPERTY',
        'FMOBJECTS_TYPE_BUILDING',
        'FMOBJECTS_TYPE_LEVEL',
        'FMOBJECTS_TYPE_ROOM',
        'FMOBJECTS_TYPE_AREA',
        'FMOBJECTS_TYPE_INVENTORY'
    ];

    $scope.categories = {
        FMOBJECTS_CATEGORY_NUF: [
            'Wohnen und Aufenthalt', 
            'Büroarbeit', 
            'Produktion, Hand- und Maschinenarbeit, Experimente', 
            'Lagern, Verteilen und Verkaufen', 
            'Bildung, Unterricht und Kultur', 
            'Heilen und Pflegen',
            'Sonstige Nutzung'
        ],
        FMOBJECTS_CATEGORY_TF: [ 'Technische Anlagen' ],
        FMOBJECTS_CATEGORY_VF: [ 'Verkehrserschließung und -sicherung' ]
    };

    $scope.usagestates = [
        "Ungenutzt",
        "Eigengenutzt",
        "Vermietet",
        "Reserviert"
    ]
    
    // Click on new FM object button opens detail dialog with new FM object data
    $scope.newFmObject = function() {
        utils.removeCard($element);
        utils.addCardWithPermission('BIM/FmobjectCard', {
            parentFmObjectId: $scope.fmObject._id,
            createFmObjectCallback: $scope.params.createFmObjectCallback,
            closeCallback: $scope.params.closeCallback
        }, 'PERMISSION_BIM_FMOBJECT');
    };

    // Click on Create-button to create a new FM object
    $scope.createFmObject = function() {
        $rootScope.isLoading = true;
        var fmObjectToSend =  { 
            name: $scope.fmObject.name, 
            type: $scope.fmObject.type, 
            parentId: $scope.fmObject.parentId,
            category: $scope.fmObject.category,
            areatype: $scope.fmObject.areatype,
            f: $scope.fmObject.f,
            bgf: $scope.fmObject.bgf,
            usagestate: $scope.fmObject.usagestate,
            nrf: $scope.fmObject.nrf,
            nuf: $scope.fmObject.nuf,
            tf: $scope.fmObject.tf,
            vf: $scope.fmObject.vf,
            previewImageId: $scope.fmObject.previewImageId
        };
        $http.post('/api/fmobjects', fmObjectToSend).then(function(response) {
            var createdFmObject = response.data;
            $scope.isNewFmObject = false;
            $scope.fmObject._id = createdFmObject._id;
            $scope.fmObjectName = $scope.fmObject.name; 
            $scope.relationsEntity = { type:'fmobjects', id:createdFmObject._id };
            if ($scope.params.createFmObjectCallback) {
                $scope.params.createFmObjectCallback(createdFmObject);
            }
            $translate(['TRK_FMOBJECTS_FM_OBJECT_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_FMOBJECTS_FM_OBJECT_CREATED).hideDelay(1000).position('bottom right'));
            });
            $rootScope.isLoading = false;
        });
    };

    // Click on Save-button to save an existing FM object
    $scope.saveFmObject = function() {
        $rootScope.isLoading = true;
        var fmObjectToSend = { 
            name: $scope.fmObject.name, 
            type: $scope.fmObject.type, 
            category: $scope.fmObject.category,
            areatype: $scope.fmObject.areatype,
            f: $scope.fmObject.f,
            bgf: $scope.fmObject.bgf,
            usagestate: $scope.fmObject.usagestate,
            nrf: $scope.fmObject.nrf,
            nuf: $scope.fmObject.nuf,
            tf: $scope.fmObject.tf,
            vf: $scope.fmObject.vf,
            previewImageId: $scope.fmObject.previewImageId
        };
        utils.saveEntity($scope, 'fmobjects', $scope.params.fmObjectId, '/api/fmobjects/', fmObjectToSend).then(function(savedFmObject) {
            $scope.fmObjectName = $scope.fmObject.name;
            if ($scope.params.saveFmObjectCallback) {
                $scope.params.saveFmObjectCallback(savedFmObject);
            }
            $rootScope.isLoading = false;
            return $translate(['TRK_FMOBJECTS_CHANGES_SAVED']);            
        }).then(function(translations) {
            $mdToast.show($mdToast.simple().textContent(translations.TRK_FMOBJECTS_CHANGES_SAVED).hideDelay(1000).position('bottom right'));
        });
    };

    // Click on delete button to delete an existing FM object
    $scope.deleteFmObject = function() {
        var translations;
        $translate(['TRK_FMOBJECTS_FM_OBJECT_DELETED', 'TRK_YES', 'TRK_NO']).then(function(t) {
            translations = t;
            return $translate('TRK_FMOBJECTS_REALLY_DELETE_FM_OBJECT', { fmObjectName: $scope.fmObjectName });
        }).then(function(TRK_FMOBJECTS_REALLY_DELETE_FM_OBJECT) {
            var confirm = $mdDialog.confirm()
                .title(TRK_FMOBJECTS_REALLY_DELETE_FM_OBJECT)
                .ok(translations.TRK_YES)
                .cancel(translations.TRK_NO);
            return $mdDialog.show(confirm);
        }).then(function() {
            $rootScope.isLoading = true;
            return $http.delete('/api/fmobjects/' + $scope.fmObject._id);
        }).then(function(response) {
            if ($scope.params.deleteFmObjectCallback) {
                $scope.params.deleteFmObjectCallback();
            }
            utils.removeCardsToTheRightOf($element);
            utils.removeCard($element);
            $mdToast.show($mdToast.simple().textContent(translations.TRK_FMOBJECTS_FM_OBJECT_DELETED).hideDelay(1000).position('bottom right'));
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

    // Dialog zur Bildauswahl öffnen
    $scope.openImageSelectionDialog = function() {
        $rootScope.isLoading = true;
        var parentScope = $scope;
        $http.get('/api/folders/allFoldersAndDocuments?type=image').then(function(response) {
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
                    var parent = allFoldersAndDocuments[folderOrDocument.parentFolderId];
                    parent.children.push(folderOrDocument);
                    folderOrDocument.parent = parent;
                } else {
                    rootElement.children.push(folderOrDocument);
                }
            });
            if ($scope.fmObject.previewImageId) {
                var element = allFoldersAndDocuments[$scope.fmObject.previewImageId];
                $scope.selectedImage = element;
                while (element.parent) {
                    element = element.parent;
                    element.isOpen = true;
                }
            }  $rootScope.isLoading = false;
            $mdDialog.show({
                controller: function ($scope) {
                    $scope.parentScope = parentScope;
                    $scope.child = rootElement;
                },
                controllerAs: 'ctrl',
                templateUrl: 'imageSelectDialog.html',
                parent: angular.element(document.body),
                clickOutsideToClose:true
            }).then(function(resolve) { // Nach Auswahl
                $scope.fmObject.previewImageId = $scope.selectedImage ? $scope.selectedImage.id : null;
                $scope.selectedElement = null; 
            }, function(reject) { // Beim Abbrechen
                $scope.selectedElement = null;
            });
        });
    };

    // Dialog abbrechen
    $scope.onDialogCancelClick = function() {
        $mdDialog.cancel();
    }

    // Auswahl treffen und Dialog schließen
    $scope.onDialogOkClick = function() {
        $mdDialog.hide();
    };

    // Öffnet das Vorschaubild in separatem Fenster
    $scope.openImage = function() {
        window.open('/api/documents/' + $scope.fmObject.previewImageId + '?action=download&token=' + $scope.token);
    };

    $scope.changeCategory = function() {
        $scope.fmObject.areatype = $scope.categories[$scope.fmObject.category][0]
    };


    // Loads the FM object details or prepares the empty dialog for a new FM object
    // Params:
    // - $scope.params.fmObjectId : ID of the FM object to load, when not set, a new FM object is to be created
    // - $scope.params.parentFmObjectId : ID of the parent FM object of the new FM object. When not set, the root is used as parent
    // - $scope.params.createFmObjectCallback : Callback function when a new FM object was created. Gets the FM object as parameter
    // - $scope.params.saveFmObjectCallback : Callback function when an existing FM object was saved. Gets the updated FM object as parameter
    // - $scope.params.deleteFmObjectCallback : Callback function when an existing FM object was deleted. No parameters
    // - $scope.params.closeCallback : Callback function when the card gets closed via button. No parameters
    $scope.load = function() {
        $rootScope.isLoading=true;
        // Switch between creation of a new FM object and loading of an existing FM object
        if ($scope.params.fmObjectId) {
            // Existing FM object
            $http.get('/api/fmobjects/' + $scope.params.fmObjectId)
            .then(function(response) {
                var completeFmObject = response.data;
                if (!completeFmObject || completeFmObject <1) return Promise.resolve(false);
                $scope.isNewFmObject = false;
                $scope.fmObject = completeFmObject;
                $scope.fmObjectName = completeFmObject.name; // Prevent updating the label when changing the input value 
                $scope.breadcrumbs = completeFmObject.path.map(function(pathElement){
                    return pathElement.name;
                }).join(' » ');
                $scope.relationsEntity = { type:'fmobjects', id:completeFmObject._id };                
                utils.loadDynamicAttributes($scope, 'fmobjects', $scope.params.fmObjectId);
                utils.setLocation('/fmobjects/' + $scope.params.fmObjectId);
                $rootScope.isLoading = false;
            });
        } else {
            // New FM object
            $scope.isNewFmObject = true;
            $scope.fmObject = { 
                name: '', 
                type: $scope.types[0], 
                category: Object.keys($scope.categories)[0], 
                areatype:$scope.categories[Object.keys($scope.categories)[0]][0],
                usagestate: $scope.usagestates[0]
             };
            if ($scope.params.parentFmObjectId) {
                $scope.fmObject.parentId = $scope.params.parentFmObjectId;
            }
            $rootScope.isLoading=false;
        }
        $scope.canWriteFmObjects = $rootScope.canWrite('PERMISSION_BIM_FMOBJECT');
        $scope.token = $http.defaults.headers.common['x-access-token'];
    };

    $scope.load();

});
