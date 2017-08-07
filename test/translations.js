/**
 * Unit tests for checking that the strings defined in the module-config
 * (titles, etc.) have complete translations (at least german ones)
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var moduleConfig = require('../config/module-config.json');
var co = require('../utils/constants');

var rootPath = path.dirname(__dirname);

/**
 * Helper function to ignore tests which fail
 */
function skipIfFailed(title, testFunction) {
    try {
        testFunction();
        it(title, function() { return; });
    } catch (error) {
        it.skip(title, function() { return; });
    }
}

/**
 * Analyzes all translation files and remembers where the translations
 * can be found. Returns a collection of translation keys and their
 * definitions in several modules.
 * Used as hints for missing translations below.
 */
function collectTranslationDefinitions() {
    var translationKeysFoundInModules = { moduleLanguageKey: {}, languageKeyModule: {}};
    Object.keys(moduleConfig.modules).forEach(function eachModule(moduleName) {
        var mod = moduleConfig.modules[moduleName];
        var moduleCollection = {};
        translationKeysFoundInModules.moduleLanguageKey[moduleName] = moduleCollection;
        if (mod.languages) mod.languages.forEach(function eachLanguage(language) {
            var moduleLanguageCollection = [];
            moduleCollection[language] = moduleLanguageCollection;
            var languageCollection = translationKeysFoundInModules.languageKeyModule[language];
            if (!languageCollection) {
                languageCollection = {};
                translationKeysFoundInModules.languageKeyModule[language] = languageCollection;
            }
            var fullPath = getTranslationFilePath(moduleName, language);
            if (fs.existsSync(fullPath)) {
                var translations = require(fullPath);
                Object.keys(translations).forEach(function eachTranslationKey(translationKey) {
                    var languageKeyCollection = languageCollection[translationKey];
                    if (!languageKeyCollection) {
                        languageKeyCollection = [];
                        languageCollection[translationKey] = languageKeyCollection;
                    }
                    var translation = translations[translationKey];
                    if (translation) {
                        moduleLanguageCollection.push(translationKey);
                        languageKeyCollection.push(moduleName);
                    }
                });
            }
        });
    });
    return translationKeysFoundInModules;
}

/**
 * Adds the new translation key to the given list, when it is not
 * already contained.
 */
function addTranslationKeyIfNotExists(translationKeys, newKey) {
    if (translationKeys.indexOf(newKey) < 0) {
        translationKeys.push(newKey);
    }
}

/**
 * Searches for all translation keys starting with TRK_ in the given
 * file and pushes them into the given key array
 */
function extractTranslationKeysFromFile(filePath, translationKeys) {
    if (!fs.existsSync(filePath)) return [];
    var fileContent = fs.readFileSync(filePath, 'utf8');
    var matches = fileContent.match(/\bTRK_\w*?\b/g);
    if (matches) matches.forEach(function eachMatch(match) {
        addTranslationKeyIfNotExists(translationKeys, match);
    });
}

/**
 * Hier werden für die Automatik schwer auffindbare Übersetzungsschlüssel
 * angegeben, die dennoch vorhanden sein müssen. Das sind solche, deren Namen
 * dynamisch an der Oberfläche generiert werden. Davon sind vor allem die Schlüssel
 * bei den dynamischen Verknüpfungen betroffen.
 */
// TODO: Änderungen in Doku aufnehmen
function getHardToFindTranslationKeysForModule(moduleName) {
    switch(moduleName) {
        case 'activities': return [ 'TRK_ACTIVITIES_ACTIVITY', 'TRK_ACTIVITIES_SELECT_ACTIVITY' ];
        case 'base': return [ 'TRK_USERGROUPS_USERGROUP', 'TRK_USERS_USER', 'TRK_USERGROUPS_SELECT_USERGROUP', 'TRK_USERS_SELECT_USER' ];
        case 'clients' : return [ 'TRK_CLIENTS_CLIENT', 'TRK_CLIENTS_SELECT_CLIENT' ];
        case 'documents' : return [ 'TRK_DOCUMENTS_DOCUMENT', 'TRK_DOCUMENTS_DOCUMENTS', 'TRK_DOCUMENTS_SELECT_FOLDER_OR_DOCUMENT', 'TRK_FOLDERS_FOLDER', 'TRK_FOLDERS_FOLDERS' ];
        case 'fmobjects' : return [ 'TRK_FMOBJECTS_FM_OBJECT', 'TRK_FMOBJECTS_FM_OBJECTS', 'TRK_FMOBJECTS_SELECT_FM_OBJECT' ];
        case 'licenseserver' : return [ 'TRK_PORTALS_PORTAL', 'TRK_PORTALS_SELECT_PORTAL' ];
        default: return [];
    }
}

