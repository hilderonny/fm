var assert = require('assert');
var th = require('../testhelpers');
var mc = require("../../config/module-config.json");
var Db = require("../../utils/db").Db;

describe('API datatypes', () => {

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
        await th.preparedatatypes();
        await th.preparedatatypefields();
    });

    describe('GET/', () => {

        it('responds without authentication with 403', async() => {
            return th.get("/api/datatypes").expect(403);
        });

        it('returns at least all predefined datatypes and their field definitions (from module-config)', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypesfromapi = (await th.get(`/api/datatypes?token=${token}`).expect(200)).body;
            var datatypesfrommoduleconfig = Object.keys(mc.modules).map(k => mc.modules[k].clientdatatypes).filter(dts => dts).reduce((arr, elem) => { 
                elem.forEach(e => arr.push(e)); return arr; 
            }, []);
            datatypesfrommoduleconfig.forEach(dt => {
                assert.ok(datatypesfromapi[dt.name]);
            });
        });

        it('also returns all custom datatypes and their field definitions', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypesfromapi = (await th.get(`/api/datatypes?token=${token}`).expect(200)).body;
            assert.ok(datatypesfromapi["clientnulldatatypenull"]);
            assert.ok(datatypesfromapi["clientnulldatatypeone"]);
            assert.ok(datatypesfromapi["clientnulldatatypetwo"]);
            var dt0 = datatypesfromapi["clientnulldatatypenull"];
            var fields = dt0.fields;
            assert.ok(fields);
            assert.ok(fields.boolean0);
            assert.ok(fields.datetime0);
            assert.ok(fields.decimal0);
            assert.ok(fields.formula0);
            assert.ok(fields.password0);
            assert.ok(fields.reference0);
            assert.ok(fields.text0);
        });

    });

});
