
// Define utils factory, http://stackoverflow.com/a/26109991
app.factory('utils', function($compile, $rootScope, $http, $translate, $location, $anchorScroll, $mdPanel, $mdDialog) {
    var utils = {

        // On slow connections clicking on list items multiply adds multiple cards
        // To prevent that, this array is used to remember which cards are to be loaded
        cardsToAdd: [],

        /**
         * Fügt eine Karte für Detailansichten von Entitäten hinzu. Prüft vorher, ob die
         * der Benutzer auch die geforderte Berechtigung hat und lädt nur dann die Karte.
         * Liefert ein Promise zurück, welches im resolve als Parameter eine Referenz zur Karte hat und
         * für den Fall, dass der Benutzer keine Berechtigung hat, reject aufruft.
         * @param cardTemplateUrl Name der HTML-Vorlagendatei unter partial/ ohne Dateiendung
         * @param params Parameter, die an den Controller der zu ladenden Karte übergeben werden
         * @param requiredPermission Berechtigung, die für die Anzeige der Karte benötigt wird.
         */
        addCardWithPermission: function(cardTemplateUrl, params, requiredPermission) {
            var cardToAdd = {}; // Dummy object for remembering that the card is to be loaded
            // Prüfen, ob der Benutzer überhaupt die benötigten Rechte hat
            if (!$rootScope.canRead(requiredPermission)) return;
            utils.cardsToAdd.push(cardToAdd);
            return $http.get('/partial/' + cardTemplateUrl + '.html', { cache: true}).then(function(response) {
                // Check whether the card should still be shown. When the dummy object is no longer
                // in the array, the request tooks too long and the user has done something other meanwhile
                if (utils.cardsToAdd.indexOf(cardToAdd) < 0) return; // So simply ignore the response
                var cardCanvas = angular.element(document.querySelector('#cardcanvas'));
                var card = angular.element(response.data);
                var domCard = card[0];
                cardCanvas.append(card);
                var newScope = $rootScope.$new(true);
                newScope.params = params || {}; // Pass paremters to the scope to have access to it in the controller instance
                newScope.requiredPermission = requiredPermission; // For permission handling in details pages
                // Compile (render) the new card and attach its new controller
                $compile(card)(newScope); // http://stackoverflow.com/a/29444176, http://stackoverflow.com/a/15560832
                window.getComputedStyle(domCard).borderColor; // https://timtaubert.de/blog/2012/09/css-transitions-for-dynamically-created-dom-elements/
                // Scroll card in view, but wait until the card is put into the dom
                utils.waitForOffsetAndScroll(domCard, cardCanvas, 50); // Try it up to 5 seconds, then abort
                utils.scrollToAnchor(domCard, cardCanvas, 50); // Try it up to 5 seconds, then abort
                return Promise.resolve(card);
            });
        },

        createdynamicobject: function(datatypename, entity) {
            return $http.post("/api/dynamic/" + datatypename, entity).then(function(response) {
                return response.data; // name of created element
            });
        },

        createrelation: function(relation) {
            return $http.post("/api/dynamic/relations", relation);
        },

        deletedynamicobject: function(datatypename, entityname) {
            return $http.delete("/api/dynamic/" + datatypename + "/" + entityname);
        },

        // Helper function which will return the response.data field from a GET API call as promise result.
        getresponsedata: function(url) {
            return $http.get(url).then(function(response) {
                return response.data;
            });
        },

        handlePreselection: function($scope, collection, selectFunction) {
            // Check preselection
            if ($scope.params.preselection) {
                var elementToSelect = collection.find(function(e) { return e._id === $scope.params.preselection; });
                if (elementToSelect) selectFunction(elementToSelect);
            }
        },

        // Loads the fields of the given datatype and returns them as array within a promise
        // TODO: OBSOLETE
        // loaddatatype: function(datatypename) {
        //     return utils.getresponsedata('/api/datatypes/' + datatypename);
        // },

        // Loads all datatypes and their field definitions on page load (keyed object)
        loaddatatypes: function(scope) {
            scope.datatypes = {};
            return utils.getresponsedata('/api/datatypes').then(function(datatypes) {
                datatypes.forEach(function(dt) { scope.datatypes[dt.name] = dt; dt.fields = []; });
                return utils.getresponsedata('/api/datatypes/fields');
            }).then(function(fields) {
                fields.forEach(function(f) { scope.datatypes[f.datatypename].fields.push(f); });
            });
        },

        // // Loads the fields of the given datatype and returns them as array within a promise
        // // TODO: OBSOLETE
        // loaddatatypefields: function(datatypename) {
        //     return utils.getresponsedata('/api/datatypes/fields/' + datatypename);
        // },

        // TODO: Replace by loaddynamicattributes, or better by loaddynamicobject
        loadDynamicAttributes: function(scope, modelName, entityId) {
            $http.get('/api/dynamicattributes/values/' + modelName + '/' + entityId).then(function(response) {
                var allDynamicAttributes = response.data;
                var visibleDynamicAttributes = [];
                //return only the visible dynamic attributes
                for(i = 0; i < allDynamicAttributes.length; i++){
                    if(allDynamicAttributes[i].type.isVisible != false){
                        visibleDynamicAttributes.push(allDynamicAttributes[i]);
                    }
                };
                scope.dynamicAttributes = visibleDynamicAttributes;
            });
        },

        // Loads the dynamic attributes of a given entity
        loaddynamicattributes: function(datatypename, entityname) {
            return $http.get('/api/dynamicattributes/values/' + datatypename + '/' + entityname).then(function(response) {
                var allDynamicAttributes = response.data;
                var visibleDynamicAttributes = [];
                //return only the visible dynamic attributes
                for(i = 0; i < allDynamicAttributes.length; i++){
                    if(allDynamicAttributes[i].type.isVisible != false){
                        visibleDynamicAttributes.push(allDynamicAttributes[i]);
                    }
                };
                return visibleDynamicAttributes;
            });
        },

        // Loads the fields of the given datatype and returns them as array within a promise
        loaddynamicobject: function(datatypename, entityname) {
            return utils.getresponsedata('/api/dynamic/' + datatypename + '/' + entityname);
        },

        loadmenu: function(scope) {
            return utils.getresponsedata('/api/menu').then(function (responsedata) {
                scope.menu = responsedata.menu;
                scope.menu.push({
                    "title": "TRK_MENU_LOGOUT",
                    "icon": "Exit",
                    "action": function() {
                        localStorage.removeItem("loginCredentials");
                        scope.isLoggedIn = false;
                        scope.searchResults = [];
                        scope.searchInputVisible = false;
                        utils.setLocation('/');
                    }
                });
                scope.logourl = responsedata.logourl;
                // Direct URL mappings
                scope.menu.forEach(function(mainmenu) {
                    if (mainmenu.items) mainmenu.items.forEach(function(submenu) {
                        if (submenu.directurls) {
                            if (!scope.directUrlMappings) scope.directUrlMappings = {};
                            submenu.directurls.forEach(function(directurl) {
                                scope.directUrlMappings[directurl] = {
                                    mainMenu: mainmenu.title,
                                    subMenu: submenu.title
                                };
                            });
                        }
                    });
                });
                console.log(scope.menu, scope.directUrlMappings);
            });
        },

        // Loads the labels of all parent elements of a given entity. Used for breadcrumbs. The order is root element first
        loadparentlabels: function(datatypename, entityname) {
            return utils.getresponsedata('/api/dynamic/parentpath/' + datatypename + '/' + entityname);
        },

        loadpermissions: function(scope) {
            return utils.getresponsedata('/api/permissions/forLoggedInUser').then(function(responsedata) {
                scope.permissions = {};
                responsedata.forEach(function(permission) {
                    scope.permissions[permission.key] = permission;
                });
            });
        },

        // Loads all relations of an entity. In the result each relation has the property "is1" shich shows that the entity is the left hand relation part (name1). Needed for interpreting the relation
        loadrelations: function(datatypename, entityname) {
            return Promise.all([
                $http.get('/api/dynamic/relations?datatype1name=' + datatypename + '&name1=' + entityname),
                $http.get('/api/dynamic/relations?datatype2name=' + datatypename + '&name2=' + entityname)
            ]).then(function(responses) {
                var relations = [];
                responses.forEach(function(response) {
                    response.data.forEach(function(relation) {
                        var is1 = relation.name1 === entityname;
                        relations.push({
                            datatypename: is1 ? relation.datatype2name : relation.datatype1name,
                            name: is1 ? relation.name2 : relation.name1,
                            relationname: relation.name,
                            relationtypename: relation.relationtypename,
                            is1: is1
                        });
                    });
                });
                return relations;
            });
        },

        // Loads the meta information about all possible relation types. Needed for titles and labels.
        loadrelationtypes: function(scope) {
            return utils.getresponsedata('/api/dynamic/relationtypes').then(function(relationtypes) { scope.relationtypes = relationtypes; });
        },

        login: function(scope, username, password) {
            scope.isLoggingIn = true;
            var user = { username: username, password: password };
            return $http.post('/api/login', user).then(function(response) {
                if (response.status !== 200) throw new Error(response.status); // Caught below
                // Set the token for all requests
                $http.defaults.headers.common['x-access-token'] = response.data.token;
                scope.isLoggedIn = true;
                scope.isPortal = response.data.clientId === "portal";
                if (scope.isPortal) scope.title = 'TRK_TITLE_PORTAL';
                // Save login credentials in browser for future access
                localStorage.setItem("loginCredentials", JSON.stringify(user));
                scope.isLoggingIn = false;
            }).catch(function() {
                localStorage.removeItem("loginCredentials"); // Delete login credentials to prevent login loop
                scope.isLoggingIn = false;
                if (hideErrorMessage) return;
                $translate(['TRK_LOGIN_FAILED_TITLE', 'TRK_LOGIN_FAILED_CONTENT', 'TRK_LOGIN_FAILED_AGAIN']).then(function(translations) {
                    $mdDialog.show($mdDialog.alert()
                        .clickOutsideToClose(true)
                        .title(translations.TRK_LOGIN_FAILED_TITLE)
                        .textContent(translations.TRK_LOGIN_FAILED_CONTENT)
                        .ok(translations.TRK_LOGIN_FAILED_AGAIN)
                    );
                });
            });
        },

        removeAllCards: function() {
            var cardCanvas = angular.element(document.querySelector('#cardcanvas'));
            var cards = cardCanvas.children();
            angular.forEach(cards, function(index, key) {
                var card = cards[key];
                utils.removeCard(angular.element(card));
            });
        },

        // Removes a card, when it is set (defined by length > 0) and destroys
        // its scope to prevent memory leaks.
        // See https://www.bennadel.com/blog/2706-always-trigger-the-destroy-event-before-removing-elements-in-angularjs-directives.htm
        removeCard: function(card) {
            if (card && card.length) {
                card.scope().$destroy(); // Need to destroy the scope before removing the card from the dom, see link above
                card.remove(); 
            }
        },

        // Removes all cards right to the given one
        removeCardsToTheRightOf: function(card) {
            // Erst mal sehen, ob der Parameter überhaupt eine Karte ist
            while (card && card.length > 0 && card[0].tagName !== 'MD-CARD') {
                card = card.parent();
            }
            if (!card) return;
            // Emtying the array of running requests
            utils.cardsToAdd = [];
            var nextCard;
            do {
                nextCard = card.next();
                utils.removeCard(nextCard);
            } while (nextCard.length > 0);
        },

        /**
         * Schließt alle Karten rechts neben dem angegebenen Element und öffnet eine neue Karte,
         * wenn die Bedingungen stimmen.
         */
        replaceCardWithPermission: function(card, cardTemplateUrl, params, requiredPermission) {
            utils.removeCardsToTheRightOf(card);
            return utils.addCardWithPermission(cardTemplateUrl, params, requiredPermission);
        },

        savedynamicattributes: function(datatypename, entityname, dynamicattributes) {
            // Nur die Daten senden, die zwingend notwendig sind. Der Rest kann von der API ermittelt werden
            return $http.post('/api/dynamicattributes/values/' + datatypename + '/' + entityname, dynamicattributes.map(function(da) { return {
                dynamicAttributeId: da.type._id,
                value: da.value
            }; }));
        },

        savedynamicobject: function(datatypename, entity) {
            return $http.put("/api/dynamic/" + datatypename + "/" + entity.name, entity);
        },

        // TODO: Durch savedynamicobject und savedynamicattributes ersetzen
        saveEntity: function(scope, modelName, entityId, api, entityToSend) {
            var savedEntity;
            return $http.put(api + entityId, entityToSend).then(function(saveEntityResponse) {
                savedEntity = saveEntityResponse.data;
                var dynamicAttributesToSend = [];
                // Nur die Daten senden, die zwingend notwendig sind. Der Rest kann von der API ermittelt werden
                if (!scope.dynamicAttributes) return Promise.resolve(); // No need for this? https://javascript.info/promise-chaining
                scope.dynamicAttributes.forEach(function(da) {
                    dynamicAttributesToSend.push({
                        dynamicAttributeId: da.type._id,
                        value: da.value
                    });
                });
                return $http.post('/api/dynamicattributes/values/' + modelName + '/' + entityId, dynamicAttributesToSend);
            }).then(function() {
                return Promise.resolve(savedEntity);
            });
        },

        /**
         * Wartet auf Rendern der Karte und springt den aktuellen in der URL angegebenen Anker an
         */
        scrollToAnchor: function(domCard, cardCanvas, counter) {
            if (domCard.offsetWidth) { // left could be zero but width must be greater than zero
                $anchorScroll();
                return;
            } else {
                if (counter > 0) {
                    setTimeout(function() { utils.scrollToAnchor(domCard, cardCanvas, counter - 1) }, 100);
                }
            }
        },

        // Sets the Browser-URL to the given one for direct access
        setLocation: function(url, handleLocationChange) {
            if ($location.url() === url) return;
            if (!handleLocationChange) $rootScope.ignoreNextLocationChange = true;
            $location.url(url);
        },

        /**
         * Shows up a dialog with multiple buttons. The buttons parameter is an array of objects, defining the buttons. Button attributes are:
         * - label: Text to show on the button
         * - class: CSS class to use, e.g. "md-warn" or "md-primary"
         * - onclick: function which is called when the button is pressed
         */
        showdialog: function(content, buttons) {
            $mdDialog.show({
                template:
                    '<md-dialog>' +
                    '  <md-dialog-content class="md-dialog-content">' + content + '</md-dialog-content>' +
                    '  <md-dialog-actions>' +
                    '    <md-button ng-repeat="button in buttons" ng-click="onclick(button)" class="md-raised {{button.class}}">{{button.label}}</md-button>' +
                    '  </md-dialog-actions>' +
                    '</md-dialog>',
                controller: function($scope, $mdDialog) {
                    $scope.buttons = buttons;
                    $scope.onclick = function(button) {
                        if (button.onclick) button.onclick();
                        $mdDialog.hide();
                    }
                }
            })
        },

        // Brings up a popup menu below the button which triggered this function. This menu contains a list of possible datatypes for the given listapi. Used for creating new elements
        showselectionpanel: function(clickevent, listapi, selectioncallback) {
            var nodeToHandle = clickevent.currentTarget;
            var position = $mdPanel.newPanelPosition().relativeTo(nodeToHandle).addPanelPosition($mdPanel.xPosition.ALIGN_START, $mdPanel.yPosition.BELOW);
            $mdPanel.open({
                attachTo: angular.element(document.body),
                controller: function($scope, $http, mdPanelRef) {
                    $http.get(listapi).then(function(datatyperesponse) {
                        $scope.list = datatyperesponse.data;
                        $scope.click = function(item) {
                            selectioncallback(item);
                            mdPanelRef.close();
                        }
                    });
                },
                templateUrl: '/partial/components/selectionpanel.html',
                panelClass: 'select-type-menu',
                position: position,
                openFrom: clickevent,
                clickOutsideToClose: true,
                escapeToClose: true,
                focusOnOpen: true,
                zIndex: 2
            });
        },

        /**
         * Wartet darauf, dass eine Karte gerendert wird und scrollt diese dann ins Blickfeld
         */
        waitForOffsetAndScroll: function(domCard, cardCanvas, counter) {
            if (domCard.offsetWidth) { // left could be zero but width must be greater than zero
                cardCanvas[0].scrollLeft = domCard.offsetLeft;
                domCard.style.borderColor = 'white';
                domCard.style.transform = 'rotate(0deg)';
                setTimeout(function() {
                    // Force the tabs in the calendar to recalculate them on mobile devices to enable the paging arrows^, http://stackoverflow.com/a/31899998
                    var evt = window.document.createEvent('UIEvents'); 
                    evt.initUIEvent('resize', true, false, window, 0); 
                    window.dispatchEvent(evt);
                }, 250);
                return;
            } else {
                if (counter > 0) {
                    setTimeout(function() { utils.waitForOffsetAndScroll(domCard, cardCanvas, counter - 1) }, 100);
                }
            }
        },

    }
    return utils;
});