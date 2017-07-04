var moduleConfig = require('../config/module-config.json');

/**
 * Returns a list of all permission keys available to the given client.
 * The keys are collected from the menu and settingset entries in the module-config.json
 * and are filtered by the modules assigned to the given client.
 * Returns a promise with an array of availyble permission keys as parameter
 * @example 
 * var configHelper = require('/utils/configHelper');
 * configHelper.getAvailablePermissionKeysForClient(req.user.clientId, req.db).then(function(permissionKeys) { ... });
 */
module.exports.getAvailablePermissionKeysForClient = function(clientId, db) {
    return new Promise((resolve, reject) => {
        module.exports.getAvailableModulesForClient(clientId, db).then(function(modules) {
            var permissionKeys = [];
            Object.keys(modules).forEach(function(moduleKey) {
                var module = modules[moduleKey];
                // Handle menu entries
                if (module.menu) {
                    module.menu.forEach(function(menu) {
                        menu.items.forEach(function(item) {
                            if (item.permission && permissionKeys.indexOf(item.permission) < 0) {
                                permissionKeys.push(item.permission);
                            }
                        })
                    });
                }
                // Handle settingsets
                if (module.settingsets) {
                    module.settingsets.forEach(function(settingset) {
                        if (settingset.permission && permissionKeys.indexOf(settingset.permission) < 0) {
                            permissionKeys.push(settingset.permission);
                        }
                    });
                }
            });
            resolve(permissionKeys);
        });
    });
};

/**
 * Prüft, ob der gegebene Mandant überhaupt Zugriff auf eine bestimmte Berechtigung hat. Wird in der permissions-API
 * verwendet bevor für eine Benutzergruppe das Vorhandensein einer Berechtigung ermittelt wird.
 * Git ein Promise zurück, welches als Parameter true oder false liefert.
 * @example 
 * var configHelper = require('/utils/configHelper');
 * configHelper.isPermissionAvailableToClient(req.user.clientId, 'PERMISSION_ADMINISTRATION_SETTINGS', req.db).then(function(permissionIsAvailable) { ... });
*/
module.exports.isPermissionAvailableToClient = function(clientId, permissionKey, db) {
    return new Promise((resolve, reject) => {
        module.exports.getAvailableModulesForClient(clientId, db).then(function(modules) {
            for (var moduleKey in modules) { // Diese Art dr Schleife ist nötig, um sie vorzeitig abzubrechen. array.forEach kann nicht abgebrochen werden.
                var mod = modules[moduleKey];
                // Handle menu entries
                if (mod.menu) {
                    for (var menuKey in mod.menu) {
                        var menu = mod.menu[menuKey];
                        for (var itemKey in menu.items) {
                            var item = menu.items[itemKey];
                            if (item.permission && item.permission === permissionKey) {
                                resolve(true);
                                return;
                            }
                        }
                    }
                }
                // Handle settingsets
                if (mod.settingsets) {
                    for (var settingsetKey in mod.settingsets) {
                        var settingset = mod.settingsets[settingsetKey];
                        if (settingset.permission && settingset.permission === permissionKey) {
                            resolve(true);
                            return;
                        }
                    }
                }
            }
            resolve(false);
        });
    });
}

/**
 * Returns a list of all modules from modules-config which are available to the client of
 * the logged in user. For portal users all modules from the module config are returned.
 * Returns a promise with the filtered module config as parameter.
 * @example 
 * var configHelper = require('/utils/configHelper');
 * configHelper.getAvailableModulesForClient(req.user.clientId, req.db).then(function(modules) { ... });
 */
module.exports.getAvailableModulesForClient = function(clientId, db) {
    return new Promise((resolve, reject) => {
        if (clientId === null) { // Portal users
            resolve(moduleConfig.modules);
        } else {
            db.get('clientmodules').find({ clientId: clientId }).then((clientmodules) => {
                var clientModuleKeys = clientmodules.map((clientModule) => clientModule.module);
                var filteredModules = {};
                clientModuleKeys.forEach(function(moduleKey) {
                    if (moduleConfig.modules[moduleKey]) { // Only when assigned module still exists in module config
                        filteredModules[moduleKey] = moduleConfig.modules[moduleKey];
                    }
                });
                resolve(filteredModules);
            });
        }
    });
};