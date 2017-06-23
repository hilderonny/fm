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
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var async = require('async');
var hat = require('hat');
var co = require('../utils/constants');

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
 * Liefert eine Liste von Portalen für die per URL übergebenen IDs. Die IDs müssen kommagetrennt sein.
 * Die Berechtigungen werden hier nicht per auth überprüft, da diese API für die Verknüpfungen verwendet
 * wird und da wäre es blöd, wenn ein 403 zur Neuanmeldung führte. Daher wird bei fehlender Berechtigung
 * einfach eine leere Liste zurück gegeben.
 * @example
 * $http.get('/api/portals/forIds?ids=ID1,ID2,ID3')...
 */
router.get('/forIds', auth(false, false, 'licenseserver'), (req, res) => {
    // Zuerst Berechtigung prüfen
    auth.canAccess(req.user._id, 'PERMISSION_LICENSESERVER_PORTAL', 'r', 'licenseserver', req.db).then(function(accessAllowed) {
        if (!accessAllowed) {
            return res.send([]);
        }
        if (!req.query.ids) {
            return res.send([]);
        }
        var ids = req.query.ids.split(',').filter(validateId.validateId).map(function(id) { return monk.id(id); }); // Nur korrekte IDs verarbeiten
        req.db.get('portals').find({
            _id: { $in: ids }
        }).then((portals) => {
            res.send(portals);
        });
    });
});

/**
 * Get single portal with given id
 */
router.get('/:id', auth('PERMISSION_LICENSESERVER_PORTAL', 'r', 'licenseserver'), validateId, validateSameClientId(co.collections.portals), (req, res) => {
    req.db.get('portals').findOne(req.params.id, req.query.fields).then((portal) => {
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
    portal.clientId = req.user.clientId; // Assing the new user to the same client as the logged in user, because users can create only users for their own clients
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
router.put('/:id', auth('PERMISSION_LICENSESERVER_PORTAL', 'w', 'licenseserver'), validateId, validateSameClientId(co.collections.portals), function(req, res) {
    var portal = req.body;
    if (!portal || Object.keys(portal).length < 1) {
        return res.sendStatus(400);
    }
    delete portal._id; // When portal object also contains the _id field
    delete portal.clientId; // Prevent assignment of the portal to another client
    // For the case that only the _id had to be updated, return an error and do not handle any further
    if (Object.keys(portal).length < 1) {
        return res.sendStatus(400);
    }
    req.db.update('portals', req.params.id, { $set: portal }).then((updatedPortal) => {
        return res.send(updatedPortal);
    });
});

/**
 * Delete portal and all dependent objects (portalmodules)
 */
router.delete('/:id', auth('PERMISSION_LICENSESERVER_PORTAL', 'w', 'licenseserver'), validateId, validateSameClientId(co.collections.portals), function(req, res) {
    var portalId = monk.id(req.params.id);
    var dependentCollections = co.collections;
    // Remove all dependent objects (currently only portalmodules)
    async.eachSeries(dependentCollections, (dependentCollection, callback) => {
        req.db.remove(dependentCollection, { portalId: portalId }).then((res) => {
            callback();
        });
    }, (err) => {
        req.db.remove('portals', req.params.id).then((result) => {
            res.sendStatus(204);
        });
    });
});

module.exports = router;
