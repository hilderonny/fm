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
    var usergroupname = Db.replaceQuotes(req.user.usergroupname);
    var clientSettings = await Db.getDynamicObject(Db.PortalDatabaseName, co.collections.clientsettings.name, { clientname: clientname });
    var allModuleKeys = Object.keys(mc.modules);
    var modulenames = clientname === Db.PortalDatabaseName
        ? allModuleKeys.filter(mk => mc.modules[mk].forportal) // Portal has only some modules allowed
        : (await Db.query(Db.PortalDatabaseName, `SELECT modulename FROM clientmodules WHERE clientname='${Db.replaceQuotes(clientname)}' AND modulename IN (${allModuleKeys.map((k) => `'${Db.replaceQuotes(k)}'`).join(",")});`)).rows.map((r) => r.modulename);
    var appsfromdatabase = await Db.getDynamicObjects(clientname, co.collections.apps.name);
    var apps = {};
    appsfromdatabase.forEach(a => apps[a.name] = { app: a, views: [] });
    var viewsfromdatabase = (await Db.query(clientname, `
        SELECT DISTINCT a.name appname, v.*
        FROM apps a
        JOIN relations r ON r.datatype1name='apps' AND r.name1=a.name AND r.datatype2name='views' AND r.relationtypename='parentchild'
        JOIN views v ON r.name2=v.name
        JOIN users u ON 1=1
        LEFT JOIN permissions p ON p.usergroupname=u.usergroupname
        WHERE u.name='${Db.replaceQuotes(req.user.name)}' AND (u.isadmin=true OR p.key=v.permission)
        ;`)).rows;
    viewsfromdatabase.forEach(v => apps[v.appname].views.push(v));
    var result = {
        logourl: clientSettings && clientSettings.logourl ? clientSettings.logourl : 'css/logo_avorium_komplett.svg',
        apps: apps
    };
    res.send(result);
});

module.exports = router;