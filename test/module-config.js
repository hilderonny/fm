/**
 * Unit tests for checking the completeness of the module-config file
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var moduleConfig = require('../config/module-config.json');
var co = require('../utils/constants');

var rootPath = path.dirname(__dirname);

/**
 * Analyzes the module-config file and collects all referenced files.
 * Returns an array of file paths relative to the rootPath.
 */
var collectModuleConfigReferencedFiles = () => {
    var files = [];
    files.insert = (f) => {
        if (files.indexOf(f) < 0) files.push(f);
    };
    Object.keys(moduleConfig.modules).forEach((moduleName) => {
        var module = moduleConfig.modules[moduleName];
        // API
        if (module.api) module.api.forEach((api) => {
            files.insert(`api/${api}.js`);
        });
        // Configuration files
        if (module.config) module.config.forEach((config) => {
            files.insert(`config/${config}.json`);
        });
        // Middlewares
        if (module.middlewares) module.middlewares.forEach((middleware) => {
            files.insert(`middlewares/${middleware}.js`);
        });
        // Public files for client delivery
        if (module.public) module.public.forEach((publicFile) => {
            files.insert(`public/${publicFile}`);
        });
        // Files in root folder
        if (module.root) module.root.forEach((rootFile) => {
            files.insert(rootFile);
        });
        // Client side javascript files to include
        if (module.include) module.include.forEach((includeFile) => {
            files.insert(includeFile);
        });
        // Language files
        if (module.languages) module.languages.forEach((language) => {
            files.insert(`public/lang/${moduleName}-${language}.json`);
        });
        // Menu target cards and icons
        if (module.menu) module.menu.forEach((menu) => {
            if (menu.mainCard) files.insert(`public/partial/${menu.mainCard}.html`);
            if (menu.icon) {
                files.insert(`public/css/icons/material/${menu.icon}.svg`);
                files.insert(`public/css/icons/office/${menu.icon}.svg`);
            }
            if (menu.items) menu.items.forEach((item) => {
                if (item.mainCard) files.insert(`public/partial/${item.mainCard}.html`);
                if (item.icon) {
                    files.insert(`public/css/icons/material/${item.icon}.svg`);
                    files.insert(`public/css/icons/office/${item.icon}.svg`);
                }
                if (item.docCard) files.insert(`public/partial/Doc/${item.docCard}.html`);
            });
        });
        if (module.doc) module.doc.forEach((doc) => {
            if (doc.docCard) files.insert(`public/partial/Doc/${doc.docCard}.html`);
            if (doc.icon) {
                files.insert(`public/css/icons/material/${doc.icon}.svg`);
            }
        });
        // Setting target cards and icons
        if (module.settingsets) module.settingsets.forEach((settingSet) => {
            if (settingSet.mainCard) files.insert(`public/partial/${settingSet.mainCard}.html`);
            if (settingSet.icon) {
                files.insert(`public/css/icons/material/${settingSet.icon}.svg`);
                files.insert(`public/css/icons/office/${settingSet.icon}.svg`);
            }
        });
        // Utils
        if (module.utils) module.utils.forEach((utilFile) => {
            files.insert(`utils/${utilFile}.js`);
        });
    });
    return files;
};

