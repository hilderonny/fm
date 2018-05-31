var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateSameClientId = require('../middlewares/validateSameClientId');
var co = require('../utils/constants');
var Db = require("../utils/db").Db;

router.post('/newpassword', auth(co.permissions.SETTINGS_USER, "w", co.modules.base), async(req, res) => {
    var password = req.body.pass;
    if (typeof(password) === 'undefined') return res.sendStatus(400);
    // Update password in allusers table
    await Db.updateDynamicObject(req.user.clientname, "users", req.user.name, { password: password });
    res.sendStatus(200);
});

module.exports = router;
