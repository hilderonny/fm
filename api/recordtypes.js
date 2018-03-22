var auth = require('../middlewares/auth');
var Db = require("../utils/db").Db;
var router = require('express').Router();
var co = require('../utils/constants');

router.get('/', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, "r", co.modules.recordtypes), async(req, res) => {
    var elements = await Db.getDataTypes(req.user.clientname);
    res.send(elements);
});
        
router.get('/:name', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, "r", co.modules.recordtypes), async(req, res) => {
    // var result = await Db.query(Db.PortalDatabaseName, `SELECT * FROM clients WHERE name = '${Db.replaceQuotes(req.params.id)}';`);
    // if (result.rowCount < 1) return res.sendStatus(404);
    // res.send(mapFields(result.rows[0]));
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
    // var client = req.body;
    // if (!client || Object.keys(client).length < 1) {
    //     return res.sendStatus(400);
    // }
    // // For the case that only the _id had to be updated, return the original client, because the _id cannot be changed
    // if (client._id && Object.keys(client).length < 2) return res.send(client);
    // delete client._id; // When client object also contains the _id field
    // var result = await Db.query(Db.PortalDatabaseName, `UPDATE clients SET label = '${Db.replaceQuotes(client.name)}' WHERE name = '${Db.replaceQuotes(req.params.id)}';`);
    // if (result.rowCount < 1) return res.sendStatus(404);
    // return res.send(client);
});

router.delete('/:name', auth(co.permissions.SETTINGS_CLIENT_RECORDTYPES, 'w', co.modules.recordtypes), async(req, res) => {
    // if (!(await Db.deleteClient(req.params.id))) return res.sendStatus(404);
    // res.sendStatus(204);
});

module.exports = router;
