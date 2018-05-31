var auth = require('../middlewares/auth');
var Db = require("../utils/db").Db;
var router = require('express').Router();
var co = require('../utils/constants');
var confighelper = require("../utils/configHelper");
var ch = require("../utils/calculationhelper");

/**
 * This API is for administering datatypes in the recordtype module.
 * Nicht mit /api/datatypes verwechseln, welches im base-Modul enthalten ist
 */

// For Setting list of record types
router.get('/', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, "r", co.modules.recordtypes), async(req, res) => {
    var elements = await Db.getdatatypes(req.user.clientname);
    res.send(Object.keys(elements).map(k => elements[k]));
});

router.get('/field/:recordtypename/:fieldname', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, "r", co.modules.recordtypes), async(req, res) => {
    var clientname = req.user.clientname;
    var datatypename = Db.replaceQuotes(req.params.recordtypename);
    var fieldname = Db.replaceQuotes(req.params.fieldname);
    var rows = (await Db.query(clientname, `SELECT * FROM datatypefields WHERE datatypename='${datatypename}' AND name='${fieldname}';`)).rows;
    if (rows.length < 1) return res.sendStatus(404);
    var field = rows[0];
    res.send(rows[0]);
});

// Retreive all possible lists from module-config
router.get('/lists', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, "r", co.modules.recordtypes), async(req, res) => {
    var clientname = req.user.clientname;
    var modules = await confighelper.getAvailableModulesForClient(clientname);
    var datatypescope = clientname === Db.PortalDatabaseName ? "portaldatatypes" : "clientdatatypes";
    // Obtain fields from module config
    var lists = modules.reduce((arr, mod) => {
        var datatypes = mod[datatypescope];
        if (datatypes) datatypes.forEach(dt => {
            if (!dt.lists) return;
            dt.lists.forEach(l => {
                if (arr.indexOf(l) < 0) arr.push(l);
            });
        });
        return arr;
    }, []);
    // Each datatype has its own list name
    var datatypes = await Db.getdatatypes(clientname);
    Object.keys(datatypes).forEach(key => {
        if (lists.indexOf(key) < 0) lists.push(key);
    });
    res.send(lists);
});
        
// For detail view of record type.
// Returns the fields as array instead of object
router.get('/:name', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, "r", co.modules.recordtypes), async(req, res) => {
    var clientname = req.user.clientname;
    var datatypename = Db.replaceQuotes(req.params.name);
    var rows = (await Db.query(clientname, `SELECT * FROM datatypes WHERE name='${datatypename}';`)).rows;
    if (rows.length < 1) return res.sendStatus(404);
    var datatype = rows[0];
    datatype.fields = (await Db.query(clientname, `SELECT * FROM datatypefields WHERE datatypename='${datatypename}';`)).rows;
    res.send(datatype);
});

// TODO: Namen auf nicht erlaubte Namen prüfen (Sub-URLs in diversen APIs, vordefinierte Tabellennamen, wie users, clients, datatypes, datatypefields, etc.)
router.post('/', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, 'w', co.modules.recordtypes), async(req, res) => {
    var recordtype = req.body;
    if (!recordtype || 
        !recordtype.name || 
        !recordtype.name.match(/^[a-z]*$/) || 
        (recordtype.lists && !Array.isArray(recordtype.lists)) ||
        co.forbiddendatatypenames.indexOf(recordtype.name) >= 0) {
        return res.status(400).send("Error in request data format");
    }
    var clientname = req.user.clientname;
    if ((await Db.getdatatypes(clientname))[recordtype.name]) return res.sendStatus(409);
    if (!recordtype.lists) recordtype.lists = [];
    if (recordtype.lists.indexOf(recordtype.name) < 0) recordtype.lists.push(recordtype.name);
    try {
        await Db.createDatatype(clientname, recordtype.name, recordtype.label || "", recordtype.plurallabel || "", "name", recordtype.icon || "", recordtype.lists, recordtype.permissionkey || "", null, recordtype.canhaverelations, recordtype.candefinename);
        res.sendStatus(200);
    } catch(error) {
        res.status(400).send(error.message); // Invalid attribute types and so
    }
});

// TODO: Formeln auf Gültigkeit prüfen und Verweise auch
router.post('/field/:datatypename', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, 'w', co.modules.recordtypes), async(req, res) => {
    var field = req.body;
    var clientname = req.user.clientname;
    var datatypename = Db.replaceQuotes(req.params.datatypename);
    if (!field || !field.name || !field.name.match(/^[a-z]*$/)) {
        return res.status(400).send("Invalid field name")
    }
    var existingdatatype = (await Db.getdatatypes(clientname))[datatypename];
    if (!existingdatatype) return res.sendStatus(404);
    if (existingdatatype.fields[field.name]) return res.sendStatus(409);
    try {
        await Db.createDatatypeField(clientname, existingdatatype.name, field.name, field.label, field.fieldtype, field.isrequired, false, field.reference, field.formula ? JSON.parse(field.formula) : undefined, field.formulaindex, field.isnullable, field.ishidden, false, false, field.rows);
        // Recalculate all entities of the datatype when a formula field was added
        if (field.fieldtype === co.fieldtypes.formula) {
            await ch.recalculateforupdateddatatype(clientname, datatypename);
        }
        res.sendStatus(200);
    } catch(error) {
        res.status(400).send(error.message); // Invalid formula and so
    }
});

