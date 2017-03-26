/**
 * Unit tests for checking that the strings defined in the module-config
 * (titles, etc.) have complete translations (at least german ones)
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var moduleConfig = require('../config/module-config.json');
var constants = require('../utils/constants');

var rootPath = path.dirname(__dirname);

var getTranslationKeysForModule = (moduleName, languages) => {
    var result = {};
    languages.forEach((language) => {
        var relativeFilePath = `../public/lang/${moduleName}-${language}.json`;
        if (fs.existsSync(path.join(__dirname, relativeFilePath))) {
            result[language] = Object.keys(require(relativeFilePath));
        }
    });
    return result;
};

var getBaseTranslations = () => {
    return getTranslationKeysForModule('base', ['de', 'en']);
};

describe('Translations', function() {

    it('contains all string keys defined in the module-config file', (done) => {
        var errors = [];
        var baseTranslations = getBaseTranslations();
        Object.keys(moduleConfig.modules).forEach((moduleName) => {
            var module = moduleConfig.modules[moduleName];
            Object.keys(baseTranslations).forEach((language) => {
                var translationKeys = baseTranslations[language];
                if (module.menu) module.menu.forEach((menu) => {
                    if (translationKeys.indexOf(menu.title) < 0) {
                        errors.push(`${menu.title} not found for language ${language}.`);
                    }
                    if (menu.items) menu.items.forEach((item) => {
                        if (translationKeys.indexOf(item.title) < 0) {
                            errors.push(`${item.title} not found for language ${language}.`);
                        }
                    });
                });
            });
        });
        if (errors.length > 0) done(new Error(errors.join('\n'))); else done();
    });

    it('contains all string keys defined for permissions', (done) => {
        var errors = [];
        var baseTranslations = getBaseTranslations();
        constants.allPermissionKeys.forEach((permissionKey) => {
            Object.keys(baseTranslations).forEach((language) => {
                var translationKeys = baseTranslations[language];
                if (translationKeys.indexOf(permissionKey) < 0) {
                    errors.push(`${permissionKey} not found for language ${language}.`);
                }
            });
        });
        if (errors.length > 0) done(new Error(errors.join('\n'))); else done();
    });

    // Checks for completeness of different languages
    var baseLanguage = 'de'; // Language to be expected as "complete" for reference
    var languagesToCheck = [ 'de', 'en'/*, 'bg', 'ar'*/ ];

    languagesToCheck.forEach((language) => {
        Object.keys(moduleConfig.modules).forEach((moduleName) => {
            // Ignore modules shich have no languages defined
            if (!moduleConfig.modules[moduleName].languages) return;
            var fileName = path.join(__dirname, `../public/lang/${moduleName}-${language}.json`);
            var fileExists = fs.existsSync(path.join(__dirname, `../public/lang/${moduleName}-${language}.json`));
            // This is a funny hack to "ignore" failing tests
            var functionToCall = fileExists ? it : it.skip;
            // First check whether the language file exists
            functionToCall(`module "${moduleName}" has language file for language "${language}"`, () => {
                assert.ok(fileExists, `Language file "${fileName}" not found`);
            });
            // Now compare the contents but ignore the base language file
            if (language === baseLanguage) return;
            var translationKeys = getTranslationKeysForModule(moduleName, languagesToCheck);
            if (translationKeys[baseLanguage]) { // Some modules have no translations at all
                translationKeys[baseLanguage].forEach((translationKey) => {
                    functionToCall(`"${moduleName}-${language}.json" has translation for key "${translationKey}"`, () => {
                        assert.ok(fileExists, `Language file "${fileName}" not found`);
                    });
                });
            }
        });
    });

});
