/**
 * API for sidebar menu
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var moduleConfig = require('../config/module-config.json'); // http://stackoverflow.com/a/14678694

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
 *     ]
 * }
 */
var extractMenu = (moduleNames) => {
    var fullMenuObject = {};
    if (!moduleNames) { // When no module filters are given
        moduleNames = Object.keys(moduleConfig.modules);
    }
    moduleNames.forEach((moduleName) => {
        var appModule = moduleConfig.modules[moduleName];
        if (!appModule.menu) return;
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
router.get('/', auth(), (req, res) => {
    // Check module availability for the client of the user 
    req.db.get('clientmodules').find({ clientId: req.user.clientId }).then((clientmodules) => {
        var clientModuleNames = clientmodules.map((clientModule) => clientModule.module);
        // Portal users have all modules available, all others must be filtered
        var clientMenu = extractMenu(req.user.clientId ? clientModuleNames : false);
        if (req.user.isAdmin) { // Admins will get all menu items available to their clients
            return res.send(clientMenu);
        }
        // Check permissions of current user
        req.db.get('permissions').find({ userGroupId: req.user.userGroupId }).then((permissions) => {
            var userMenu = JSON.parse(JSON.stringify(clientMenu)); // Clone config, otherwise it would be overwritten
            for (var i = userMenu.length - 1; i >= 0; i--) {
                var mainMenu = userMenu[i];
                for (var j = mainMenu.items.length - 1; j >= 0; j--) {
                    var item = mainMenu.items[j];
                    var hasPermission = false;
                    for (var k = 0; k < permissions.length; k++) {
                        var permission = permissions[k];
                        if ((permission.canRead || permission.canWrite) && permission.key === item.permission) {
                            hasPermission = true;
                            break;
                        }
                    }
                    if (!hasPermission) {
                        mainMenu.items.splice(j, 1);
                    }
                }
                if (mainMenu.items.length < 1) {
                    userMenu.splice(i, 1);
                }
            }
            res.send(userMenu);
        });
    });
});

module.exports = router;