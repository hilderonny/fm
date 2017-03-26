/**
 * CRUD API for portal management
 * 
 * portal {
 *  _id
 *  name
 *  isActive
 *  licenseKey
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var monk = require('monk');
var async = require('async');
var hat = require('hat');
var constants = require('../utils/constants');

// Generate license key with hat, https://github.com/substack/node-hat
var generateLicenseKey = () => {
    return hat(1024, 32);
};

/**
 * List all portals
 */
router.get('/', auth('PERMISSION_LICENSESERVER_PORTAL', 'r', 'licenseserver'), (req, res) => {
    req.db.get('portals').find({}, req.query.fields).then((portals) => {
        return res.send(portals);
    });
});

/**
 * Get single portal with given id
 */
router.get('/:id', auth('PERMISSION_LICENSESERVER_PORTAL', 'r', 'licenseserver'), validateId, (req, res) => {
    req.db.get('portals').findOne(req.params.id, req.query.fields).then((portal) => {
        if (!portal) {
            return res.sendStatus(404);
        }
        return res.send(portal);
    });
});

/**
 * Generates a new license key for the portal with the given id 
 */
router.post('/newkey/:id', auth('PERMISSION_LICENSESERVER_PORTAL', 'w', 'licenseserver'), validateId, function(req, res) {
    var portal = {
        licenseKey: generateLicenseKey()
    };
    req.db.update('portals', req.params.id, { $set: portal }).then((updatedPortal) => {
        if (!updatedPortal || updatedPortal.lastErrorObject) {
            return res.sendStatus(404);
        }
        return res.send(updatedPortal);
    });
});

/**
 * Create a new portal and assign the modules "base" and "portalbase" by default
 */
router.post('/', auth('PERMISSION_LICENSESERVER_PORTAL', 'w', 'licenseserver'), function(req, res) {
    var portal = req.body;
    if (!portal || Object.keys(portal).length < 1) {
        return res.sendStatus(400);
    }
    delete portal._id; // Ids are generated automatically
    // Generate new license key for new portal. Overwrite eventually sent licenseKey
    portal.licenseKey = generateLicenseKey();
    req.db.insert('portals', portal).then((insertedPortal) => {
        var newPortalModules = [
            { portalId: insertedPortal._id, module: 'base' },
            { portalId: insertedPortal._id, module: 'portalbase' }
        ];
        req.db.insert('portalmodules', newPortalModules).then(() => {
            return res.send(insertedPortal);
        });
    });
});

/**
 * Update portal details
 */
router.put('/:id', auth('PERMISSION_LICENSESERVER_PORTAL', 'w', 'licenseserver'), validateId, function(req, res) {
    var portal = req.body;
    if (!portal || Object.keys(portal).length < 1) {
        return res.sendStatus(400);
    }
    delete portal._id; // When portal object also contains the _id field
    // For the case that only the _id had to be updated, return an error and do not handle any further
    if (Object.keys(portal).length < 1) {
        return res.sendStatus(400);
    }
    req.db.update('portals', req.params.id, { $set: portal }).then((updatedPortal) => {
        if (!updatedPortal || updatedPortal.lastErrorObject) {
            return res.sendStatus(404);
        }
        return res.send(updatedPortal);
    });
});

/**
 * Delete portal and all dependent objects (portalmodules)
 */
router.delete('/:id', auth('PERMISSION_LICENSESERVER_PORTAL', 'w', 'licenseserver'), validateId, function(req, res) {
    var portalId = monk.id(req.params.id);
    var dependentCollections = constants.collections;
    // Remove all dependent objects (currently only portalmodules)
    async.eachSeries(dependentCollections, (dependentCollection, callback) => {
        req.db.remove(dependentCollection, { portalId: portalId }).then((res) => {
            callback();
        });
    }, (err) => {
        req.db.remove('portals', req.params.id).then((result) => {
            if (result.result.n < 1) {
                return res.sendStatus(404);
            }
            res.sendStatus(204);
        });
    });
});

module.exports = router;
