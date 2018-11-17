/**
 * UNIT Tests for api/areas
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('API areas', () =>{

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

        it('Responds with FM structure with correct category calculation', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var areas = (await th.get(`/api/areas?token=${token}`).expect(200)).body;
            var level0 = areas.find(e => e.name==="client0_level0");
            assert.ok(level0);
            assert.strictEqual(level0.nrf, "150");
            assert.strictEqual(level0.nuf, "60");
            assert.strictEqual(level0.tf, "40");
            assert.strictEqual(level0.vf, "50");
            assert.ok(level0._children);
            var room0 = level0._children.find(e => e.name==="client0_room0");
            assert.ok(room0);
            assert.strictEqual(room0.nrf, "30");
            assert.strictEqual(room0.nuf, "30");
            assert.strictEqual(room0.tf, "0");
            assert.strictEqual(room0.vf, "0");
            assert.ok(room0._children);
            assert.ok(room0._children.find(e => e.name==="client0_area01"));
            assert.ok(room0._children.find(e => e.name==="client0_area02"));
            var room1 = level0._children.find(e => e.name==="client0_room1");
            assert.ok(room1);
            assert.strictEqual(room1.nrf, "120");
            assert.strictEqual(room1.nuf, "30");
            assert.strictEqual(room1.tf, "40");
            assert.strictEqual(room1.vf, "50");
            assert.ok(room1._children);
            assert.ok(room1._children.find(e => e.name==="client0_area03"));
            assert.ok(room1._children.find(e => e.name==="client0_area04"));
            assert.ok(room1._children.find(e => e.name==="client0_area05"));
        });

        it('ignores parent relations when the relations table contains corrupt data (not existing parents)', async() => {
            // Create corrupt relation
            await th.createRelation("levels", "invalidlevel", "rooms", "client0_room0", "parentchild");
            var token = await th.defaults.login("client0_usergroup0_user0");
            var areas = (await th.get(`/api/areas?token=${token}`).expect(200)).body;
            var level0 = areas.find(e => e.name==="client0_level0");
            assert.ok(level0);
        });
        
    });

    describe('GET/din277/:entityname/:areatypename', () => {

        it('responds without authentication with 403', async() => {
            await th.get(`/api/areas/din277/client0_level0/client0_areatype1`).expect(403);
        });

        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_AREAS);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.get(`/api/areas/din277/client0_level0/client0_areatype1?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', async() => {
            await th.removeClientModule("client0", co.modules.areas);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.get(`/api/areas/din277/client0_level0/client0_areatype1?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', async() => {
            await th.removeClientModule("client0", co.modules.areas);
            var token = await th.defaults.login("client0_usergroup0_user1");
            await th.get(`/api/areas/din277/client0_level0/client0_areatype1?token=${token}`).expect(403);
        });
        
        it('responds with not existing areatypename with empty list', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = await th.get(`/api/areas/din277/client0_level0/999999999999999999999999?token=${token}`).expect(200);
            assert.strictEqual(result.body.length, 0);
        });
        
        it('responds with not existing entityname with empty list', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = await th.get(`/api/areas/din277/999999999999999999999999/client0_areatype1?token=${token}`).expect(200);
            assert.strictEqual(result.body.length, 0);
        });

        it('responds with empty list when the area type with the given name does not belong to the client of the logged in user', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = await th.get(`/api/areas/din277/client0_level0/client1_areatype1?token=${token}`).expect(200);
            assert.strictEqual(result.body.length, 0);
        });

        it('responds with empty list when the entity with the given name does not belong to the client of the logged in user', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = await th.get(`/api/areas/din277/client1_level0/client0_areatype1?token=${token}`).expect(200);
            assert.strictEqual(result.body.length, 0);
        });

        it('Contains all areas of the requested type and its subtypes recursively', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var areas = (await th.get(`/api/areas/din277/client0_level0/client0_areatype1?token=${token}`).expect(200)).body;
            assert.strictEqual(areas.length, 5);
            areas.sort((a, b) => a.name.localeCompare(b.name)); // Cannot be sure, in which order the API provides the elements
            assert.strictEqual(areas[0].name, "client0_area1");
            assert.strictEqual(areas[0].label, "Area1");
            assert.strictEqual(areas[0].areatypenumber, "N1");
            assert.strictEqual(areas[0].f, 200);
            assert.strictEqual(areas[1].name, "client0_area11");
            assert.strictEqual(areas[1].label, "Area11");
            assert.strictEqual(areas[1].areatypenumber, "N11");
            assert.strictEqual(areas[1].f, 210);
            assert.strictEqual(areas[2].name, "client0_area111");
            assert.strictEqual(areas[2].label, "Area111");
            assert.strictEqual(areas[2].areatypenumber, "N111");
            assert.strictEqual(areas[2].f, 211);
            assert.strictEqual(areas[3].name, "client0_area112");
            assert.strictEqual(areas[3].label, "Area112");
            assert.strictEqual(areas[3].areatypenumber, "N112");
            assert.strictEqual(areas[3].f, 212);
            assert.strictEqual(areas[4].name, "client0_area12");
            assert.strictEqual(areas[4].label, "Area12");
            assert.strictEqual(areas[4].areatypenumber, "N12");
            assert.strictEqual(areas[4].f, 220);
        });

        it('Contains only those areas which are direct or indirect childs of the given entity', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var areas = (await th.get(`/api/areas/din277/client0_room0/client0_areatype1?token=${token}`).expect(200)).body;
            assert.strictEqual(areas.length, 2);
            assert.ok(areas.find(a => a.name === "client0_area1"));
            assert.ok(areas.find(a => a.name === "client0_area11"));
        });


        it('returns the name of the area when the area has no label set', async() => {
            await Db.updateDynamicObject("client0", "areas", "client0_area1", { label: null });
            var token = await th.defaults.login("client0_usergroup0_user0");
            var areas = (await th.get(`/api/areas/din277/client0_level0/client0_areatype1?token=${token}`).expect(200)).body;
            var area = areas.find(a => a.name === "client0_area1");
            assert.strictEqual(area.label, area.name);
        });
        
    });

    describe('GET/usagestate/:name', () => {

        it('responds without authentication with 403', async() => {
            await th.get(`/api/areas/usagestate/client0_level0`).expect(403);
        });

        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_AREAS);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.get(`/api/areas/usagestate/client0_level0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', async() => {
            await th.removeClientModule("client0", co.modules.areas);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.get(`/api/areas/usagestate/client0_level0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', async() => {
            await th.removeClientModule("client0", co.modules.areas);
            var token = await th.defaults.login("client0_usergroup0_user1");
            await th.get(`/api/areas/usagestate/client0_level0?token=${token}`).expect(403);
        });
        
        it('responds with not existing name with empty list', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = await th.get(`/api/areas/usagestate/999999999999999999999999?token=${token}`).expect(200);
            assert.strictEqual(result.body.length, 0);
        });

        it('responds with empty list when the object with the given name exists but does not belong to the client of the logged in user', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = await th.get(`/api/areas/usagestate/client1_level0?token=${token}`).expect(200);
            assert.strictEqual(result.body.length, 0);
        });

        it('returns a list of usagetypes on success', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = await th.get(`/api/areas/usagestate/client0_level0?token=${token}`).expect(200);
            var list = result.body;
            assert.ok(list.length > 1);
            assert.ok(list.find(r => r.label === 'UsageState1' && r.f === 511 ));
            assert.ok(list.find(r => r.label === 'UsageState2' && r.f === 692 ));
        });

        it('does not return unused usagetypes', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = await th.get(`/api/areas/usagestate/client0_level0?token=${token}`).expect(200);
            assert.ok(!result.body.find(r => r.label === 'UsageState3' ));
        });

    });

    describe('GET/belagarten/:name', () => {
        it('responds without authentication with 403', async() => {
            await th.get(`/api/areas/belagarten/client0_level0`).expect(403);
        });

        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_AREAS);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.get(`/api/areas/belagarten/client0_level0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', async() => {
            await th.removeClientModule("client0", co.modules.areas);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.get(`/api/areas/belagarten/client0_level0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', async() => {
            await th.removeClientModule("client0", co.modules.areas);
            var token = await th.defaults.login("client0_usergroup0_user1");
            await th.get(`/api/areas/belagarten/client0_level0?token=${token}`).expect(403);
        });

        it('responds with not existing name with empty list', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = await th.get(`/api/areas/belagarten/999999999999999999999999?token=${token}`).expect(200);
            assert.strictEqual(result.body.length, 0);
        });

        it('responds with empty list when the object with the given name exists but does not belong to the client of the logged in user', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = await th.get(`/api/areas/belagarten/client1_level0?token=${token}`).expect(200);
            assert.strictEqual(result.body.length, 0);
        });

    });

});