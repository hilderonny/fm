var auth = require('../middlewares/auth');
var Db = require("../utils/db").Db;
var router = require('express').Router();
var co = require('../utils/constants');

// For retrieving datatypes at client startup
router.get('/', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, "r", co.modules.recordtypes), async(req, res) => {
    var elements = await Db.getdatatypes(req.user.clientname);
    res.send(elements);
});

// For Setting list of record types
router.get('/forlist', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, "r", co.modules.recordtypes), async(req, res) => {
    var elements = await Db.getdatatypes(req.user.clientname);
    res.send(Object.keys(elements).map(k => elements[k]));
});
        
// For detail view of record type
router.get('/:name', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, "r", co.modules.recordtypes), async(req, res) => {
    var clientname = req.user.clientname;
    var datatypename = Db.replaceQuotes(req.params.name);
    var rows = (await Db.query(clientname, `SELECT * FROM datatypes WHERE name='${datatypename}';`)).rows;
    if (rows.length < 1) return res.sendStatus(404);
    var datatype = rows[0];
    datatype.fields = (await Db.query(clientname, `SELECT * FROM datatypefields WHERE datatypename='${datatypename}';`)).rows;
    res.send(datatype);
});

router.post('/', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, 'w', co.modules.recordtypes), async(req, res) => {
    // var element = req.body;
    // if (!element || Object.keys(element).length < 1 || !element.name) {
    //     return res.sendStatus(400);
    // }
    // var clientname = uuidv4().replace(/-/g, ""); // UUID contains dashes which cannot be used as database names
    // await Db.createClient(clientname, element.name);
    // await Db.query(Db.PortalDatabaseName, `INSERT INTO clientmodules (clientname, modulename) VALUES ('${Db.replaceQuotes(clientname)}', '${Db.replaceQuotes(co.modules.base)}');`);
    // await Db.query(Db.PortalDatabaseName, `INSERT INTO clientmodules (clientname, modulename) VALUES ('${Db.replaceQuotes(clientname)}', '${Db.replaceQuotes(co.modules.doc)}');`);
    // res.send({_id:clientname,name:element.name});
});

router.put('/:name', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, 'w', co.modules.recordtypes), async(req, res) => {
    var recordtype = req.body;
    var clientname = req.user.clientname;
    var recordtypename = req.params.name;
    var existing = (await Db.getdatatypes(clientname))[recordtypename];
    if (!existing) return res.sendStatus(404);
    var updateset = {};
    var keys = Object.keys(recordtype);
    if (keys.indexOf("label") >= 0) updateset.label = recordtype.label;
    if (keys.indexOf("plurallabel") >= 0) updateset.plurallabel = recordtype.plurallabel;
    if (keys.indexOf("titlefield") >= 0) updateset.titlefield = recordtype.titlefield;
    if (keys.indexOf("icon") >= 0) updateset.icon = recordtype.icon;
    if (!existing.ispredefined && keys.indexOf("permissionkey") >= 0) updateset.permissionkey = recordtype.permissionkey;
    if (!existing.ispredefined && keys.indexOf("canhaverelations") >= 0) updateset.canhaverelations = recordtype.canhaverelations;
    if (!existing.ispredefined && keys.indexOf("candefinename") >= 0) updateset.candefinename = recordtype.candefinename;
    await Db.updaterecordtype(clientname, recordtypename, updateset);
    // Force update of cache in the next request
    delete Db.datatypes;
    res.sendStatus(200);
});

router.delete('/:name', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, 'w', co.modules.recordtypes), async(req, res) => {
    // if (!(await Db.deleteClient(req.params.id))) return res.sendStatus(404);
    // res.sendStatus(204);
});

module.exports = router;
