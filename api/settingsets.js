var router = require('express').Router();
var auth = require('../middlewares/auth');
var moduleConfig = require('../config/module-config.json'); // http://stackoverflow.com/a/14678694
var Db = require("../utils/db").Db;
var co = require('../utils/constants');
var ch = require('../utils/configHelper');

/**
 * Extracts the setting sets structure from the module configuration for further processing
 * [
 *     {
 *         "type": "SETTINGSET_TYPE_USER",
 *         "items": [
 *             { 
 *                  "mainCard": "Administration/UserSettingSetCard", 
 *                  "icon": "User", 
 *                  "title": "SETTINGSET_USER",
 *                  "permission" : "PERMISSION_SETTINGS_USER"
 *             }
 *         ]
 *     }
 * ]
 */
var extractSettingSets = (isUserAdmin, userClientId, allowedPermissionKeys) => {
    var settingSets = {};
    Object.keys(moduleConfig.modules).forEach((moduleName) => {
        var appModule = moduleConfig.modules[moduleName];
        if (!appModule.settingsets) return;
        appModule.settingsets.forEach((settingSet) => {
            var permission = settingSet.permission.replace("PERMISSION_", "");
            if (!isUserAdmin && allowedPermissionKeys.indexOf(permission) < 0) return; // Filter out setting sets the user has no access to
            // Check whether the user is a client user and tries to access portal level settings and forbid it
            if (userClientId !== Db.PortalDatabaseName && permission === co.permissions.SETTINGS_PORTAL) return;
            if (!settingSets[settingSet.type]) {
                settingSets[settingSet.type] = {
                    type: settingSet.type,
                    items: []
                };
            }
            settingSets[settingSet.type].items.push({
                mainCard: settingSet.mainCard,
                icon: settingSet.icon,
                title: settingSet.title,
                permission: permission
            });
        });
    });
    var settingSetsArray = Object.keys(settingSets).map((key) => settingSets[key]);
    return settingSetsArray;
};

/**
 * Get all setting sets the currently logged in user has access to. When the user has no access
 * to any setting set, the returned list is empty.
 */
router.get('/', auth(false, false, co.modules.base), async(req, res) => {
    var clientname = req.user.clientname;
    var permissionKeysForClient = await ch.getAvailablePermissionKeysForClient(clientname);
    var permissionKeysForUser = (await Db.query(clientname, `SELECT * FROM permissions WHERE usergroupname = '${req.user.usergroupname}' AND key IN (${permissionKeysForClient.map((k) => `'${k}'`).join(',')});`)).rows.map((p) => p.key);
    var settingSets = extractSettingSets(req.user.isadmin, clientname, permissionKeysForUser);
    res.send(settingSets);
});

module.exports = router;
