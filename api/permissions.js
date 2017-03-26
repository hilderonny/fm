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
var constants = require('../utils/constants');

/**
 * Checks whether the currently logged in user has read permissions on the
 * given permission key. Used for handling link and button visibility on client.
 */
router.get('/canRead/:key', auth(false, false, 'base'), (req, res) => {
    if (req.user.isAdmin) {
        return res.send(true);
    }
    req.db.get('permissions').findOne({ key: req.params.key, userGroupId: req.user.userGroupId, canRead: true}).then((permission) => {
        if (!permission) {
            return res.send(false);
        }
        return res.send(true);
    });
});

/**
 * Checks whether the currently logged in user has write permissions on the
 * given permission key. Used for handling link and button visibility on client.
 */
router.get('/canWrite/:key', auth(false, false, 'base'), (req, res) => {
    if (req.user.isAdmin) {
        return res.send(true);
    }
    req.db.get('permissions').findOne({ key: req.params.key, userGroupId: req.user.userGroupId, canWrite: true}).then((permission) => {
        if (!permission) {
            return res.send(false);
        }
        return res.send(true);
    });
});

/**
 * Get all possible permissions for listing them in a dropdown. Only the "permission" field is returned as array.
 * The permissions are related to card controller URLs and its APIs, e.g. "PERMISSION_ADMINISTRATION_CLIENT"
 * refers to the controller /Administration/ClientListCardController and to the API GET /clients/
 * The permissions are also referred in the translation files for dropdown 
 */
router.get('/list', auth(false, false, 'base'), (req, res) => {
    return res.send(constants.allPermissionKeys);
});

// Get all permissions of the client of the logged in user, possibly filtered by a user group
router.get('/', auth('PERMISSION_ADMINISTRATION_PERMISSION', 'r', 'base'), (req, res) => {
    // Only get permissions of the client of the logged in user
    var clientId = req.user.clientId; // clientId === null means that the user is a portal user
    var filter = { clientId: clientId };
    // When the query parameter "userGroupId" is given, return only the permissions of this usergroup
    if (req.query.userGroupId) {
        if (!validateId.validateId(req.query.userGroupId)) {
            return res.sendStatus(400);
        }
        filter.userGroupId = monk.id(req.query.userGroupId);
    }
    // Return only the fileds defined by the query parameter "fields" or all, when "fileds" is not given
    req.db.get('permissions').find(filter, req.query.fields).then((permissions) => {
        res.send(permissions);
    });
});

// Get a specific permission
apiHelper.createDefaultGetIdRoute(router, 'permissions', 'PERMISSION_ADMINISTRATION_PERMISSION', 'base');

// Create a permission
router.post('/', auth('PERMISSION_ADMINISTRATION_PERMISSION', 'w', 'base'), function(req, res) {
    var permission = req.body;
    if (!permission || Object.keys(permission).length < 1 || !permission.userGroupId || !validateId.validateId(permission.userGroupId) || !permission.key || constants.allPermissionKeys.indexOf(permission.key) < 0) {
        return res.sendStatus(400);
    }
    delete permission._id; // Ids are generated automatically
    permission.clientId = req.user.clientId; // Assing the new userGroup to the same client as the logged in user
    permission.userGroupId = monk.id(permission.userGroupId); // Make it a real ID
    // Check whether userGroup exists
    req.db.get('usergroups').findOne({ _id: permission.userGroupId, clientId: permission.clientId}).then((existingUserGroup) => {
        if (!existingUserGroup) {
            // User group does not not exist or is in another client
            return res.sendStatus(400);
        }
        req.db.insert('permissions', permission).then((insertedPermission) => {
            return res.send(insertedPermission);
        });
    });
});

// Update a permission
router.put('/:id', auth('PERMISSION_ADMINISTRATION_PERMISSION', 'w', 'base'), validateId, validateSameClientId('permissions'), function(req, res) {
    var permission = req.body;
    if (!permission || Object.keys(permission).length < 1 || (permission.key && constants.allPermissionKeys.indexOf(permission.key) < 0)) {
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

// Delete a permission
router.delete('/:id', auth('PERMISSION_ADMINISTRATION_PERMISSION', 'w', 'base'), validateId, validateSameClientId('permissions'), function(req, res) {
    req.db.remove('permissions', req.params.id).then((result) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
    });
});

module.exports = router;
