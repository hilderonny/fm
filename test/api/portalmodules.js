/**
 * UNIT Tests for api/portalmodules
 */
var th = require('../testhelpers');
var co = require('../../utils/constants');

th.createApiTests({
    apiname: "portalmodules",
    beforeeach: [ th.preparePortals, th.preparePortalModules ],
    comparefields: ["_id", "portalId", "module"],
    mapfields: (e, clientname) => { return {
        _id: e.name, 
        // clientId: clientname, 
        portalId: e.portalname, 
        module: e.modulename
    }},
    forparent: { 
        datatypename: "portals", 
        apisuffix: "forPortal", 
        parentfield: "portalname",
        clientparentfield: "portalId",
        elementname: "portal_portal0"
    },
    permission: co.permissions.LICENSESERVER_PORTAL,
    elementname: "portal_portalmodule0" ,
    testelement: { 
        name: "testportalmodule", 
        portalname: "portal_portal0", 
        modulename: "ronnyseins"
    },
    client: "portal",
    usergroup: "portal_usergroup0",
    user: "portal_usergroup0_user0",
    adminuser: "portal_usergroup0_user1",
});