/**
 * Searches for translation keys (strings startinng with 'TRK_') in all files
 * referenced in the given module and return them as array.
 */
function findTranslationKeysForModule(moduleName) {
    var mod = moduleConfig.modules[moduleName];
    var translationKeys = [];
    // Find static keys in all files in public folder and its subfolders
    if (mod.public) mod.public.forEach(function eachPublicFile(publicFile) {
        // Ignore CSS files
        if (publicFile.indexOf('/') < 0 || publicFile.indexOf('partial/') === 0) {
            var fullPath = path.join(__dirname, '../public', publicFile);
            extractTranslationKeysFromFile(fullPath, translationKeys);
        }
    });
    if (mod.include) mod.include.forEach(function eachIncludeFile(includeFile) {
        // Ignore node_modules
        if (includeFile.indexOf('/node_modules') < 0) {
            var fullPath = path.join(__dirname, '..', includeFile);
            extractTranslationKeysFromFile(fullPath, translationKeys);
        }
    });
    // Collect dynamic translation keys (module titles, menu titles, etc.)
    addTranslationKeyIfNotExists(translationKeys, `TRK_MODULE_${moduleName}_NAME`);
    if (mod.title) addTranslationKeyIfNotExists(translationKeys, mod.title);
    if (mod.menu) mod.menu.forEach(function eachMenu(menu) {
        if (menu.title) addTranslationKeyIfNotExists(translationKeys, menu.title);
        if (menu.items) {
            menu.items.forEach(function eachMenuItem(item) {
                if (item.title) addTranslationKeyIfNotExists(translationKeys, item.title);
            });
        }
    });
    if (mod.permissions) mod.permissions.forEach(function (permission) {
        addTranslationKeyIfNotExists(translationKeys, `TRK_${permission}`);
    });
    if (mod.settingsets) mod.settingsets.forEach(function eachSettingSet(settingSet) {
        if (settingSet.title) addTranslationKeyIfNotExists(translationKeys, settingSet.title);
    });

    return translationKeys;
}

/**
 * Returns the name for a translation file
 */
function getTranslationFileName(moduleName, language) {
    return `${moduleName}-${language}.json`;
}

/**
 * Returns the absolute path for a translation file
 */
function getTranslationFilePath(moduleName, language) {
    var fileName = getTranslationFileName(moduleName, language);
    return path.join(__dirname, '../public/lang', fileName);
}

/**
 * Collects all translation keys for permission defined in the module-config
 * in menus or settingsets and stores them in the given array.
 */
function collectPermissionTranslationKeys(translationKeys) {
    Object.keys(moduleConfig.modules).forEach(function eachModule(moduleName) {
        var mod = moduleConfig.modules[moduleName];
        if (mod.menu) mod.menu.forEach(function eachMenu(menu) {
            if (menu.items) {
                menu.items.forEach(function eachMenuItem(item) {
                    if (item.permission) addTranslationKeyIfNotExists(translationKeys, 'TRK_' + item.permission);
                });
            }
        });
        if (mod.settingsets) mod.settingsets.forEach(function eachSettingSet(settingSet) {
            if (settingSet.permission) addTranslationKeyIfNotExists(translationKeys, 'TRK_' + settingSet.permission);
        });
    });
}

