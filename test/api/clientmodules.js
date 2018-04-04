/**
 * UNIT Tests for api/clientmodules
 */
var assert = require('assert');
var fs = require('fs');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var moduleConfig = require('../../config/module-config.json');
var Db = require("../../utils/db").Db;

describe('API clientmodules', () => {

    /**
     * Modul-config mit vorgegebenen DAs vorbereiten, wir benutzen ein eigenes Modul "DAtest"
     */
    function prepareModuleConfigForDynamicAttributes() {
        moduleConfig.modules.DAtest = {
            dynamicattributes: {
                users: [
                    {
                        identifier: 'DAtest_user_1',
                        name_en: 'DAtest_user_1',
                        type: co.dynamicAttributeTypes.text
                    },
                    {
                        identifier: 'DAtest_user_2',
                        name_en: 'DAtest_user_2',
                        type: co.dynamicAttributeTypes.picklist,
                        options: [
                            { text_en: 'DAtest_user_2_1', value: 'DAtest_user_2_1' },
                            { text_en: 'DAtest_user_2_2', value: 'DAtest_user_2_2' }
                        ]
                    }
                ]
            }
        };
    }

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await Db.query("client0", "DELETE FROM dynamicattributes WHERE identifier like 'DAtest%';");
        await Db.query("client0", "DELETE FROM dynamicattributeoptions WHERE value like 'DAtest%';");
        prepareModuleConfigForDynamicAttributes();
    });

    afterEach(async() => {
        delete moduleConfig.modules.DAtest;
    });

    describe('GET/forClient/:id', () => {

        it('responds without authentication with 403', async() => {
            await th.get(`/api/clientmodules/forClient/client0`).expect(403);
        });

        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("portal", "portal_usergroup0", co.permissions.ADMINISTRATION_CLIENT);
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.get(`/api/clientmodules/forClient/client0?token=${token}`).expect(403);
        });

        it('responds with not existing id with 404', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.get(`/api/clientmodules/forClient/999999999999999999999999?token=${token}`).expect(404);
        });

        it('responds with all client modules where the states are correctly set', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var clientModulesFromDatabase = (await Db.query(Db.PortalDatabaseName, `SELECT * FROM clientmodules WHERE clientname='client0';`)).rows;
            var clientModulesFromApi = (await th.get(`/api/clientmodules/forClient/client0?token=${token}`).expect(200)).body;
            var keysFromDatabase = clientModulesFromDatabase.map((p) => p.modulename);
            var keysFromApi = clientModulesFromApi.map((p) => p.module);
            keysFromDatabase.forEach((key) => {
                assert.ok(keysFromApi.indexOf(key) >= 0, `Client module ${key} not returned by API.`);
            });
            keysFromApi.forEach((key) => {
                assert.ok(keysFromDatabase.indexOf(key) >= 0, `Client module ${key} not prepared in database`);
            });
        });

        it('responds with all client modules even when some of them are not defined in database', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            // Zugriff aus Datenbank löschen
            await Db.query(Db.PortalDatabaseName, `DELETE FROM clientmodules WHERE modulename = 'documents';`);
            var clientModulesFromApi = (await th.get(`/api/clientmodules/forClient/client0?token=${token}`).expect(200)).body;
            var relevantClientModule = clientModulesFromApi.find((p) => p.module === "documents");
            assert.ok(relevantClientModule);
            assert.ok(!relevantClientModule.active);
        });

    });

    describe('POST/', () => {

        function createTestObject() {
            return { clientId: "client0", module: "ronnyseins" };
        }

        it('responds without authentication with 403', async() => {
            var testObject = createTestObject();
            await th.post(`/api/clientmodules`).send(testObject).expect(403);
        });

        it('responds without write permission with 403', async() => {
            var testObject = createTestObject();
            await th.removeWritePermission("portal", "portal_usergroup0", co.permissions.ADMINISTRATION_CLIENT);
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/clientmodules?token=${token}`).send(testObject).expect(403);
        });

        it('responds with 400 when not sending an object to insert', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/clientmodules?token=${token}`).expect(400);
        });

        it('responds with the created element containing an _id field', async() => {
            var testObject = createTestObject();
            var token = await th.defaults.login("portal_usergroup0_user0");
            var objectFromApi = (await th.post(`/api/clientmodules?token=${token}`).send(testObject).expect(200)).body;
            assert.strictEqual(objectFromApi._id, testObject.clientId + "_--_" + testObject.module);
            assert.strictEqual(objectFromApi.clientId, testObject.clientId);
            assert.strictEqual(objectFromApi.module, testObject.module);
            var result = await Db.query(Db.PortalDatabaseName, `SELECT * FROM clientmodules WHERE clientname='${testObject.clientId}' AND modulename='${testObject.module}';`);
            assert.ok(result.rowCount > 0);
            var objectFromDatabase = result.rows[0];
            assert.strictEqual(objectFromDatabase.clientname, testObject.clientId);
            assert.strictEqual(objectFromDatabase.modulename, testObject.module);
        });

        it('responds with the existing assignment when an assignment between a client and a module already exists', async() => {
            var testObject = { clientId: "client0", module: "activities" };
            var token = await th.defaults.login("portal_usergroup0_user0");
            var objectFromApi = (await th.post(`/api/clientmodules?token=${token}`).send(testObject).expect(200)).body;
            assert.strictEqual(objectFromApi._id, testObject.clientId + "_--_" + testObject.module);
            var result = await Db.query(Db.PortalDatabaseName, `SELECT * FROM clientmodules WHERE clientname='${testObject.clientId}' AND modulename='${testObject.module}';`);
            assert.ok(result.rowCount > 0);
        });

        it('Vorgegebene DAs, die noch nicht existieren, werden angelegt und sind nicht inaktiv', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var moduleAssignment = { module: 'DAtest', clientId: "client0" };
            await th.post(`/api/clientmodules?token=${token}`).send(moduleAssignment).expect(200);
            var das = (await Db.query("client0", "SELECT * FROM dynamicattributes WHERE identifier IS NOT NULL;")).rows;
            assert.strictEqual(das.length, 2);
            assert.ok(das.find((da) => da.identifier === 'DAtest_user_1' && !da.isinactive ));
            assert.ok(das.find((da) => da.identifier === 'DAtest_user_2' && !da.isinactive ));
            var daos = (await Db.query("client0", "SELECT * FROM dynamicattributeoptions WHERE value IS NOT NULL;")).rows;
            assert.strictEqual(daos.length, 2);
            assert.ok(daos.find((dao) => dao.value === 'DAtest_user_2_1' ));
            assert.ok(daos.find((dao) => dao.value === 'DAtest_user_2_2' ));
        });

        it('Vorgegebene DAs, die bereits aktiv sind, bleiben aktiv', async() => {
            // DAs vorbereiten
            await Db.insertDynamicObject("client0", "dynamicattributes", { name: "datest001", identifier: 'DAtest_user_1', label: 'DAtest_user_1', dynamicattributetypename: co.dynamicAttributeTypes.text });
            // Der Rest wie oben
            var token = await th.defaults.login("portal_usergroup0_user0");
            var moduleAssignment = { module: 'DAtest', clientId: "client0" };
            await th.post(`/api/clientmodules?token=${token}`).send(moduleAssignment).expect(200);
            var das = (await Db.query("client0", "SELECT * FROM dynamicattributes WHERE identifier IS NOT NULL;")).rows;
            assert.strictEqual(das.length, 2);
            var textAttribute = das.find((da) => da.identifier === 'DAtest_user_1' && !da.isinactive );
            assert.ok(textAttribute);
        });

        it('Vorgegebene DAs, die inaktiv sind, werden aktiviert', async() => {
            // DAs vorbereiten
            await Db.insertDynamicObject("client0", "dynamicattributes", { name: "datest001", identifier: 'DAtest_user_1', label: 'DAtest_user_1', dynamicattributetypename: co.dynamicAttributeTypes.text, isinactive: true });
            // Der Rest wie oben
            var token = await th.defaults.login("portal_usergroup0_user0");
            var moduleAssignment = { module: 'DAtest', clientId: "client0" };
            await th.post(`/api/clientmodules?token=${token}`).send(moduleAssignment).expect(200);
            var das = (await Db.query("client0", "SELECT * FROM dynamicattributes WHERE identifier IS NOT NULL;")).rows;
            assert.strictEqual(das.length, 2);
            var textAttribute = das.find((da) => da.identifier === 'DAtest_user_1' && !da.isinactive );
            assert.ok(textAttribute);
        });
        
    });

    describe('DELETE/:id', () => {

        it('responds without authentication with 403', async() => {
            await Db.query(Db.PortalDatabaseName, `INSERT INTO clientmodules (clientname, modulename) VALUES ('client0', 'DAtest');`);
            await th.del(`/api/clientmodules/client0_--_DAtest`).expect(403);
        });

        it('responds without write permission with 403', async() => {
            await Db.query(Db.PortalDatabaseName, `INSERT INTO clientmodules (clientname, modulename) VALUES ('client0', 'DAtest');`);
            await th.removeWritePermission("portal", "portal_usergroup0", co.permissions.ADMINISTRATION_CLIENT);
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.del(`/api/clientmodules/client0_--_DAtest?token=${token}`).expect(403);
        });

        it('responds with 404 when the _id is invalid', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.del(`/api/clientmodules/invalidId?token=${token}`).expect(404);
        });

        it('deletes the object and return 204', async() => {
            await Db.query(Db.PortalDatabaseName, `INSERT INTO clientmodules (clientname, modulename) VALUES ('client0', 'DAtest');`);
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.del(`/api/clientmodules/client0_--_DAtest?token=${token}`).expect(204);
            var result = await Db.query(Db.PortalDatabaseName, "SELECT 1 FROM clientmodules WHERE clientname='client0' and modulename='DAtest';");
            assert.ok(result.rowCount < 1);
        });
        
        it('Vorgegebene DAs werden deaktiviert', async () => {
            // DAs vorbereiten
            await Db.insertDynamicObject("client0", "dynamicattributes", { name: "datest001", identifier: 'DAtest_user_1', label: 'DAtest_user_1', dynamicattributetypename: co.dynamicAttributeTypes.text });
            await Db.query(Db.PortalDatabaseName, `INSERT INTO clientmodules (clientname, modulename) VALUES ('client0', 'DAtest');`);
            // Deaktivieren
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.del(`/api/clientmodules/client0_--_DAtest?token=${token}`).expect(204);
            var das = (await Db.query("client0", "SELECT * FROM dynamicattributes WHERE identifier IS NOT NULL;")).rows;
            assert.strictEqual(das.length, 1);
            assert.strictEqual(das[0].identifier, 'DAtest_user_1');
            assert.ok(das[0].isinactive);
        });
        
    });

});
