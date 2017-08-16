// Controller for main functions
app.controller('MainController', function($scope, $rootScope, $mdMedia, $mdSidenav, $http, $mdDialog, $translate, $mdDateLocale, $location, utils) {

    $scope.$mdMedia = $mdMedia; // https://github.com/angular/material/issues/2341#issuecomment-93680762



    window.onbeforeunload = function(e) { // Shows up dialog to leave the site
        //return false;
    };

    // Handle Sidenav toggle button click
    $scope.toggleLeftSidenav = function() { // http://jsfiddle.net/qo1gmrrr/
        $mdSidenav('left').toggle();
    }

    // Handle click on sidenav menu item
    $scope.menuClick = function(menuItem) {
        $scope.currentMenuItem = menuItem;
        if (menuItem) {
            if (menuItem.action) {
                menuItem.action();
            } else {
                utils.removeAllCards();
                utils.addCardWithPermission(menuItem.mainCard, null, menuItem.permission);
                $mdSidenav('left').close();
            }
        } else {
            utils.removeAllCards();
            $mdSidenav('left').close();
            utils.setLocation('/');
        }
    }


    $scope.handleDirectUrls = function() {
        if (app.directUrlMappings[$scope.path[1]]) {
            var mapping = app.directUrlMappings[$scope.path[1]];
            var mainMenu = $scope.menu.find(function(m) { return m.title === mapping.mainMenu; });
            if (!mainMenu) return;
            var subMenu = mainMenu.items.find(function(mi) { return mi.title === mapping.subMenu; });
            if (!subMenu) return;
            $scope.currentMenuItem = subMenu;
            angular.element(document.querySelector('#cardcanvas')).empty();
            utils.addCardWithPermission(subMenu.mainCard, { preselection: $scope.path[2] }, subMenu.permission);
        }
    };

    $rootScope.permissions = {};

    $rootScope.canRead = function(permissionKey) {
        return $rootScope.permissions[permissionKey] && $rootScope.permissions[permissionKey].canRead;
    }

    $rootScope.canWrite = function(permissionKey) {
        return $rootScope.permissions[permissionKey] && $rootScope.permissions[permissionKey].canWrite;
    }

    // User clicked on login button
    $scope.doLogin = function(hideErrorMessage) {
        $scope.title = null;
        $scope.isLoggingIn = true;
        // Loads the menu structure from the server
        var user = {
            username: $scope.username,
            password: $scope.password
        }
        $http.post('/api/login', user).then(function (response) {
            if (response.status !== 200) throw new Error(response.status); // Caught below
            // Set the token for all requests
            $http.defaults.headers.common['x-access-token'] = response.data.token;
            $scope.isLoggedIn = true;
            $scope.isPortal = response.data.clientId === null;
            if ($scope.isPortal) {
                $scope.title = 'TRK_TITLE_PORTAL';
            }
            // Save login credentials in browser for future access
            localStorage.setItem("loginCredentials", JSON.stringify(user));
            // Loads the menu structure from the server
            $http.get('/api/menu').then(function (response) {
                $scope.menu = response.data.menu;
                $scope.menu.push({
                    "title": "TRK_MENU_LOGOUT",
                    "icon": "Exit",
                    "action": function() {
                        localStorage.removeItem("loginCredentials");
                        $scope.isLoggedIn = false;
                        utils.setLocation('/');
                    }
                });
                $scope.logourl = response.data.logourl;
                // Ermittelt zentral alle Berechtigungen für den angemeldeten Benutzer.
                // Diese können dann per $rootScope.permissions[key] abgefragt werden.
                return $http.get('/api/permissions/forLoggedInUser');
            }).then(function(response) {
                $rootScope.permissions = {};
                response.data.forEach(function(permission) {
                    $rootScope.permissions[permission.key] = permission;
                });
                $scope.isLoggingIn = false;
                $scope.currentMenuItem = null;
                $scope.handleDirectUrls();
            });
        }).catch(function() {
            localStorage.removeItem("loginCredentials"); // Delete login credentials to prevent login loop
            $scope.isLoggingIn = false;
            if (hideErrorMessage) {
                return;
            }
            $translate(['TRK_LOGIN_FAILED_TITLE', 'TRK_LOGIN_FAILED_CONTENT', 'TRK_LOGIN_FAILED_AGAIN']).then(function(translations) {
                $mdDialog.show(
                    $mdDialog.alert()
                        .clickOutsideToClose(true)
                        .title(translations.TRK_LOGIN_FAILED_TITLE)
                        .textContent(translations.TRK_LOGIN_FAILED_CONTENT)
                        .ok(translations.TRK_LOGIN_FAILED_AGAIN)
                );
            });
        });
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
        $rootScope.currentLanguage = lang;
        $rootScope.langDirection = (lang==='ar'?'rtl':'ltr');
        $rootScope.$emit('localeChanged', lang); // Tell the activity controller to update its date picker
    }

    $rootScope.languages = [ 'de', 'en']; // Define which languages are shown in menu

    $scope.setLang($translate.proposedLanguage());

    if ($rootScope.languages.indexOf($rootScope.currentLanguage) < 0) {
        $scope.setLang('en'); // Fallback
    }

    // Handle direct URLs, checked after login

    $rootScope.$on('$locationChangeSuccess', function(evt, newUrl, oldUrl) {
        if ($rootScope.ignoreNextLocationChange) {
            $rootScope.ignoreNextLocationChange = false;
            return;
        }
        $scope.path = $location.path().split('/');
        $scope.hash = $location.hash();
        if (newUrl === oldUrl) return;
        if ($scope.isLoggedIn) $scope.handleDirectUrls();
    });

    // Try to do a login with information from local storage
    try {
        var loginCredentials = JSON.parse(localStorage.getItem("loginCredentials"));
        $scope.username = loginCredentials.username;
        $scope.password = loginCredentials.password;
        setTimeout(function() { // Give the translation some time
            $scope.doLogin(true);
        }, 300);
    } catch(e) {}
});
