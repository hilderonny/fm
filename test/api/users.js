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