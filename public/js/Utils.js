// Define utils factory, http://stackoverflow.com/a/26109991
app.factory('utils', function($compile, $rootScope, $http, $translatePartialLoader, $translate) {
    var utils = {

        // On slow connections clicking on list items multiply adds multiple cards
        // To prevent that, this array is used to remember which cards are to be loaded
        cardsToAdd: [],

        // Add a card to the card canvas
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
                var waitForOffsetAndScroll = function(counter) {
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
                            setTimeout(function() { waitForOffsetAndScroll(counter-1) }, 100);
                        }
                    }
                }
                waitForOffsetAndScroll(50); // Try it up to 5 seconds, then abort
                if (doneCallback) {
                    doneCallback(card);
                }
            });
        },

        // Registers translations for the given key
        registerTranslations: function(translationKey) {
            if (!$translatePartialLoader.isPartAvailable(translationKey)) {
                $translatePartialLoader.addPart(translationKey);
                $translate.refresh();
            }
        },

        // Removes all cards right to the given one
        removeCardsToTheRightOf: function(card) {
            // Emtying the array of running requests
            utils.cardsToAdd = [];
            var nextCard;
            do {
                nextCard = card.next();
                utils.destroyAndRemoveCard(nextCard);
            } while (nextCard.length > 0);
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
        }

    }
    return utils;
});