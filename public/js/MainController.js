// Controller for main functions
app.controller('MainController', function($scope, $mdMedia, $mdSidenav, $http, $mdDialog, $translate, $mdDateLocale, $location, $mdPanel, $q, utils) {

    $scope.$mdMedia = $mdMedia; // https://github.com/angular/material/issues/2341#issuecomment-93680762

    var rootscope = $scope.$root;

    window.onbeforeunload = function(e) { // Shows up dialog to leave the site
        //return false;
    };

    // Handle Sidenav toggle button click
    $scope.toggleLeftSidenav = function() { // http://jsfiddle.net/qo1gmrrr/
        $mdSidenav('left').toggle();
    }

    // Handle click on sidenav menu item
    rootscope.menuClick = function(menuItem) {
        rootscope.currentMenuItem = menuItem;
        var promise;
        if (menuItem) {
            utils.removeAllCards();
            utils.setLocation("/"); // Clear location before switching to another module to prevent handling of element names which are invalid in new context
            promise = utils.addCardWithPermission(menuItem.mainCard, menuItem, menuItem.permission).then(function() {
                $mdSidenav('left').close();
                if (menuItem.directurls && menuItem.directurls.length > 0) utils.setLocation('/' + menuItem.directurls[0]); // Use first defined direct URL
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
            return utils.addCardWithPermission('Doc/List', { preselection: rootscope.path[2], anchor: rootscope.path[3] });
        } else if (rootscope.directUrlMappings[path1]) {
            var mapping = rootscope.directUrlMappings[path1];
            // TODO: Handle direct URLs
            var menus = rootscope.apps[mapping.apptitle];
            var menu = menus.find(function(m) { return m.title === mapping.menutitle; });
            if (!menu) return Promise.resolve();
            rootscope.currentMenuItem = menu;
            rootscope.currentappname = mapping.apptitle;
            angular.element(document.querySelector('#cardcanvas')).empty();
            return utils.addCardWithPermission(menu.mainCard, menu, menu.permission);
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
    $scope.doLogin = function(hideErrorMessage) {
        rootscope.title = null;
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
        utils.setLocation('/');
    };

    $scope.getofficeicon = function(icon) {
        return icon.replace(/\/material\//g, '/office/');
    };

    $scope.onappselected = function() {
        localStorage.setItem("currentappname", this.currentappname); // this refers to the child scope of the select box
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
        $scope.username = loginCredentials.username;
        $scope.password = loginCredentials.password;
        setTimeout(function() { // Give the translation some time
            $scope.doLogin(true);
        }, 300);
    } catch(e) {}
});
