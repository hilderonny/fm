/**
 * API for checking and downloading updates for portals from the license server.
 * Diese API ist auf dem Lizenzserver vorhanden und wird von den Portalen angesprochen.
 */
var router = require('express').Router();
var fs = require('fs');
var appPackager = require('../utils/app-packager');
var co = require('../utils/constants');

/**
 * API for checking for available updates for a specific portal. Returns the version number of the
 * currently available version.
 * Parameters:
 * - licenseKey: License key identifying the portal
 */
router.get('/version', (req, res) => {
    if (!req.query.licenseKey) {
        return res.sendStatus(400);
    }
    req.db.get('portals').findOne({ licenseKey: req.query.licenseKey, isActive: true}).then((portal) => {
        if (!portal) {
            return res.sendStatus(403); // No active portal with the given licenseKey found
        }
        var packageJson = JSON.parse(fs.readFileSync('./package.json').toString());
        return res.send(packageJson.version);
    });
});

/**
 * Download a ZIP file containing the current version of the app with content especially for the
 * portal. The ZIP package is complete and replaces all files of the current installation.
 * Parameters:
 * - licenseKey: License key of the portal to get the update package for
 */
router.get('/download', (req, res) => {
    if (!req.query.licenseKey) {
        return res.sendStatus(400);
    }
    req.db.get('portals').findOne({ licenseKey: req.query.licenseKey, isActive: true}).then((portal) => {
        if (!portal) {
            return res.sendStatus(403); // No active portal with the given licenseKey found
        }
        req.db.get('portalmodules').find({ portalId: portal._id}).then((portalModules) => {
            var moduleNames = portalModules.map((portalModule) => portalModule.module);
            if (moduleNames.length < 1) {
                return res.sendStatus(404); // At least one module must be configured
            }
            var packageJson = JSON.parse(fs.readFileSync('./package.json').toString());
            var version = packageJson.version;
            appPackager.pack(moduleNames, version).then(function(buffer) {
                res.set({'Content-disposition': `attachment; filename=${portal.name} ${version}.zip`}).send(buffer);
            });
        });
    });
});

/**
 * Wird von Portalen bei jedem Start aufgerufen, um deren aktuell installierte Version mitzuteilen.
 * Merkt sich den Zeitpunkt der letzten Meldung.
 * Künftig wird hier auch die Lizenz geprüft und das Portal ggf. am Start gehindert.
 */
router.post('/heartbeat', (req, res) => {
    if (!req.body.licenseKey || !req.body.version) {
        return res.sendStatus(400);
    }
    req.db.get(co.collections.portals.name).findOne({ licenseKey: req.body.licenseKey }).then((portal) => {
        if (!portal) {
            return res.sendStatus(403); // No active portal with the given licenseKey found
        }
        var updateSet = {
            version: req.body.version,
            lastNotification: Date.now()
        };
        req.db.update(co.collections.portals.name, portal._id, { $set: updateSet }).then(() => {
            res.sendStatus(200);
        });
    });

});

module.exports = router;
