/**
 * CRUD API for portal module assignments
 * 
 * portalmodule {
 *  _id
 *  portalId,
 *  module
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var fs = require('fs');
var co = require('../utils/constants');

router.get('/forPortal/:id', auth(co.permissions.LICENSESERVER_PORTAL, 'r', co.modules.licenseserver), validateId, validateSameClientId(co.collections.portals), function(req, res) {
    var portal;
    var portalModuleKeys = Object.keys(co.modules).map((k) => co.modules[k]);
    req.db.get(co.collections.portals).findOne(req.params.id).then(function(p) {
        portal = p;
        // Obtain the portal modules for the portal
        return req.db.get(co.collections.portalmodules).find({ 
            portalId: portal._id,
            module: { $in: portalModuleKeys }
        });
    }).then((portalModulesOfPortal) => {
        var result = portalModuleKeys.map((key) => {
            var existingPortalModule = portalModulesOfPortal.find((p) => p.module === key);
            return {
                _id: existingPortalModule ? existingPortalModule._id : null,
                clientId: portal.clientId,
                portalId: portal._id,
                active: existingPortalModule ? true : false,
                module: key
            };
        });
        res.send(result);
    });
});

/**
 * Create a new portal module
 */
router.post('/', auth(co.permissions.LICENSESERVER_PORTAL, 'w', co.modules.licenseserver), function(req, res) {
    var portalModule = req.body;
    if (!portalModule || Object.keys(portalModule).length < 2 || !portalModule.portalId || !validateId.validateId(portalModule.portalId) || !portalModule.module) { // At least portalId and module
        return res.sendStatus(400);
    }
    req.db.get(co.collections.portals).findOne(portalModule.portalId).then((portal) => {
        if (!portal || `${portal.clientId ? portal.clientId : 'null'}` !== `${req.user.clientId}`) {
            return Promise.reject(400);
        }
        delete portalModule._id; // Ids are generated automatically
        portalModule.portalId = portal._id;
        portalModule.clientId = portal.clientId;
        // Prüfen, ob so eine Zuordnung schon existiert.
        return req.db.get(co.collections.portalmodules).find(portalModule);
    }).then(function(existingAssignments) {
        if (existingAssignments.length > 0) {
            return Promise.reject(409); // Diese Zuordnung gibt es schon
        }
        return req.db.insert(co.collections.portalmodules, portalModule);
    }).then((insertedPortalModule) => {
        res.send(insertedPortalModule);
    }).catch((status) => {
        res.sendStatus(status);
    });
});

/**
 * Delete portal module
 */
router.delete('/:id', auth(co.permissions.LICENSESERVER_PORTAL, 'w', co.modules.licenseserver), validateId, validateSameClientId(co.collections.portalmodules), function(req, res) {
    req.db.remove(co.collections.portalmodules, req.params.id).then((result) => {
        if (result.result.n < 1) {
            return res.sendStatus(404);
        }
        res.sendStatus(204);
    });
});

module.exports = router;
