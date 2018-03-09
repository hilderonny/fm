/**
 * API for checking and downloading updates for portals from the license server.
 * Diese API ist auf dem Lizenzserver vorhanden und wird von den Portalen angesprochen.
 */
var router = require('express').Router();
var fs = require('fs');
var appPackager = require('../utils/app-packager');
var co = require('../utils/constants');
var Db = require("../utils/db").Db;

/**
 * API for checking for available updates for a specific portal. Returns the version number of the
 * currently available version.
 * Parameters:
 * - licenseKey: License key identifying the portal
 */
router.get('/version', async(req, res) => {
    if (!req.query.licenseKey) return res.sendStatus(400);
    var portal = await Db.getDynamicObject(Db.PortalDatabaseName, co.collections.portals.name, { licensekey: req.query.licenseKey, isactive: true });
    if (!portal) return res.sendStatus(403); // No active portal with the given licenseKey found
    var packageJson = JSON.parse(fs.readFileSync('./package.json').toString());
    return res.send(packageJson.version);
});

/**
 * Download a ZIP file containing the current version of the app with content especially for the
 * portal. The ZIP package is complete and replaces all files of the current installation.
 * Parameters:
 * - licenseKey: License key of the portal to get the update package for
 */
router.get('/download', async(req, res) => {
    if (!req.query.licenseKey) return res.sendStatus(400);
    var portal = await Db.getDynamicObject(Db.PortalDatabaseName, co.collections.portals.name, { licensekey: req.query.licenseKey, isactive: true });
    if (!portal) return res.sendStatus(403); // No active portal with the given licenseKey found
    var portalModules = await Db.getDynamicObjects(Db.PortalDatabaseName, co.collections.portalmodules.name, { portalname: portal.name });
    var moduleNames = portalModules.map((portalModule) => portalModule.modulename);
    if (moduleNames.length < 1) return res.sendStatus(404); // At least one module must be configured
    var packageJson = JSON.parse(fs.readFileSync('./package.json').toString());
    var version = packageJson.version;
    var buffer = await appPackager.pack(moduleNames, version);
    res.set({'Content-disposition': `attachment; filename=${portal.name} ${version}.zip`}).send(buffer);
});

/**
 * Wird von Portalen bei jedem Start aufgerufen, um deren aktuell installierte Version mitzuteilen.
 * Merkt sich den Zeitpunkt der letzten Meldung.
 * Künftig wird hier auch die Lizenz geprüft und das Portal ggf. am Start gehindert.
 */
router.post('/heartbeat', async(req, res) => {
    if (!req.body.licenseKey || !req.body.version) return res.sendStatus(400);
    var portal = await Db.getDynamicObject(Db.PortalDatabaseName, co.collections.portals.name, { licensekey: req.body.licenseKey });
    if (!portal) return res.sendStatus(403); // No active portal with the given licenseKey found
    var updateSet = {
        version: req.body.version,
        lastnotification: Date.now()
    };
    await Db.updateDynamicObject(Db.PortalDatabaseName, co.collections.portals.name, portal.name, updateSet);
    res.sendStatus(200);
});

module.exports = router;
