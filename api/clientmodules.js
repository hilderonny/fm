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
var co = require('../utils/constants');

router.get('/forClient/:id', auth(co.permissions.ADMINISTRATION_CLIENT, 'r', co.modules.clients), validateId, function(req, res) {
    var client;
    var clientModuleKeys = Object.keys(co.modules).map((k) => co.modules[k]);
    req.db.get(co.collections.clients).findOne(req.params.id).then(function(c) {
        if (!c) {
            return Promise.reject();
        }
        client = c;
        // Obtain the client modules for the client
        return req.db.get(co.collections.clientmodules).find({ 
            clientId: client._id,
            module: { $in: clientModuleKeys }
        });
    }).then((clientModulesOfClient) => {
        var result = clientModuleKeys.map((key) => {
            var existingClientModule = clientModulesOfClient.find((c) => c.module === key);
            return {
                _id: existingClientModule ? existingClientModule._id : null,
                clientId: client._id,
                active: existingClientModule ? true : false,
                module: key
            };
        });
        res.send(result);
    }, () => {
        res.sendStatus(400);
    });
});

/**
 * Create a new client module
 */
router.post('/', auth(co.permissions.ADMINISTRATION_CLIENT, 'w', co.modules.clients), function(req, res) {
    var clientModule = req.body;
    if (!clientModule || Object.keys(clientModule).length < 2 || !clientModule.clientId || !validateId.validateId(clientModule.clientId) || !clientModule.module) { // At least clientId and module
        return res.sendStatus(400);
    }
    req.db.get(co.collections.clients).findOne(clientModule.clientId).then((client) => {
        if (!client) {
            return res.sendStatus(400);
        }
        // Prüfen, ob so eine Zuordnung schon besteht
        req.db.get(co.collections.clientmodules).findOne({clientId:client._id, module:clientModule.module}).then(function(existingClientModule) {
            if (existingClientModule) {
                return res.send(existingClientModule); // Zuordnung besteht bereits, einfach zurück schicken
            }
            delete clientModule._id; // Ids are generated automatically
            clientModule.clientId = client._id; // Make it a real id
            req.db.insert(co.collections.clientmodules, clientModule).then((insertedClientModule) => {
                return res.send(insertedClientModule);
            });
        });
    });
});

/**
 * Delete client module
 */
router.delete('/:id', auth(co.permissions.ADMINISTRATION_CLIENT, 'w', co.modules.clients), validateId, function(req, res) {
    req.db.remove(co.collections.clientmodules, req.params.id).then((result) => {
        if (result.result.n < 1) {
            return res.sendStatus(404);
        }
        res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
    });
});

module.exports = router;
