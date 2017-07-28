/**
 * CRUD API for userGroup permission management
 * 
 * permission {
 *  _id
 *  key // Translation key of the permission the card / the menu requires. Defined in module_config and in APIs
 *  userGroupId
 *  clientId
 *  canRead
 *  canWrite
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var apiHelper = require('../utils/apiHelper');
var co = require('../utils/constants');
var configHelper = require('../utils/configHelper');

/**
 * Checks whether the currently logged in user has read permissions on the
 * given permission key. Used for handling link and button visibility on client.
 */
router.get('/canRead/:key', auth(false, false, 'base'), (req, res) => {
    // Als Erstes prüfen, ob der Mandant überhaupt Zugriff auf das Modul hat, welches die Berechtigung verwendet
    configHelper.isPermissionAvailableToClient(req.user.clientId, req.params.key, req.db).then(function(permissionIsAvailable) {
        if (!permissionIsAvailable) {
            res.send(false);
            return;
        }
        if (req.user.isAdmin) {
            res.send(true);
            return;
        }
        req.db.get('permissions').findOne({ key: req.params.key, userGroupId: req.user.userGroupId, canRead: true}).then((permission) => {
            if (!permission) {
                res.send(false);
                return;
            }
            res.send(true);
        });
    });
});

/**
 * Checks whether the currently logged in user has write permissions on the
 * given permission key. Used for handling link and button visibility on client.
 */
router.get('/canWrite/:key', auth(false, false, 'base'), (req, res) => {
    // Als Erstes prüfen, ob der Mandant überhaupt Zugriff auf das Modul hat, welches die Berechtigung verwendet
    configHelper.isPermissionAvailableToClient(req.user.clientId, req.params.key, req.db).then(function(permissionIsAvailable) {
        if (!permissionIsAvailable) {
            res.send(false);
            return;
        }
        if (req.user.isAdmin) {
            res.send(true);
            return;
        }
        req.db.get('permissions').findOne({ key: req.params.key, userGroupId: req.user.userGroupId, canWrite: true}).then((permission) => {
            if (!permission) {
                res.send(false);
                return;
            }
            res.send(true);
        });
    });
});

/**
 * Liefert alle Berechtigungen für den angemeldeten Benutzer. Wird für Verweise verwendet, um
 * Verweismenü zu filtern.
 */
router.get('/forLoggedInUser', auth(false, false, 'base'), (req, res) => {
    configHelper.getAvailablePermissionKeysForClient(req.user.clientId, req.db).then(function(permissionKeysForClient) {
        // Bei Administratoren werden alle Permissions einfach zurück gegeben
        if (req.user.isAdmin) {
            var adminPermissions = permissionKeysForClient.map(function(permissionKey) {
                return { key:permissionKey, canRead:true, canWrite:true, clientId:req.user.clientid, userGroupId: req.user.userGroupId };
            });
            res.send(adminPermissions);
        } else {
            // Obtain the permissions for the user group
            req.db.get('permissions').find({
                userGroupId: req.user.userGroupId,
                key: { $in: permissionKeysForClient }
            }).then((permissionsOfUserGroup) => {
                res.send(permissionsOfUserGroup);
            });
        }
    });
});

router.get('/forUserGroup/:id', auth(co.permissions.ADMINISTRATION_USERGROUP, 'r', 'base'), validateId, validateSameClientId('usergroups'), function(req, res) {
    var userGroup, permissionKeysForClient;
    req.db.get('usergroups').findOne(req.params.id).then(function(ug) {
        userGroup = ug;
        return configHelper.getAvailablePermissionKeysForClient(userGroup.clientId, req.db);
    }).then(function(keys) {
        permissionKeysForClient = keys;
        // Obtain the permissions for the user group
        return req.db.get('permissions').find({ 
            userGroupId: userGroup._id,
            key: { $in: permissionKeysForClient } // Filter out permissions which are not available to the portal and client of the user group
        });
    }).then((permissionsOfUserGroup) => {
        var result = permissionKeysForClient.map((key) => {
            var existingPermission = permissionsOfUserGroup.find((p) => p.key === key);
            return {
                _id: existingPermission ? existingPermission._id : null,
                clientId: userGroup.clientId,
                userGroupId: userGroup._id,
                canRead: existingPermission ? existingPermission.canRead : false,
                canWrite: existingPermission ? existingPermission.canWrite : false,
                key: key
            };
        });
        res.send(result);
    });
});

// Create a permission
router.post('/', auth(co.permissions.ADMINISTRATION_USERGROUP, 'w', 'base'), function(req, res) {
    var permission = req.body;
    configHelper.getAvailablePermissionKeysForClient(req.user.clientId, req.db).then(function(permissionKeyForUser) {
        if (!permission || Object.keys(permission).length < 1 || !permission.userGroupId || !validateId.validateId(permission.userGroupId) || !permission.key || permissionKeyForUser.indexOf(permission.key) < 0) {
            return res.sendStatus(400);
        }
        delete permission._id; // Ids are generated automatically
        permission.clientId = req.user.clientId; // Assing the new userGroup to the same client as the logged in user
        permission.userGroupId = monk.id(permission.userGroupId); // Make it a real ID
        // Check whether userGroup exists
        req.db.get(co.collections.usergroups).findOne({ _id: permission.userGroupId, clientId: permission.clientId}).then((existingUserGroup) => {
            if (!existingUserGroup) {
                // User group does not not exist or is in another client
                return res.sendStatus(400);
            }
            // Prüfen, ob so eine Berechtigung schon besteht
            req.db.get(co.collections.permissions).findOne({userGroupId:existingUserGroup._id, key:permission.key}).then(function(existingPermission) {
                if (existingPermission) {
                    return res.send(existingPermission); // Berechtigung besteht bereits, einfach zurück schicken
                }
                req.db.insert(co.collections.permissions, permission).then((insertedPermission) => {
                    return res.send(insertedPermission);
                });
            });
        });
    });
});

// Update a permission
router.put('/:id', auth('PERMISSION_ADMINISTRATION_USERGROUP', 'w', 'base'), validateId, validateSameClientId('permissions'), function(req, res) {
    var permission = req.body;
    configHelper.getAvailablePermissionKeysForClient(req.user.clientId, req.db).then(function(permissionKeyForUser) {
        if (!permission || Object.keys(permission).length < 1 || (permission.key && permissionKeyForUser.indexOf(permission.key) < 0)) {
            return res.sendStatus(400);
        }
        delete permission._id; // When permission object also contains the _id field
        delete permission.userGroupId; // Prevent assignment of the permission to another userGroup
        delete permission.clientId; // Prevent assignment of the permission to another client
        req.db.update('permissions', req.params.id, { $set: permission }).then((updatedPermission) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
            // Database element is available here in every case, because validateSameClientId already checked for existence
            res.send(updatedPermission);
        });
    });
});

// Delete a permission
router.delete('/:id', auth('PERMISSION_ADMINISTRATION_USERGROUP', 'w', 'base'), validateId, validateSameClientId('permissions'), function(req, res) {
    req.db.remove('permissions', req.params.id).then((result) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
    });
});

module.exports = router;
