/**
 * CRUD API for user management
 * user {
 *  _id,
 *  name,
 *  pass,
 *  userGroupId,
 *  clientId,
 *  isAdmin
 * }
 */
var bcryptjs = require('bcryptjs');
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateSameClientId = require('../middlewares/validateSameClientId');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');
var dah = require('../utils/dynamicAttributesHelper');
var Db = require("../utils/db").Db;

function mapFields(e, user) {
    // Passwort niemals mappen
    var user = {
        _id: e.name,
        clientId: user.clientname,
        name: e.name,
        userGroupId: e.usergroupname,
        isAdmin: e.isadmin
    }
    if (e.usergroup) user.userGroup = e.usergroup;
    return user;
}

router.get(`/forUserGroup/:id`, auth(co.permissions.ADMINISTRATION_USER, 'r', co.modules.base), validateSameClientId(co.collections.usergroups.name), async(req, res) => {
    var elements = await Db.getDynamicObjects(req.user.clientname, "users", { usergroupname: req.params.id});
    res.send(elements.map((e) => { return mapFields(e, req.user); }));
});

/**
 * Gibt eine Liste von Benutzern des Mandanten des angemeldeten Benutzers zurück.
 * Wenn als Query-Parameter "joinUserGroup=true" angegeben ist, werden in der Property "userGroup"
 * auch noch die Daten der Benutzergruppe der Benutzer zurück gegeben.
 */
router.get('/', auth(co.permissions.ADMINISTRATION_USER, 'r', 'base'), async(req, res) => {
    var users = await Db.getDynamicObjects(req.user.clientname, "users");
    if (req.query.joinUserGroup) { // Daten der Benutzergruppe einbinden
        var usergroups = await Db.getDynamicObjects(req.user.clientname, "usergroups");
        users.forEach((user) => {
            var usergroup = usergroups.find((ug) => ug.name === user.usergroupname);
            user.usergroup = { _id: usergroup.name, name: usergroup.label };
        });
    }
    res.send(users.map((e) => { return mapFields(e, req.user); }));
});

router.get('/forIds', auth(false, false, co.modules.base), async(req, res) => {
    // Zuerst Berechtigung prüfen
    var accessAllowed = await auth.canAccess(req.user.name, co.permissions.ADMINISTRATION_USER, 'r', co.modules.base);
    if (!accessAllowed) {
        return res.send([]);
    }
    if (!req.query.ids) {
        return res.send([]);
    }
    var users = await Db.getDynamicObjectsForNames(req.user.clientname, "users", req.query.ids.split(','));
    var usergroups = await Db.getDynamicObjects(req.user.clientname, "usergroups");
    users.forEach((user) => {
        var usergroup = usergroups.find((ug) => ug.name === user.usergroupname);
        user.usergroup = { _id: usergroup.name, name: usergroup.label };
    });
    res.send(users.map((e) => { return mapFields(e, req.user); }));
});

router.get('/:id', auth(co.permissions.ADMINISTRATION_USER, "r", co.modules.base), async(req, res) => {
    var user = await Db.getDynamicObject(req.user.clientname, "users", req.params.id);
    if (!user) return res.sendStatus(404);
    res.send(mapFields(user, req.user));
});

router.post('/newpassword', auth(co.permissions.SETTINGS_USER, "w", co.modules.base), async(req, res) => {
    if (typeof(req.body.pass) === 'undefined') return res.sendStatus(400);
    await Db.updateDynamicObject(req.user.clientname, "users", req.user.name, { password: bcryptjs.hashSync(req.body.pass) });
    res.sendStatus(200);
});

// Create an user
router.post('/', auth(co.permissions.ADMINISTRATION_USER, "w", co.modules.base), async(req, res) => {
    var user = req.body;
    if (!user || Object.keys(user).length < 1 || !user.name || !user.pass || !user.userGroupId) {
        return res.sendStatus(400);
    }
    // Check whether username is in use
    if ((await Db.query(Db.PortalDatabaseName, `SELECT 1 FROM allusers WHERE name = '${user.name}';`)).rowCount > 0) return res.sendStatus(409); // Conflict
    // Check whether userGroup exists
    if (!(await Db.getDynamicObject(req.user.clientname, "usergroups", user.userGroupId))) return res.sendStatus(400);
    var usertoinsert = {
        name: user.name,
        label: user.name,
        password: bcryptjs.hashSync(user.pass),
        usergroupname: user.userGroupId,
        isadmin: user.isAdmin
    };
    await Db.query(Db.PortalDatabaseName, `INSERT INTO allusers (name, password, clientname) VALUES('${usertoinsert.name}', '${usertoinsert.password}', '${req.user.clientname}');`);
    await Db.query(req.user.clientname, `INSERT INTO users (name, label, password, usergroupname, isadmin) VALUES('${usertoinsert.name}', '${usertoinsert.name}', '${usertoinsert.password}', '${usertoinsert.usergroupname}', ${usertoinsert.isadmin});`);
    return res.send(mapFields(usertoinsert, req.user));
});

// Update an user
router.put('/:id', auth(co.permissions.ADMINISTRATION_USER, "w", co.modules.base), validateSameClientId(co.collections.users.name), async(req, res) => {
    var user = req.body;
    if (!user || Object.keys(user).length < 1) return res.sendStatus(400);
    // Check whether userGroup exists
    var usertoupdate = {};
    if (user.pass && user.pass.length > 0) usertoupdate.password = bcryptjs.hashSync(user.pass);
    if (user.userGroupId) {
        if (!(await Db.getDynamicObject(req.user.clientname, "usergroups", user.userGroupId))) return res.sendStatus(400);
        usertoupdate.usergroupname = user.userGroupId;
    }
    if (typeof(user.isAdmin) !== "undefined") usertoupdate.isadmin = user.isAdmin;
    if (user.name) usertoupdate.label = user.name;
    if (Object.keys(usertoupdate).length < 1) return res.sendStatus(400);
    await Db.updateDynamicObject(req.user.clientname, "users", req.params.id, usertoupdate);
    return res.send(mapFields(usertoupdate, req.user));
});

// Delete an user
router.delete('/:id', auth(co.permissions.ADMINISTRATION_USER, "w", co.modules.base), validateSameClientId(co.collections.users.name), async(req, res) => {
    var id = req.params.id;
    var clientname = req.user.clientname;
    var result = await Db.deleteDynamicObject(clientname, "users", id);
    if (result.rowCount < 1) return res.sendStatus(403); // Error in deletion, maybe filters do not match like in activities?
    await rh.deleteAllRelationsForEntity(clientname, "users", id);
    await dah.deleteAllDynamicAttributeValuesForEntity(clientname, id);
    res.sendStatus(204);
});

module.exports = router;
