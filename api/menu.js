/**
 * API for sidebar menu
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var mc = require('../config/module-config.json'); // http://stackoverflow.com/a/14678694
var co = require('../utils/constants');
var configHelper = require('../utils/configHelper');
var Db = require("../utils/db").Db;

function extractAppsFromModules(modulenames) {
    var mccopy = JSON.parse(JSON.stringify(mc));
    var apps = {};
    modulenames.forEach((modulename) => {
        var mcmodule = mccopy.modules[modulename];
        if (!mcmodule || !mcmodule.apps) return;
        Object.keys(mcmodule.apps).forEach((apptitle) => {
            var app = mcmodule.apps[apptitle];
            if (!apps[apptitle]) {
                apps[apptitle] = JSON.parse(JSON.stringify(app)); // Make copy instead of reference
            } else {
                Array.prototype.push.apply(apps[apptitle], app); // Push multiple items with prototype.push
            }
        });
    });
    return apps;
}

/**
 * Only the menu structure available for the current user is returned.
 * When the logged in user is an admin, 
 * then the entire menu structure is returned.
 * {
 *  logourl: "avorium.png",
 *  menu: [
 *      { 
 *          title: "sectiontitle",
 *          items: [
 *              { mainCard, icon, title, permission, docCard, directurls: [] }
 *          ]
 *      }
 *  ],
 *  apps: {
 *      "Translation key for app title": [
 *          { mainCard, index, icon, title, permission, docCard, directurls: [] }
 *      ]
 *  }
 * }
 */
router.get('/', auth(), async(req, res) => {
    var clientname = req.user.clientname;
    var clientSettings = await Db.getDynamicObject(Db.PortalDatabaseName, co.collections.clientsettings.name, { clientname: clientname });
    var allModuleKeys = Object.keys(mc.modules);
    var modulenames = clientname === Db.PortalDatabaseName
        ? allModuleKeys.filter(mk => mc.modules[mk].forportal) // Portal has only some modules allowed
        : (await Db.query(Db.PortalDatabaseName, `SELECT modulename FROM clientmodules WHERE clientname='${Db.replaceQuotes(clientname)}' AND modulename IN (${allModuleKeys.map((k) => `'${Db.replaceQuotes(k)}'`).join(",")});`)).rows.map((r) => r.modulename);
    var apps = extractAppsFromModules(modulenames);
    if (!req.user.isadmin) {
        var permissionKeys = await configHelper.getAvailablePermissionKeysForClient(clientname);
        var permissions = permissionKeys.length > 0 ? (await Db.query(clientname, `SELECT * FROM permissions WHERE usergroupname = '${Db.replaceQuotes(req.user.usergroupname)}' AND key IN (${permissionKeys.map((k) => `'${Db.replaceQuotes(k)}'`).join(',')});`)).rows : [];
        var apptitles = Object.keys(apps);
        apptitles.forEach((apptitle) => {
            var appmenus = apps[apptitle].filter(m => !!permissions.find(p => p.key === m.permission));
            if (appmenus.length > 0) {
                apps[apptitle] = appmenus;
            } else {
                delete apps[apptitle];
            }
        });
    }
    var result = {
        logourl: clientSettings && clientSettings.logourl ? clientSettings.logourl : 'css/logo_avorium_komplett.svg',
        // menu: fullmenu,
        apps: apps
    };
    res.send(result);
});

module.exports = router;