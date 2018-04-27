/**
 * UNIT Tests for api/portals
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');

describe('API portals', async() => {

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
    });

    describe('GET/newkey', () => {

        it('responds without authentication with 403', async() => {
            await th.get(`/api/portals/newkey`).expect(403);
        });
        
        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("portal", "portal_usergroup0", co.permissions.LICENSESERVER_PORTAL);
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.get(`/api/portals/newkey?token=${token}`).expect(403);
        });

        it('responds with a new license key', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var licensekey = (await th.get(`/api/portals/newkey?token=${token}`).expect(200)).text;
            assert.ok(licensekey);
            assert.ok(licensekey.length > 0);
        });

    });

});