var assert = require('assert');
var fs = require('fs');
var th = require("../testhelpers");
var moduleConfig = require('../../config/module-config.json');
var path = require('path');

/**
 * Extract all relevant translations from all modules for a specific client
 */
function extractTranslationsForLanguage(moduleNames, languageKey) {
    var translations = {};
    moduleNames.forEach(function eachModuleName(moduleName) {
        var mod = moduleConfig.modules[moduleName];
        if (mod.languages && mod.languages.indexOf(languageKey) >= 0) {
            var fullPath = path.join(__dirname, '../../public/lang', `${moduleName}-${languageKey}.json`);
            fileContent = require(fullPath);
            Object.keys(fileContent).forEach(function eachKeyInFile(keyInFile) {
                if (!translations[keyInFile]) translations[keyInFile] = fileContent[keyInFile];
            });
        };
    });
    return translations;
}

/**
 * Checks whether the results from the API have multiple entries, which must not be.
 */
function checkApiTranslationForDoublettes(translationsFromApi) {
    var cleanKeys = [];
    var doublettes = [];
    Object.keys(translationsFromApi).forEach(function eachKey(key) {
        if (cleanKeys[key]) {
            if (!doublettes[key]) doublettes.push(key);
        } else {
            cleanKeys.push(key);
        }
        assert.ok(doublettes.length === 0, 'Doublettes found for keys ' + doublettes.join(','));
    });
}

/**
 * Compare translation definitions from API and from local file system
 */
function compareTranslations(translationsFromApi, translationsForClient) {
    var localKeys = Object.keys(translationsForClient);
    var errors = [];
    Object.keys(translationsFromApi).forEach(function eachKeyFromApi(keyFromApi) {
        if (!(keyFromApi in translationsForClient)) {
            errors.push('There is no local translation for key ' + keyFromApi);
            return;
        }
        var translationFromApi = translationsFromApi[keyFromApi];
        var localTranslation = translationsForClient[keyFromApi];
        if (translationFromApi !== localTranslation) {
            errors.push(`API and local translations differ. API: "${translationFromApi}", Local: "${localTranslation}"`);
        }
        delete translationsForClient[keyFromApi];
    });
    var restKeys = Object.keys(translationsForClient);
    if (restKeys.length > 0) errors.push('Local keys missing in API result: ' + restKeys.join(','));
    assert.ok(errors.length === 0, '\n' + errors.join('\n'));
}

describe('API translations', () => {

    before(async() => {
        await th.waitForServer();
    });

    // Collect available languages from module config
    var languageKeys = [];
    Object.keys(moduleConfig.modules).forEach(function eachModule(moduleName) {
        var mod = moduleConfig.modules[moduleName];
        if (mod.languages) mod.languages.forEach(function eachLanguageKey(languageKey) {
            if (languageKeys.indexOf(languageKey) < 0) languageKeys.push(languageKey);
        });
    });

    // Iterate over languages
    languageKeys.forEach(function eachLanguageKey(languageKey) {

        it('has no doublettes for language ' + languageKey, async() => {
            var translationsFromApi = (await th.get(`/api/translations/${languageKey}`).expect(200)).body;
            checkApiTranslationForDoublettes(translationsFromApi);
        });

        it('returns translations available to portal for language ' + languageKey, async() => {
            // Fetch translations from API and compare the contained keys and values
            // to the ones defined in the JSON files.
            var translationsFromApi = (await th.get(`/api/translations/${languageKey}`).expect(200)).body;
            var moduleNames = Object.keys(moduleConfig.modules);
            var translationsForClient = extractTranslationsForLanguage(moduleNames, languageKey);
            compareTranslations(translationsFromApi, translationsForClient);
        });

    });

    it('responds to GET/:languageKey with wrong language key with an empty list', async() => {
        var translationsFromApi = (await th.get(`/api/translations/WRONGKEY`).expect(200)).body;
        assert.strictEqual(Object.keys(translationsFromApi).length, 0, 'There were translations returned.');
    });

});
