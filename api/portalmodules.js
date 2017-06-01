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
var monk = require('monk');
var fs = require('fs');

/**
 * List all available portal module names for a given portal
 */
router.get('/available', auth('PERMISSION_LICENSESERVER_PORTAL', 'r', 'licenseserver'), (req, res) => {
    if (!req.query.portalId || !validateId.validateId(req.query.portalId)) {
        return res.sendStatus(400);
    }
    var moduleConfig = JSON.parse(fs.readFileSync('./config/module-config.json').toString());
    var availablePortalModuleKeys = Object.keys(moduleConfig.modules);
    req.db.get('portals').findOne(req.query.portalId).then((portal) => {
        if (!portal) {
            res.sendStatus(400);
            return;
        }
        req.db.get('portalmodules').find({ portalId: portal._id }, req.query.fields).then((portalModules) => {
            portalModules.forEach((portalModule) => {
                var foundIndex = availablePortalModuleKeys.indexOf(portalModule.module);
                if (foundIndex >= 0) {
                    // Return only those modules which are not already assigned
                    availablePortalModuleKeys.splice(foundIndex, 1);
                }
            });
            res.send(availablePortalModuleKeys);
            return;
        });
    });
});

/**
 * List all portal module assignments for a given portal.
 */
router.get('/', auth('PERMISSION_LICENSESERVER_PORTAL', 'r', 'licenseserver'), (req, res) => {
    if (!req.query.portalId || !validateId.validateId(req.query.portalId)) {
        return res.sendStatus(400);
    }
    req.db.get('portals').findOne(req.query.portalId).then((portal) => {
        if (!portal) {
            return res.sendStatus(400);
        }
        req.db.get('portalmodules').find({ portalId: portal._id }, req.query.fields).then((portalModules) => {
            return res.send(portalModules);
        });
    });
});

/**
 * Get single portal module with given id
 */
router.get('/:id', auth('PERMISSION_LICENSESERVER_PORTAL', 'r', 'licenseserver'), validateId, (req, res) => {
    req.db.get('portalmodules').findOne(req.params.id, req.query.fields).then((portalModule) => {
        if (!portalModule) {
            return res.sendStatus(404);
        }
        return res.send(portalModule);
    });
});

/**
 * Create a new portal module
 */
router.post('/', auth('PERMISSION_LICENSESERVER_PORTAL', 'w', 'licenseserver'), function(req, res) {
    var portalModule = req.body;
    if (!portalModule || Object.keys(portalModule).length < 2 || !portalModule.portalId || !validateId.validateId(portalModule.portalId) || !portalModule.module) { // At least portalId and module
        return res.sendStatus(400);
    }
    req.db.get('portals').findOne(portalModule.portalId).then((portal) => {
        if (!portal) {
            return res.sendStatus(400);
        }
        delete portalModule._id; // Ids are generated automatically
        portalModule.portalId = portal._id; // Make it a real id
        // Prüfen, ob so eine Zuordnung schon existiert.
        req.db.get('portalmodules').find(portalModule).then(function(existingAssignments) {
            if (existingAssignments.length > 0) {
                return res.sendStatus(409); // Diese Zuordnung gibt es schon
            }
            req.db.insert('portalmodules', portalModule).then((insertedPortalModule) => {
                return res.send(insertedPortalModule);
            });
        });
    });
});

/**
 * Update portal module details
 */
router.put('/:id', auth('PERMISSION_LICENSESERVER_PORTAL', 'w', 'licenseserver'), validateId, function(req, res) {
    var portalModule = req.body;
    if (!portalModule || Object.keys(portalModule).length < 1) {
        return res.sendStatus(400);
    }
    delete portalModule._id; // When portal object also contains the _id field
    delete portalModule.portalId; // When portal object also contains the portalId field
    // For the case that only the _id had to be updated, return an error
    if (Object.keys(portalModule).length < 1) {
        return res.sendStatus(400);
    }
    req.db.update('portalmodules', req.params.id, { $set: portalModule }).then((updatedPortalModule) => {
        if (!updatedPortalModule || updatedPortalModule.lastErrorObject) {
            return res.sendStatus(404);
        }
        return res.send(updatedPortalModule);
    });
});

/**
 * Delete portal module
 */
router.delete('/:id', auth('PERMISSION_LICENSESERVER_PORTAL', 'w', 'licenseserver'), validateId, function(req, res) {
    req.db.remove('portalmodules', req.params.id).then((result) => {
        if (result.result.n < 1) {
            return res.sendStatus(404);
        }
        res.sendStatus(204);
    });
});

module.exports = router;
