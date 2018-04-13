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
            name: e.name, // label cannot be used and is obsolete
            userGroupId: e.usergroupname,
            isAdmin: e.isadmin
        }
    }

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

    describe('POST/newpassword', () => {

        function createPostPassword() {
            return { pass: "newPassword" }
        }

        var api = `${co.apis.users}/newpassword`;

        th.apiTests.post.defaultNegative(api, co.permissions.SETTINGS_USER, createPostPassword);

        it('responds with 200 with giving an empty password and does not update the password in the database (empty passwords are ignored)', async() => {
            var elementToSend = createPostPassword();
            elementToSend.pass = "";
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${api}?token=${token}`).send(elementToSend).expect(200);
            var userFromDatabase = (await Db.query("client0", "SELECT * FROM users WHERE name='client0_usergroup0_user0';")).rows[0];
            assert.ok(!bcryptjs.compareSync(elementToSend.pass, userFromDatabase.password));
            var userFromAllUsersTable = (await Db.query(Db.PortalDatabaseName, "SELECT * FROM allusers WHERE name='client0_usergroup0_user0';")).rows[0];
            assert.ok(!bcryptjs.compareSync(elementToSend.pass, userFromAllUsersTable.password));
        });

        it('responds with 200 with giving a correct new password and updates the password in the database', async() => {
            var elementToSend = createPostPassword();
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${api}?token=${token}`).send(elementToSend).expect(200);
            var userFromDatabase = (await Db.query("client0", "SELECT * FROM users WHERE name='client0_usergroup0_user0';")).rows[0];
            assert.ok(bcryptjs.compareSync(elementToSend.pass, userFromDatabase.password));
            var userFromAllUsersTable = (await Db.query(Db.PortalDatabaseName, "SELECT * FROM allusers WHERE name='client0_usergroup0_user0';")).rows[0];
            assert.ok(bcryptjs.compareSync(elementToSend.pass, userFromAllUsersTable.password));
        });

    });

});