router.put('/field/:datatypename/:fieldname', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, 'w', co.modules.recordtypes), async(req, res) => {
    var clientname = req.user.clientname;
    var datatypename = Db.replaceQuotes(req.params.datatypename);
    var fieldname = Db.replaceQuotes(req.params.fieldname);
    var field = req.body;
    var existingdatatype = (await Db.getdatatypes(clientname))[datatypename];
    if (!existingdatatype) return res.sendStatus(404);
    var existingfield = existingdatatype.fields[fieldname];
    if (!existingfield) return res.sendStatus(404);
    var updateset = {};
    var keys = Object.keys(field);
    if (keys.indexOf("label") >= 0) updateset.label = field.label;
    if (!existingfield.ispredefined && keys.indexOf("formula") >= 0) updateset.formula = field.formula;
    if (!existingfield.ispredefined && keys.indexOf("formulaindex") >= 0) updateset.formulaindex = field.formulaindex;
    if (keys.indexOf("ishidden") >= 0) updateset.ishidden = field.ishidden;
    if (keys.indexOf("rows") >= 0) updateset.rows = field.rows;
    if (Object.keys(updateset).length < 1) return res.status(400).send("Update set does not contain valid information");
    try {
        await Db.updaterecordtypefield(clientname, datatypename, fieldname, updateset);
        // Force update of cache in the next request
        delete Db.datatypes;
        // Recalculate all entities of the datatype when a formula field was changed
        if (existingfield.fieldtype === co.fieldtypes.formula && ( field.formula || field.formulaindex)) {
            await ch.recalculateforupdateddatatype(clientname, datatypename);
        }
        res.sendStatus(200);
    } catch(error) {
        res.status(400).send(error.message);
    }
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
    if (keys.indexOf("lists") >= 0) updateset.lists = recordtype.lists;
    if (keys.indexOf("icon") >= 0) updateset.icon = recordtype.icon;
    if (!existing.ispredefined && keys.indexOf("permissionkey") >= 0) updateset.permissionkey = recordtype.permissionkey;
    if (!existing.ispredefined && keys.indexOf("canhaverelations") >= 0) updateset.canhaverelations = recordtype.canhaverelations;
    if (!existing.ispredefined && keys.indexOf("candefinename") >= 0) updateset.candefinename = recordtype.candefinename;
    if (Object.keys(updateset).length < 1) return res.status(400).send("Update set does not contain valid information");
    try {
        await Db.updaterecordtype(clientname, recordtypename, updateset);
        // Force update of cache in the next request
        delete Db.datatypes;
        res.sendStatus(200);
    } catch(error) {
        res.status(400).send(error.message);
    }
});

router.delete('/field/:datatypename/:fieldname', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, 'w', co.modules.recordtypes), async(req, res) => {
    var clientname = req.user.clientname;
    var datatypename = Db.replaceQuotes(req.params.datatypename);
    var fieldname = Db.replaceQuotes(req.params.fieldname);
    var existingdatatype = (await Db.getdatatypes(clientname))[datatypename];
    if (!existingdatatype) return res.sendStatus(404);
    var existingfield = existingdatatype.fields[fieldname];
    if (!existingfield) return res.sendStatus(404);
    if (existingfield.ispredefined || existingdatatype.titlefield === fieldname) return res.status(400).send("Field is either predefined or set as title field and so cannot be deleted.");
    await Db.deleteRecordTypeField(clientname, datatypename, fieldname);
    if (existingfield.fieldtype === co.fieldtypes.formula) {
        await ch.recalculateforupdateddatatype(clientname, datatypename);
    }
    res.sendStatus(204);
});

router.delete('/:name', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, 'w', co.modules.recordtypes), async(req, res) => {
    var clientname = req.user.clientname;
    var datatypename = Db.replaceQuotes(req.params.name);
    var existing = (await Db.getdatatypes(clientname))[datatypename];
    if (!existing) return res.sendStatus(404);
    if (existing.ispredefined) return res.status(400).send("Datatype is predefined");
    var referencingfields = await Db.query(clientname, `SELECT 1 FROM datatypefields WHERE fieldtype='reference' AND reference='${datatypename}';`);
    if (referencingfields.rowCount > 0) return res.status(400).send("Datatype is still referenced by other datatypes");
    var existingrelationstootherdatatypes = await Db.query(clientname, `SELECT 1 FROM relations WHERE (datatype1name='${datatypename}' AND NOT datatype2name='${datatypename}') OR (datatype2name='${datatypename}' AND NOT datatype1name='${datatypename}');`);
    if (existingrelationstootherdatatypes.rowCount > 0) return res.status(400).send("There exist relations to this datatype");
    await Db.deleteRecordType(clientname, datatypename);
    res.sendStatus(204);
});

module.exports = router;
