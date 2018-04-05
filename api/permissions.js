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
var ph = require("../utils/permissionshelper");

/**
 * Liefert alle Berechtigungen für den angemeldeten Benutzer. Wird für Verweise verwendet, um
 * Verweismenü zu filtern.
 */
router.get('/forLoggedInUser', auth(), async(req, res) => {
    var clientname = req.user.clientname;
    var permissions = await ph.getpermissionsforuser(req.user);
    res.send(permissions);
});

router.get('/forUserGroup/:id', auth(co.permissions.ADMINISTRATION_USERGROUP, 'r', co.modules.base), validateSameClientId(co.collections.usergroups.name), async(req, res) => {
    var clientname = req.user.clientname;
    var usergroupname = req.params.id;
    var permissionKeysForClient = await configHelper.getAvailablePermissionKeysForClient(clientname);
    var permissionsForUserGroup = (await Db.query(clientname, `SELECT * FROM permissions WHERE usergroupname = '${Db.replaceQuotes(usergroupname)}' AND key IN (${permissionKeysForClient.map((k) => `'${Db.replaceQuotes(k)}'`).join(',')});`)).rows;
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
    if (!permission || Object.keys(permission).length < 1 || !permission.userGroupId || !permission.key || (!!!permission.canRead && !!permission.canWrite)) return res.sendStatus(400);
    var permissionKeyForUser = await configHelper.getAvailablePermissionKeysForClient(clientname);
    if (permissionKeyForUser.indexOf(permission.key) < 0) return res.sendStatus(400);
    if (!(await Db.getDynamicObject(clientname, co.collections.usergroups.name, permission.userGroupId))) return res.sendStatus(400);
    if (!!!permission.canRead) {
        await Db.query(clientname, `DELETE FROM permissions WHERE key = '${Db.replaceQuotes(permission.key)}' AND usergroupname = '${Db.replaceQuotes(permission.userGroupId)}';`);
    } else {
        if ((await Db.query(clientname, `SELECT 1 FROM permissions WHERE key = '${Db.replaceQuotes(permission.key)}' AND usergroupname = '${Db.replaceQuotes(permission.userGroupId)}';`)).rowCount > 0) {
            await Db.query(clientname, `UPDATE permissions SET canwrite = ${!!permission.canWrite} WHERE key = '${Db.replaceQuotes(permission.key)}' AND usergroupname = '${Db.replaceQuotes(permission.userGroupId)}';`);
        } else {
            await Db.query(clientname, `INSERT INTO permissions (usergroupname, key, canwrite) VALUES('${Db.replaceQuotes(permission.userGroupId)}', '${Db.replaceQuotes(permission.key)}', ${!!permission.canWrite});`);
        }
    }
    res.send(permission);
});

module.exports = router;
