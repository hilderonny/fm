/**
 * UNIT Tests for api/areas
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe.only('API areas', () =>{

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareAreas();
    });

    describe('GET/', () => {

        th.apiTests.get.defaultNegative(co.apis.areas, co.permissions.BIM_AREAS);

        xit('', async() => {
        });
        
    });

    describe('GET/din277/:areatypename', () => {

        it('responds without authentication with 403', async() => {
            await th.get(`/api/areas/din277/client0_areatype1`).expect(403);
        });

        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_AREAS);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.get(`/api/areas/din277/client0_areatype1?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', async() => {
            await th.removeClientModule("client0", co.modules.areas);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.get(`/api/areas/din277/client0_areatype1?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', async() => {
            await th.removeClientModule("client0", co.modules.areas);
            var token = await th.defaults.login("client0_usergroup0_user1");
            await th.get(`/api/areas/din277/client0_areatype1?token=${token}`).expect(403);
        });
        
        it('responds with not existing id with empty list', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = await th.get(`/api/areas/din277/999999999999999999999999?token=${token}`).expect(200);
            assert.strictEqual(result.body.length, 0);
        });

        it('responds with empty list when the object with the given ID does not belong to the client of the logged in user', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = await th.get(`/api/areas/din277/client1_areatype1?token=${token}`).expect(200);
            assert.strictEqual(result.body.length, 0);
        });

        xit('', async() => {
        });
        
    });

});