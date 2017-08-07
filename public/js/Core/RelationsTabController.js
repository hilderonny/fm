app.controller('CoreRelationsTabController', function($scope, $rootScope, $http, $translate, $mdDialog, $mdToast, $element, $filter, utils) {

    /**
     * Hilfsfunktionen zum Laden und Aufarbeiten von Verknüpfungen
     */
    $scope.relationLoaders = {
        activities: function(relationList) {
            var targetIds = {};
            relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
            // Details für die verknüpften Elemente laden, dabei API-Erweiterung nutzen
            return $http.get('/api/activities/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                var activities = response.data;
                if (!activities || activities.length < 1)  return Promise.resolve(false);
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
                            targetUrl:'/activities/' + activity._id
                        };
                    })
                }
                $scope.relations.activities = relations; // Verknüpfungen dem richtigen Abschnitt zuweisen
                return Promise.resolve(relations);
            });
        },
        clients: function(relationList) {
            var targetIds = {};
            relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
            return $http.get('/api/clients/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                var clients = response.data;
                if (!clients || clients.length < 1)  return Promise.resolve(false);
                var relations = {
                    title: 'CLIENTS_CLIENTS',
                    items: clients.map(function(client) {
                        return {
                            icon:'material/Briefcase', 
                            firstLine:client.name,
                            id:client._id,
                            relationId:targetIds[client._id].relationId,
                            targetUrl:'/clients/' + client._id
                        };
                    })
                }
                $scope.relations.clients = relations;
                return Promise.resolve(relations);
            });
        },
        documents: function(relationList) {
            var targetIds = {};
            relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
            return $http.get('/api/documents/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                var documents = response.data;
                if (!documents || documents.length < 1)  return Promise.resolve(false);
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
                            targetUrl:'/documents/' + document._id
                        };
                    })
                }
                $scope.relations.documents = relations;
                return Promise.resolve(relations);
            });
        },
        fmobjects: function(relationList) {
            var targetIds = {};
            relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
            return $http.get('/api/fmobjects/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                var fmObjects = response.data;
                if (!fmObjects || fmObjects.length < 1) return Promise.resolve(false);
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
                            targetUrl:'/fmobjects/' + fmObject._id
                        };
                    })
                }
                $scope.relations.fmobjects = relations;
                return Promise.resolve(relations);
            });
        },
        folders: function(relationList) {
            var targetIds = {};
            relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
            return $http.get('/api/folders/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                var folders = response.data;
                if (!folders || folders.length < 1)  return Promise.resolve(false);
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
                            targetUrl:'/documents/' + folder._id
                        };
                    })
                }
                $scope.relations.folders = relations;
                return Promise.resolve(relations);
            });
        },
         partners: function(relationList) {
            return new Promise(function(resolve, reject) {
                var targetIds = {};
                relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
                $http.get('/api/busniesspartner/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                    var partners = response.data;
                    if (!partners || partners.length < 1) return resolve(false);
                    var relations = {
                        title: 'BP_BP',
                        items: partners.map(function(partner) {
                            return {
                                icon:'material/Briefcase', 
                                firstLine:partner.name,
                                id:partner._id,
                                relationId:targetIds[partner._id].relationId,
                                onSelect: function() {
                                    var item = this;
                                    return utils.replaceCardWithPermission($element, 'Administration/BPCard', {
                                        partnerId: partner._id,
                                        saveBPCallback: $scope.loadRelations,
                                        deleteBPCallback:$scope.loadRelations,
                                        closeCallback: function() { $scope.selectedElement = null; }
                                    }, 'PERMISSION_CRM_BUSINESSPARTNERS');
                                }
                            };
                        })
                    }
                    $scope.relations.partners = relations;
                    resolve(relations);
                });
            });
        },
        portals: function(relationList) {
            var targetIds = {};
            relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
            return $http.get('/api/portals/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                var portals = response.data;
                if (!portals || portals.length < 1)  return Promise.resolve(false);
                var relations = {
                    title: 'PORTALS_PORTALS',
                    items: portals.map(function(portal) {
                        return {
                            icon:'material/Server', 
                            firstLine:portal.name,
                            id:portal._id,
                            relationId:targetIds[portal._id].relationId,
                            targetUrl:'/portals/' + portal._id
                        };
                    })
                }
                $scope.relations.portals = relations;
                return Promise.resolve(relations);
            });
        },
        usergroups: function(relationList) {
            var targetIds = {};
            relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
            return $http.get('/api/usergroups/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                var userGroups = response.data;
                if (!userGroups || userGroups.length < 1) return Promise.resolve(false);
                var relations = {
                    title: 'USERGROUPS_USERGROUPS',
                    items: userGroups.map(function(userGroup) {
                        return {
                            icon:'material/User Group Man Man', 
                            firstLine:userGroup.name,
                            id:userGroup._id,
                            relationId:targetIds[userGroup._id].relationId,
                            targetUrl:'/usergroups/' + userGroup._id
                        };
                    })
                }
                $scope.relations.usergroups = relations;
                return Promise.resolve(relations);
            });
        },
        users: function(relationList) {
            var targetIds = {};
            relationList.forEach(function(relation) { targetIds[relation.targetId] = relation; });
            return $http.get('/api/users/forIds?ids=' + Object.keys(targetIds).join(',')).then(function(response) {
                var users = response.data;
                if (!users || users.length < 1) return Promise.resolve(false);
                var relations = {
                    title: 'USERS_USERS',
                    items: users.map(function(user) {
                        return {
                            icon:'material/User', 
                            firstLine: user.name,
                            secondLine: user.userGroup[0].name,
                            id:user._id,
                            relationId:targetIds[user._id].relationId,
                            targetUrl:'/users/' + user._id
                        };
                    })
                }
                $scope.relations.users = relations;
                return Promise.resolve(relations);
            });
        }        
    };

    /**
     * Lädt die Verknüpfungen des aktuellen Objekts vom Server und füllt die Liste
     */
    $scope.loadRelations = function() {
        var entityType = $scope.relationsEntity.type;
        var entityId = $scope.relationsEntity.id;
        $http.get('/api/relations/' + entityType + '/' + entityId).then(function(response) {
            var relations = response.data;
            // Verknüpfungen aufbereiten und nach Typen sortieren
            var sortedRelations = {};
            relations.forEach(function(relation) {
                if (relation.id1 === entityId) {
                    if (!sortedRelations[relation.type2]) {
                        sortedRelations[relation.type2] = [];
                    }
                    sortedRelations[relation.type2].push({
                        relationId: relation._id,
                        targetId: relation.id2 
                    });
                } else {
                    if (!sortedRelations[relation.type1]) {
                        sortedRelations[relation.type1] = [];
                    }
                    sortedRelations[relation.type1].push({
                        relationId: relation._id,
                        targetId: relation.id1 
                    });
                }
            });
            $scope.relations = {};
            // Verknüpfungsdetails abhängig von deren Typ laden
            Object.keys(sortedRelations).forEach(function(typeName) {
                $scope.relationLoaders[typeName](sortedRelations[typeName]);
            });
        });
    };

    /**
     * Hilfsfunktionen zum Umwandeln der Verknüpfungen in ein Feld, das sortiert
     * werden kann.
     */
    $scope.relationsArray = function() {
        return $scope.relations ? Object.keys($scope.relations).map(function(key) { return $scope.relations[key]; }) : [];
    }

    /**
     * Filterfunktion, um für orderBy-Klauseln von Verknüpfungen die
     * einzelnen Abschnitte nach den übersetzten Titeln zu sortieren.
     * Siehe: https://angular-translate.github.io/docs/#/api/pascalprecht.translate.$translate und
     * http://stackoverflow.com/a/26460244/5964970
     */
    $scope.translateTitle = function(relation) {
        return $filter('translate')('TRK_' + relation.title);
    }

    /**
     * Wird erstmalig ausgeführt, wenn der Tab markiert wird.
     * Vorher brauchen wir die Daten nicht.
     */
    $scope.onTabSelected = function() {
        $scope.loadRelations();
    };

    /**
     * Behandelt die Auswahl eines Listenelementes und öffnet die entsprechende Detailkarte
     */
    $scope.onSelectElement = function(element) {
        if (element.targetUrl) {
            utils.setLocation(element.targetUrl, true);
        };
    };

    /**
     * Event Handler für das Löschen von Verknüpfungen. Zeigt einen Bestätigungsdialog an
     * und führt das Löschen per API durch.
     */
    $scope.onDeleteElement = function(relationId) {
        $translate(['TRK_RELATIONS_DELETED', 'TRK_YES', 'TRK_NO', 'TRK_RELATIONS_REALLY_DELETE_RELATION']).then(function(translations) {
            var confirm = $mdDialog.confirm()
                .title(translations.TRK_RELATIONS_REALLY_DELETE_RELATION)
                .ok(translations.TRK_YES)
                .cancel(translations.TRK_NO);
            $mdDialog.show(confirm).then(function() {
                $http.delete('/api/relations/' + relationId).then(function(response) {
                    $mdToast.show($mdToast.simple().textContent(translations.TRK_RELATIONS_DELETED).hideDelay(1000).position('bottom right'));
                    utils.removeCardsToTheRightOf($element);
                    $scope.loadRelations();
                });
            });
        });

    }

    /*
     * Prüft die Referenztypen, ob der angemeldete Benutzer Lesezugriff auf die Zielobjektlisten hat und gibt nur
     * erlaubte Elemente in einem Promise zurück.
     */
    $scope.canWriteRelations = $rootScope.canWrite('PERMISSION_CORE_RELATIONS');
    $scope.canReadRelations = $rootScope.canRead('PERMISSION_CORE_RELATIONS');

    /**
     * Im übergeordneten Scope wird eine Methode zum Neuladen der Elemente referenziert,
     * die von anderen Kind-Controllern (RelationsMenuController) verwendet werden kann,
     * um nach einer Neuanlage die Verknüpfungsliste neu zu laden
     */
    $scope.$parent.$parent.onRelationListChanged = $scope.loadRelations;
});
