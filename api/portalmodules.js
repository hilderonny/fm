/**
 * CRUD API for portal module assignments
 */
var co = require('../utils/constants');
var ah = require("../utils/apiHelper");
var auth = require('../middlewares/auth');
var Db = require("../utils/db").Db;
var mc = require('../config/module-config.json');

var router = ah.createApi({
    apiname: "portalmodules",
    modulename: "licenseserver",
    permission: co.permissions.LICENSESERVER_PORTAL,
    mapfields: (e, user) => { return {
        _id: e.name, 
        portalId: e.portalname, 
        module: e.modulename
    }},
    mapfieldsreverse: (e) => { return {
        name: e._id, 
        portalname: e.portalId, 
        modulename: e.module
    }},
    post: true,
    delete: true,
});

router.get("/forPortal/:id", auth(co.permissions.LICENSESERVER_PORTAL, 'r', co.modules.licenseserver), async(req, res) => {
    var portalname = req.params.id;
    var result = Object.keys(mc.modules).map(k => { return {
        _id: null,
        portalId: portalname,
        module: k,
        active: false
    }});
    var assignedportalmodules = await Db.getDynamicObjects(req.user.clientname, co.collections.portalmodules.name, { portalname : portalname });
    assignedportalmodules.forEach(m => {
        var r = result.find(e => e.module === m.modulename);
        r.active = true;
        r._id = m.name;
    });
    res.send(result);
});

module.exports = router;