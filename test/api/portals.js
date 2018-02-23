/**
 * UNIT Tests for api/portals
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

th.createApiTests({
    apiname: "portals",
    beforeeach: [ th.preparePortals, th.preparePortalModules ],
    comparefields: ["_id", "name", "isActive", "version", "lastNotification", "url", "comment"],
    mapfields: (e, clientname) => { return {
        _id: e.name, 
        name: e.label, 
        isActive: e.isactive, 
        version: e.version, 
        lastNotification: e.lastnotification, 
        url: e.url, 
        comment: e.comment
    }},
    permission: co.permissions.PERMISSION_LICENSESERVER_PORTAL,
    elementname: "portal_portal0",
    testelement: { 
        name: "portal_testportal", 
        label: "label", 
        isactive: true,
        version: "version",
        lastnotification: 12345,
        url: "url",
        comment: "comment"
    },
    updateset: { comment: "Ronny wars" },
    cangetall: true,
    cangetforids: true,
    children: {
        datatypename: "portalmodules",
        parentfield: "portalname"
    },
    cangetid: true,
    canput: true,
    client: "portal",
    usergroup: "portal_usergroup0",
    user: "portal_usergroup0_user0",
    adminuser: "portal_usergroup0_user1",
    additionaltests: createAdditionalTests
});

function createAdditionalTests() {

    describe('POST/newkey', () => {

        it('responds without authentication with 403', async() => {
            await th.post(`/api/portals/newkey/portal_portal0`).expect(403);
        });
        
        it('responds without write permission with 403', async() => {
            await th.removeWritePermission("portal", "portal_usergroup0", co.permissions.LICENSESERVER_PORTAL);
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/portals/newkey/portal_portal0?token=${token}`).expect(403);
        });

        it('responds with non-exisitng id with 404', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/portals/newkey/999999999999999999999999?token=${token}`).expect(404);
        });

        it('responds with a new license key for the portal with the given id', async() => {
            var portalFromDatabaseBefore = await Db.getDynamicObject("portal", "portals", "portal_portal0");
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/portals/newkey/portal_portal0?token=${token}`).expect(200);
            var portalFromDatabaseAfter = await Db.getDynamicObject("portal", "portals", "portal_portal0");
            assert.notEqual(portalFromDatabaseBefore.licensekey, portalFromDatabaseAfter.licensekey);
        });

    });

}