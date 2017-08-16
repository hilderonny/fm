/**
 * CRUD API for userGroup management
 * userGroup {
 *  _id,
 *  name,
 *  clientId
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var apiHelper = require('../utils/apiHelper');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');
var dah = require('../utils/dynamicAttributesHelper');

// Get all user groups of the current client
router.get('/', auth('PERMISSION_ADMINISTRATION_USERGROUP', 'r', 'base'), (req, res) => {
    var clientId = req.user.clientId;
    req.db.get('usergroups').find({ clientId: clientId }, req.query.fields).then((docs) => {
        res.send(docs);
    });
});

/**
 * Liefert eine Liste von Terminen für die per URL übergebenen IDs. Die IDs müssen kommagetrennt sein.
 * Die Berechtigungen werden hier nicht per auth überprüft, da diese API für die Verknüpfungen verwendet
 * wird und da wäre es blöd, wenn ein 403 zur Neuanmeldung führte. Daher wird bei fehlender Berechtigung
 * einfach eine leere Liste zurück gegeben.
 * @example
 * $http.get('/api/usergroups/forIds?ids=ID1,ID2,ID3')...
 */
router.get('/forIds', auth(false, false, 'base'), (req, res) => {
    // Zuerst Berechtigung prüfen
    auth.canAccess(req.user._id, 'PERMISSION_ADMINISTRATION_USERGROUP', 'r', 'base', req.db).then(function(accessAllowed) {
        if (!accessAllowed) {
            return res.send([]);
        }
        if (!req.query.ids) {
            return res.send([]);
        }
        var ids = req.query.ids.split(',').filter(validateId.validateId).map(function(id) { return monk.id(id); }); // Nur korrekte IDs verarbeiten
        var clientId = req.user.clientId; // Nur die Termine des Mandanten des Benutzers raus holen.
        req.db.get('usergroups').find({
            _id: { $in: ids },
            clientId: clientId
        }).then((usergroups) => {
            res.send(usergroups);
        });
    });
});

// Get a specific userGroup; the users and permissions are requested by separate API calls
apiHelper.createDefaultGetIdRoute(router, 'usergroups', 'PERMISSION_ADMINISTRATION_USERGROUP', 'base');

// Create an userGroup
router.post('/', auth('PERMISSION_ADMINISTRATION_USERGROUP', 'w', 'base'), function(req, res) {
    var userGroup = req.body;
    if (!userGroup || Object.keys(userGroup).length < 1) {
        return res.sendStatus(400);
    }
    delete userGroup._id; // Ids are generated automatically
    userGroup.clientId =req.user.clientId;
    req.db.insert('usergroups', userGroup).then((insertedUserGroup) => {
        res.send(insertedUserGroup);
    });
});

// Update an userGroup
router.put('/:id', auth('PERMISSION_ADMINISTRATION_USERGROUP', 'w', 'base'), validateId, validateSameClientId('usergroups'), function(req, res) {
    var userGroup = req.body;
    if (!userGroup || Object.keys(userGroup).length < 1) {
        return res.sendStatus(400);
    }
    delete userGroup._id; // When userGroup object also contains the _id field
    delete userGroup.clientId; // Prevent assignment of the userGroup to another client
    if (Object.keys(userGroup).length < 1) {
        return res.sendStatus(400);
    }
    req.db.update('usergroups', req.params.id, { $set: userGroup }).then((updatedUserGroup) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
        // Database element is available here in every case, because validateSameClientId already checked for existence
        res.send(updatedUserGroup);
    });
});

// Delete an userGroup
router.delete('/:id', auth('PERMISSION_ADMINISTRATION_USERGROUP', 'w', 'base'), validateId, validateSameClientId('usergroups'), function(req, res) {
    var id = monk.id(req.params.id);
    // Only possible, when no user is assigned
    req.db.get('users').count({userGroupId: id}).then((count) => {
        if (count > 0) {
            return res.sendStatus(403);
        } else {
            req.db.remove('usergroups', id).then(() => {
                // Database element is available here in every case, because validateSameClientId already checked for existence
                // Delete permissions too
                return req.db.remove('permissions', {userGroupId: id});
            }).then(() => {
                return rh.deleteAllRelationsForEntity(co.collections.usergroups.name, id);
            }).then(() => {
                return dah.deleteAllDynamicAttributeValuesForEntity(id);
            }).then(function() {
                res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
            });
        }
    });
});

module.exports = router;
