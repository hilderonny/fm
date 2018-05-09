/**
 * CRUD API for client management
 */
var auth = require('../middlewares/auth');
var Db = require("../utils/db").Db;
var router = require('express').Router();
var co = require('../utils/constants');
var bcryptjs = require("bcryptjs");

/**
 * Creates an admin for a client. Must be defined before the overall POST handler below,
 * because otherwise the /newadmin URL part would be interpreted as :id
 */
router.post('/newadmin', auth(co.permissions.ADMINISTRATION_CLIENT, 'w', co.modules.clients), async(req, res) => {
    var newAdmin = req.body;
    if (!newAdmin || Object.keys(newAdmin).length < 1 || !newAdmin.name || !newAdmin.password || !newAdmin.clientname) {
        return res.sendStatus(400);
    }
    if ((await Db.query(Db.PortalDatabaseName, `SELECT 1 FROM clients WHERE name = '${Db.replaceQuotes(newAdmin.clientname)}';`)).rowCount < 1) return res.sendStatus(400);
    // Check whether username is in use
    if ((await Db.query(Db.PortalDatabaseName, `SELECT 1 FROM allusers WHERE name = '${Db.replaceQuotes(newAdmin.name)}';`)).rowCount > 0) return res.sendStatus(409); // Conflict
    var usergroup = { name: Db.createName(), label: newAdmin.name };
    await Db.insertDynamicObject(newAdmin.clientname, "usergroups", usergroup);
    var usertoinsert = { name: newAdmin.name, password: bcryptjs.hashSync(newAdmin.password), usergroupname: usergroup.name, isadmin: true };
    await Db.query(Db.PortalDatabaseName, `INSERT INTO allusers (name, password, clientname) VALUES('${Db.replaceQuotes(usertoinsert.name)}', '${Db.replaceQuotes(usertoinsert.password)}', '${Db.replaceQuotes(newAdmin.clientname)}');`);
    await Db.query(newAdmin.clientname, `INSERT INTO users (name, label, password, usergroupname, isadmin) VALUES('${Db.replaceQuotes(usertoinsert.name)}', '${Db.replaceQuotes(usertoinsert.name)}', '${Db.replaceQuotes(usertoinsert.password)}', '${Db.replaceQuotes(usertoinsert.usergroupname)}', ${!!usertoinsert.isadmin});`);
    res.sendStatus(200);
});

module.exports = router;
