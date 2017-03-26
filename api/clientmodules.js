/**
 * CRUD API for client module assignments
 * 
 * clientmodule {
 *  _id
 *  clientId,
 *  module
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var monk = require('monk');
var fs = require('fs');

/**
 * List all available client module names for a given client
 */
router.get('/available', auth('PERMISSION_ADMINISTRATION_CLIENT', 'r', 'clients'), (req, res) => {
    if (!req.query.clientId || !validateId.validateId(req.query.clientId)) {
        return res.sendStatus(400);
    }
    var moduleConfig = JSON.parse(fs.readFileSync('./config/module-config.json').toString());
    var allClientModuleKeys = Object.keys(moduleConfig.modules);
    req.db.get('clients').findOne(req.query.clientId).then((client) => {
        if (!client) {
            res.sendStatus(400);
            return;
        }
        // Filter out modules which are already assigned to the client
        req.db.get('clientmodules').find({ clientId: client._id }, req.query.fields).then((clientmodules) => {
            var clientModuleKeys = clientmodules.map((clientModule) => clientModule.module);
            var availableClientModuleKeys = allClientModuleKeys.filter((key) => clientModuleKeys.indexOf(key) < 0);
            res.send(availableClientModuleKeys);
            return;
        });
    });
});

/**
 * List all client module assignments for a given client.
 */
router.get('/', auth('PERMISSION_ADMINISTRATION_CLIENT', 'r', 'clients'), (req, res) => {
    if (!req.query.clientId || !validateId.validateId(req.query.clientId)) {
        return res.sendStatus(400);
    }
    req.db.get('clients').findOne(req.query.clientId).then((client) => {
        if (!client) {
            return res.sendStatus(400);
        }
        req.db.get('clientmodules').find({ clientId: client._id }, req.query.fields).then((clientmodules) => {
            return res.send(clientmodules);
        });
    });
});

/**
 * Get single client module with given id
 */
router.get('/:id', auth('PERMISSION_ADMINISTRATION_CLIENT', 'r', 'clients'), validateId, (req, res) => {
    req.db.get('clientmodules').findOne(req.params.id, req.query.fields).then((clientmodule) => {
        if (!clientmodule) {
            // Client module with given ID not found
            return res.sendStatus(404);
        }
        return res.send(clientmodule);
    });
});

/**
 * Create a new client module
 */
router.post('/', auth('PERMISSION_ADMINISTRATION_CLIENT', 'w', 'clients'), function(req, res) {
    var clientModule = req.body;
    if (!clientModule || Object.keys(clientModule).length < 2 || !clientModule.clientId || !validateId.validateId(clientModule.clientId) || !clientModule.module) { // At least clientId and module
        return res.sendStatus(400);
    }
    req.db.get('clients').findOne(clientModule.clientId).then((client) => {
        if (!client) {
            return res.sendStatus(400);
        }
        delete clientModule._id; // Ids are generated automatically
        clientModule.clientId = client._id; // Make it a real id
        req.db.insert('clientmodules', clientModule).then((insertedClientModule) => {
            return res.send(insertedClientModule);
        });
    });
});

/**
 * Update client module details
 */
router.put('/:id', auth('PERMISSION_ADMINISTRATION_CLIENT', 'w', 'clients'), validateId, function(req, res) {
    var clientModule = req.body;
    if (!clientModule || Object.keys(clientModule).length < 1) {
        return res.sendStatus(400);
    }
    delete clientModule._id; // When client object also contains the _id field
    delete clientModule.clientId; // When client object also contains the clientId field
    // For the case that only the _id had to be updated, return the original clientModule, because the _id cannot be changed
    if (Object.keys(clientModule).length < 1) {
        req.db.get('clientmodules').findOne(req.params.id, req.query.fields).then((clientModuleFromDatabase) => {
            if (!clientModuleFromDatabase) {
                // Client module with given ID not found
                return res.sendStatus(404);
            }
            return res.send(clientModuleFromDatabase);
        });
    } else {
        req.db.update('clientmodules', req.params.id, { $set: clientModule }).then((updatedClientModule) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
            if (!updatedClientModule || updatedClientModule.lastErrorObject) {
                // Client module with given ID not found
                return res.sendStatus(404);
            }
            return res.send(updatedClientModule);
        });
    }
});

/**
 * Delete client module
 */
router.delete('/:id', auth('PERMISSION_ADMINISTRATION_CLIENT', 'w', 'clients'), validateId, function(req, res) {
    req.db.remove('clientmodules', req.params.id).then((result) => {
        if (result.result.n < 1) {
            return res.sendStatus(404);
        }
        res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
    });
});

module.exports = router;
