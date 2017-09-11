// Setup app. Must be included before all controllers
var app = angular.module('app', ['ngMaterial', 'ngMessages', 'ngSanitize', 'pascalprecht.translate', 'angularMoment', 'ngRoute'] ); // Include app dependency on ngMaterial and error messages, see https://material.angularjs.org/latest/demo/input and https://angular-translate.github.io/docs/#/guide/02_getting-started

// Define theme
app.config(function($mdThemingProvider) {
  $mdThemingProvider.theme('default')
    .primaryPalette('indigo')
    .accentPalette('blue-grey');
  $mdThemingProvider.enableBrowserColor();
});

// Handle response errors by reloading the page
app.config(['$httpProvider', function($httpProvider) { 
    $httpProvider.interceptors.push(function() { // See https://docs.angularjs.org/api/ng/service/$http
        return {
            'response': function(response) {
              // Handle 205 status codes from server to force reloading of the 
              // entire app after server restart
              if (response.status === 205) {
                // Reload from server without cache
                location.reload(true); // See http://stackoverflow.com/a/5722855/5964970
                return;
              } else {
                return response;
              }
            },
            'responseError': function(rejection) {
              // Darf nur auf Requests an APIs an den eigenen Server reagieren
              // Calls zu externen Systemen müssen durchgelassen werden und werden von
              // den jeweiligen Controllern gehandhabt.
              // Eine andere Idee, den Response abzufragen und nach einem speziellen
              // ForceReload - Inhalt oder Header zu checken, würde das Problem mit den 403
              // aus weggenommenen Rechten nicht lösen.
              // Wird an die URL #ignore403 angehangen, werden die Fehler ignoriert.
              // Das wird z.B. bei der Benutzerliste für Benutzergruppen verwendet, wenn
              // man zwar die Benutzergruppe aber keine Benutzer sehen darf.
              if (rejection.status === 403 && rejection.config.url.startsWith('/api/') && !rejection.config.url.endsWith('#ignore403')) {
                location.reload();
              }
              return rejection;
            }
        };
    });
}]);

// Configure dates
app.config(function($mdDateLocaleProvider) {
  // https://material.angularjs.org/latest/api/service/$mdDateLocaleProvider
  // https://github.com/angular/material/issues/4480
  // Der Rest ist in mainController:88 konfiguriert
  $mdDateLocaleProvider.formatDate = function(date) {
    return moment(date).format('L');
  }
});

// Configure translation
// TODO: Refactor to use /api/translations
app.config(function($translateProvider) {
  // https://angular-translate.github.io/docs/#/guide/12_asynchronous-loading
  $translateProvider.useStaticFilesLoader({
      prefix: '/api/translations/',
      suffix: ''
  });
  $translateProvider.fallbackLanguage('en');
  $translateProvider.preferredLanguage('de');
  $translateProvider.useSanitizeValueStrategy(null); // Needed to translate HTML code, see https://github.com/angular-translate/angular-translate/issues/1131 and https://angular-translate.github.io/docs/#/guide/19_security
  // null ist notwendig, damit sowohl die Blockübersetzung in Mandantenadministrator als auch die Umlaute beim Löschbestätigendialog korrekt angezeigt werden
});

// Provide password matching, see http://odetocode.com/blogs/scott/archive/2014/10/13/confirm-password-validation-in-angularjs.aspx
app.directive('compareTo', function() {
  return {
    require: "ngModel",
    scope: {
      otherModelValue: "=compareTo"
    },
    link: function(scope, element, attributes, ngModel) {
      ngModel.$validators.compareTo = function(modelValue) {
        var valid = modelValue === scope.otherModelValue // Make comparison of undefined and '' possible
          || (typeof(modelValue) === 'undefined' && scope.otherModelValue === '')
          || (modelValue === '' && typeof(scope.otherModelValue) === 'undefined');
        return valid; 
      };
      scope.$watch("otherModelValue", function() {
        ngModel.$validate();
      });
    }
  };
});

// Für Input-Felder, die den Fokus bei Events bekommen sollen, z.B. Suchfeld
// Siehe https://stackoverflow.com/a/14837021
app.directive('focusMe', function($timeout) {
  return {
    scope: { trigger: '=focusMe' },
    link: function(scope, element) {
      scope.$watch('trigger', function(value) {
        if(value === true) { 
          element[0].focus();
          scope.trigger = false;
        }
      });
    }
  };
});

/**
 * Resize-handle für Karten. Wird bei Listen eingesetzt.
 * <md-card>
 *  ...
 *  <resize-handle></resize-handle>
 * </md-card>
 */
app.directive('resizeHandle', function() {
  return function(scope, element, attrs) {
    element.bind('mousedown', function(evt) {
      scope.isResizing = true;
      scope.resizeStartX = evt.pageX;
      scope.resizeStartWidth = this.parentNode.offsetWidth;
    });
    document.body.addEventListener('mousemove', function(evt) {
      if (!scope.isResizing) return;
      var delta = evt.pageX - scope.resizeStartX;
      var flex = '0 0 ' + (scope.resizeStartWidth + delta) + 'px';
      element[0].parentNode.style.flex = flex;
      evt.preventDefault();
      return false;
    });
    document.body.addEventListener('mouseup', function(evt) {
      scope.isResizing = false;
    });
  }
});

app.directUrlMappings = {};
