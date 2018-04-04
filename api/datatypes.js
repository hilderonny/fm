var router = require('express').Router();
var auth = require('../middlewares/auth');
var Db = require("../utils/db").Db;
var co = require('../utils/constants');

// Retreive all datatypes and their fields
router.get("/", auth(), async(req, res) => {
    var datatypes = await Db.getdatatypes(req.user.clientname);
    res.send(datatypes);
});

module.exports = router;
