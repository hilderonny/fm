var moduleConfig = require('../config/module-config.json');
var co = require('../utils/constants');
var Db = require("../utils/db").Db;

var ch = {
    /**
     * Returns a list of all permission keys available to the given client.
     * The keys are collected from the menu and settingset entries in the module-config.json
     * and are filtered by the modules assigned to the given client.
     * Returns a promise with an array of availyble permission keys as parameter
     * @example 
     * var configHelper = require('/utils/configHelper');
     * configHelper.getAvailablePermissionKeysForClient(req.user.clientId, req.db).then(function(permissionKeys) { ... });
     */
    getAvailablePermissionKeysForClient: async(clientname) => {
        var modules = await ch.getAvailableModulesForClient(clientname);
        var permissionKeys = [];
        modules.forEach((mod) => {
            // Handle menu entries
            if (mod.menu) mod.menu.forEach((menu) => {
                menu.items.forEach((item) => {
                    if (item.permission && permissionKeys.indexOf(item.permission) < 0) {
                        permissionKeys.push(item.permission);
                    }
                })
            });
            // Handle settingsets
            if (mod.settingsets) {
                mod.settingsets.forEach((settingset) => {
                    if (settingset.permission && permissionKeys.indexOf(settingset.permission) < 0) {
                        permissionKeys.push(settingset.permission);
                    }
                });
            }
        });
        // Special handle permission for relations, aber nur, wenn für den Mandanten Module freigeschaltet sind
        if (modules.length > 0) permissionKeys.push(co.permissions.CORE_RELATIONS);
        return permissionKeys;
    },

    /**
     * Prüft, ob der gegebene Mandant überhaupt Zugriff auf eine bestimmte Berechtigung hat. Wird in der permissions-API
     * verwendet bevor für eine Benutzergruppe das Vorhandensein einer Berechtigung ermittelt wird.
     * Git ein Promise zurück, welches als Parameter true oder false liefert.
     * @example 
     * var configHelper = require('/utils/configHelper');
     * configHelper.isPermissionAvailableToClient(req.user.clientId, 'PERMISSION_ADMINISTRATION_SETTINGS', req.db).then(function(permissionIsAvailable) { ... });
    */
    isPermissionAvailableToClient: async(clientname, permissionKey) => {
        var clientPermissionKeys = await ch.getAvailablePermissionKeysForClient(clientname);
        return clientPermissionKeys.indexOf(permissionKey) >= 0;
    },

    /**
     * Returns a list of all modules from modules-config which are available to the client of
     * the logged in user. For portal users all modules from the module config are returned.
     * Returns a promise with the filtered module config as parameter.
     * @example 
     * var configHelper = require('/utils/configHelper');
     * configHelper.getAvailableModulesForClient(req.user.clientId, req.db).then(function(modules) { ... });
     */
    getAvailableModulesForClient: async(clientname) => {
        if (clientname === Db.PortalDatabaseName) {
            var modules = [];
            if (moduleConfig.modules.base) modules.push(moduleConfig.modules.base);
            if (moduleConfig.modules.doc) modules.push(moduleConfig.modules.doc);
            if (moduleConfig.modules.clients) modules.push(moduleConfig.modules.clients);
            if (moduleConfig.modules.licenseserver) modules.push(moduleConfig.modules.licenseserver);
            if (moduleConfig.modules.portalbase) modules.push(moduleConfig.modules.portalbase);
            return modules;
        }
        var modulekeys = (await Db.query(Db.PortalDatabaseName, `SELECT modulename FROM clientmodules WHERE clientname = '${clientname}';`)).rows;
        var filteredmodules = modulekeys.map((k) => moduleConfig.modules[k.modulename]);
        return filteredmodules;
    }

}

module.exports = ch;