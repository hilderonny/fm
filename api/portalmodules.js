/**
 * CRUD API for portal module assignments
 */
var co = require('../utils/constants');
var ah = require("../utils/apiHelper");

module.exports = ah.createApi({
    apiname: "portalmodules",
    modulename: "licenseserver",
    permission: co.permissions.LICENSESERVER_PORTAL,
    mapfields: (e, user) => { return {
        _id: e.name, 
        // clientId: user.clientname, 
        portalId: e.portalname, 
        module: e.modulename
    }},
    mapfieldsreverse: (e) => { return {
        name: e._id, 
        portalname: e.portalId, 
        modulename: e.module
    }},
    parent: { 
        datatypename: "portals", 
        apisuffix: "forPortal", 
        parentfield: "portalname"
    },
    post: true,
    delete: true,
});
