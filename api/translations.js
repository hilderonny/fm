/**
 * API for getting translations for a specific language for the
 * client of the logged in user. All translations of all modules
 * available to the client of the logged in user are flattened
 * and are returned without doublettes.
 * Returns an object:
 * {
 *  'TRANSLATION_KEY_1': 'TRANSLATED_INTO_LANGUAGE',
 *  'TRANSLATION_KEY_2': 'TRANSLATED_INTO_LANGUAGE'
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var moduleConfig = require('../config/module-config.json');
var path = require('path');
var fs = require('fs');

/**
 * Extract all relevant translations from all modules for a specific client
 */
function extractTranslationsForLanguage(moduleNames, languageKey) {
    var translations = {};
    moduleNames.forEach(function eachModuleName(moduleName) {
        var mod = moduleConfig.modules[moduleName];
        if (mod.languages && mod.languages.indexOf(languageKey) >= 0) {
            var fullPath = path.join(__dirname, '../public/lang', `${moduleName}-${languageKey}.json`);
            // You can expect that the path exists. It was checked on build time. When it is not there you have more serious errors
            fileContent = require(fullPath);
            Object.keys(fileContent).forEach(function eachKeyInFile(keyInFile) {
                if (!translations[keyInFile]) translations[keyInFile] = fileContent[keyInFile];
            });
        };
    });
    return translations;
}

/**
 * Collects all translations for the given language from
 * all modules and sends them as object with
 * language keys as keys back to the requester
 */
router.get('/:languageKey', (req, res) => {
    var languageKey = req.params.languageKey;
    // Check for portal users
    var moduleNames = Object.keys(moduleConfig.modules);
    res.send(extractTranslationsForLanguage(moduleNames, languageKey));
});

module.exports = router;
