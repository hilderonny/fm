
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
            var card, cardCanvas, domCard;
            // Prüfen, ob der Benutzer überhaupt die benötigten Rechte hat
            if (!$rootScope.canRead(requiredPermission)) return Promise.resolve();
            utils.cardsToAdd.push(cardToAdd);
            var urlparts = cardTemplateUrl.split("#"); // Can be with a hash
            var url = '/partial/' + urlparts[0] + '.html';
            if (urlparts.length > 0) url += "#" + urlparts[1];
            return $http.get(url, { cache: true}).then(function(response) {
                // Check whether the card should still be shown. When the dummy object is no longer
                // in the array, the request tooks too long and the user has done something other meanwhile
                if (utils.cardsToAdd.indexOf(cardToAdd) < 0) return Promise.resolve(); // So simply ignore the response
                cardCanvas = angular.element(document.querySelector('#cardcanvas'));
                card = angular.element(response.data);
                domCard = card[0];
                cardCanvas.append(card);
                var newScope = $rootScope.$new(true);
                newScope.params = params || {}; // Pass paremters to the scope to have access to it in the controller instance
                newScope.requiredPermission = requiredPermission; // For permission handling in details pages
                // Compile (render) the new card and attach its new controller
                $compile(card)(newScope); // http://stackoverflow.com/a/29444176, http://stackoverflow.com/a/15560832
                window.getComputedStyle(domCard).borderColor; // https://timtaubert.de/blog/2012/09/css-transitions-for-dynamically-created-dom-elements/
                // Scroll card in view, but wait until the card is put into the dom
                return utils.waitForOffsetAndScroll(domCard, cardCanvas, 50); // Try it up to 5 seconds, then abort
            }).then(function() {
                if (domCard && cardCanvas) return utils.scrollToAnchor(domCard, cardCanvas, 50).then(function() { return Promise.resolve(card); }); // Try it up to 5 seconds, then abort
                return Promise.resolve(card);
            });
        },

        addcardbyname: function(cardname, params) {
            var cardToAdd = {}; // Dummy object for remembering that the card is to be loaded
            var card, cardCanvas, domCard;
            utils.cardsToAdd.push(cardToAdd);
            return utils.loaddynamicobject("viewcards", cardname).then(function(viewcard) {
                // Check whether the card should still be shown. When the dummy object is no longer
                // in the array, the request tooks too long and the user has done something other meanwhile
                if (utils.cardsToAdd.indexOf(cardToAdd) < 0) return Promise.resolve(); // So simply ignore the response
                cardCanvas = angular.element(document.querySelector('#cardcanvas'));
                card = angular.element(viewcard.content);
                domCard = card[0];
                cardCanvas.append(card);
                var newScope = $rootScope.$new(true);
                newScope.params = params || {}; // Pass paremters to the scope to have access to it in the controller instance
                // Either the required permission is given as parameter (generic ones) or the cardname is used
                newScope.requiredPermission = newScope.params.permission || cardname; // For permission handling in details pages
                // Compile (render) the new card and attach its new controller
                $compile(card)(newScope); // http://stackoverflow.com/a/29444176, http://stackoverflow.com/a/15560832
                window.getComputedStyle(domCard).borderColor; // https://timtaubert.de/blog/2012/09/css-transitions-for-dynamically-created-dom-elements/
                // Scroll card in view, but wait until the card is put into the dom
                return utils.waitForOffsetAndScroll(domCard, cardCanvas, 50); // Try it up to 5 seconds, then abort
            }).then(function() {
                if (domCard && cardCanvas) return utils.scrollToAnchor(domCard, cardCanvas, 50).then(function() { return Promise.resolve(card); }); // Try it up to 5 seconds, then abort
                return Promise.resolve(card);
            });
        },

        addcardforview: function(view) {
            // Prüfen, ob der Benutzer überhaupt die benötigten Rechte hat
            if (!$rootScope.canRead(view.permission)) return Promise.resolve();
            return utils.addcardbyname(view.viewcardname, view);
        },

        adddetailscard: function(scope, datatypename, entityname, permission, parentdatatypename, parententityname, listfilter) {
            return utils.addCardWithPermission(scope.detailscard, {
                datatypename: datatypename,
                entityname: entityname,
                listfilter: listfilter,
                parentdatatypename: parentdatatypename,
                parententityname: parententityname,
                onclose: scope.ondetailscardclosed,
                oncreate: scope.onelementcreated,
                ondelete: scope.onelementdeleted,
                onsave: scope.onelementupdated,
                permission: permission
            }, permission);
        },

        closecard: function(scope, element) {
            if (scope.params.closeCallback) {
                scope.params.closeCallback();
            }
            utils.removeCardsToTheRightOf(element);
            utils.removeCard(element);
        },

        createdynamicobject: function(datatypename, entity) {
            var datatype = $rootScope.datatypes[datatypename];
            Object.keys(datatype.fields).map(function(fn) { return datatype.fields[fn]; }).forEach(function(f) { 
                if (entity[f.name] && f.fieldtype === "datetime") entity[f.name] = Date.parse(entity[f.name]);
            });
            return $http.post("/api/dynamic/" + datatypename, entity).then(function(response) {
                if (response.status !== 200) return Promise.reject(response.status);
                return response.data; // name of created element
            });
        },

        createrelation: function(relation) {
            return $http.post("/api/dynamic/relations", relation);
        },

        deletedynamicobject: function(datatypename, entityname) {
            // TODO: Das Löschen der Kindelemente sollte evetuell manuell durch die client-App erfolgen und gar nicht von der API
            // unterstützt werden.
            return $http.delete("/api/dynamic/" + datatypename + "/" + entityname);
        },

        // Go up all parents until one is found which's tag name is the given one
        // Used in avt-drag-drop-document for finding the list item for a tag
        // From: https://stackoverflow.com/a/7333885
        getparentnode: function(element, parenttagname) {
            var lcptn = parenttagname.toLowerCase();
            while (element.parentNode) {
                element = element.parentNode;
                if (element && element.tagName && element.tagName.toLowerCase() === lcptn) return element;
            }
            return false; // No parent with the given tagname found
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

        importfromurl: function(scope, url, parentdatatypename, parententityname) {
            return new Promise(function(resolve, reject) {
                var datatosend = { url: url };
                if (parentdatatypename) datatosend.parentdatatypename = parentdatatypename;
                if (parententityname) datatosend.parententityname = parententityname;
                scope.progressmode = 'indeterminate';
                scope.isinprogress = true;
                $http.post('/api/documents/urlupload', datatosend).then(function(response) {
                    scope.isinprogress = false;
                    if (response.status >= 400) return reject();
                    if (response.status === 301) return utils.importfromurl(scope, response.url, parentdatatypename, parententityname).then(resolve, reject);
                    resolve(response.data);
                });
            });
        },

        // Loads all datatypes and their field definitions on page load (keyed object)
        loaddatatypes: function(scope) {
            return utils.getresponsedata('/api/datatypes').then(function(datatypes) {
                scope.datatypes = datatypes;
                scope.titlefields = {};
                Object.keys(datatypes).forEach(function(k) {
                    var dt = datatypes[k];
                    scope.titlefields[k] = dt.titlefield ? dt.titlefield : "name";
                });
                scope.titlefields["recordtypes"] = "label"; // Special handling for record type administration
                return Promise.resolve();
            });
        },

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

        loaddynamicobjects: function(datatypename) {
            return utils.getresponsedata('/api/dynamic/' + datatypename);
        },

        /**
         * Loads the menu and apps structure from the server and prepares the menu for the logged in user
         */
        loadmenu: function(scope) {
            return utils.getresponsedata('/api/menu').then(function (responsedata) {
                scope.logourl = responsedata.logourl;
                // Apps
                scope.apps = Object.values(responsedata.apps);
                scope.apps.sort((a, b) => a.app.label.localeCompare(b.app.label));
                scope.currentapp = scope.apps.find(a => a.app.name === localStorage.getItem("currentappname"));
                if (!scope.currentapp) scope.currentapp = scope.apps[0];
                // Direct URL mappings
                scope.apps.forEach(app => {
                    var views = app.views;
                    views.sort((a, b) => a.index - b.index);
                    views.forEach(function(view) {
                        if (view.directurls) {
                            if (!scope.directUrlMappings) scope.directUrlMappings = {};
                            view.directurls.split(",").forEach(function(directurl) {
                                scope.directUrlMappings[directurl] = {
                                    app: app,
                                    view: view
                                };
                            });
                        }
                    });
                });
                return Promise.resolve();
            });
        },

        // Loads the labels of all parent elements of a given entity. Used for breadcrumbs. The order is root element first
        loadparentlabels: function(forlist, datatypename, entityname) {
            return utils.getresponsedata("/api/dynamic/parentpath/" + forlist + "/" + datatypename + "/" + entityname);
        },

        loadpermissions: function(scope) {
            return utils.getresponsedata('/api/permissions/forLoggedInUser').then(function(responsedata) {
                scope.permissions = {};
                responsedata.forEach(function(permission) {
                    scope.permissions[permission.key] = permission;
                });
                return Promise.resolve();
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
            return utils.getresponsedata('/api/dynamic/relationtypes').then(function(relationtypes) { 
                scope.relationtypes = relationtypes;
                return Promise.resolve();
            });
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
                if (scope.isPortal) scope.title = 'Portalverwaltung';
                // Save login credentials in browser for future access
                localStorage.setItem("loginCredentials", JSON.stringify(user));
                scope.isLoggingIn = false;
            }).catch(function() {
                localStorage.removeItem("loginCredentials"); // Delete login credentials to prevent login loop
                scope.isLoggingIn = false;
                scope.$root.isLoading = false;
                $mdDialog.show($mdDialog.alert()
                    .clickOutsideToClose(true)
                    .title("Anmeldung fehlgeschlagen")
                    .textContent("Der Benutzername oder das Passwort ist nicht korrekt.")
                    .ok("Wiederholen")
                );
                throw new Error("Login failed"); // Prevent further loading in MainController.dologin()
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

        savedynamicobject: function(datatype, entity) {
            // Filter out formulas and name
            var entitytosend = JSON.parse(JSON.stringify(entity));
            delete entitytosend.name;
            Object.keys(datatype.fields).map(function(fn) { return datatype.fields[fn]; }).forEach(function(f) { 
                if (f.fieldtype === "formula") delete entitytosend[f.name];
                if (entitytosend[f.name] && f.fieldtype === "datetime") entitytosend[f.name] = Date.parse(entitytosend[f.name]);
            });
            return $http.put("/api/dynamic/" + datatype.name + "/" + entity.name, entitytosend);
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
            return new Promise(function(resolve, reject) {
                function doscroll(domCard, cardCanvas, counter) {
                    if (domCard.offsetWidth) { // left could be zero but width must be greater than zero
                        $anchorScroll();
                        resolve();
                    } else if (counter > 0) {
                        setTimeout(function() { doscroll(domCard, cardCanvas, counter - 1) }, 100);
                    } else resolve();
                }
                doscroll(domCard, cardCanvas, counter);
            });
        },

        // Sets the Browser-URL to the given one for direct access
        setLocation: function(url, handleLocationChange) {
            if ($location.url() === url) return;
            if (!handleLocationChange) $rootScope.ignoreNextLocationChange = true;
            $location.url(url);
        },

        /**
         * Shows up a dialog with multiple buttons. The buttons parameter is an array of objects, defining the buttons. Button attributes are:
         * - label: Text to show on the button, can be a translation key
         * - class: CSS class to use, e.g. "md-warn" or "md-primary"
         * - onclick: function which is called when the button is pressed
         * - visible: show button or not
         */
        showdialog: function(parentscope, content, buttons) {
            $mdDialog.show({
                template:
                    '<md-dialog>' +
                    '  <md-dialog-content class="md-dialog-content">' + content + '</md-dialog-content>' +
                    '  <md-dialog-actions>' +
                    '    <md-button ng-repeat="button in dialogbuttons" ng-click="onclick(button)" ng-if="!button.ishidden" class="md-raised {{button.class}}">{{button.label}}</md-button>' +
                    '  </md-dialog-actions>' +
                    '</md-dialog>',
                scope: parentscope,
                controller: function($scope, $mdDialog) {
                    $scope.dialogbuttons = buttons;
                    $scope.onclick = function(button) {
                        var result = button.onclick && button.onclick() === false ? false : true;
                        if (result) $mdDialog.hide();
                    }
                }
            })
        },

        // Brings up a popup menu below the button which triggered this function. This menu contains a list of possible datatypes for the given listapi. Used for creating new elements
        showselectionpanel: function(clickevent, datatypes, selectioncallback) {
            var nodeToHandle = clickevent.currentTarget;
            var position = $mdPanel.newPanelPosition().relativeTo(nodeToHandle).addPanelPosition($mdPanel.xPosition.ALIGN_START, $mdPanel.yPosition.BELOW);
            $mdPanel.open({
                attachTo: angular.element(document.body),
                controller: function($scope, $http, mdPanelRef) {
                    $scope.list = datatypes;
                    $scope.click = function(item) {
                        selectioncallback(item);
                        mdPanelRef.close();
                    }
                },
                template: 
                    '<md-list class="context-menu" role="list">' +
                    '   <md-list-item ng-repeat="item in list | orderBy : \'label\'" ng-click="click(item)">' +
                    '       <img ng-src="{{item.icon}}"/>' +
                    '       <p>{{item.label}}</p>' +
                    '   </md-list-item>' +
                    '</md-list>',
                panelClass: 'select-type-menu',
                position: position,
                openFrom: clickevent,
                clickOutsideToClose: true,
                escapeToClose: true,
                focusOnOpen: true,
                zIndex: 2
            });
        },

        uploadfile: function(scope, filedata, parentdatatypename, parententityname, url, indeterminate) {
            if (!url) url = 'api/documents?token=' + $http.defaults.headers.common['x-access-token'];
            return new Promise(function(resolve, reject) {
                scope.progressmode = indeterminate ? "indeterminate" : "determinate";
                scope.progressvalue = 0;
                scope.isinprogress = true;
                // http://stackoverflow.com/q/13591345
                var form = new FormData();
                var xhr = new XMLHttpRequest;
                // Additional POST variables may be required by the API script
                if (parententityname) form.append('parententityname', parententityname);
                if (parentdatatypename) form.append('parentdatatypename', parentdatatypename);
                form.append('file', filedata);
                xhr.upload.onprogress = function (e) {
                    // Event listener for when the file is uploading
                    if (e.lengthComputable && !indeterminate) {
                        var progress = Math.round(e.loaded / e.total * 100);
                        scope.progressvalue = progress;
                    } else {
                        scope.progressmode = 'indeterminate';
                    }
                }
                xhr.onreadystatechange = function (e) { // https://developer.mozilla.org/de/docs/Web/API/XMLHttpRequest
                    if (e.target.readyState === 4) {
                        scope.isinprogress = false;
                        var uploadeddocumentname = e.target.response;
                        resolve(e.target.response); // In most cases the name of the uploaded document is returned. In client import the new clientname is returned
                    }
                }
                xhr.open('POST', url);
                xhr.send(form);
            });
        },

        /**
         * Wartet darauf, dass eine Karte gerendert wird und scrollt diese dann ins Blickfeld
         */
        waitForOffsetAndScroll: function(domCard, cardCanvas, counter) {
            return new Promise(function(resolve, reject) {
                function dowait(domCard, cardCanvas, counter) {
                    if (domCard.offsetWidth) { // left could be zero but width must be greater than zero
                        cardCanvas[0].scrollLeft = domCard.offsetLeft;
                        domCard.style.borderColor = 'white';
                        domCard.style.transform = 'rotate(0deg)';
                        setTimeout(function() {
                            // Force the tabs in the calendar to recalculate them on mobile devices to enable the paging arrows^, http://stackoverflow.com/a/31899998
                            var evt = window.document.createEvent('UIEvents'); 
                            evt.initUIEvent('resize', true, false, window, 0); 
                            window.dispatchEvent(evt);
                            resolve();
                        }, 250);
                    } else if (counter > 0) {
                        setTimeout(function() { dowait(domCard, cardCanvas, counter - 1) }, 100);
                    } else resolve();
                }
                dowait(domCard, cardCanvas, counter);
            });
        },

    }
    return utils;
});