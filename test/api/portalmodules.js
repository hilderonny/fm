/**
 * UNIT Tests for api/portalmodules
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var mc = require('../../config/module-config.json');
var Db = require("../../utils/db").Db;

describe('API portalmodules', () => {

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.preparePortals();
        await th.preparePortalModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
    });

    describe('GET/forportal/:name', () => {

        it('responds without authentication with 403', async() => {
            await th.get(`/api/portalmodules/forportal/portal_portal0`).expect(403);
        });

        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("portal", "portal_usergroup0", co.permissions.LICENSESERVER_PORTAL);
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.get(`/api/portalmodules/forportal/portal_portal0?token=${token}`).expect(403);
        });

        it('responds with not existing name with 200 and list of all modules which are not active', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var result = (await th.get(`/api/portalmodules/forportal/999999999999999999999999?token=${token}`).expect(200)).body;
            var modulenames = Object.keys(mc.modules);
            assert.strictEqual(result.length, modulenames.length);
            modulenames.forEach((mn) => {
                assert.ok(result.find(r => r.module === mn));
            });
        });

        it('responds with all portal modules where the states are correctly set', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var portalmodulesfromdatabase = (await Db.query(Db.PortalDatabaseName, `SELECT * FROM portalmodules WHERE portalname='portal_portal0';`)).rows;
            var portalmodulesfromapi = (await th.get(`/api/portalmodules/forportal/portal_portal0?token=${token}`).expect(200)).body;
            var keysFromDatabase = portalmodulesfromdatabase.map((p) => p.modulename);
            var keysFromApi = portalmodulesfromapi.map((p) => p.module);
            keysFromDatabase.forEach((key) => {
                assert.ok(keysFromApi.indexOf(key) >= 0, `Portal module ${key} not returned by API.`);
                assert.ok(portalmodulesfromapi.find(pma => pma.module === key).active);
            });
        });

        it('responds with all portal modules even when some of them are not defined in database', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            // Zugriff aus Datenbank löschen
            await Db.query(Db.PortalDatabaseName, `DELETE FROM portalmodules WHERE modulename = 'documents';`);
            var portalmodulesfromapi = (await th.get(`/api/portalmodules/forportal/portal_portal0?token=${token}`).expect(200)).body;
            var relevantportalmodule = portalmodulesfromapi.find((p) => p.module === "documents");
            assert.ok(relevantportalmodule);
            assert.ok(!relevantportalmodule.active);
        });

    });

    describe('POST/', () => {

        function createTestObject() {
            return { portalname: "portal_portal0", module: "ronnyseins" };
        }

        it('responds without authentication with 403', async() => {
            var testObject = createTestObject();
            await th.post(`/api/portalmodules`).send(testObject).expect(403);
        });

        it('responds without write permission with 403', async() => {
            var testObject = createTestObject();
            await th.removeWritePermission("portal", "portal_usergroup0", co.permissions.LICENSESERVER_PORTAL);
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/portalmodules?token=${token}`).send(testObject).expect(403);
        });

        it('responds with 400 when not sending an object to insert', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/portalmodules?token=${token}`).expect(400);
        });

        it('responds with 200 on success and creates the assignment', async() => {
            var testObject = createTestObject();
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/portalmodules?token=${token}`).send(testObject).expect(200);
            var portalmodulefromdatabase = (await Db.query(Db.PortalDatabaseName, `SELECT * FROM portalmodules WHERE portalname='${testObject.portalname}' AND modulename='${testObject.module}';`)).rows;
            assert.ok(portalmodulefromdatabase.length > 0);
            assert.strictEqual(portalmodulefromdatabase[0].portalname, testObject.portalname);
            assert.strictEqual(portalmodulefromdatabase[0].modulename, testObject.module);
        });

        it('responds with 200 when an assignment between a client and a module already exists', async() => {
            var testObject = { portalname: "portal_portal0", module: "activities" };
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/portalmodules?token=${token}`).send(testObject).expect(200);
            var portalmodulefromdatabase = (await Db.query(Db.PortalDatabaseName, `SELECT * FROM portalmodules WHERE portalname='${testObject.portalname}' AND modulename='${testObject.module}';`)).rows;
            assert.ok(portalmodulefromdatabase.length > 0);
        });
        
    });

    describe('DELETE/:portalname/:modulename', () => {

        it('responds without authentication with 403', async() => {
            await Db.query(Db.PortalDatabaseName, `INSERT INTO portalmodules (name, portalname, modulename) VALUES ('portal_portalname0', 'portal_portal0', 'DAtest');`);
            await th.del(`/api/portalmodules/portal_portal0/DAtest`).expect(403);
        });

        it('responds without write permission with 403', async() => {
            await Db.query(Db.PortalDatabaseName, `INSERT INTO portalmodules (name, portalname, modulename) VALUES ('portal_portalname0', 'portal_portal0', 'DAtest');`);
            await th.removeWritePermission("portal", "portal_usergroup0", co.permissions.LICENSESERVER_PORTAL);
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.del(`/api/portalmodules/portal_portal0/DAtest?token=${token}`).expect(403);
        });

        it('responds with 404 when the portalname is invalid', async() => {
            await Db.query(Db.PortalDatabaseName, `INSERT INTO portalmodules (name, portalname, modulename) VALUES ('portal_portalname0', 'portal_portal0', 'DAtest');`);
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.del(`/api/portalmodules/invalidportalname/DAtest?token=${token}`).expect(404);
        });

        it('responds with 404 when the modulename is invalid', async() => {
            await Db.query(Db.PortalDatabaseName, `INSERT INTO portalmodules (name, portalname, modulename) VALUES ('portal_portalname0', 'portal_portal0', 'DAtest');`);
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.del(`/api/portalmodules/portal_portal0/invalidmodulename?token=${token}`).expect(404);
        });

        it('deletes the portalmodule and return 204', async() => {
            await Db.query(Db.PortalDatabaseName, `INSERT INTO portalmodules (name, portalname, modulename) VALUES ('portal_portalname0', 'portal_portal0', 'DAtest');`);
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.del(`/api/portalmodules/portal_portal0/DAtest?token=${token}`).expect(204);
            var result = await Db.query(Db.PortalDatabaseName, "SELECT 1 FROM portalmodules WHERE portalname='portal_portal0' and modulename='DAtest';");
            assert.ok(result.rowCount < 1);
        });
        
    });

});
