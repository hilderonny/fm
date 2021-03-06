/**
 * CRUD API for userGroup permission management
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var co = require('../utils/constants');
var configHelper = require('../utils/configHelper');
var Db = require("../utils/db").Db;
var ph = require("../utils/permissionshelper");

/**
 * Alle Berechtigungsschlüssel des Mandanten zurück geben.
 * Wird für Definition von Recordtypes verwendet.
 */
router.get("/forclient", auth(), async(req, res) => {
    var clientname = req.user.clientname;
    var permissionkeys = await configHelper.getAvailablePermissionKeysForClient(clientname);
    res.send(permissionkeys);
});

/**
 * Liefert alle Berechtigungen für den angemeldeten Benutzer. Wird für Verweise verwendet, um
 * Verweismenü zu filtern.
 */
router.get('/forLoggedInUser', auth(), async(req, res) => {
    var permissions = await ph.getpermissionsforuser(req.user);
    res.send(permissions);
});

router.get('/forUserGroup/:id', auth(co.permissions.ADMINISTRATION_USERGROUP, 'r', co.modules.base), async(req, res) => {
    var clientname = req.user.clientname;
    var usergroupname = req.params.id;
    var permissionKeysForClient = await configHelper.getAvailablePermissionKeysForClient(clientname);
    var permissionsForUserGroup = (await Db.query(clientname, `SELECT * FROM permissions WHERE usergroupname = '${Db.replaceQuotes(usergroupname)}' AND key IN (${permissionKeysForClient.map((k) => `'${Db.replaceQuotes(k)}'`).join(',')});`)).rows;
    var mappedPermissions = permissionKeysForClient.map((pk) => {
        var usergrouppermission = permissionsForUserGroup.find((p) => p.key === pk);
        return {
            key: pk,
            canread: !!usergrouppermission,
            canwrite: usergrouppermission ? usergrouppermission.canwrite : false,
            usergroupname: usergroupname
        }
    });
    res.send(mappedPermissions);
});

// Create, delete or change a permission
router.post('/', auth(co.permissions.ADMINISTRATION_USERGROUP, 'w', co.modules.base), async(req, res) => {
    var clientname = req.user.clientname;
    var permission = req.body;
    if (!permission || Object.keys(permission).length < 1 || !permission.usergroupname || !permission.key || (!!!permission.canread && !!permission.canwrite)) return res.sendStatus(400);
    var permissionKeyForUser = await configHelper.getAvailablePermissionKeysForClient(clientname);
    if (permissionKeyForUser.indexOf(permission.key) < 0) return res.sendStatus(400);
    if (!(await Db.getDynamicObject(clientname, co.collections.usergroups.name, permission.usergroupname))) return res.sendStatus(400);
    var usergroupname = Db.replaceQuotes(permission.usergroupname);
    if (!!!permission.canread) {
        await Db.query(clientname, `DELETE FROM permissions WHERE key = '${Db.replaceQuotes(permission.key)}' AND usergroupname = '${usergroupname}';`);
    } else {
        if ((await Db.query(clientname, `SELECT 1 FROM permissions WHERE key = '${Db.replaceQuotes(permission.key)}' AND usergroupname = '${usergroupname}';`)).rowCount > 0) {
            await Db.query(clientname, `UPDATE permissions SET canwrite = ${!!permission.canwrite} WHERE key = '${Db.replaceQuotes(permission.key)}' AND usergroupname = '${usergroupname}';`);
        } else {
            await Db.query(clientname, `INSERT INTO permissions (usergroupname, key, canwrite) VALUES('${usergroupname}', '${Db.replaceQuotes(permission.key)}', ${!!permission.canwrite});`);
        }
    }
    // Force update of user cache for relevant users
    var usercache = require("../middlewares/auth").usercache;
    (await Db.query(clientname, `SELECT name FROM users WHERE usergroupname='${usergroupname}';`)).rows.forEach(u => {
        delete usercache[u.name];
    });
    res.send(permission);
});

module.exports = router;
