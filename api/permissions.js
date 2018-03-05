/**
 * CRUD API for userGroup permission management
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateSameClientId = require('../middlewares/validateSameClientId');
var apiHelper = require('../utils/apiHelper');
var co = require('../utils/constants');
var configHelper = require('../utils/configHelper');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;

/**
 * Liefert alle Berechtigungen für den angemeldeten Benutzer. Wird für Verweise verwendet, um
 * Verweismenü zu filtern.
 */
router.get('/forLoggedInUser', auth(), async(req, res) => {
    var clientname = req.user.clientname;
    var permissionKeysForClient = await configHelper.getAvailablePermissionKeysForClient(clientname);
    // Bei Administratoren werden alle Permissions einfach zurück gegeben
    if (req.user.isadmin) {
        var adminPermissions = permissionKeysForClient.map((permissionKey) => {
            return { key:permissionKey, canRead:true, canWrite:true, clientId:clientname, userGroupId: req.user.usergroupname };
        });
        res.send(adminPermissions);
    } else {
        var permissions = (await Db.query(clientname, `SELECT * FROM permissions WHERE usergroupname = '${req.user.usergroupname}' AND key IN (${permissionKeysForClient.map((k) => `'${k}'`).join(',')});`)).rows;
        var mappedPermissions = permissions.map((p) => { return {
            key: p.key,
            canRead: true,
            canWrite: p.canwrite,
            clientId:clientname,
            userGroupId: req.user.usergroupname
        }});
        res.send(mappedPermissions);
    }
});

router.get('/forUserGroup/:id', auth(co.permissions.ADMINISTRATION_USERGROUP, 'r', co.modules.base), validateSameClientId(co.collections.usergroups.name), async(req, res) => {
    var clientname = req.user.clientname;
    var usergroupname = req.user.usergroupname;
    var permissionKeysForClient = await configHelper.getAvailablePermissionKeysForClient(clientname);
    var permissionsForUserGroup = (await Db.query(clientname, `SELECT * FROM permissions WHERE usergroupname = '${usergroupname}' AND key IN (${permissionKeysForClient.map((k) => `'${k}'`).join(',')});`)).rows;
    var mappedPermissions = permissionKeysForClient.map((pk) => {
        var usergrouppermission = permissionsForUserGroup.find((p) => p.key === pk);
        return {
            key: pk,
            canRead: !!usergrouppermission,
            canWrite: usergrouppermission ? usergrouppermission.canwrite : false,
            clientId:clientname,
            userGroupId: usergroupname
        }
    });
    res.send(mappedPermissions);
});

// Create a permission
router.post('/', auth(co.permissions.ADMINISTRATION_USERGROUP, 'w', co.modules.base), async(req, res) => {
    var clientname = req.user.clientname;
    var permission = req.body;
    if (!permission || Object.keys(permission).length < 1 || !permission.userGroupId || !permission.key || (!permission.canRead && permission.canWrite)) return res.sendStatus(400);
    var permissionKeyForUser = await configHelper.getAvailablePermissionKeysForClient(clientname);
    if (permissionKeyForUser.indexOf(permission.key) < 0) return res.sendStatus(400);
    if (!(await Db.getDynamicObject(clientname, co.collections.usergroups.name, permission.userGroupId))) return res.sendStatus(400);
    if (!permission.canRead) {
        await Db.query(clientname, `DELETE FROM permissions WHERE key = '${permission.key}' AND usergroupname = '${permission.userGroupId}';`);
    } else {
        if ((await Db.query(clientname, `SELECT 1 FROM permissions WHERE key = '${permission.key}' AND usergroupname = '${permission.userGroupId}';`)).rowCount > 0) {
            await Db.query(clientname, `UPDATE permissions SET canwrite = ${permission.canWrite} WHERE key = '${permission.key}' AND usergroupname = '${permission.userGroupId}';`);
        } else {
            await Db.query(clientname, `INSERT INTO permissions (usergroupname, key, canwrite) VALUES('${permission.userGroupId}', '${permission.key}', ${permission.canWrite});`);
        }
    }
    res.send(permission);
});

module.exports = router;
