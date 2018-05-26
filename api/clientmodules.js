/**
 * CRUD API for client module assignments
 */
var auth = require('../middlewares/auth');
var Db = require("../utils/db").Db;
var dah = require('../utils/dynamicAttributesHelper');
var router = require('express').Router();
var co = require('../utils/constants');
var mc = require('../config/module-config.json'); // http://stackoverflow.com/a/14678694

router.get('/forClient/:name', auth(co.permissions.ADMINISTRATION_CLIENT, 'r', co.modules.clients), async(req, res) => {
    if ((await Db.query(Db.PortalDatabaseName, `SELECT * FROM clients WHERE name = '${Db.replaceQuotes(req.params.name)}';`)).rowCount < 1) return res.sendStatus(404);
    var allModuleKeys = Object.keys(mc.modules).filter(mk => mc.modules[mk].forclients);
    var clientModulesOfClient = (await Db.query(Db.PortalDatabaseName, `SELECT * FROM clientmodules WHERE clientname='${Db.replaceQuotes(req.params.name)}' AND modulename IN (${allModuleKeys.map((k) => `'${Db.replaceQuotes(k)}'`).join(",")});`)).rows;
    var result = allModuleKeys.map((key) => {
        var existingClientModule = clientModulesOfClient.find((c) => c.modulename === key);
        return {
            clientname: req.params.name,
            active: existingClientModule ? true : false,
            module: key
        };
    });
    res.send(result);
});

router.post('/', auth(co.permissions.ADMINISTRATION_CLIENT, 'w', co.modules.clients), async(req, res) => {
    var clientModule = req.body;
    if (!clientModule || Object.keys(clientModule).length < 2 || !clientModule.clientname || !clientModule.module) return res.sendStatus(400);
    var result = await Db.query(Db.PortalDatabaseName, `SELECT * FROM clients WHERE name = '${Db.replaceQuotes(clientModule.clientname)}';`);
    if (result.rowCount < 1) return res.sendStatus(400);
    var client = result.rows[0];
    if ((await Db.query(Db.PortalDatabaseName, `SELECT 1 FROM clientmodules WHERE clientname='${Db.replaceQuotes(clientModule.clientname)}' AND modulename = '${Db.replaceQuotes(clientModule.module)}';`)).rowCount < 1) {
        await Db.query(Db.PortalDatabaseName, `INSERT INTO clientmodules (clientname, modulename) VALUES ('${Db.replaceQuotes(clientModule.clientname)}', '${Db.replaceQuotes(clientModule.module)}');`);
        await dah.activateDynamicAttributesForClient(clientModule.clientname, clientModule.module);
    }
    res.sendStatus(200);
});

/**
 * Löscht eine Modulzuordnung für einen Mandanten.
 * Deaktiviert ggf. dynamische Attribute des Moduls.
 */
router.delete('/:clientname/:modulename', auth(co.permissions.ADMINISTRATION_CLIENT, 'w', co.modules.clients), async(req, res) => {
    var clientname = Db.replaceQuotes(req.params.clientname);
    var modulename = Db.replaceQuotes(req.params.modulename);
    var result = await Db.query(Db.PortalDatabaseName, `SELECT 1 FROM clientmodules WHERE clientname='${clientname}' AND modulename = '${modulename}';`);
    if (result.rowCount < 1) return res.sendStatus(404);
    await dah.deactivateDynamicAttributesForClient(clientname, modulename);
    await Db.query(Db.PortalDatabaseName, `DELETE FROM clientmodules WHERE clientname='${clientname}' AND modulename = '${modulename}';`);
    res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
});

module.exports = router;
