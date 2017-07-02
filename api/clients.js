/**
 * CRUD API for client management
 * 
 * client {
 *  _id
 *  name
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var monk = require('monk');
var async = require('async');
var bcryptjs = require('bcryptjs');
var constants = require('../utils/constants');

/**
 * List all clients
 */
router.get('/', auth('PERMISSION_ADMINISTRATION_CLIENT', 'r', 'clients'), (req, res) => {
    req.db.get('clients').find({}, req.query.fields).then((clients) => {
        return res.send(clients);
    });
});

/**
 * Liefert eine Liste von Mandanten für die per URL übergebenen IDs. Die IDs müssen kommagetrennt sein.
 * Die Berechtigungen werden hier nicht per auth überprüft, da diese API für die Verknüpfungen verwendet
 * wird und da wäre es blöd, wenn ein 403 zur Neuanmeldung führte. Daher wird bei fehlender Berechtigung
 * einfach eine leere Liste zurück gegeben.
 * @example
 * $http.get('/api/clients/forIds?ids=ID1,ID2,ID3')...
 */
router.get('/forIds', auth(false, false, 'clients'), (req, res) => {
    // Zuerst Berechtigung prüfen
    auth.canAccess(req.user._id, 'PERMISSION_ADMINISTRATION_CLIENT', 'r', 'clients', req.db).then(function(accessAllowed) {
        if (!accessAllowed) {
            return res.send([]);
        }
        if (!req.query.ids) {
            return res.send([]);
        }
        var ids = req.query.ids.split(',').filter(validateId.validateId).map(function(id) { return monk.id(id); }); // Nur korrekte IDs verarbeiten
        req.db.get('clients').find({
            _id: { $in: ids }
        }).then((clients) => {
            res.send(clients);
        });
    });
});

/**
 * Get single client with given id
 */
router.get('/:id', auth('PERMISSION_ADMINISTRATION_CLIENT', 'r', 'clients'), validateId, (req, res) => {
    req.db.get('clients').findOne(req.params.id, req.query.fields).then((client) => {
        if (!client) {
            // Client with given ID not found
            return res.sendStatus(404);
        }
        return res.send(client);
    });
});

/**
 * Creates an admin for a client. Must be defined before the overall POST handler below,
 * because otherwise the /newadmin URL part would be interpreted as :id
 */
router.post('/newadmin', auth('PERMISSION_ADMINISTRATION_CLIENT', 'w', 'clients'), function(req, res) {
    var newAdmin = req.body;
    if (!newAdmin || Object.keys(newAdmin).length < 1 || !newAdmin.name || !newAdmin.clientId || !validateId.validateId(newAdmin.clientId)) {
        return res.sendStatus(400);
    }
    var clientId = monk.id(newAdmin.clientId);
    // Check whether an user with the name exists
    req.db.get('users').count({ name: newAdmin.name }).then((count) => {
        if (count > 0) {
            // User with the name already exists
            return res.sendStatus(409);
        }
        // Obtain the client for the new admin
        req.db.get('clients').findOne(clientId).then((client) => {
            if (!client) {
                // Client with given ID not found
                return res.sendStatus(400);
            }
            // Create a new usergroup for the admin
            req.db.insert('usergroups', { name: newAdmin.name, clientId: clientId }).then((insertedUserGroup) => {
                // Create new user for the admin
                var userToInsert = {
                    name: newAdmin.name,
                    pass: bcryptjs.hashSync(newAdmin.pass),
                    clientId: clientId,
                    userGroupId: insertedUserGroup._id,
                    isAdmin: true
                }
                req.db.insert('users', userToInsert).then((insertedUser) => {
                    return res.send(insertedUser);
                });
            });
        });
    });
});

/**
 * Create a new client and assigns the base module to it.
 */
router.post('/', auth('PERMISSION_ADMINISTRATION_CLIENT', 'w', 'clients'), function(req, res) {
    var client = req.body;
    if (!client || Object.keys(client).length < 1) {
        return res.sendStatus(400);
    }
    delete client._id; // Ids are generated automatically
    req.db.insert('clients', client).then((insertedClient) => {
        // Assign base module
        var baseModuleAssignment = { clientId: insertedClient._id, module: 'base' };
        req.db.insert('clientmodules', baseModuleAssignment).then((insertedClientModule) => {
            return res.send(insertedClient);
        });
    });
});

/**
 * Update client details
 */
router.put('/:id', auth('PERMISSION_ADMINISTRATION_CLIENT', 'w', 'clients'), validateId, function(req, res) {
    var client = req.body;
    if (!client || Object.keys(client).length < 1) {
        return res.sendStatus(400);
    }
    delete client._id; // When client object also contains the _id field
    // For the case that only the _id had to be updated, return the original client, because the _id cannot be changed
    if (Object.keys(client).length < 1) {
        req.db.get('clients').findOne(req.params.id, req.query.fields).then((client) => {
            if (!client) {
                // Client with given ID not found
                return res.sendStatus(404);
            }
            return res.send(client);
        });
    } else {
        req.db.update('clients', req.params.id, { $set: client }).then((updatedClient) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
            if (!updatedClient || updatedClient.lastErrorObject) {
                // Client with given ID not found
                return res.sendStatus(404);
            }
            return res.send(updatedClient);
        });
    }
});

/**
 * Delete client and all dependent objects
 */
router.delete('/:id', auth('PERMISSION_ADMINISTRATION_CLIENT', 'w', 'clients'), validateId, function(req, res) {
    var clientId = monk.id(req.params.id);
    var dependentCollections = Object.keys(constants.collections);
    // Remove all dependent objects (activities, documents, fmobjects, folders, permissions, usergroups, users)
    async.eachSeries(dependentCollections, (dependentCollection, callback) => {
        req.db.remove(dependentCollection, { clientId: clientId }).then((res) => {
            callback();
        });
    }, (err) => {
        req.db.remove('clients', req.params.id).then((result) => {
            if (result.result.n < 1) {
                return res.sendStatus(403); // For test compatibility
            }
            res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
        });
    });
});

module.exports = router;
