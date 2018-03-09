/**
 * CRUD API for portal management
 */
var co = require('../utils/constants');
var ah = require("../utils/apiHelper");
var hat = require('hat');
var auth = require('../middlewares/auth');
var Db = require("../utils/db").Db;

// Generate license key with hat, https://github.com/substack/node-hat
var generateLicenseKey = () => {
    return hat(1024, 32);
};

var router = ah.createApi({
    apiname: "portals",
    modulename: "licenseserver",
    permission: co.permissions.LICENSESERVER_PORTAL,
    mapfields: (e, user) => { return {
        _id: e.name, 
        name: e.label, 
        isActive: e.isactive, 
        licenseKey: e.licensekey, 
        version: e.version, 
        lastNotification: e.lastnotification, 
        url: e.url, 
        comment: e.comment
    }},
    mapfieldsreverse: (e) => { return {
        name: e._id, 
        label: e.name, 
        isactive: e.isActive, 
        licensekey: e.licenseKey, 
        version: e.version, 
        lastnotification: e.lastNotification, 
        url: e.url, 
        comment: e.comment, 
    }},
    children: [{
        datatypename: "portalmodules",
        parentfield: "portalname"
    }],
    getforids: true,
    getall: true,
    getid: true,
    post: async(portal, req, res) => { 
        portal.licensekey = generateLicenseKey();
        return true;
    },
    put: true,
    delete: true,
}, true);

/**
 * Generates a new license key for the portal with the given id 
 */
router.post('/newkey/:id', auth(co.permissions.LICENSESERVER_PORTAL, 'w', co.modules.licenseserver), async(req, res) => {
    var elementtoupdate = { licensekey: generateLicenseKey() };
    var result = await Db.updateDynamicObject(req.user.clientname, "portals", req.params.id, elementtoupdate);
    if (result.rowCount < 1) return res.sendStatus(404);
    return res.send(elementtoupdate);
});

module.exports = router