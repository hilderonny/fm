// Controller for main functions
app.controller('MainController', function($scope, $rootScope, $mdMedia, $mdSidenav, $http, $mdDialog, $translate, $mdDateLocale, utils) {

    $scope.$mdMedia = $mdMedia; // https://github.com/angular/material/issues/2341#issuecomment-93680762

    $scope.logo = '/css/logo_avorium_komplett.svg';

    window.onbeforeunload = function(e) { // Shows up dialog to leave the site
        //return false;
    };

    // Handle Sidenav toggle button click
    $scope.toggleLeftSidenav = function() { // http://jsfiddle.net/qo1gmrrr/
        $mdSidenav('left').toggle();
    }

    // Handle click on sidenav menu item
    // Deprecated
    $scope.menuClick = function(menuItem) {
        $scope.currentMenuItem = menuItem;
        if (menuItem) {
            if (menuItem.action) {
                menuItem.action();
            } else {
                $scope.showmainCard(menuItem.mainCard);
                $mdSidenav('left').close();
            }
        } else {
            angular.element(document.querySelector('#cardcanvas')).empty();
            $mdSidenav('left').close();
        }
    }

    $scope.showmainCard = function(cardUrl) {
        angular.element(document.querySelector('#cardcanvas')).empty();
        utils.addCard(cardUrl);
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
            // Set the token for all requests
            $http.defaults.headers.common['x-access-token'] = response.data.token;
            $scope.isLoggedIn = true;
            $scope.isPortal = response.data.clientId === null;
            if ($scope.isPortal) {
                $scope.title = 'TITLE_PORTAL';
            }
            // Save login credentials in browser for future access
            localStorage.setItem("loginCredentials", JSON.stringify(user));
            // Loads the menu structure from the server
            $http.get('/api/menu').then(function (response) {
                $scope.menu = response.data;
                $scope.menu.push({
                    "title": "MENU_LOGOUT",
                    "icon": "Exit",
                    "action": function() {
                        localStorage.removeItem("loginCredentials");
                        $scope.isLoggedIn = false;
                    }
                })
            });
            $scope.isLoggingIn = false;
            $scope.currentMenuItem = null;
        }).catch(function() {
            $scope.isLoggingIn = false;
            if (hideErrorMessage) {
                return;
            }
            $translate(['LOGIN_FAILED_TITLE', 'LOGIN_FAILED_CONTENT', 'LOGIN_FAILED_AGAIN']).then(function(translations) {
                $mdDialog.show(
                    $mdDialog.alert()
                        .clickOutsideToClose(true)
                        .title(translations.LOGIN_FAILED_TITLE)
                        .textContent(translations.LOGIN_FAILED_CONTENT)
                        .ok(translations.LOGIN_FAILED_AGAIN)
                );
            });
        });
    }

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
        $scope.currentLanguage = lang;
        $rootScope.langDirection = (lang==='ar'?'rtl':'ltr');
        $rootScope.$emit('localeChanged', lang); // Tell the activity controller to update its date picker
    }

    $scope.languages = [ 'de', 'en', 'ar']; // Define which languages are shown in menu

    $scope.setLang($translate.proposedLanguage());

    if ($scope.languages.indexOf($scope.currentLanguage) < 0) {
        $scope.setLang('en'); // Fallback
    }

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
