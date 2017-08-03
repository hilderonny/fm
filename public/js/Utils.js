// Define utils factory, http://stackoverflow.com/a/26109991
app.factory('utils', function($compile, $rootScope, $http, $translate) {
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
            return new Promise(function(resolve, reject) {
                // Prüfen, ob der Benutzer überhaupt die benötigten Rechte hat
                $http.get('/api/permissions/canRead/' + requiredPermission).then(function permissionCheck(response) {
                    if (!response.data) {
                        reject();
                        return;
                    }
                    var cardToAdd = {}; // Dummy object for remembering that the card is to be loaded
                    utils.cardsToAdd.push(cardToAdd);
                    $http.get('/partial/' + cardTemplateUrl + '.html', { cache: true}).then(function(response) {
                        // Check whether the card should still be shown. When the dummy object is no longer
                        // in the array, the request tooks too long and the user has done something other meanwhile
                        if (utils.cardsToAdd.indexOf(cardToAdd) < 0) return; // So simply ignore the response
                        var cardCanvas = angular.element(document.querySelector('#cardcanvas'));
                        var card = angular.element(response.data);
                        var domCard = card[0];
                        cardCanvas.append(card);
                        var newScope = $rootScope.$new(true);
                        newScope.params = params || {}; // Pass paremters to the scope to have access to it in the controller instance
                        // Compile (render) the new card and attach its new controller
                        $compile(card)(newScope); // http://stackoverflow.com/a/29444176, http://stackoverflow.com/a/15560832
                        window.getComputedStyle(domCard).borderColor; // https://timtaubert.de/blog/2012/09/css-transitions-for-dynamically-created-dom-elements/
                        // Scroll card in view, but wait until the card is put into the dom
                        utils.waitForOffsetAndScroll(domCard, cardCanvas, 50); // Try it up to 5 seconds, then abort
                        resolve(card);
                    });
                });
            });
        },

        // Add a card to the card canvas
        // TODO: Raus damit und durch addCardWithPermission ersetzen
        addCard: function(cardUrl, params, doneCallback) {
            var cardToAdd = {}; // Dummy object for remembering that the card is to be loaded
            utils.cardsToAdd.push(cardToAdd);
            $http.get('/partial/' + cardUrl + '.html', { cache: true}).then(function(response) {
                // Check whether the card should still be shown. When the dummy object is no longer
                // in the array, the request tooks too long and the user has done something other meanwhile
                if (utils.cardsToAdd.indexOf(cardToAdd) < 0) return; // So simply ignore the response
                var cardCanvas = angular.element(document.querySelector('#cardcanvas'));
                var card = angular.element(response.data);
                var domCard = card[0];
                cardCanvas.append(card);
                var newScope = $rootScope.$new(true);
                newScope.params = params || {}; // Pass paremters to the scope to have access to it in the controller instance
                // Compile (render) the new card and attach its new controller
                $compile(card)(newScope); // http://stackoverflow.com/a/29444176, http://stackoverflow.com/a/15560832
                window.getComputedStyle(domCard).borderColor; // https://timtaubert.de/blog/2012/09/css-transitions-for-dynamically-created-dom-elements/
                // Scroll card in view, but wait until the card is put into the dom
                utils.waitForOffsetAndScroll(domCard, cardCanvas, 50); // Try it up to 5 seconds, then abort
                if (doneCallback) {
                    doneCallback(card);
                }
            });
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
                utils.destroyAndRemoveCard(nextCard);
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

        // Removes a card, when it is set (defined by length > 0) and destroys
        // its scope to prevent memory leaks. Should not be called directly.
        // Call removeCard() instead to have a nice animation.
        // See https://www.bennadel.com/blog/2706-always-trigger-the-destroy-event-before-removing-elements-in-angularjs-directives.htm
        destroyAndRemoveCard: function(card) {
            if (card && card.length) {
                card.scope().$destroy(); // Need to destroy the scope before removing the card from the dom, see link above
                card.remove(); 
            }
        },

        // Removes the given card from the canvas
        removeCard: function(card) {
            // Show hide animation
            card.addClass('willclose');
            card[0].style.borderColor = 'black';
            card[0].style.removeProperty('transform');
            // Wait until animation completed
            setTimeout(function() { 
                utils.destroyAndRemoveCard(card);
            }, 250);
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

        loadDynamicAttributes: function(scope) {
            console.log('loadDynamicAttributes', scope);
        },

        saveDynamicAttributes: function(scope) {

        }

    }
    return utils;
});