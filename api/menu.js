/**
 * API for sidebar menu
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var mc = require('../config/module-config.json'); // http://stackoverflow.com/a/14678694
var co = require('../utils/constants');
var configHelper = require('../utils/configHelper');
var Db = require("../utils/db").Db;

/**
 * Extracts the menu structure from the module configuration for further processing
 * {
 *     "menu" : [
 *         {
 *             "title": "MENU_ADMINISTRATION",
 *             "items": [
 *                 { 
 *                      "mainCard": "Administration/UsergrouplistCard", 
 *                      "icon": "domain", 
 *                      "title": "MENU_ADMINISTRATION_USERGROUPS",
 *                      "permission" : "PERMISSION_ADMINISTRATION_USERGROUP"
 *                 }
 *             ]
 *         }
 *     ],
 *     "logourl" : "http://..."
 * }
 */
var extractMenu = (moduleNames) => {
    var moduleConfig = JSON.parse(JSON.stringify(mc));
    var fullMenuObject = {};
    moduleNames.forEach((moduleName) => {
        var appModule = moduleConfig.modules[moduleName];
        if (!appModule || !appModule.menu) return;
        appModule.menu.forEach((menu) => {
            if (!fullMenuObject[menu.title]) {
                fullMenuObject[menu.title] = JSON.parse(JSON.stringify(menu)); // Make copy instead of reference
            } else {
                Array.prototype.push.apply(fullMenuObject[menu.title].items, menu.items);
            }
        });
    });
    var fullMenuArray = Object.keys(fullMenuObject).map((key) => fullMenuObject[key]);
    return fullMenuArray;
};

/**
 * Only the menu structure available for the current user is returned.
 * When the logged in user is an admin, 
 * then the entire menu structure is returned.
 */
router.get('/', auth(), async(req, res) => {
    var clientname = req.user.clientname;
    var clientSettings = await Db.getDynamicObject(Db.PortalDatabaseName, co.collections.clientsettings.name, { clientname: clientname });
    var allModuleKeys = Object.keys(co.modules).map((k) => co.modules[k]);
    var modulenames = clientname === Db.PortalDatabaseName
        ? co.portalmodules.filter((m) => allModuleKeys.indexOf(m) >= 0) // Portal has only some modules allowed
        : (await Db.query(Db.PortalDatabaseName, `SELECT modulename FROM clientmodules WHERE clientname='${clientname}' AND modulename IN (${allModuleKeys.map((k) => `'${k}'`).join(",")});`)).rows.map((r) => r.modulename);
    var fullmenu = extractMenu(modulenames); // Clone it for overwriting
    if (!req.user.isadmin) {
        var permissionKeys = await configHelper.getAvailablePermissionKeysForClient(clientname);
        var permissions = (await Db.query(clientname, `SELECT * FROM permissions WHERE usergroupname = '${req.user.usergroupname}' AND key IN (${permissionKeys.map((k) => `'${k}'`).join(',')});`)).rows;
        for (var i = fullmenu.length - 1; i >= 0; i--) {
            var mainMenu = fullmenu[i];
            for (var j = mainMenu.items.length - 1; j >= 0; j--) {
                if (!permissions.find((p) => p.key === mainMenu.items[j].permission)) mainMenu.items.splice(j, 1);
            }
            if (mainMenu.items.length < 1) {
                fullmenu.splice(i, 1);
            }
        }
    }
    var result = {
        logourl: clientSettings && clientSettings.logourl ? clientSettings.logourl : 'css/logo_avorium_komplett.svg',
        menu: fullmenu,
    }
    res.send(result);
});

module.exports = router;