/**
 * CRUD API for user management
 * user {
 *  _id,
 *  name,
 *  pass,
 *  userGroupId,
 *  clientId,
 *  isAdmin
 * }
 */
var bcryptjs = require('bcryptjs');
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var apiHelper = require('../utils/apiHelper');

// Get all users of the current client, maybe filtered by userGroupId
router.get('/', auth('PERMISSION_ADMINISTRATION_USER', 'r', 'base'), (req, res) => {
    var clientId = req.user.clientId; // clientId === null means that the user is a portal user
    var filter = { clientId: clientId };
    if (req.query.userGroupId) {
        if (!validateId.validateId(req.query.userGroupId)) {
            return res.sendStatus(400);
        }
        filter.userGroupId = monk.id(req.query.userGroupId);
    }
    req.db.get('users').find(filter, req.query.fields).then((docs) => {
        res.send(docs);
    });
});

// Get a specific user
apiHelper.createDefaultGetIdRoute(router, 'users', 'PERMISSION_ADMINISTRATION_USER', 'base');

// Create an user
router.post('/', auth('PERMISSION_ADMINISTRATION_USER', 'w', 'base'), function(req, res) {
    var user = req.body;
    if (!user || Object.keys(user).length < 1 || !user.name || !user.pass || !user.userGroupId || !validateId.validateId(user.userGroupId)) {
        return res.sendStatus(400);
    }
    user.pass = bcryptjs.hashSync(user.pass);
    user.userGroupId = monk.id(user.userGroupId);
    // Check whether username is in use
    var users = req.db.get('users');
    users.count({ name: user.name}).then((count) => {
        if (count > 0) {
            return res.sendStatus(409); // Conflict
        }
        // Check whether userGroup exists
        req.db.get('usergroups').findOne(user.userGroupId).then((userGroup) => {
            if (!userGroup) {
                res.sendStatus(400);
            } else {
                delete user._id; // Ids are generated automatically
                user.clientId = req.user.clientId; // Assing the new user to the same client as the logged in user
                req.db.insert('users', user).then((insertedUser) => {
                    res.send(insertedUser);
                });
            }
        });
    });
});

//TODO check if other verifications are needed
router.post('/newpassword', auth('PERMISSION_SETTINGS_USER', 'w', 'base'), (req, res) => {
    var encryptedNewPassword = bcryptjs.hashSync(req.body.pass);
    req.db.update('users', req.user._id, { $set: {pass:encryptedNewPassword} }).then(() => { // https://docs.mongodb.com/manual/reference/operator/update/set/
        res.sendStatus(200);
    });
});

var getUserFromDatabase = (req, res, userId, userFromRequest) => {
    return new Promise((resolve, reject) => {
        req.db.get('users').findOne(req.params.id).then((userFromDatabase) => {
            resolve(userFromDatabase);
        });
    });
};

var checkUserNameInUse = (req, res, userFromRequest, userFromDatabase) => {
    return new Promise((resolve, reject) => {
        if (userFromRequest.name && userFromRequest.name !== userFromDatabase.name) {
            // Name was changed, so check whether another user has this name already
            req.db.get('users').count({ name: userFromRequest.name}).then((count) => {
                if (count > 0) {
                    res.sendStatus(409); // Conflict
                    reject();
                } else {
                    resolve();
                }
            });
        } else {
            resolve(); // Name was not changed
        }
    });
};

var checkUserGroupId = (req, res, userFromRequest) => {
    return new Promise((resolve, reject) => {
        if (userFromRequest.userGroupId) {
            userFromRequest.userGroupId = monk.id(userFromRequest.userGroupId);
            // Check whether userGroup exists
            req.db.get('usergroups').findOne(userFromRequest.userGroupId).then((userGroupFromDatabase) => {
                if (!userGroupFromDatabase) {
                    res.sendStatus(400);
                    reject();
                } else {
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
};

var updateUser = (req, res, userFromRequest) => {
    return new Promise((resolve, reject) => {
        req.db.update('users', req.params.id, { $set: userFromRequest }).then((updatedUser) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
            res.send(updatedUser);
            resolve();
        });
    });
};

// Update an user
router.put('/:id', auth('PERMISSION_ADMINISTRATION_USER', 'w', 'base'), validateId, validateSameClientId('users'), function(req, res) {
    var user = req.body;
    if (!user || Object.keys(user).length < 1) {
        return res.sendStatus(400);
    }
    delete user._id; // When user object also contains the _id field
    delete user.clientId; // Prevent assignment of the user to another client
    if (user.pass && user.pass.length > 0) {
        user.pass = bcryptjs.hashSync(user.pass);
    } else {
        delete user.pass;
    }
    if (user.userGroupId && !validateId.validateId(user.userGroupId)) {
        return res.sendStatus(400);
    }
    getUserFromDatabase(req, res, req.params.id, user)
        .then((userFromDatabase) => checkUserNameInUse(req, res, user, userFromDatabase))
        .then(() => checkUserGroupId(req, res, user))
        .then(() => updateUser(req, res, user))
        .catch(() => {}); // Errors are handled in the functions itselves
});

// Delete an user
router.delete('/:id', auth('PERMISSION_ADMINISTRATION_USER', 'w', 'base'), validateId, validateSameClientId('users'), function(req, res) {
    req.db.remove('users', req.params.id).then((result) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
    });
});

module.exports = router;
