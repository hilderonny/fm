/**
 * CRUD API for portal module assignments
 */
var co = require('../utils/constants');
var auth = require('../middlewares/auth');
var Db = require("../utils/db").Db;
var mc = require('../config/module-config.json');
var router = require('express').Router();

router.get("/forportal/:name", auth(co.permissions.LICENSESERVER_PORTAL, 'r', co.modules.licenseserver), async(req, res) => {
    var portalname = req.params.name;
    var result = Object.keys(mc.modules).map(k => { return {
        portalname: portalname,
        module: k,
        active: false
    }});
    var assignedportalmodules = await Db.getDynamicObjects(req.user.clientname, co.collections.portalmodules.name, { portalname : portalname });
    assignedportalmodules.forEach(m => {
        var r = result.find(e => e.module === m.modulename);
        r.active = true;
    });
    res.send(result);
});

router.post('/', auth(co.permissions.LICENSESERVER_PORTAL, 'w', co.modules.licenseserver), async(req, res) => {
    var portalmodule = req.body;
    if (!portalmodule || Object.keys(portalmodule).length < 2 || !portalmodule.portalname || !portalmodule.module) return res.sendStatus(400);
    var portalname = Db.replaceQuotes(portalmodule.portalname);
    var modulename = Db.replaceQuotes(portalmodule.module);
    var result = await Db.query(Db.PortalDatabaseName, `SELECT * FROM portals WHERE name = '${portalname}';`);
    if (result.rowCount < 1) return res.sendStatus(400);
    var portal = result.rows[0];
    if ((await Db.query(Db.PortalDatabaseName, `SELECT 1 FROM portalmodules WHERE portalname='${portalname}' AND modulename = '${modulename}';`)).rowCount < 1) {
        await Db.query(Db.PortalDatabaseName, `INSERT INTO portalmodules (name, portalname, modulename) VALUES ('${Db.createName()}', '${portalname}', '${modulename}');`);
    }
    res.sendStatus(200);
});

router.delete('/:portalname/:modulename', auth(co.permissions.LICENSESERVER_PORTAL, 'w', co.modules.licenseserver), async(req, res) => {
    var portalname = Db.replaceQuotes(req.params.portalname);
    var modulename = Db.replaceQuotes(req.params.modulename);
    var result = await Db.query(Db.PortalDatabaseName, `SELECT 1 FROM portalmodules WHERE portalname='${portalname}' AND modulename = '${modulename}';`);
    if (result.rowCount < 1) return res.sendStatus(404);
    await Db.query(Db.PortalDatabaseName, `DELETE FROM portalmodules WHERE portalname='${portalname}' AND modulename = '${modulename}';`);
    res.sendStatus(204);
});

module.exports = router;