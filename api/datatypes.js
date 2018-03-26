var router = require('express').Router();
var auth = require('../middlewares/auth');
var Db = require("../utils/db").Db;
var co = require('../utils/constants');

router.get("/", auth(co.permissions.ADMINISTRATION_DATATYPES, "r", co.modules.base), async(req, res) => {
    var datatypes = await Db.getDataTypes(req.user.clientname, req.query.forlist);
    res.send(datatypes);
});

module.exports = router;
