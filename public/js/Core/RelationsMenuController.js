app.controller('CoreRelationsMenuController', function($scope, $rootScope, $http, $mdPanel, $mdDialog, $translate, $mdToast, moment) {

    /**
     * Liste aller möglicher Referenztypen für das Menü für neue Verknüpfungen.
     * Wird von 
     * {
     *  icon: Pfad zum Icon für den Menüeintrag
     *  translationKey: Übersetzungsschlüssel für den Namen des Menüeintrags
     *  requiredPermission: Lese-Berechtigung, die notwendig ist, um die Entitäten des Menüeintrags zu lesen
     *  dialogFunction: Referenz auf Funktion, welche den zum Neüeintrag gehörenden Auswahldialog öffnet
     * }
     */
//TODO: Hierachiedialoge in Doku beschreiben
    var allReferenceTypes = [
        { icon: 'Planner', translationKey: 'ACTIVITIES_ACTIVITY', requiredReadPermission: 'PERMISSION_OFFICE_ACTIVITY', dialogFunction: function() {
            $http.get('/api/activities').then(function(response) { // Liste von Terminen für den Auswahldialog laden
                var listItems = response.data.map(function(activity) {
                    return { // ViewModel für die Liste erzeugen
                        icon:'material/Planner', // TODO: Icon-URL-Änderung in Doku einbinden
                        firstLine:activity.name,
                        secondLine:moment(activity.date).format('L'),
                        type:'activities',
                        id:activity._id
                    };
                });
                $scope.showListDialog('ACTIVITIES_SELECT_ACTIVITY', listItems); // Dialog für einfache Listen öffnen
            });
        } },
        { icon: 'Briefcase', translationKey: 'CLIENTS_CLIENT', requiredReadPermission: 'PERMISSION_ADMINISTRATION_CLIENT', dialogFunction: function() {
            $http.get('/api/clients').then(function(response) {
                var listItems = response.data.map(function(client) {
                    return {
                        icon:'material/Briefcase', 
                        firstLine:client.name,
                        type:'clients',
                        id:client._id
                    };
                });
                $scope.showListDialog('CLIENTS_SELECT_CLIENT', listItems);
            });
        } },
        { icon: 'Document', translationKey: 'DOCUMENTS_DOCUMENT', requiredReadPermission: 'PERMISSION_OFFICE_DOCUMENT', dialogFunction: function() {
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
                        allFoldersAndDocuments[folderOrDocument.parentFolderId].children.push(folderOrDocument);
                    } else {
                        rootElement.children.push(folderOrDocument);
                    }
                });
                $scope.showHierarchyDialog('DOCUMENTS_SELECT_FOLDER_OR_DOCUMENT', rootElement); // Dialog für Hierarchien öffnen
            });
        } },
        { icon: 'Cottage', translationKey: 'FMOBJECTS_FM_OBJECT', requiredReadPermission: 'PERMISSION_BIM_FMOBJECT', dialogFunction: function() {
            $http.get('/api/fmobjects').then(function(response) {
                var handleFmObject = function(fmObject) {
                    return {
                        icon: 'fm/' + fmObject.type,
                        name: fmObject.name,
                        type: 'fmobjects',
                        id: fmObject._id,
                        children: fmObject.children ? fmObject.children.map(handleFmObject) : []
                    }
                };
                var viewModel = { children: response.data.map(handleFmObject) };
                $scope.showHierarchyDialog('FMOBJECTS_SELECT_FM_OBJECT', viewModel); // Dialog für Hierarchien öffnen
            });
        } },
        { icon: 'Server', translationKey: 'PORTALS_PORTAL', requiredReadPermission: 'PERMISSION_LICENSESERVER_PORTAL', dialogFunction: function() {
            $http.get('/api/portals').then(function(response) {
                var listItems = response.data.map(function(portal) {
                    return {
                        icon:'material/Server', 
                        firstLine:portal.name,
                        type:'portals',
                        id:portal._id
                    };
                });
                $scope.showListDialog('PORTALS_SELECT_PORTAL', listItems);
            });
        } },
        { icon: 'User Group Man Man', translationKey: 'USERGROUPS_USERGROUP', requiredReadPermission: 'PERMISSION_ADMINISTRATION_USERGROUP', dialogFunction: function() {
            $http.get('/api/usergroups').then(function(response) {
                var listItems = response.data.map(function(usergroup) {
                    return {
                        icon:'material/User Group Man Man', 
                        firstLine:usergroup.name,
                        type:'usergroups',
                        id:usergroup._id
                    };
                });
                $scope.showListDialog('USERGROUPS_SELECT_USERGROUP', listItems);
            });
        } },
        { icon: 'User', translationKey: 'USERS_USER', requiredReadPermission: 'PERMISSION_ADMINISTRATION_USER', dialogFunction: function() {
            $http.get('/api/users?joinUserGroup=true').then(function(response) {
                var listItems = response.data.map(function(user) {
                    return {
                        icon:'material/User', 
                        firstLine:user.name,
                        secondLine: user.userGroup.name,
                        type:'users',
                        id:user._id
                    };
                });
                $scope.showListDialog('USERS_SELECT_USER', listItems);
            });
        } }
    ];

    /**
     * Erstellt nach einer Auswahl eine Verknüpfung via API-Abfrage und
     * aktualisiert die Verknüpfungsliste.
     */
    $scope.createRelation = function(targetType, targetId) {
        var sourceType = $scope.relationsEntity.type;
        var sourceId = $scope.relationsEntity.id;
        var relationToSend =  { 
            type1: $scope.relationsEntity.type,
            type2: targetType,
            id1: $scope.relationsEntity.id,
            id2: targetId
        };
        $http.post('/api/relations', relationToSend).then(function() {
            $translate(['TRK_RELATIONS_RELATION_CREATED']).then(function(translations) {
                $mdToast.show($mdToast.simple().textContent(translations.TRK_RELATIONS_RELATION_CREATED).hideDelay(1000).position('bottom right'));
            });
            // Liste aktualisieren, kann in verschiedenen Skopen existieren
            if ($scope.$parent.onRelationListChanged) {
                $scope.$parent.onRelationListChanged();
            } else if ($scope.$parent.onRelationListChanged) { 
                $scope.$parent.onRelationListChanged();
            }
        });
    };

    /**
     * Zeigt einen Auswahldialog für einfache Listen
     */
    $scope.showListDialog = function(title, listItems) {
        $scope.menuPanel.close();
        var parentScope = $scope;
        $mdDialog.show({
            controller: function ($scope) { // https://github.com/angular/material/issues/1531#issuecomment-74640529
                $scope.parentScope = parentScope;
                $scope.title = title;
                $scope.listItems = listItems;
            },
            controllerAs: 'ctrl',
            templateUrl: 'simpleListDialog.html',
            parent: angular.element(document.body),
            clickOutsideToClose:true
        }).then(function(resolve) { // Nach Auswahl
            $scope.createRelation($scope.selectedElement.type, $scope.selectedElement.id);
            $scope.selectedElement = null; 
        }, function(reject) { // Beim Abbrechen
            $scope.selectedElement = null; 
        });
    };

    /**
     * Zeigt einen Auswahldialog für Hierarchien
     */
    $scope.showHierarchyDialog = function(title, rootElement) {
        $scope.menuPanel.close();
        var parentScope = $scope;
        $mdDialog.show({
            controller: function ($scope) { // https://github.com/angular/material/issues/1531#issuecomment-74640529
                $scope.parentScope = parentScope;
                $scope.title = title;
                $scope.child = rootElement;
            },
            controllerAs: 'ctrl',
            templateUrl: 'hierarchyDialog.html',
            parent: angular.element(document.body),
            clickOutsideToClose:true
        }).then(function(resolve) { // Nach Auswahl
            $scope.createRelation($scope.selectedElement.type, $scope.selectedElement.id);
            $scope.selectedElement = null; 
        }, function(reject) { // Beim Abbrechen
            $scope.selectedElement = null; 
        });
    };

    /**
     * Beim Klicken auf einen Menüeintrag wird die entsprechende Dialogfunktion aufgerufen.
     */
    $scope.onMenuClick = function(menuItem) {
        menuItem.dialogFunction();
    };

    /**
     * Event handler für den "Neuer Link" - Button im FAB.
     * Öffnet das Popup, in welchem die Verknüpfungsart
     * ausgewählt wird.
     */
    $scope.onNewLinkClick = function(evt) {
        var nodeToHandle = evt.currentTarget;
        /*
        while (nodeToHandle && nodeToHandle.tagName.toLowerCase() !== 'md-toolbar') {
            nodeToHandle = nodeToHandle.parentNode;
            console.log(nodeToHandle.tagName);
        }
        */
        var position = $mdPanel.newPanelPosition().relativeTo(nodeToHandle).addPanelPosition($mdPanel.xPosition.ALIGN_START, $mdPanel.yPosition.BELOW);
        var parentScope = $scope;
        $mdPanel.open({
            attachTo: angular.element(document.body),
            controller: function ($scope) { $scope.parentScope = parentScope; }, // https://github.com/angular/material/issues/1531#issuecomment-74640529
            templateUrl: 'menuContent.html',
            panelClass: 'select-type-menu',
            position: position,
            openFrom: evt,
            clickOutsideToClose: true,
            escapeToClose: true,
            focusOnOpen: true,
            zIndex: 2
        }).then(function(panelRef) {
            $scope.menuPanel = panelRef;
        });
    };

    /**
     * Beim Anklicken eines Elementes in einem Auswahldialog wird dieses als selektiert
     * gemerkt. Dadurch wird der OK-Button aktiviert.
     */
    $scope.onSelectElement = function(element) {
        $scope.selectedElement = element;
    };

    /**
     * Event handler für die Abbrechen-Buttons in den Dialogen.
     * Schließt den Dialog und setzt das gewählte Dialogelement zurück.
     */
    $scope.onCancelClick = function() {
        $mdDialog.cancel();
    };

    /**
     * Event handler für die OK-Buttons in den Dialogen.
     * Schließt den Dialog und setzt das gewählte Dialogelement zurück.
     */
    $scope.onOkClick = function() {
        $mdDialog.hide();
    };

    /**
     * Beim Anklicken eines Rechts-Pfeils im Hierarchiedialog wird diese Ebene geöffnet
     */
    $scope.onOpenElement = function(element) {
        element.isOpen = true;
    };

    /**
     * Beim Anklicken eines Unten-Pfeils im Hierarchiedialog wird diese Ebene geschlossen
     */
    $scope.onCloseElement = function(element) {
        element.isOpen = false;
    };

    /*
     * Prüft die Referenztypen, ob der angemeldete Benutzer Lesezugriff auf die Zielobjektlisten hat und gibt nur
     * erlaubte Elemente in einem Promise zurück.
     */
    $scope.canWriteRelations = $rootScope.canWrite('PERMISSION_CORE_RELATIONS');
    $scope.availableReferenceTypes = allReferenceTypes.filter(function(referenceType) {
        return $rootScope.canRead(referenceType.requiredReadPermission);
    });

});