describe('module-config.json', function() {

    it('all references target existing files (files referenced but missing?)', (done) => {
        // Alle Referenzen prüfen, ob dafür auch die Dateien existieren
        var errors = [];
        collectModuleConfigReferencedFiles().forEach((filePath) => {
            if (!fs.existsSync(path.join(rootPath, filePath))) errors.push(`File "${filePath}" does not exist.`);
        });
        if (errors.length > 0) {
            done(new Error(errors.join('\n')));
        } else {
            done();
        }
    });

    var handleDirectoriesRecursively = (directory, errors, referencedFiles, pathsToIgnore) => {
        fs.readdirSync(path.join(rootPath, directory)).forEach((file) => {
            var filePath = `${directory}/${file}`;
            if (filePath[0] === '/') filePath = filePath.substring(1);
            var isDir = fs.lstatSync(path.join(rootPath, filePath)).isDirectory();
            if (!isDir && pathsToIgnore.indexOf(filePath) >= 0) return;
            if (isDir && pathsToIgnore.indexOf(`${filePath}/`) >= 0) return;
            if (isDir) {
                handleDirectoriesRecursively(filePath, errors, referencedFiles, pathsToIgnore);
            } else {
                if (referencedFiles.indexOf(filePath) < 0) {
                    errors.push(`File "${filePath}" is not referenced in module-config.`);
                }
            }
        });
    };

    it('contains references to all files of the project in any way (too much files?)', (done) => {
        // Alle Unterverzeichnisse und Dateien durchsuchen und prüfen, ob die in irgendeiner Weise in der module-config verwiesen sind
        // Liste von übrig gebliebenen Dateien ausgeben
        var errors = [];
        var referencedFiles = collectModuleConfigReferencedFiles();
        var pathsToIgnore = [
            '.git/',
            '.gitignore',
            '.nyc_output/',
            '.vscode/',
            'basetest.bat',
            'config/README.md',
            'config/localconfig.json',
            'config/module-config.json', // Is handles especially by re-creating it, so no need to reference it in itself
            'cover.bat',
            'coverage/',
            'debug.log',
            'documents/',
            'drafts/',
            'log/',
            'node_modules/',
            'priv.key',
            'pub.cert',
            'public/css/local.css',
            'public/index.html',
            'public/js/include.js',
            'public/js/include.js.map',
            'temp/',
            'test/',
            'test.bat',
            'uploads/',
            'utils/README.md',
            'utils/webHelper.js'
        ];
        handleDirectoriesRecursively('', errors, referencedFiles, pathsToIgnore);
        if (errors.length > 0) {
            done(new Error(errors.join('\n')));
        } else {
            done();
        }
    });

    it('APIs match with those in constants', function() {
        var apisFromConfig = [], errors = [];
        Object.keys(moduleConfig.modules).map((k) => moduleConfig.modules[k].api).forEach((modApis) => {
            if (modApis) modApis.forEach(function(api) {
                if (apisFromConfig.indexOf(api) < 0) apisFromConfig.push(api);
            });
        });
        // Alle in der config definierten APIs müssen als Konstanten vorhanden sein
        apisFromConfig.forEach(function(api) {
            if (!co.apis[api]) errors.push(`API ${api} is not defined in constants`);
        });
        // Alle als Konstanten definierten APIs müssen irgendwo in config enthalten sein
        Object.keys(co.apis).forEach(function(key) {
            var api = co.apis[key];
            if (apisFromConfig.indexOf(api) < 0) errors.push(`API ${api} is not defined in module-config`);
        });
        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
        return Promise.resolve();
    });

    it('modules match with those in constants', function() {
        var errors = [];
        var modulesFromConfig = Object.keys(moduleConfig.modules);
        // Alle in der config definierten Module müssen als Konstanten vorhanden sein
        modulesFromConfig.forEach(function(mod) {
            if (!co.modules[mod]) errors.push(`Module ${mod} is not defined in constants`);
        });
        // Alle als Konstanten definierten Module müssen irgendwo in config enthalten sein
        Object.keys(co.modules).forEach(function(key) {
            var mod = co.modules[key];
            if (modulesFromConfig.indexOf(mod) < 0) errors.push(`Module ${mod} is not defined in module-config`);
        });
        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
        return Promise.resolve();
    });

    it('contains all material icons for collections defined in constants', function() {
        var errors = [];
        Object.keys(co.collections).forEach((key) => {
            var collection = co.collections[key];
            if (!collection.canHaveAttributes) return; // Nur relevant bei dynamischen Attributen
            var filePath = `public/css/icons/material/${collection.icon}.svg`;
            if (!fs.existsSync(path.join(rootPath, filePath))) errors.push(`File "${filePath}" does not exist.`);
        });
        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
        return Promise.resolve();
    });

    it('permissions match with those in constants', function() {
        var permissionsFromConfig = [], errors = [];
        // Aus den Menüs holen
        Object.keys(moduleConfig.modules).map((k) => moduleConfig.modules[k].menu).forEach((modMenus) => {
            if (modMenus) modMenus.forEach(function(menu) {
                menu.items.forEach(function(item) {
                    if (item.permission && permissionsFromConfig.indexOf(item.permission) < 0) permissionsFromConfig.push(item.permission);
                });
            });
        });
        // Aus den SettingSets holen
        Object.keys(moduleConfig.modules).map((k) => moduleConfig.modules[k].settingsets).forEach((modSettingSets) => {
            if (modSettingSets) modSettingSets.forEach(function(modSettingSet) {
                if (modSettingSet.permission && permissionsFromConfig.indexOf(modSettingSet.permission) < 0) permissionsFromConfig.push(modSettingSet.permission);
            });
        });
        // Explizit defnierte Berechtigungen holen
        Object.keys(moduleConfig.modules).map((k) => moduleConfig.modules[k].permissions).forEach((permissions) => {
            if (permissions) permissions.forEach(function(permission) {
                if (permissionsFromConfig.indexOf(permission) < 0) permissionsFromConfig.push(permission);
            });
        });
        // Alle in der config definierten Zugriffsrechte müssen als Konstanten vorhanden sein
        permissionsFromConfig.forEach(function(permission) {
            var permissionName = permission.substring(11);
            if (!co.permissions[permissionName]) errors.push(`Permission ${permission} is not defined in constants`);
        });
        // Alle als Konstanten definierten Zugriffsrechte müssen irgendwo in config enthalten sein
        Object.keys(co.permissions).forEach(function(key) {
            var permission = co.permissions[key];
            if (permissionsFromConfig.indexOf(permission) < 0) errors.push(`Permission ${permission} is not defined in module-config`);
        });
        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
        return Promise.resolve();
    });

    /**
     * Sucht in der gegebenen HTML-Datei alle Verweise auf Bilder und prüft, ob diese
     * (wenn sie lokal verwiesen sind) auch im public-Part des Moduls verwiesen sind.
     */
    function checkDocumentationImageLinks(modName, pub, fileName, errors) {
        var fullPath = path.join(__dirname, '../public', fileName);
        if (!fs.existsSync(fullPath)) {
            errors.push(`File "${fullPath}" referenced as doc in module-config does not exist`);
            return;
        }
        var fileContent = fs.readFileSync(fullPath, 'utf8');
        var matches = fileContent.match(/<img([\w\W]+?)[\/]?>/g);
        if (matches) matches.forEach(function eachMatch(match) {
            // Leerzeichen entfernen
            var stringToCheck = match.replace(/ /g, '').replace(/'/g,'"'); // Alle Anführungszeichen in doppelte umwandeln
            var url = stringToCheck.substr(stringToCheck.indexOf('src="') + 5);
            url = url.substr(0, url.indexOf('"'));
            if (url.indexOf('http:') === 0 || url.indexOf('https:') === 0 || url.indexOf('data:') === 0) return; // Referenzen und Inline-Bilder ignorieren
            if (url.indexOf('/') === 0) url = url.substr(1);
            // Gucken, ob Datei in public-Part enthalten ist
            if (pub.indexOf(url) < 0) errors.push(`Image "${url}" not referenced in public part of module "${modName}".`);
            // Datei finden
            var imagePath = path.join(__dirname, '../public', url);
            if (!fs.existsSync(imagePath)) {
                errors.push(`Image "${imagePath}" referenced in documentation file ${fullPath} does not exist`);
            }
        });
    }

    it('contains all documentation files defined for modules in correspondig public part', function() {
        var errors = [];
        Object.keys(moduleConfig.modules).forEach((k) => {
            var mod = moduleConfig.modules[k];
            // Doku-Links aus Menü holen
            if (mod.menu) mod.menu.forEach(function(menu) {
                menu.items.forEach(function(item) {
                    if (item.docCard) {
                        var fileName = `partial/Doc/${item.docCard}.html`;
                        if (mod.public.indexOf(fileName) < 0) errors.push(`File "${fileName}" not referenced in public part of module "${k}".`);
                        checkDocumentationImageLinks(k, mod.public, fileName, errors);
                    }
                });
            });
            // Versteckte Doku-Links extrahieren
            if (mod.doc) mod.doc.forEach((doc) => {
                if (!doc.docCard) errors.push(`Fehlendes "docCard" Attribut im "doc"-Abschnitt des Moduls "${k}".`);
                var docFileName = `partial/Doc/${doc.docCard}.html`;
                if (mod.public.indexOf(docFileName) < 0) errors.push(`File "${docFileName}" not referenced in public part of module "${k}".`);
                if (!doc.icon) errors.push(`Fehlendes "icon" Attribut im "doc"-Abschnitt des Moduls "${k}".`);
                var iconFileName = `css/icons/material/${doc.icon}.svg`;
                if (mod.public.indexOf(iconFileName) < 0) errors.push(`Icon "${iconFileName}" not referenced in public part of module "${k}".`);
                checkDocumentationImageLinks(k, mod.public, docFileName, errors);
            });
        });
        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
        return Promise.resolve();
    });

});
