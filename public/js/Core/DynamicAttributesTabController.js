app.controller('CoreDynamicAttributesTabController', function($scope, $http, $translate, $mdDialog, $mdToast, $element, $filter, utils) {

    /**
     * Hilfsfunktionen zum Laden und Aufarbeiten von Verknüpfungen
     */
    $scope.relationLoaders = {
        activities: function(relationList) {
            return new Promise(function(resolve, reject) { // Ein Promise mit den Verknüpfungen als Parameter muss zurück gegeben werden
                var targetIds = {};
                relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
                // Details für die verknüpften Elemente laden, dabei API-Erweiterung nutzen
                $http.get('/api/activities/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                    var activities = response.data;
                    if (!activities || activities.length < 1) return resolve(false);
                    // ViewModel für Anzeige in Liste vorbereiten. Die Objektattribute müssen genau so heissen, die Liste erwartet das
                    var relations = {
                        title: 'ACTIVITIES_ACTIVITIES', // Übersetzungsschlüssel ohne Präfix "TRK_" als Abschnittsüberschrift
                        items: activities.map(function(activity) {
                            return { // ViewModel für einzelnen Eintrag
                                icon:'material/Planner', // TODO: Pfadangabe in Doku überarbeiten
                                firstLine:activity.name,
                                secondLine:moment(activity.date).format('L'),
                                id:activity._id,
                                relationId:targetIds[activity._id].relationId,
                                onSelect: function() { // Handler, der bei Selektion des Listeneintrags die Detailkarte lädt
                                    var item = this;
                                    return utils.replaceCardWithPermission($element, 'Office/ActivityCard', {
                                        activityId: activity._id,
                                        saveActivityCallback: $scope.loadRelations,
                                        deleteActivityCallback:$scope.loadRelations,
                                        closeCallback: function() { $scope.selectedElement = null; }
                                    }, 'PERMISSION_OFFICE_ACTIVITY');
                                }
                            };
                        })
                    }
                    $scope.relations.activities = relations; // Verknüpfungen dem richtigen Abschnitt zuweisen
                    resolve(relations);
                });
            });
        },
        clients: function(relationList) {
            return new Promise(function(resolve, reject) {
                var targetIds = {};
                relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
                $http.get('/api/clients/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                    var clients = response.data;
                    if (!clients || clients.length < 1) return resolve(false);
                    var relations = {
                        title: 'CLIENTS_CLIENTS',
                        items: clients.map(function(client) {
                            return {
                                icon:'material/Briefcase', 
                                firstLine:client.name,
                                id:client._id,
                                relationId:targetIds[client._id].relationId,
                                onSelect: function() {
                                    var item = this;
                                    return utils.replaceCardWithPermission($element, 'Administration/ClientCard', {
                                        clientId: client._id,
                                        saveClientCallback: $scope.loadRelations,
                                        deleteClientCallback:$scope.loadRelations,
                                        closeCallback: function() { $scope.selectedElement = null; }
                                    }, 'PERMISSION_ADMINISTRATION_CLIENT');
                                }
                            };
                        })
                    }
                    $scope.relations.clients = relations;
                    resolve(relations);
                });
            });
        },
        documents: function(relationList) {
            return new Promise(function(resolve, reject) {
                var targetIds = {};
                relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
                $http.get('/api/documents/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                    var documents = response.data;
                    if (!documents || documents.length < 1) return resolve(false);
                    var relations = {
                        title: 'DOCUMENTS_DOCUMENTS',
                        items: documents.map(function(document) {
                            return { // ViewModel für einzelnen Eintrag
                                icon: 'material/Document', 
                                firstLine: document.name,
                                secondLine: document.path.map(function(pathElement) {
                                    return pathElement.name
                                }).join (' / '),
                                id: document._id,
                                relationId: targetIds[document._id].relationId,
                                onSelect: function() {
                                    var item = this;
                                    return utils.replaceCardWithPermission($element, 'Office/DocumentCard', {
                                        documentId: document._id,
                                        saveDocumentCallback: $scope.loadRelations,
                                        deleteDocumentCallback: $scope.loadRelations,
                                        closeCallback: function() { $scope.selectedElement = null; }
                                    }, 'PERMISSION_OFFICE_DOCUMENT');
                                }
                            };
                        })
                    }
                    $scope.relations.documents = relations;
                    resolve(relations);
                });
            });
        },
        fmobjects: function(relationList) {
            return new Promise(function(resolve, reject) {
                var targetIds = {};
                relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
                $http.get('/api/fmobjects/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                    var fmObjects = response.data;
                    if (!fmObjects || fmObjects.length < 1) return resolve(false);
                    var relations = {
                        title: 'FMOBJECTS_FM_OBJECTS',
                        items: fmObjects.map(function(fmObject) {
                            return { // ViewModel für einzelnen Eintrag
                                icon:'fm/' + fmObject.type, 
                                firstLine:fmObject.name,
                                secondLine:fmObject.path.map(function(pathElement) {
                                    return pathElement.name
                                }).join (' » '),
                                id:fmObject._id,
                                relationId:targetIds[fmObject._id].relationId,
                                onSelect: function() {
                                    var item = this;
                                    return utils.replaceCardWithPermission($element, 'BIM/FmobjectCard', {
                                        fmObjectId: fmObject._id,
                                        saveFmObjectCallback: $scope.loadRelations,
                                        deleteFmObjectCallback:$scope.loadRelations,
                                        closeCallback: function() { $scope.selectedElement = null; }
                                    }, 'PERMISSION_BIM_FMOBJECT');
                                }
                            };
                        })
                    }
                    $scope.relations.fmobjects = relations;
                    resolve(relations);
                });
            });
        },
        folders: function(relationList) {
            return new Promise(function(resolve, reject) {
                var targetIds = {};
                relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
                $http.get('/api/folders/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                    var folders = response.data;
                    if (!folders || folders.length < 1) return resolve(false);
                    var relations = {
                        title: 'FOLDERS_FOLDERS',
                        items: folders.map(function(folder) {
                            return { // ViewModel für einzelnen Eintrag
                                icon:'material/Folder', 
                                firstLine:folder.name,
                                secondLine:folder.path.map(function(pathElement) {
                                    return pathElement.name
                                }).join (' / '),
                                id:folder._id,
                                relationId:targetIds[folder._id].relationId,
                                onSelect: function() {
                                    var item = this;
                                    return utils.replaceCardWithPermission($element, 'Office/FolderCard', {
                                        folderId: folder._id,
                                        saveFolderCallback: $scope.loadRelations,
                                        deleteFolderCallback:$scope.loadRelations,
                                        closeCallback: function() { $scope.selectedElement = null; }
                                    }, 'PERMISSION_OFFICE_DOCUMENT');
                                }
                            };
                        })
                    }
                    $scope.relations.folders = relations;
                    resolve(relations);
                });
            });
        },
        portals: function(relationList) {
            return new Promise(function(resolve, reject) {
                var targetIds = {};
                relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
                $http.get('/api/portals/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                    var portals = response.data;
                    if (!portals || portals.length < 1) return resolve(false);
                    var relations = {
                        title: 'PORTALS_PORTALS',
                        items: portals.map(function(portal) {
                            return {
                                icon:'material/Server', 
                                firstLine:portal.name,
                                id:portal._id,
                                relationId:targetIds[portal._id].relationId,
                                onSelect: function() {
                                    var item = this;
                                    return utils.replaceCardWithPermission($element, 'LicenseServer/PortalCard', {
                                        portalId: portal._id,
                                        savePortalCallback: $scope.loadRelations,
                                        deletePortalCallback:$scope.loadRelations,
                                        closeCallback: function() { $scope.selectedElement = null; }
                                    }, 'PERMISSION_LICENSESERVER_PORTAL');
                                }
                            };
                        })
                    }
                    $scope.relations.portals = relations;
                    resolve(relations);
                });
            });
        },
        usergroups: function(relationList) {
            return new Promise(function(resolve, reject) {
                var targetIds = {};
                relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
                $http.get('/api/usergroups/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                    var userGroups = response.data;
                    if (!userGroups || userGroups.length < 1) return resolve(false);
                    var relations = {
                        title: 'USERGROUPS_USERGROUPS',
                        items: userGroups.map(function(userGroup) {
                            return {
                                icon:'material/User Group Man Man', 
                                firstLine:userGroup.name,
                                id:userGroup._id,
                                relationId:targetIds[userGroup._id].relationId,
                                onSelect: function() {
                                    var item = this;
                                    return utils.replaceCardWithPermission($element, 'Administration/UsergroupCard', {
                                        userGroupId: userGroup._id,
                                        saveUserGroupCallback: $scope.loadRelations,
                                        deleteUserGroupCallback:$scope.loadRelations,
                                        closeCallback: function() { $scope.selectedElement = null; }
                                    }, 'PERMISSION_ADMINISTRATION_USERGROUP');
                                }
                            };
                        })
                    }
                    $scope.relations.usergroups = relations;
                    resolve(relations);
                });
            });
        },
        users: function(relationList) {
            return new Promise(function(resolve, reject) {
                var targetIds = {};
                relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
                $http.get('/api/users/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                    var users = response.data;
                    if (!users || users.length < 1) return resolve(false);
                    var relations = {
                        title: 'USERS_USERS',
                        items: users.map(function(user) {
                            return {
                                icon:'material/User', 
                                firstLine: user.name,
                                secondLine: user.userGroup[0].name,
                                id:user._id,
                                relationId:targetIds[user._id].relationId,
                                onSelect: function() {
                                    var item = this;
                                    return utils.replaceCardWithPermission($element, 'Administration/UserCard', {
                                        userId: user._id,
                                        saveUserCallback: $scope.loadRelations,
                                        deleteUserCallback:$scope.loadRelations,
                                        closeCallback: function() { $scope.selectedElement = null; }
                                    }, 'PERMISSION_ADMINISTRATION_USERGROUP');
                                }
                            };
                        })
                    }
                    $scope.relations.users = relations;
                    resolve(relations);
                });
            });
        },
    };

    /**
     * Lädt die Verknüpfungen des aktuellen Objekts vom Server und füllt die Liste
     */
    $scope.loadAttributes = function() {
        if(!$scope.relationsEntity){console.log('NO relationsEntity');}
        var modelname = $scope.$parent.relationsEntity.type;
        var entityId = $scope.relationsEntity.id;
        $http.get('/api/dynamicattributes/values/' + modelname + '/' + entityId).then(function(response){
            $scope.attributes = response.data;
            console.log($scope.attributes);
        });
;
       // $scope.attributes.title  =  '$scope.relationsEntity.type';
    };
     $scope.loadAttributes();
    /**
     * Hilfsfunktionen zum Umwandeln der Verknüpfungen in ein Feld, das sortiert
     * werden kann.
     */
    $scope.attributesArray = function() {
        return $scope.attributes ? Object.keys($scope.attributes).map(function(key) { return $scope.attributes[key]; }) : [];
    }
    console.log($scope.attributesArray(1));

    /**
     * Filterfunktion, um für orderBy-Klauseln von Verknüpfungen die
     * einzelnen Abschnitte nach den übersetzten Titeln zu sortieren.
     * Siehe: https://angular-translate.github.io/docs/#/api/pascalprecht.translate.$translate und
     * http://stackoverflow.com/a/26460244/5964970
     */
    $scope.translateTitle = function(attribute) {
        return $filter('translate')('TRK_' + attribute.name_en);
    }
    

   
 
});
