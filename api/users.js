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
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');

// Get all users of the current client, maybe filtered by userGroupId
// TODO: Testfälle anpassen
/**
 * Gibt eine Liste von Benutzern des Mandanten des angemeldeten Benutzers zurück.
 * Wenn als Query-Parameter "userGroupId=IRGENDEINEID" angegeben ist, werden nur die Benutzer
 * zurück gegeben, die der geforderten Benutzergruppe angehören.
 * Wenn als Query-Parameter "joinUserGroup=true" angegeben ist, werden in der Property "userGroup"
 * auch noch die Daten der Benutzergruppe der Benutzer zurück gegeben.
 */
router.get('/', auth(co.permissions.ADMINISTRATION_USER, 'r', 'base'), (req, res) => {
    var clientId = req.user.clientId; // clientId === null means that the user is a portal user
    // Aggregate-Pipeline: https://www.mongodb.com/blog/post/joins-and-other-aggregation-enhancements-coming-in-mongodb-3-2-part-1-of-3-introduction
    var aggregateSteps = [
        { $match: { clientId: clientId } } // Nur Benutzer des Mandanten des angemeldeten Benutzers
    ];
    if (req.query.userGroupId) { // Nur Benutzer einer bestimmten Benutzergruppe
        if (!validateId.validateId(req.query.userGroupId)) {
            return res.sendStatus(400);
        }
        aggregateSteps.push({ $match: { userGroupId: monk.id(req.query.userGroupId) } });
    }
    if (req.query.joinUserGroup) { // Daten der Benutzergruppe einbinden
        aggregateSteps.push({ $lookup: { 
            from: 'usergroups',
            localField: 'userGroupId',
            foreignField: '_id',
            as: 'userGroup'
        } });
    }
    aggregateSteps.push({ $project: { pass: false } }); // Passwort niemals mit zurück geben // TODO: Test einbauen, ob Passwörter zurück kommen
    req.db.get('users').aggregate(aggregateSteps).then((users) => {
        if (req.query.joinUserGroup) { // Benutzergruppen ggf. von Feld zu Einzelwert wandeln
            users.forEach(function(user) {
                user.userGroup = user.userGroup[0];
            });
        }
        res.send(users);
    });
});

/**
 * Liefert eine Liste von Terminen für die per URL übergebenen IDs. Die IDs müssen kommagetrennt sein.
 * Die Berechtigungen werden hier nicht per auth überprüft, da diese API für die Verknüpfungen verwendet
 * wird und da wäre es blöd, wenn ein 403 zur Neuanmeldung führte. Daher wird bei fehlender Berechtigung
 * einfach eine leere Liste zurück gegeben.
 * Zu jedem Benutzer wird in der Eigenschaft userGroup die Information über die zugehörige Benutzergruppe
 * zurück gegeben. Passwörter werden nicht rausgegeben.
 * @example
 * $http.get('/api/users/forIds?ids=ID1,ID2,ID3')...
 */
router.get('/forIds', auth(false, false, 'base'), (req, res) => {
    // Zuerst Berechtigung prüfen
    auth.canAccess(req.user._id, 'PERMISSION_ADMINISTRATION_USER', 'r', 'base', req.db).then(function(accessAllowed) {
        if (!accessAllowed) {
            return res.send([]);
        }
        if (!req.query.ids) {
            return res.send([]);
        }
        var ids = req.query.ids.split(',').filter(validateId.validateId).map(function(id) { return monk.id(id); }); // Nur korrekte IDs verarbeiten
        var clientId = req.user.clientId; // Nur die Termine des Mandanten des Benutzers raus holen.
        var aggregateSteps = [
            { $match: { // Nur Benutzer des Mandanten des angemeldeten Benutzers
                clientId: clientId, 
                _id: { $in: ids } 
            } },
            { $lookup: { 
                from: 'usergroups',
                localField: 'userGroupId',
                foreignField: '_id',
                as: 'userGroup'
            } }
        ];
        aggregateSteps.push({ $project: { pass: false } }); // Passwort niemals mit zurück geben // TODO: Test einbauen, ob Passwörter zurück kommen
        req.db.get('users').aggregate(aggregateSteps).then((users) => {
            res.send(users);
        });
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
                user.clientId = req.user.clientId; // Assing the new user to the same client as the logged in user, because users can create only users for their own clients
                req.db.insert('users', user).then((insertedUser) => {
                    res.send(insertedUser);
                });
            }
        });
    });
});

//TODO check if other verifications are needed
router.post('/newpassword', auth('PERMISSION_SETTINGS_USER', 'w', 'base'), (req, res) => {
    if (typeof(req.body.pass) === 'undefined') {
        res.sendStatus(400);
    } else {
        var encryptedNewPassword = bcryptjs.hashSync(req.body.pass);
        req.db.update('users', req.user._id, { $set: {pass:encryptedNewPassword} }).then(() => { // https://docs.mongodb.com/manual/reference/operator/update/set/
            res.sendStatus(200);
        });
    }
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
    // For the case that only the _id had to be updated, return an error and do not handle any further
    if (Object.keys(user).length < 1) {
        return res.sendStatus(400);
    }
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
    var id = monk.id(req.params.id);
    req.db.remove('users', req.params.id).then((result) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        rh.deleteAllRelationsForEntity(co.collections.users, id).then(function() {
            res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
        });
    });
});

module.exports = router;
