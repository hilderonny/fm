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
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateSameClientId = require('../middlewares/validateSameClientId');
var co = require('../utils/constants');
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

router.post('/newpassword', auth(co.permissions.SETTINGS_USER, "w", co.modules.base), async(req, res) => {
    var password = req.body.pass;
    if (typeof(password) === 'undefined') return res.sendStatus(400);
    // Update password in allusers table
    await Db.updateDynamicObject(req.user.clientname, "users", req.user.name, { password: password });
    res.sendStatus(200);
});

module.exports = router;
