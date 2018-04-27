/**
 * UNIT Tests for api/clients
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;
var localconfig = require('../../config/localconfig.json');

var dbprefix = process.env.POSTGRESQL_TEST_DBPREFIX  || localconfig.dbprefix || 'arrange' ; 

describe('API clients', async() => {

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

    afterEach(async() => {
        await Db.deleteClient("testclient");
    });

    function compareElement(actual, expected) {
        ["_id", "name"].forEach((f) => {
            assert.ok(typeof(actual[f]) !== "undefined");
            assert.strictEqual(actual[f], expected[f]);
        });
    }

    function compareElements(actual, expected) {
        assert.strictEqual(actual.length, expected.length);
        actual.sort((a, b) => { return a._id.localeCompare(b._id); });
        expected.sort((a, b) => { return a._id.localeCompare(b._id); });
        for (var i = 0; i < actual.length; i++) compareElement(actual[i], expected[i]);
    }

    function mapFields(e) {
        return {
            _id: e.name,
            name: e.label
        }
    }

    describe('GET/', async() => {

        th.apiTests.get.defaultNegative(co.apis.clients, co.permissions.ADMINISTRATION_CLIENT); 

        it('responds with list of all clients containing all details', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var elementsFromDatabase = (await Db.query(Db.PortalDatabaseName, "SELECT * FROM clients")).rows.map(mapFields);
            var elementsFromRequest = (await th.get(`/api/clients?token=${token}`).expect(200)).body;
            compareElements(elementsFromRequest, elementsFromDatabase);
        });

    });

    describe('GET/forIds', async() => {

        async function createTestClients() {
            return ['client0', 'client1'].map((name) => { return { _id: name } });
            return testobjects;
        }

        th.apiTests.getForIds.defaultNegative(co.apis.clients, co.permissions.ADMINISTRATION_CLIENT, co.collections.clients.name, createTestClients, "portal", "portal_usergroup0", "portal_usergroup0_user0");
        th.apiTests.getForIds.defaultPositive(co.apis.clients, co.collections.clients.name, createTestClients, "portal", "portal_usergroup0", "portal_usergroup0_user0");

    });

    describe('GET/:id', async() => {

        it('responds without authentication with 403', async() => {
            await th.get(`/api/clients/client0`).expect(403);
        });
        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("portal", "portal_usergroup0", co.permissions.ADMINISTRATION_CLIENT);
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.get(`/api/clients/client0?token=${token}`).expect(403);
        });
        it('responds with not existing id with 404', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.get(`/api/clients/999999999999999999999999?token=${token}`).expect(404);
        });
     
        it(`returns the client with all details for the given id`, async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var elementFromDatabase = mapFields((await Db.query(Db.PortalDatabaseName, `SELECT * FROM clients WHERE name='client0';`)).rows[0]);
            var elementFromApi = (await th.get(`/api/clients/client0?token=${token}`).expect(200)).body;
            compareElement(elementFromApi, elementFromDatabase);
        });

    });

    describe('POST/', async() => {

        function createPostTestElement() {
            return { name: "testclient" };
        }

        th.apiTests.post.defaultNegative(co.apis.clients, co.permissions.ADMINISTRATION_CLIENT, createPostTestElement, false, "portal", "portal_usergroup0", "portal_usergroup0_user0");

        it('responds with the created element containing an _id field', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var testObject = createPostTestElement();
            var objectFromApi = (await th.post(`/api/${co.apis.clients}?token=${token}`).send(testObject).expect(200)).body;
            assert.ok(objectFromApi._id);
            Object.keys(testObject).forEach(function(key) {
                assert.ok(typeof(objectFromApi[key]) !== "undefined", `Key ${key} is missing`);
                assert.strictEqual(objectFromApi[key], testObject[key], `Key ${key} differs`);
            });
            var objectFromDatabase = mapFields((await Db.query(Db.PortalDatabaseName, `SELECT * FROM clients WHERE name='${objectFromApi._id}';`)).rows[0]);
            Object.keys(testObject).forEach(function(key) {
                assert.ok(typeof(objectFromDatabase[key]) !== "undefined", `Key ${key} is missing`);
                assert.strictEqual(objectFromDatabase[key], testObject[key], `Key ${key} differs`);
            });
        });

        it('creates client module assignments for modules "base" and "doc"', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var newClient = createPostTestElement();
            var createdClient = (await th.post(`/api/${co.apis.clients}?token=${token}`).send(newClient).expect(200)).body;
            var createdClientModules = (await Db.query(Db.PortalDatabaseName, `SELECT * FROM clientmodules WHERE clientname='${createdClient._id}';`)).rows;
            assert.strictEqual(createdClientModules.length, 2);
            assert.ok(createdClientModules.find((m) => m.modulename === co.modules.base));
            assert.ok(createdClientModules.find((m) => m.modulename === co.modules.doc));
        });

    });

    describe('POST/newadmin', async() => {

        function createPostNewAdminTestElement() {
            return { name: "client0_newadmin", password: 'password', clientname: "client0" };
        }

        th.apiTests.post.defaultNegative(co.apis.clients + "/newAdmin", co.permissions.ADMINISTRATION_CLIENT, createPostNewAdminTestElement, false, "portal", "portal_usergroup0", "portal_usergroup0_user0");

        it('responds with 400 when no user is given', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/clients/newadmin?token=${token}`).send().expect(400);
        });

        it('responds with 400 when no username is given', async() => {
            var newAdmin = { password: 'password', clientname: "client0" };
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(400);
        });

        it('responds with 400 when no password is given', async() => {
            var newAdmin = { name: "client0_usergroup0_user0", clientname: "client0" };
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(400);
        });

        it('responds with 409 when username is in use', async() => {
            var newAdmin = { name: "client0_usergroup0_user0", password: 'password', clientname: "client0" };
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(409);
        });

        it('responds with 400 when no clientname is given', async() => {
            var newAdmin = { name: "client0_newadmin", password: 'password' };
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(400);
        });

        it('responds with 400 when clientname is invalid', async() => {
            var newAdmin = { name: "client0_newadmin", password: 'password', clientname: "invalidId" };
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(400);
        });

        it('responds with 200 and creates a new admin in a new user group with the same name as the username', async() => {
            var newAdmin = { name: "client0_newadmin", password: 'password', clientname: "client0" };
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(200);
            var createdUser = await Db.getDynamicObject("client0", "users", newAdmin.name);
            assert.ok(createdUser);
            assert.ok(createdUser.isadmin);
            var createdUserGroup = await Db.getDynamicObject("client0", "usergroups", createdUser.usergroupname);
            assert.ok(createdUserGroup);
            assert.strictEqual(createdUserGroup.label, createdUser.name);
        });

    });

    describe('PUT/:id', async() => {

        async function createPutTestElement() {
            return { _id: "client0", name: "Dingens" };
        }

        th.apiTests.put.defaultNegative(co.apis.clients, co.permissions.ADMINISTRATION_CLIENT, createPutTestElement, "portal", "portal_usergroup0", "portal_usergroup0_user0");

        it(`updates the client and returns the updated entity`, async() => {
            var elementupdate = { name: "Ronny" };
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.put(`/api/clients/client0?token=${token}`).send(elementupdate).expect(200);
            var elementFromDatabase = (await Db.query(Db.PortalDatabaseName, `SELECT * FROM clients WHERE name='client0';`)).rows[0];
            assert.strictEqual(elementFromDatabase.label, elementupdate.name);
        });

    });

    describe('DELETE/:id', async() => {

        async function getDeleteClientId() {
            await Db.createClient("testclient", "label");
            return "testclient";
        }

        th.apiTests.delete.defaultNegative(co.apis.clients, co.permissions.ADMINISTRATION_CLIENT, getDeleteClientId, "portal", "portal_usergroup0", "portal_usergroup0_user0");

        it('responds with 204 and deletes all dependent objects (clients entry, clientmodules, clientsettings, database)', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.del(`/api/clients/client0?token=${token}`).expect(204);
            assert.ok((await Db.query(Db.PortalDatabaseName, "SELECT 1 FROM clients WHERE name='client0';")).rowCount < 1);
            assert.ok((await Db.query(Db.PortalDatabaseName, "SELECT 1 FROM clientmodules WHERE clientname='client0';")).rowCount < 1);
            assert.ok((await Db.query(Db.PortalDatabaseName, "SELECT 1 FROM clientsettings WHERE clientname='client0';")).rowCount < 1);
            assert.ok((await Db.queryDirect("postgres", `SELECT 1 FROM pg_database WHERE datname = '${dbprefix}_client0';`)).rowCount < 1);
        });

    });

});
