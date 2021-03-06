// Controller for main functions
app.controller('MainController', function($scope, $mdMedia, $mdSidenav, $http, $mdDialog, $translate, $mdDateLocale, $location, $mdPanel, $q, utils) {

    $scope.$mdMedia = $mdMedia; // https://github.com/angular/material/issues/2341#issuecomment-93680762

    var rootscope = $scope.$root;

    // Handle Sidenav toggle button click
    $scope.toggleLeftSidenav = function() { // http://jsfiddle.net/qo1gmrrr/
        $mdSidenav('left').toggle();
    }

    // Handle click on sidenav menu item
    rootscope.menuClick = async(view) => {
        rootscope.currentview = view;
        var promise;
        if (view) {
            utils.removeAllCards();
            utils.setLocation("/"); // Clear location before switching to another module to prevent handling of element names which are invalid in new context
            promise = (view.viewcardname ? 
                utils.addcardforview(view): // Otherwise use the card definition from the database
                utils.addCardWithPermission(view.maincard, view, view.permission) // When maincard is set, use the old fashioned way to retrieve the HTML template
            ).then(() => {
                $mdSidenav('left').close();
                if (view.directurls && view.directurls.length > 0) utils.setLocation('/' + view.directurls.split(",")[0]); // Use first defined direct URL
                return Promise.resolve();
            });
        } else {
            utils.removeAllCards();
            $mdSidenav('left').close();
            utils.setLocation('/');
            promise = Promise.resolve();
        }
        return promise;
    }


    rootscope.handleDirectUrls = function() {
        var path1 = rootscope.path[1];
        rootscope.isShowingDoc = false; // Pauschal ausschalten, wenn vorher aktiv war
        if (!path1) { // Navigate back to dashboard
            return rootscope.menuClick(null);
        } else if (path1 === 'doc') { // Sonderbehandlung für Online-Dokumentation
            rootscope.isShowingDoc = true;
            angular.element(document.querySelector('#cardcanvas')).empty();
            return utils.addCardWithPermission('Doc/List', { preselection: rootscope.path[2], anchor: rootscope.hash });
        } else if (rootscope.directUrlMappings[path1]) {
            var mapping = rootscope.directUrlMappings[path1];
            if (!mapping) return Promise.resolve();
            rootscope.currentview = mapping.view;
            rootscope.currentapp = mapping.app;
            localStorage.setItem("currentappname", rootscope.currentapp.app.name);
            angular.element(document.querySelector('#cardcanvas')).empty();
            return mapping.view.viewcardname ? 
                utils.addcardforview(mapping.view) : 
                utils.addCardWithPermission(mapping.view.maincard, mapping.view, mapping.view.permission);
        } else {
            return Promise.resolve();
        }
    };

    rootscope.canRead = function(permissionKey) {
        return !permissionKey || (rootscope.permissions[permissionKey] && rootscope.permissions[permissionKey].canRead);
    }

    rootscope.canWrite = function(permissionKey) {
        return !permissionKey || (rootscope.permissions[permissionKey] && rootscope.permissions[permissionKey].canWrite);
    }

    // User clicked on login button
    $scope.doLogin = function() {
        rootscope.title = null;
        rootscope.currentapp = null;
        return utils.login(rootscope, $scope.username, $scope.password).then(function() {        
            $scope.$root.isLoading = true;            
            return Promise.all([
                utils.loadmenu(rootscope),
                utils.loadpermissions(rootscope),
                utils.loaddatatypes(rootscope),
                utils.loadrelationtypes(rootscope)
            ]);
        }).then(function() {
            return rootscope.handleDirectUrls();
        }).then(function() {
            $scope.$root.isLoading = false;
        });
    };

    $scope.logout = function() {
        localStorage.removeItem("loginCredentials");
        localStorage.removeItem("currentappname");
        rootscope.isLoggedIn = false;
        rootscope.searchResults = [];
        rootscope.searchInputVisible = false;
        delete rootscope.currentview;
        rootscope.currentapp = null;
    utils.setLocation('/');
    };

    $scope.getofficeicon = function(icon) {
        return icon ? icon.replace(/\/material\//g, '/office/') : null;
    };

    $scope.onappselected = function() {
        localStorage.setItem("currentappname", this.currentapp.app.name); // this refers to the child scope of the select box
    };

    // Define used languages
    $scope.setLang = function(lang) {
        moment.locale(lang);
        var localeData = moment.localeData();
        $mdDateLocale.months = localeData.months();
        $mdDateLocale.shortMonths = localeData.monthsShort();
        $mdDateLocale.days = localeData.weekdays();
        $mdDateLocale.shortDays = localeData.weekdaysShort();
        $mdDateLocale.firstDayOfWeek = localeData.firstDayOfWeek();
        $translate.use(lang);
        rootscope.currentLanguage = lang;
        rootscope.langDirection = (lang==='ar'?'rtl':'ltr');
        rootscope.$emit('localeChanged', lang); // Tell the activity controller to update its date picker
    }

    rootscope.languages = [ 'de', 'en']; // Define which languages are shown in menu

    $scope.setLang($translate.proposedLanguage());

    if (rootscope.languages.indexOf(rootscope.currentLanguage) < 0) {
        $scope.setLang('en'); // Fallback
    }

    // Handle direct URLs, checked after login

    rootscope.$on('$locationChangeSuccess', function(evt, newUrl, oldUrl) {
        if (rootscope.ignoreNextLocationChange) {
            rootscope.ignoreNextLocationChange = false;
            return;
        }
        rootscope.path = $location.path().split('/');
        rootscope.hash = $location.hash();
        if (newUrl === oldUrl) return;
        if (rootscope.isLoggedIn) rootscope.handleDirectUrls();
    });

    // Handle more-menu on mobile devices
    $scope.openMoreMenu = function(evt) {
        var nodeToHandle = evt.currentTarget;
        var position = $mdPanel.newPanelPosition().relativeTo(nodeToHandle).addPanelPosition($mdPanel.xPosition.ALIGN_END, $mdPanel.yPosition.BELOW);
        var parentScope = $scope;
        $mdPanel.open({
            attachTo: angular.element(document.body),
            controller: function ($scope) { $scope.parentScope = parentScope; }, // https://github.com/angular/material/issues/1531#issuecomment-74640529
            templateUrl: 'moreMenuContent.html',
            panelClass: 'select-type-menu',
            position: position,
            openFrom: evt,
            clickOutsideToClose: true,
            escapeToClose: true,
            focusOnOpen: true,
            zIndex: 2
        }).then(function(panelRef) {
            $scope.moreMenuPanel = panelRef;
        });
    };

    $scope.searchRequestCanceler = $q.defer();

    // Sendet Sucheingaben unverzüglich an den Server und verarbeitet die Antwort
    $scope.handleSearchInput = function(evt) {
        var searchTerm = evt.target.value;
        if ($scope.searchInputTimeoutId) {
            clearTimeout($scope.searchInputTimeoutId);
        }
        $scope.searchInputTimeoutId = setTimeout(function() {
            $scope.searchResults = [];
            $scope.searchInputTimeoutId = null;
            // Abbruch bestehender Requests: https://stackoverflow.com/q/35375120/5964970
            $scope.searchRequestCanceler.resolve('Request cancelled'); // Resolve the previous canceler
            $scope.searchRequestCanceler = $q.defer();
            $http({
                method: 'GET',
                url: '/api/search?term=' + encodeURIComponent(searchTerm),
                timeout: $scope.searchRequestCanceler.promise
            }).then(function(response) {
                var results = response.data;
                if (!results) {
                    return; // Passiert durch Abbruch des Requests, wenn ein neuer gestartet wird
                }
                var regexp = new RegExp(searchTerm, 'gi');
                results.forEach(function(result) {
                    result.name = result.name.replace(regexp, function(match, offset, string) {
                        return '<u><b>' + match + '</b></u>'; // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace
                    });
                });
                $scope.searchResults = results;
            });
        }, 500);
    };

    // Klick auf Suchergebnisse öffnet diese per Direkteinsprung
    $scope.onSearchResultClick = function(searchResult) {
        var collection = searchResult.collection;
        if (collection === 'folders') collection = 'documents'; // Beim Direkteinsprung werden Verzeichnisse wie Dokumente gehandhabt
        var url = '/' + collection + '/' + searchResult._id;
        utils.setLocation(url, true);
        $scope.searchInputVisible = false;
    };

    // Try to do a login with information from local storage
    try {
        $scope.searchResults = [];
        $scope.searchInputVisible = false;
        var loginCredentials = JSON.parse(localStorage.getItem("loginCredentials"));
        if(!loginCredentials.error) {
        $scope.username = loginCredentials.username;
        $scope.password = loginCredentials.password;
        setTimeout(function() { // Give the translation some time
            $scope.doLogin(true);
        }, 300);} else{
            localStorage.removeItem("loginCredentials");
            $mdDialog.show($mdDialog.alert()
            .clickOutsideToClose(true)
            .title("Anmeldung fehlgeschlagen")
            .textContent("Es gibt ein Problem bezüglich Ihrer Anmeldedaten. Bitte kontaktieren Sie Ihren Administrator!")
            .ok("Ok")
        );}
    } catch(e) {}
});