function findPermissionKeyInModuleConfig(permissionKey, errors, fileName) {
    var found = false;
    Object.keys(moduleConfig.modules).forEach(function eachModule(moduleName) {
        if (found) return; // Break when found in another module
        var mod = moduleConfig.modules[moduleName];
        if (mod.menu) mod.menu.forEach(function eachMenu(menu) {
            if (menu.items) {
                menu.items.forEach(function eachMenuItem(item) {
                    if (item.permission === permissionKey) {
                        found = true;
                        return;
                    }
                });
            }
        });
        if (mod.permissions && mod.permissions.indexOf(permissionKey) >= 0) {
            found = true;
        }
        if (mod.settingsets) mod.settingsets.forEach(function eachSettingSet(settingSet) {
            if (settingSet.permission === permissionKey) {
                found = true;
                return;
            }
        });
    });
    if (!found) errors.push(`Translation key TRK_${permissionKey} for permission defined in ${fileName} is not used in module-config`);
}

describe.only('Translations', function describeTranslations() {
    var itFunction = it;//process.env.IGNORE_FAILED_TRANSLATION_TESTS === 'true' ? skipIfFailed : it;
    var translationDefinitions = collectTranslationDefinitions();
    // Iterate over modules
    Object.keys(moduleConfig.modules).forEach(function eachModule(moduleName) {

        describe(moduleName, function describeModule() {
            var mod = moduleConfig.modules[moduleName];
            // Find translation keys for the module
            var translationKeys = findTranslationKeysForModule(moduleName)
                .concat(getHardToFindTranslationKeysForModule(moduleName));
            // Handle constants and lists from base module in a special way (module names, permissions, etc.)
            if (moduleName === 'base') {
                collectPermissionTranslationKeys(translationKeys);
            }
            // Iterate over languages defined in the module
            if (mod.languages) mod.languages.forEach(function eachLanguage(language) {

                itFunction(`${language} complete`, function checkLanguage(done) {

                    var errors = [];

                    // Check whether the translation file exists
                    var fileName = getTranslationFileName(moduleName, language);
                    var fullPath = getTranslationFilePath(moduleName, language);
                    if (!fs.existsSync(fullPath)) errors.push('Translation file not found in ' + fullPath);

                    // Iterate over translation keys
                    var keyCollection = translationDefinitions.moduleLanguageKey[moduleName][language];
                    translationKeys.forEach(function eachTranslationKey(translationKey) {

                        // Constructed translations result in finding "TRK_" or "TRK_MODULE_".
                        // They normally  represent type lists and are ignored hiere
                        if (['TRK_', 'TRK_MODULE_'].indexOf(translationKey) >= 0) return;
                        
                        var keyExists = keyCollection.indexOf(translationKey) >= 0;
                        var message = `Translation key ${translationKey} is not defined in file ${fileName}`;
                        var alternativeModules = translationDefinitions.languageKeyModule[language][translationKey];
                        if (alternativeModules && alternativeModules.length > 0) message += ' but it exists in module(s) ' + alternativeModules.join(', ');
                        if(!keyExists) errors.push(message);
                        
                    });
                    // Find translations in the file which are used nowhere in the module
                    Object.keys(require(fullPath)).forEach(function eachKeyInFile(translationKeyInFile) {

                        // Translation keys which represent type list elements are constructed
                        // and cannot be searched, so ignore them. They are identified by containing
                        // a _TYPE_.
                        /*
                        TODO: Hier brauchen wir ein spezielles Konstrukt für Typlisten,
                        da diese in Modulen selbst definiert werden, aber die Übersetzungen
                        zentral überprüfbar sein müssen
                        */
                        if (translationKeyInFile.indexOf('_TYPE_') > 0) return;
                        // Special handle permission keys
                        if (translationKeyInFile.indexOf('TRK_PERMISSION_') === 0) {
                            findPermissionKeyInModuleConfig(translationKeyInFile.substr(4), errors, fileName);
                            return;
                        }
                        var keyIsUsed = translationKeys.indexOf(translationKeyInFile) >= 0;
                        if (!keyIsUsed) errors.push(`Translation key ${translationKeyInFile} defined in ${fileName} is not used anywhere`);
                    });

                    if (errors.length > 0) {
                        done(new Error('\n' + errors.join('\n')));
                    } else {
                        done();
                    }
                });

            });
        });

    });

});
