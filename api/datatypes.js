var router = require('express').Router();
var auth = require('../middlewares/auth');
var Db = require("../utils/db").Db;
var co = require('../utils/constants');

// Retreive all datatypes. The result can be filtered by the query parameter "forlist"
router.get("/", auth(co.permissions.ADMINISTRATION_DATATYPES, "r", co.modules.base), async(req, res) => {
    var datatypes = await Db.getDataTypes(req.user.clientname, req.query.forlist);
    res.send(datatypes);
});

// Retreive all datatype fields of all datatypes. The access is public because the API is needed for details pages
router.get("/fields", auth(), async(req, res) => {
    var datatypefields = await Db.getDataTypeFields(req.user.clientname);
    res.send(datatypefields);
});

// Retreive all datatype fields for a given datatypename. The access is public because the API is needed for details pages
router.get("/fields/:datatypename", auth(), async(req, res) => {
    var datatypefields = await Db.getDataTypeFields(req.user.clientname, req.params.datatypename);
    res.send(datatypefields);
});

// Retreive a specific datatype. Used for showing the label on details pages. No authentication required
router.get("/:datatypename", auth(), async(req, res) => {
    var datatype = await Db.getDataType(req.user.clientname, req.params.datatypename);
    res.send(datatype);
});

module.exports = router;
