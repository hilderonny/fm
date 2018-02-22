/**
 * CRUD API for client management
 */
var auth = require('../middlewares/auth');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;
var rh = require('../utils/relationsHelper');
var dah = require('../utils/dynamicAttributesHelper');
var router = require('express').Router();
var co = require('../utils/constants');
var bcryptjs = require("bcryptjs");

function mapFields(e) {
    return {
        _id: e.name,
        name: e.label
    }
}

function mapFieldsReverse(e) {
    return {
        name: e._id,
        label: e.name
    }
}

router.get('/forIds', auth(false, false, co.modules.clients), async(req, res) => {
    // Zuerst Berechtigung prüfen
    var accessAllowed = await auth.canAccess(req.user.name, co.permissions.ADMINISTRATION_CLIENT, "r", co.modules.clients);
    if (!accessAllowed) return res.send([]);
    if (!req.query.ids) return res.send([]);
    var elements = (await Db.query(Db.PortalDatabaseName, `SELECT * FROM clients WHERE name IN (${req.query.ids.split(',').map(id => `'${id}'`).join(",")});`)).rows;
    res.send(elements.map(mapFields));
});

router.get('/', auth(co.permissions.ADMINISTRATION_CLIENT, "r", co.modules.clients), async(req, res) => {
    var elements = (await Db.query(Db.PortalDatabaseName, "SELECT * FROM clients")).rows;
    res.send(elements.map(mapFields));
});
        
router.get('/:id', auth(co.permissions.ADMINISTRATION_CLIENT, "r", co.modules.clients), async(req, res) => {
    var result = await Db.query(Db.PortalDatabaseName, `SELECT * FROM clients WHERE name = '${req.params.id}';`);
    if (result.rowCount < 1) return res.sendStatus(404);
    res.send(mapFields(result.rows[0]));
});

// /**
//  * Creates an admin for a client. Must be defined before the overall POST handler below,
//  * because otherwise the /newadmin URL part would be interpreted as :id
//  */
router.post('/newadmin', auth(co.permissions.ADMINISTRATION_CLIENT, 'w', co.modules.clients), async(req, res) => {
    var newAdmin = req.body;
    if (!newAdmin || Object.keys(newAdmin).length < 1 || !newAdmin.name || !newAdmin.clientId) {
        return res.sendStatus(400);
    }
    if ((await Db.query(Db.PortalDatabaseName, `SELECT 1 FROM clients WHERE name = '${newAdmin.clientId}';`)).rowCount < 1) return res.sendStatus(400);
    if (await Db.getDynamicObject(newAdmin.clientId, "users", newAdmin.name)) return res.sendStatus(409);
    var usergroup = { name: uuidv4(), label: newAdmin.name };
    await Db.insertDynamicObject(newAdmin.clientId, "usergroups", usergroup);
    var user = { name: newAdmin.name, password: bcryptjs.hashSync(newAdmin.pass), usergroupname: usergroup.name, isadmin: true };
    await Db.insertDynamicObject(newAdmin.clientId, "users", user);
    res.send({ _id: user.name, name: user.name, userGroupId: user.usergroupname, clientId: newAdmin.clientId, isAdmin: user.isadmin });
});

router.post('/', auth(co.permissions.ADMINISTRATION_CLIENT, 'w', co.modules.clients), async(req, res) => {
    var element = req.body;
    if (!element || Object.keys(element).length < 1) {
        return res.sendStatus(400);
    }
    await Db.query(Db.PortalDatabaseName, `INSERT INTO clients (name, label) VALUES ('${element.name}','${element.name}');`);
    await Db.query(Db.PortalDatabaseName, `INSERT INTO clientmodules (clientname, modulename) VALUES ('${element.name}','${co.modules.base}');`);
    await Db.query(Db.PortalDatabaseName, `INSERT INTO clientmodules (clientname, modulename) VALUES ('${element.name}','${co.modules.doc}');`);
    res.send({_id:element.name,name:element.name});
});

/**
 * Update client details
 */
router.put('/:id', auth(co.permissions.ADMINISTRATION_CLIENT, 'w', co.modules.clients), async(req, res) => {
    var client = req.body;
    if (!client || Object.keys(client).length < 1) {
        return res.sendStatus(400);
    }
    // For the case that only the _id had to be updated, return the original client, because the _id cannot be changed
    if (client._id && Object.keys(client).length < 2) return res.send(client);
    delete client._id; // When client object also contains the _id field
    var result = await Db.query(Db.PortalDatabaseName, `UPDATE clients SET label = '${client.name}' WHERE name = '${req.params.id}';`);
    if (result.rowCount < 1) return res.sendStatus(404);
    return res.send(client);
});

// /**
//  * Delete client and all dependent objects
//  */
router.delete('/:id', auth(co.permissions.ADMINISTRATION_CLIENT, 'w', co.modules.clients), async(req, res) => {
    if (!(await Db.deleteClient(req.params.id))) return res.sendStatus(404);
    res.sendStatus(204);
});

module.exports = router;
