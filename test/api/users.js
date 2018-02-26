/**
 * UNIT Tests for api/users
 */
var assert = require('assert');
var th = require('../testhelpers');
var Db = require("../../utils/db").Db;
var bcryptjs =  require('bcryptjs');
var co = require('../../utils/constants');

describe('API users', () => {

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareRelations();
    });

    function compareElement(actual, expected) {
        ["_id", "name", "userGroupId", "isAdmin"].forEach((f) => {
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
            clientId: "client0",
            name: e.label,
            userGroupId: e.usergroupname,
            isAdmin: e.isadmin
        }
    }

    describe('GET/', () => {

        th.apiTests.get.defaultNegative(co.apis.users, co.permissions.ADMINISTRATION_USER);

        it('responds with list of all users of the client of the logged in user containing all details', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementsFromDatabase = (await Db.getDynamicObjects("client0", "users")).map((e) => { return mapFields(e); });
            var elementsFromRequest = (await th.get(`/api/users?token=${token}`).expect(200)).body;
            compareElements(elementsFromRequest, elementsFromDatabase);
        });

        it('contains information about the usergroup when parameter "joinUserGroup" is given', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var usergroup = await Db.getDynamicObject("client0", "usergroups", "client0_usergroup0");
            var usersFromRequest = (await th.get(`/api/users?token=${token}&joinUserGroup=true`).expect(200)).body;
            usersFromRequest.forEach((userFromRequest) => {
                assert.ok(userFromRequest.userGroup);
                assert.strictEqual(userFromRequest.userGroup._id, usergroup.name);
                assert.strictEqual(userFromRequest.userGroup.name, usergroup.label);
            });
        });

    });

    describe('GET/forIds', () => {

        async function createTestUsers(client) {
            var hashedPassword = '$2a$10$mH67nsfTbmAFqhNo85Mz4.SuQ3kyZbiYslNdRDHhaSO8FbMuNH75S'; // Encrypted version of 'test'. Because bryptjs is very slow in tests.
            var testobjects = [
                { name: client + "_usergroup0_testuser0", password: hashedPassword, label: "label0", usergroupname: client + "_usergroup0", isadmin: false },
                { name: client + "_usergroup0_testuser1", password: hashedPassword, label: "label1", usergroupname: client + "_usergroup0", isadmin: true }
            ];
            for (var i = 0; i < testobjects.length; i++) {
                await Db.insertDynamicObject(client, "users", testobjects[i]);
            }
            return testobjects.map(mapFields);
        }

        th.apiTests.getForIds.defaultNegative(co.apis.users, co.permissions.ADMINISTRATION_USER, co.collections.users.name, createTestUsers);
        th.apiTests.getForIds.clientDependentNegative(co.apis.users, co.collections.users.name, createTestUsers);
        th.apiTests.getForIds.defaultPositive(co.apis.users, co.collections.users.name, createTestUsers);

    });

    describe('GET/forUserGroup', () => {
    
        var api = "users/forUserGroup";
        th.apiTests.getId.defaultNegative(api, co.permissions.ADMINISTRATION_USER, "usergroups");
        th.apiTests.getId.clientDependentNegative(api, "usergroups");
        
        it(`returns all users for the given usergroup`, async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var filter = { usergroupname: "client0_usergroup0" };
            var elementsFromDatabase = (await Db.getDynamicObjects("client0", "users", filter)).map((e) => { return mapFields(e); });
            var elementsFromApi = (await th.get(`/api/${api}/client0_usergroup0?token=${token}`).expect(200)).body;
            compareElements(elementsFromApi, elementsFromDatabase);
        });
        
    });

    describe('GET/:id', () => {

        th.apiTests.getId.defaultNegative(co.apis.users, co.permissions.ADMINISTRATION_USER, co.collections.users.name);
        th.apiTests.getId.clientDependentNegative(co.apis.users, co.collections.users.name);

        it('responds with existing user id with all details of the user', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementFromDatabase = mapFields(await Db.getDynamicObject("client0", "users", "client0_usergroup0_user0"));
            var elementFromApi = (await th.get(`/api/users/client0_usergroup0_user0?token=${token}`).expect(200)).body;
            compareElement(elementFromApi, elementFromDatabase);
        });
        
    });

    describe('POST/', () => {

        async function createPostTestUser() {
            return { _id: "client0_testuser", pass: "newPassword", name: "client0_testuser", userGroupId: "client0_usergroup0", isAdmin: false }
        }

        th.apiTests.post.defaultNegative(co.apis.users, co.permissions.ADMINISTRATION_USER, createPostTestUser);

        it('responds with the created user containing an _id field', async() => {
            var elementToSend = await createPostTestUser();
            var token = await th.defaults.login("client0_usergroup0_user0");
            var userFromApi = (await th.post(`/api/users?token=${token}`).send(elementToSend).expect(200)).body;
            assert.ok(typeof(userFromApi._id) !== "undefined");
            assert.ok(typeof(userFromApi.name) !== "undefined");
            assert.ok(typeof(userFromApi.clientId) !== "undefined");
            assert.ok(typeof(userFromApi.userGroupId) !== "undefined");
            assert.ok(typeof(userFromApi.isAdmin) !== "undefined");
            assert.strictEqual(userFromApi._id, elementToSend.name); // id must be name with users
            assert.strictEqual(userFromApi.clientId, "client0");
            assert.strictEqual(userFromApi.name, elementToSend.name);
            assert.strictEqual(userFromApi.userGroupId, elementToSend.userGroupId);
            assert.strictEqual(userFromApi.isAdmin, elementToSend.isAdmin);
            var userFromDatabase = await Db.getDynamicObject("client0", "users", elementToSend.name);
            assert.strictEqual(userFromDatabase.name, elementToSend.name);
            assert.strictEqual(userFromDatabase.label, elementToSend.name);
            assert.strictEqual(userFromDatabase.usergroupname, elementToSend.userGroupId);
            assert.strictEqual(userFromDatabase.isadmin, elementToSend.isAdmin);
        });

        it('responds without giving an user password with 400', async() => {
            var elementToSend = createPostTestUser();
            delete elementToSend.pass;
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/users?token=${token}`).send(elementToSend).expect(400);
        });
        
        it('responds without giving an userGroupId with 400', async() => {
            var elementToSend = createPostTestUser();
            delete elementToSend.userGroupId;
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/users?token=${token}`).send(elementToSend).expect(400);
        });
    
        it('responds with not existing userGroup with 400', async() => {
            var elementToSend = createPostTestUser();
            elementToSend.userGroupId = "client1_usergroupnotexisting";
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/users?token=${token}`).send(elementToSend).expect(400);
        });
                
        it('responds with 400 when the parent of the element does not belong to the same client as the logged in user', async() => {
            var elementToSend = createPostTestUser();
            elementToSend.userGroupId = "client1_usergroup0";
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/users?token=${token}`).send(elementToSend).expect(400);
        });

    });

    describe('POST/newpassword', () => {

        function createPostPassword() {
            return { pass: "newPassword" }
        }

        var api = `${co.apis.users}/newpassword`;

        th.apiTests.post.defaultNegative(api, co.permissions.SETTINGS_USER, createPostPassword);

        it('responds with 200 with giving an empty password and updates the password in the database (empty passwords are okay)', async() => {
            var elementToSend = createPostPassword();
            elementToSend.pass = "";
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${api}?token=${token}`).send(elementToSend).expect(200);
            var userFromDatabase = await Db.getDynamicObject("client0", "users", "client0_usergroup0_user0");
            assert.ok(bcryptjs.compareSync(elementToSend.pass, userFromDatabase.password));
        });

        it('responds with 200 with giving a correct new password and updates the password in the database', async() => {
            var elementToSend = createPostPassword();
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${api}?token=${token}`).send(elementToSend).expect(200);
            var userFromDatabase = await Db.getDynamicObject("client0", "users", "client0_usergroup0_user0");
            assert.ok(bcryptjs.compareSync(elementToSend.pass, userFromDatabase.password));
        });

    });

    describe('PUT/:id', () => {

        async function createPutTestUser(client) {
            var testelement = { name: client + "_usergroup0_testuser", label: 'Bezeichnung', password: 'test', usergroupname: client + "_usergroup0", isadmin: false };
            await Db.insertDynamicObject(client, "users", testelement);
            return mapFields(testelement);
        }

        th.apiTests.put.defaultNegative(co.apis.users, co.permissions.ADMINISTRATION_USER, createPutTestUser);
        th.apiTests.put.clientDependentNegative(co.apis.users, createPutTestUser);
        
        it('responds with an user containing a new password with an updated user which has the new password', async() => {
            var updateset = { pass: "newpassword" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/users/client0_usergroup0_user0?token=${token}`).send(updateset).expect(200);
            var userFromDatabase = await Db.getDynamicObject("client0", "users", "client0_usergroup0_user0");
            assert.ok(bcryptjs.compareSync(updateset.pass, userFromDatabase.password));
        });

        it('responds with an invalid userGroupId with 400', async() => {
            var updateset = { userGroupId: "client0_invalidusergroup" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/users/client0_usergroup0_user0?token=${token}`).send(updateset).expect(400);
        });

        it('responds with a correct user with the updated user and its new properties', async() => {
            var updateset = { name: "newlabel", isAdmin: true, userGroupId: "client0_usergroup1" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/users/client0_usergroup0_user1?token=${token}`).send(updateset).expect(200);
            var userFromDatabase = await Db.getDynamicObject("client0", "users", "client0_usergroup0_user1");
            assert.notStrictEqual(userFromDatabase.name, updateset.name);
            assert.strictEqual(userFromDatabase.label, updateset.name);
            assert.strictEqual(userFromDatabase.usergroupname, updateset.userGroupId);
            assert.strictEqual(userFromDatabase.isadmin, updateset.isAdmin);
        });
        
    });

    describe('DELETE/:id', () => {

        async function getDeleteUserId(client) {
            return client + "_usergroup0_user1";
        }

        th.apiTests.delete.defaultNegative(co.apis.users, co.permissions.ADMINISTRATION_USER, getDeleteUserId);
        th.apiTests.delete.clientDependentNegative(co.apis.users, getDeleteUserId);
        th.apiTests.delete.defaultPositive(co.apis.users, co.collections.users.name, getDeleteUserId);
        
    });

});