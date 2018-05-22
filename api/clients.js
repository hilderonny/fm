/**
 * CRUD API for client management
 */
var auth = require('../middlewares/auth');
var Db = require("../utils/db").Db;
var router = require('express').Router();
var co = require('../utils/constants');
var bcryptjs = require("bcryptjs");
var eh = require("../utils/exporthelper");
var multer = require('multer');
var upload = multer({ dest: 'uploads/' });

router.get('/export/:clientname', auth(co.permissions.ADMINISTRATION_CLIENT, 'r', co.modules.clients), async (req, res) => {
    var clientname = req.params.clientname;
    if ((await Db.query(Db.PortalDatabaseName, `SELECT 1 FROM clients WHERE name = '${Db.replaceQuotes(clientname)}';`)).rowCount < 1) return res.sendStatus(404);
    var withdatatypes = req.query.datatypes === "true";
    var withcontent = req.query.content === "true";
    var withfiles = req.query.files === "true";
    var prefix = clientname + "_" + Date.now().toString();
    var buffer = await eh.export(clientname, withdatatypes, withcontent, withfiles, prefix);
    res.set({ 'Content-disposition': `attachment; filename=${prefix}.zip` }).send(buffer);
});

router.post('/import', auth(co.permissions.ADMINISTRATION_CLIENT, 'w', co.modules.clients), upload.single('file'), async (req, res) => {
    var zipfile = req.file;
    var label = req.query.label;
    try {
        var clientname = await eh.import(zipfile, label);
        res.send(clientname);
    } catch(error) {
        console.log(error);
        res.send("Error"); // Error in parsing zip file
    }
});

/**
 * Creates an admin for a client. Must be defined before the overall POST handler below,
 * because otherwise the /newadmin URL part would be interpreted as :id
 */
router.post('/newadmin', auth(co.permissions.ADMINISTRATION_CLIENT, 'w', co.modules.clients), async (req, res) => {
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
