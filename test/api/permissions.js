/**
 * UNIT Tests for api/permissions
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('API permissions', () => {

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

    function getAllowedClientPermissions() {
        return [
            co.permissions.ADMINISTRATION_USER,
            co.permissions.ADMINISTRATION_USERGROUP,
            co.permissions.BIM_AREAS,
            co.permissions.BIM_FMOBJECT,
            co.permissions.CORE_RELATIONS,
            co.permissions.CRM_BUSINESSPARTNERS,
            co.permissions.CRM_PERSONS,
            co.permissions.CMS_APPS,
            co.permissions.CMS_CARDS,
            co.permissions.OFFICE_ACTIVITY,
            co.permissions.OFFICE_DOCUMENT,
            co.permissions.OFFICE_NOTE,
            co.permissions.QRSCANNER,
            co.permissions.SETTINGS_CLIENT,
            co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES,
            co.permissions.SETTINGS_CLIENT_RECORDTYPES,
            co.permissions.SETTINGS_USER
        ]
    }

    describe('GET/forLoggedInUser', () => {

        var api = `${co.apis.permissions}/forLoggedInUser`;

        it('responds without authentication with 403', async() => {
            return th.get(`/api/${api}`).expect(403);
        });

        it('returns all permissions available to the client when the user is admin', async() => {
            await th.cleanTable("permissions", true, true);
            var token = await th.defaults.login("client0_usergroup0_user1");
            var permissionsFromApi = (await th.get(`/api/${api}?token=${token}`).expect(200)).body;
            var expectedPermissions = getAllowedClientPermissions();
            assert.strictEqual(permissionsFromApi.length, expectedPermissions.length);
            permissionsFromApi.forEach(function(permission) {
                assert.ok(expectedPermissions.indexOf(permission.key) >= 0);
                assert.ok(permission.canRead);
                assert.ok(permission.canWrite);
            });
        });

        it('returns only permissions available to the logged in user (depending on usergroup and client modules)', async() => {
            await th.cleanTable("permissions", true, true);
            var expectedPermissions = [
                { permission: co.permissions.BIM_FMOBJECT, canwrite: true },
                { permission: co.permissions.OFFICE_NOTE, canwrite: false },
            ]
            for (var i = 0; i < expectedPermissions.length; i++) {
                var expectedPermission = expectedPermissions[i];
                await Db.query("client0", `INSERT INTO permissions (usergroupname, key, canwrite) VALUES('client0_usergroup0', '${expectedPermission.permission}', ${expectedPermission.canwrite});`);
            }
            var token = await th.defaults.login("client0_usergroup0_user0");
            var permissionsFromApi = (await th.get(`/api/${api}?token=${token}`).expect(200)).body;
            assert.strictEqual(permissionsFromApi.length, expectedPermissions.length);
            permissionsFromApi.forEach(function(permission) {
                var expectedPermission = expectedPermissions.find((p) => p.permission === permission.key);
                assert.ok(expectedPermission);
                assert.ok(typeof(permission.canRead) !== "undefined");
                assert.ok(typeof(permission.canWrite) !== "undefined");
                assert.strictEqual(permission.canWrite, expectedPermission.canwrite);
            });
        });

    });

    describe('GET/forUserGroup/:id', async() => {

        var api = `${co.apis.permissions}/forUserGroup`;

        it('responds with all permissions of the usergroup where the states are correctly set', async() => {
            await th.cleanTable("permissions", true, true);
            var expectedPermissions = [
                { permission: co.permissions.ADMINISTRATION_USERGROUP, canwrite: false }, // For accessing the API
                { permission: co.permissions.BIM_FMOBJECT, canwrite: true },
                { permission: co.permissions.OFFICE_NOTE, canwrite: false },
            ]
            for (var i = 0; i < expectedPermissions.length; i++) {
                var expectedPermission = expectedPermissions[i];
                await Db.query("client0", `INSERT INTO permissions (usergroupname, key, canwrite) VALUES('client0_usergroup0', '${expectedPermission.permission}', ${expectedPermission.canwrite});`);
            }
            var token = await th.defaults.login("client0_usergroup0_user0");
            var permissionsFromApi = (await th.get(`/api/${api}/client0_usergroup0?token=${token}`).expect(200)).body;
            var permissionKeys = getAllowedClientPermissions();
            assert.strictEqual(permissionsFromApi.length, permissionKeys.length);
            permissionsFromApi.forEach(function(permission) {
                assert.ok(typeof(permission.key) !== "undefined");
                assert.ok(typeof(permission.canread) !== "undefined");
                assert.ok(typeof(permission.canwrite) !== "undefined");
            });
            expectedPermissions.forEach((ep) => {
                var apipermission = permissionsFromApi.find((p) => p.key === ep.permission);
                assert.strictEqual(apipermission.canread, true);
                assert.strictEqual(apipermission.canwrite, ep.canwrite);
            });
        });

    });

    describe('POST/', () => {

        async function createPostObject() {
            return { key: co.permissions.CRM_PERSONS, usergroupname: "client0_usergroup0", canread: true, canwrite: true };
        }

        th.apiTests.post.defaultNegative(co.apis.permissions, co.permissions.ADMINISTRATION_USERGROUP, createPostObject);

        it('responds without giving a permission usergroupname with 400', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var newpermission = {key: co.permissions.CRM_BUSINESSPARTNERS, canread: true, canwrite: true };
            await th.post(`/api/permissions?token=${token}`).send(newpermission).expect(400);
        });

        it('responds without giving a permission key with 400', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var newpermission = { usergroupname: "client0_usergroup0", canread: true, canwrite: true };
            await th.post(`/api/permissions?token=${token}`).send(newpermission).expect(400);
        });

        it('responds with off-the-list permission key with 400', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var newpermission = { key: "invalidkey", usergroupname: "client0_usergroup0", canread: true, canwrite: true };
            await th.post(`/api/permissions?token=${token}`).send(newpermission).expect(400);
        });

        it('responds with non-existing usergroupname with 400', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var newpermission = { key: co.permissions.CRM_BUSINESSPARTNERS, usergroupname: "invalidid", canread: true, canwrite: true };
            await th.post(`/api/permissions?token=${token}`).send(newpermission).expect(400);
        });

        it('returns 400 when canread = false and canwrite = true', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var newpermission = { key: co.permissions.CRM_BUSINESSPARTNERS, usergroupname: "client0_usergroup0", canread: false, canwrite: true };
            await th.post(`/api/permissions?token=${token}`).send(newpermission).expect(400);
        });

        it('deletes the permission from database when canread = false and canwrite = false', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var newpermission = { key: co.permissions.CRM_BUSINESSPARTNERS, usergroupname: "client0_usergroup0", canread: false, canwrite: false };
            var response = (await th.post(`/api/permissions?token=${token}`).send(newpermission).expect(200)).body;
            assert.ok(typeof(response.canread) !== "undefined");
            assert.ok(typeof(response.canwrite) !== "undefined");
            assert.strictEqual(response.canread, newpermission.canread);
            assert.strictEqual(response.canwrite, newpermission.canwrite);
            var result = await Db.query("client0", "SELECT 1 FROM permissions WHERE key = 'CRM_BUSINESSPARTNERS' AND usergroupname = 'client0_usergroup0';");
            assert.strictEqual(result.rowCount, 0);
        });

        it('inserts the permission into database when canread = true', async() => {
            await Db.query("client0", `DELETE FROM permissions WHERE usergroupname = 'client0_usergroup0' AND key = '${co.permissions.CRM_BUSINESSPARTNERS}';`);
            var token = await th.defaults.login("client0_usergroup0_user0");
            var newpermission = { key: co.permissions.CRM_BUSINESSPARTNERS, usergroupname: "client0_usergroup0", canread: true, canwrite: false };
            var response = (await th.post(`/api/permissions?token=${token}`).send(newpermission).expect(200)).body;
            assert.ok(typeof(response.canread) !== "undefined");
            assert.ok(typeof(response.canwrite) !== "undefined");
            assert.strictEqual(response.canread, newpermission.canread);
            assert.strictEqual(response.canwrite, newpermission.canwrite);
            var result = await Db.query("client0", "SELECT * FROM permissions WHERE key = 'PERMISSION_CRM_BUSINESSPARTNERS' AND usergroupname = 'client0_usergroup0';");
            assert.strictEqual(result.rowCount, 1);
            assert.strictEqual(result.rows[0].canwrite, false);
        });

        it('updates an existing permission when it was sent again', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var newpermission = { key: co.permissions.OFFICE_ACTIVITY, usergroupname: "client0_usergroup0", canread: true, canwrite: true };
            await th.post(`/api/permissions?token=${token}`).send(newpermission).expect(200);
            var response = (await th.post(`/api/permissions?token=${token}`).send(newpermission).expect(200)).body;
            assert.ok(typeof(response.canread) !== "undefined");
            assert.ok(typeof(response.canwrite) !== "undefined");
            assert.strictEqual(response.canread, newpermission.canread);
            assert.strictEqual(response.canwrite, newpermission.canwrite);
            var result = await Db.query("client0", "SELECT * FROM permissions WHERE key = 'PERMISSION_OFFICE_ACTIVITY' AND usergroupname = 'client0_usergroup0';");
            assert.strictEqual(result.rowCount, 1);
            assert.strictEqual(result.rows[0].canwrite, true);
        });

    });

});