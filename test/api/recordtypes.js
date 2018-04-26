/**
 * UNIT Tests for api/recordtypes
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var ch = require("../../utils/calculationhelper");
var Db = require("../../utils/db").Db;

describe('API recordtypes', () => {

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await Db.deleteRecordType("client0", "clientnulldatatypenull");
        await Db.deleteRecordType("client0", "testrecordtypename");
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.preparedatatypes();
        await th.preparedatatypefields();
        await th.preparedynamicobjects();
        await th.preparerelations();
        await ch.calculateentityandparentsrecursively("client0", "clientnulldatatypenull", "clientnulldatatypenullentity2");
    });
    
    describe('GET/', () => {

        th.apiTests.get.defaultNegative(co.apis.recordtypes, co.permissions.SETTINGS_CLIENT_RECORDTYPES); 

        it('returns all datatypes of the client including their fields', async () => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var recordtypes = (await th.get(`/api/recordtypes?token=${token}`).expect(200)).body;
            assert.ok(recordtypes.length > 3);
            var rt0 = recordtypes.find(r => r.name === "clientnulldatatypenull");
            assert.ok(rt0);
            assert.strictEqual(rt0.candefinename, true);
            assert.strictEqual(rt0.canhaverelations, true);
            assert.ok(rt0.fields);
            assert.strictEqual(rt0.fields.boolean0.datatypename, "clientnulldatatypenull");
            assert.strictEqual(rt0.fields.boolean0.fieldtype, "boolean");
            assert.strictEqual(rt0.fields.boolean0.formula, null);
            assert.strictEqual(rt0.fields.boolean0.formulaindex, 0);
            assert.strictEqual(rt0.fields.boolean0.ishidden, false);
            assert.strictEqual(rt0.fields.boolean0.ismanuallyupdated, false);
            assert.strictEqual(rt0.fields.boolean0.isnullable, false);
            assert.strictEqual(rt0.fields.boolean0.ispredefined, false);
            assert.strictEqual(rt0.fields.boolean0.isrequired, true);
            assert.strictEqual(rt0.fields.boolean0.label, "Boolean0");
            assert.strictEqual(rt0.fields.boolean0.name, "boolean0");
            assert.strictEqual(rt0.fields.boolean0.reference, null);
            assert.ok(rt0.fields.datetime0);
            assert.ok(rt0.fields.decimal0);
            assert.ok(rt0.fields.formula0);
            assert.ok(rt0.fields.formula1);
            assert.ok(rt0.fields.name);
            assert.ok(rt0.fields.password0);
            assert.ok(rt0.fields.reference0);
            assert.ok(rt0.fields.text0);
            assert.strictEqual(rt0.icon, "icon0");
            assert.strictEqual(rt0.ismanuallyupdated, false);
            assert.strictEqual(rt0.ispredefined, false);
            assert.strictEqual(rt0.label, "label0");
            assert.ok(rt0.lists);
            assert.strictEqual(rt0.lists.length, 1);
            assert.strictEqual(rt0.lists[0], "list0");
            assert.strictEqual(rt0.modulename, "fmobjects");
            assert.strictEqual(rt0.name, "clientnulldatatypenull");
            assert.strictEqual(rt0.permissionkey, "PERMISSION_BIM_FMOBJECT");
            assert.strictEqual(rt0.plurallabel, "plurallabel0");
            assert.strictEqual(rt0.titlefield, "text0");
            assert.ok(recordtypes.find(r => r.name === "clientnulldatatypeone"));
            assert.ok(recordtypes.find(r => r.name === "clientnulldatatypetwo"));
            assert.ok(recordtypes.find(r => r.name === "clientnulldatatypethree"));
        });

        it('does not return datatypes of other clients', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var recordtypes = (await th.get(`/api/recordtypes?token=${token}`).expect(200)).body;
            assert.ok(!recordtypes.find(r => r.name === "clientonedatatypenull"));
        });

    });
    
    describe('GET/field/:recordtypename/:fieldname', () => {

        it('responds without authentication with 403', async() => {
            return th.get("/api/recordtypes/field/clientnulldatatypenull/boolean0").expect(403);
        });

        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.SETTINGS_CLIENT_RECORDTYPES);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/recordtypes/field/clientnulldatatypenull/boolean0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', async() => {
            await th.removeClientModule("client0", co.modules.recordtypes);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/recordtypes/field/clientnulldatatypenull/boolean0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', async() => {
            await th.removeClientModule("client0", co.modules.recordtypes);
            var token = await th.defaults.login("client0_usergroup0_user1");
            return th.get(`/api/recordtypes/field/clientnulldatatypenull/boolean0?token=${token}`).expect(403);
        });

        it('returns 404 when the recordtype does not exist in the client', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/recordtypes/field/unknownrecordtype/boolean0?token=${token}`).expect(404);
        });

        it('returns 404 when the field does not exist in the client', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/recordtypes/field/clientnulldatatypenull/unknownfield?token=${token}`).expect(404);
        });

        it('returns 404 when the recordtype does not exist in the client but in another client', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/recordtypes/field/clientonedatatypenull/boolean0?token=${token}`).expect(404);
        });

        it('returns 404 when the field does not exist in the client but in another client', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/recordtypes/field/clientnulldatatypenull/clientonetextnull?token=${token}`).expect(404);
        });

        it('returns the requested field information', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var field = (await th.get(`/api/recordtypes/field/clientnulldatatypenull/boolean0?token=${token}`).expect(200)).body;
            assert.ok(field);
            assert.strictEqual(field.datatypename, "clientnulldatatypenull");
            assert.strictEqual(field.fieldtype, "boolean");
            assert.strictEqual(field.formula, null);
            assert.strictEqual(field.formulaindex, 0);
            assert.strictEqual(field.ishidden, false);
            assert.strictEqual(field.ismanuallyupdated, false);
            assert.strictEqual(field.isnullable, false);
            assert.strictEqual(field.ispredefined, false);
            assert.strictEqual(field.isrequired, true);
            assert.strictEqual(field.label, "Boolean0");
            assert.strictEqual(field.name, "boolean0");
            assert.strictEqual(field.reference, null);
        });

    });
    
    describe('GET/lists', () => {

        th.apiTests.get.defaultNegative(co.apis.recordtypes + "/lists", co.permissions.SETTINGS_CLIENT_RECORDTYPES); 

        it('retreives all list names for the user\'s client defined in module config', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var lists = (await th.get(`/api/recordtypes/lists?token=${token}`).expect(200)).body;
            assert.ok(lists.length > 3);
            assert.ok(lists.indexOf("clientnulldatatypenull") >= 0);
            assert.ok(lists.indexOf("clientnulldatatypeone") >= 0);
            assert.ok(lists.indexOf("clientnulldatatypetwo") >= 0);
            assert.ok(lists.indexOf("clientnulldatatypethree") >= 0);
        });

        it('retreives only list names for modules which are available to the client', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var lists = (await th.get(`/api/recordtypes/lists?token=${token}`).expect(200)).body;
            assert.ok(lists.indexOf("clientonedatatypenull") < 0);
        });

        it('retreives list names of portaldatatypes when logged in user is a portal user', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var lists = (await th.get(`/api/recordtypes/lists?token=${token}`).expect(200)).body;
            assert.ok(lists.indexOf("users") >= 0);
            assert.ok(lists.indexOf("clients") >= 0);
            assert.ok(lists.indexOf("portals") >= 0);
            assert.ok(lists.indexOf("documents") < 0);
        });

        it('retreives list names of clientdatatypes when logged in user is a client user', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var lists = (await th.get(`/api/recordtypes/lists?token=${token}`).expect(200)).body;
            assert.ok(lists.indexOf("users") >= 0);
            assert.ok(lists.indexOf("documents") >= 0);
            assert.ok(lists.indexOf("portals") < 0);
            assert.ok(lists.indexOf("clients") < 0);
        });

    });

    describe('GET/:name', () => {

        it('responds without authentication with 403', async() => {
            return th.get("/api/recordtypes/clientnulldatatypenull").expect(403);
        });

        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.SETTINGS_CLIENT_RECORDTYPES);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/recordtypes/clientnulldatatypenull?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', async() => {
            await th.removeClientModule("client0", co.modules.recordtypes);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/recordtypes/clientnulldatatypenull?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', async() => {
            await th.removeClientModule("client0", co.modules.recordtypes);
            var token = await th.defaults.login("client0_usergroup0_user1");
            return th.get(`/api/recordtypes/clientnulldatatypenull?token=${token}`).expect(403);
        });

        it('returns 404 when the recordtype does not exist in the client', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/recordtypes/unknownrecordtype?token=${token}`).expect(404);
        });

        it('returns 404 when the recordtype does not exist in the client but in another client', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/recordtypes/clientonedatatypenull?token=${token}`).expect(404);
        });

        it('returns the datatype and its fields', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatype = (await th.get(`/api/recordtypes/clientnulldatatypenull?token=${token}`).expect(200)).body;
            assert.ok(datatype);
            assert.strictEqual(datatype.candefinename, true);
            assert.strictEqual(datatype.canhaverelations, true);
            assert.ok(datatype.fields);
            var booleanfield = datatype.fields.find(f => f.name === "boolean0");
            assert.ok(booleanfield);
            assert.strictEqual(booleanfield.datatypename, "clientnulldatatypenull");
            assert.strictEqual(booleanfield.fieldtype, "boolean");
            assert.strictEqual(booleanfield.formula, null);
            assert.strictEqual(booleanfield.formulaindex, 0);
            assert.strictEqual(booleanfield.ishidden, false);
            assert.strictEqual(booleanfield.ismanuallyupdated, false);
            assert.strictEqual(booleanfield.isnullable, false);
            assert.strictEqual(booleanfield.ispredefined, false);
            assert.strictEqual(booleanfield.isrequired, true);
            assert.strictEqual(booleanfield.label, "Boolean0");
            assert.strictEqual(booleanfield.name, "boolean0");
            assert.strictEqual(booleanfield.reference, null);
            assert.ok(datatype.fields.find(f => f.name === "datetime0"));
            assert.ok(datatype.fields.find(f => f.name === "decimal0"));
            assert.ok(datatype.fields.find(f => f.name === "formula0"));
            assert.ok(datatype.fields.find(f => f.name === "formula1"));
            assert.ok(datatype.fields.find(f => f.name === "name"));
            assert.ok(datatype.fields.find(f => f.name === "password0"));
            assert.ok(datatype.fields.find(f => f.name === "reference0"));
            assert.ok(datatype.fields.find(f => f.name === "text0"));
            assert.strictEqual(datatype.icon, "icon0");
            assert.strictEqual(datatype.ismanuallyupdated, false);
            assert.strictEqual(datatype.ispredefined, false);
            assert.strictEqual(datatype.label, "label0");
            assert.ok(datatype.lists);
            assert.strictEqual(datatype.lists.length, 1);
            assert.strictEqual(datatype.lists[0], "list0");
            assert.strictEqual(datatype.modulename, "fmobjects");
            assert.strictEqual(datatype.name, "clientnulldatatypenull");
            assert.strictEqual(datatype.permissionkey, "PERMISSION_BIM_FMOBJECT");
            assert.strictEqual(datatype.plurallabel, "plurallabel0");
            assert.strictEqual(datatype.titlefield, "text0");
        });

    });

    describe('POST/', () => {

        function createPostTestRecordtype() {
            return {
                name: "testrecordtypename",
                label: "testrecordtypelabel",
                plurallabel: "testrecordtypeplurallabel",
                lists: ["testlist0", "testlist1" ] ,
                icon: "testrecordtypeicon",
                permissionkey: "testrecordtypepermissionkey",
                canhaverelations: true,
                candefinename: true
            };
        }

        th.apiTests.post.defaultNegative(co.apis.recordtypes, co.permissions.SETTINGS_CLIENT_RECORDTYPES, createPostTestRecordtype);

        it('responds with 400 when no name is given', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            delete datatypetosend.name;
            return th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(400);
        });

        it('responds with 400 when name contains characters other than a-z', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            datatypetosend.name = "aUb";
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(400);
            datatypetosend.name = "a0b";
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(400);
            datatypetosend.name = "a'b";
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(400);
            datatypetosend.name = "a\"b";
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(400);
            datatypetosend.name = "a-b";
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(400);
            datatypetosend.name = "a_b";
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(400);
        });

        it('responds with 400 when lists is given but is not an array', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            datatypetosend.lists = "notanarray";
            return th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(400);
        });

        it('responds with 400 when name is not allowed (used by API routes)', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            for (var i = 0; i < co.forbiddendatatypenames.length; i++) {
                datatypetosend.name = co.forbiddendatatypenames[i];
                await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(400);
            }
        });

        it('responds with 400 when canhaverelations is not of type boolean', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            datatypetosend.canhaverelations = "notboolean";
            return th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(400);
        });

        it('responds with 400 when candefinename is not of type boolean', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            datatypetosend.candefinename = "notboolean";
            return th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(400);
        });

        it('responds with 409 when a record type with the given name already exists', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            datatypetosend.name = "clientnulldatatypenull";
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(409);
        });

        it('creates the recordtype and a field "name" which is set as titlefield and returns 200', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdb = (await Db.getdatatypes("client0"))[datatypetosend.name];
            assert.ok(datatypefromdb);
            assert.strictEqual(datatypefromdb.name, datatypetosend.name);
            assert.strictEqual(datatypefromdb.label, datatypetosend.label);
            assert.strictEqual(datatypefromdb.plurallabel, datatypetosend.plurallabel);
            var lists = datatypefromdb.lists;
            assert.ok(lists);
            assert.ok(lists.length > 1);
            assert.ok(lists.indexOf("testlist0") >= 0);
            assert.ok(lists.indexOf("testlist1") >= 0);
            assert.strictEqual(datatypefromdb.icon, datatypetosend.icon);
            assert.strictEqual(datatypefromdb.permissionkey, datatypetosend.permissionkey);
            assert.strictEqual(datatypefromdb.canhaverelations, datatypetosend.canhaverelations);
            assert.strictEqual(datatypefromdb.candefinename, datatypetosend.candefinename);
            assert.strictEqual(datatypefromdb.titlefield, "name");
            assert.strictEqual(datatypefromdb.modulename, null);
            assert.strictEqual(datatypefromdb.ismanuallyupdated, false);
            assert.strictEqual(datatypefromdb.ispredefined, false);
            var fields = datatypefromdb.fields;
            assert.ok(fields);
            var namefield = fields.name;
            assert.ok(namefield);
        });

        it('appends the recordtypename to the lists field when not already contained', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdb = (await Db.getdatatypes("client0"))[datatypetosend.name];
            assert.ok(datatypefromdb.lists.indexOf(datatypetosend.name) >= 0);
        });

        it('does not append the recordtypename to the lists field when already contained', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            datatypetosend.lists.push(datatypetosend.name);
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdb = (await Db.getdatatypes("client0"))[datatypetosend.name];
            assert.strictEqual(datatypefromdb.lists.length, 3);
            assert.ok(datatypefromdb.lists.indexOf(datatypetosend.name) >= 0);
        });

        it('creates the lists field when not sent in request', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            delete datatypetosend.lists;
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdb = (await Db.getdatatypes("client0"))[datatypetosend.name];
            assert.ok(datatypefromdb.lists);
            assert.ok(datatypefromdb.lists.length > 0);
        });

        it('sets the label to "" when not given', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            delete datatypetosend.label;
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdb = (await Db.getdatatypes("client0"))[datatypetosend.name];
            assert.strictEqual(datatypefromdb.label, "");
        });

        it('sets the plurallabel to "" when not given', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            delete datatypetosend.plurallabel;
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdb = (await Db.getdatatypes("client0"))[datatypetosend.name];
            assert.strictEqual(datatypefromdb.plurallabel, "");
        });

        it('sets the icon to "" when not given', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            delete datatypetosend.icon;
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdb = (await Db.getdatatypes("client0"))[datatypetosend.name];
            assert.strictEqual(datatypefromdb.icon, "");
        });

        it('sets the permissionkey to "" when not given', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            delete datatypetosend.permissionkey;
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdb = (await Db.getdatatypes("client0"))[datatypetosend.name];
            assert.strictEqual(datatypefromdb.permissionkey, "");
        });

        it('ignores the attribute "titlefield" when sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            datatypetosend.titlefield = "newtitlefield";
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdb = (await Db.getdatatypes("client0"))[datatypetosend.name];
            assert.strictEqual(datatypefromdb.titlefield, "name");
        });

        it('ignores the attribute "modulename" when sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            datatypetosend.modulename = "newmodulename";
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdb = (await Db.getdatatypes("client0"))[datatypetosend.name];
            assert.strictEqual(datatypefromdb.modulename, null);
        });

        it('ignores the attribute "ismanuallyupdated" when sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            datatypetosend.ismanuallyupdated = true;
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdb = (await Db.getdatatypes("client0"))[datatypetosend.name];
            assert.strictEqual(datatypefromdb.ismanuallyupdated, false);
        });

        it('ignores the attribute "ispredefined" when sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPostTestRecordtype();
            datatypetosend.ispredefined = true;
            await th.post(`/api/recordtypes?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdb = (await Db.getdatatypes("client0"))[datatypetosend.name];
            assert.strictEqual(datatypefromdb.ispredefined, false);
        });

    });

    describe('POST/field/:datatypename', () => {

        function createPostTestRecordtypefield() {
            return {
                name: "testrecordtypefieldname",
                label: "testrecordtypefieldlabel",
                fieldtype: "text",
                isrequired: true,
                isnullable: true,
                ishidden: true
            };
        }

        th.apiTests.post.defaultNegative(co.apis.recordtypes + "/field/clientnulldatatypenull", co.permissions.SETTINGS_CLIENT_RECORDTYPES, createPostTestRecordtypefield);

        it('responds with 400 when no name is given', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            delete fieldtosend.name;
            return th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
        });

        it('responds with 400 when name contains characters other than a-z', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.name = "aUb";
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.name = "a0b";
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.name = "a'b";
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.name = "a\"b";
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.name = "a-b";
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.name = "a_b";
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
        });

        it('responds with 400 when fieldtype is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.fieldtype = "invalidfieldtype";
            return th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
        });

        it('responds with 400 when fieldtype is formula and formula is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.fieldtype = "formula";
            fieldtosend.formula = "invalid formula";
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({});
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({ unknownformula: "A" });
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({ childsum: 13 });
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({ ifthenelse: "eins" });
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({ ifthenelse: ["A"] });
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({ ifthenelse: [ 1, 13, "B", 42 ] });
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({ ifthenelse: [ "A", 13, 2, 42 ] });
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({ sum: "eins" });
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({ sum: [ 1, "2" ] });
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
        });

        it('responds with 400 when isrequired is not of type boolean', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.isrequired = "notboolean";
            return th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
        });

        it('responds with 400 when isnullable is not of type boolean', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.isnullable = "notboolean";
            return th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
        });

        it('responds with 400 when ishidden is not of type boolean', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.ishidden = "notboolean";
            return th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
        });

        it('responds with 400 when formulaindex is not of type int', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.formulaindex = "notint";
            return th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
        });

        it('responds with 400 when fieldtype is reference and reference targets an invalid datatype', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.fieldtype = "reference";
            fieldtosend.reference = "invaliddatatype";
            return th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(400);
        });

        it('responds with 404 when datatype does not exist for client', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            return th.post(`/api/recordtypes/field/invaliddatatype?token=${token}`).send(fieldtosend).expect(404);
        });

        it('responds with 404 when datatype does not exist for client but for other client', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            return th.post(`/api/recordtypes/field/clientonedatatypenull?token=${token}`).send(fieldtosend).expect(404);
        });

        it('responds with 409 when a field with the given name already exists for the datatype', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.name = "name";
            return th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(409);
        });

        it('creates the field and returns 200 on correct fieldtype "text"', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields[fieldtosend.name];
            assert.ok(fieldfromdatabase);
            assert.strictEqual(fieldfromdatabase.datatypename, "clientnulldatatypenull");
            assert.strictEqual(fieldfromdatabase.fieldtype, "text");
            assert.strictEqual(fieldfromdatabase.formula, null);
            assert.strictEqual(fieldfromdatabase.formulaindex, 0);
            assert.strictEqual(fieldfromdatabase.ishidden, fieldtosend.ishidden);
            assert.strictEqual(fieldfromdatabase.ismanuallyupdated, false);
            assert.strictEqual(fieldfromdatabase.isnullable, fieldtosend.isnullable);
            assert.strictEqual(fieldfromdatabase.ispredefined, false);
            assert.strictEqual(fieldfromdatabase.isrequired, fieldtosend.isrequired);
            assert.strictEqual(fieldfromdatabase.label, fieldtosend.label);
            assert.strictEqual(fieldfromdatabase.name, fieldtosend.name);
            assert.strictEqual(fieldfromdatabase.reference, null);
        });

        it('creates the field and returns 200 on correct fieldtype "decimal"', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.fieldtype = "decimal";
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields[fieldtosend.name];
            assert.strictEqual(fieldfromdatabase.fieldtype, fieldtosend.fieldtype);
        });

        it('creates the field and returns 200 on correct fieldtype "boolean"', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.fieldtype = "boolean";
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields[fieldtosend.name];
            assert.strictEqual(fieldfromdatabase.fieldtype, fieldtosend.fieldtype);
        });

        it('creates the field and returns 200 on correct fieldtype "datetime"', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.fieldtype = "datetime";
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields[fieldtosend.name];
            assert.strictEqual(fieldfromdatabase.fieldtype, fieldtosend.fieldtype);
        });

        it('creates the field and returns 200 on correct fieldtype "password"', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.fieldtype = "password";
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields[fieldtosend.name];
            assert.strictEqual(fieldfromdatabase.fieldtype, fieldtosend.fieldtype);
        });

        it('creates the field and returns 200 on correct fieldtype "reference"', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.fieldtype = "reference";
            fieldtosend.reference = "clientnulldatatypeone";
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields[fieldtosend.name];
            assert.strictEqual(fieldfromdatabase.fieldtype, fieldtosend.fieldtype);
            assert.strictEqual(fieldfromdatabase.reference, fieldtosend.reference);
        });

        it('creates the field and returns 200 on correct fieldtype "formula"', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.fieldtype = "formula";
            fieldtosend.formula = JSON.stringify({ childsum: "childfield" });
            fieldtosend.formulaindex = 13;
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields[fieldtosend.name];
            assert.strictEqual(fieldfromdatabase.fieldtype, fieldtosend.fieldtype);
            assert.strictEqual(fieldfromdatabase.formula, fieldtosend.formula);
            assert.strictEqual(fieldfromdatabase.formulaindex, fieldtosend.formulaindex);
        });

        it('creates the field even when one with the given name already exists for another datatype', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.name = "datatypeonefield";
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields[fieldtosend.name];
            assert.ok(fieldfromdatabase);
        });

        it('ignores the attribute "datatypename" when sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.datatypename = "customdatatypename";
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields[fieldtosend.name];
            assert.strictEqual(fieldfromdatabase.datatypename, "clientnulldatatypenull");
        });

        it('ignores the attribute "ispredefined" when sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.ispredefined = true;
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields[fieldtosend.name];
            assert.strictEqual(fieldfromdatabase.ispredefined, false);
        });

        it('recalculates the formula of all entities of the datatype when a new formula field was created', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = createPostTestRecordtypefield();
            fieldtosend.fieldtype = "formula";
            fieldtosend.formula = JSON.stringify({ childsum: "decimal0" });
            fieldtosend.formulaindex = 13;
            await th.post(`/api/recordtypes/field/clientnulldatatypenull?token=${token}`).send(fieldtosend).expect(200);
            var entity = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.strictEqual(entity.testrecordtypefieldname, 345.789);
        });

    });

    describe('PUT/field/:datatypename/:fieldname', () => {

        function createPutTestRecordtypefield() {
            return {
                _id: "text0",
                label: "testrecordtypefieldlabel",
                ishidden: true
            };
        }

        th.apiTests.put.defaultNegative(co.apis.recordtypes + "/field/clientnulldatatypenull", co.permissions.SETTINGS_CLIENT_RECORDTYPES, createPutTestRecordtypefield);

        it('responds with 400 when fieldtype is formula and sent formula is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {};
            fieldtosend.formula = "invalid formula";
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula0?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({});
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula0?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({ unknownformula: "A" });
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula0?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({ childsum: 13 });
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula0?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({ ifthenelse: "eins" });
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula0?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({ ifthenelse: ["A"] });
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula0?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({ ifthenelse: [ 1, 13, "B", 42 ] });
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula0?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({ ifthenelse: [ "A", 13, 2, 42 ] });
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula0?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({ sum: "eins" });
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula0?token=${token}`).send(fieldtosend).expect(400);
            fieldtosend.formula = JSON.stringify({ sum: [ 1, "2" ] });
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula0?token=${token}`).send(fieldtosend).expect(400);
        });

        it('responds with 400 when label is not of type text', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                label: 1234,
                ishidden: true
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/text0?token=${token}`).send(fieldtosend).expect(400);
        });

        it('responds with 400 when ishidden is not of type boolean', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                label: "updatedlabel",
                ishidden: "notboolean"
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/text0?token=${token}`).send(fieldtosend).expect(400);
        });

        it('responds with 400 when formulaindex is not of type int', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                formulaindex: "notint"
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula0?token=${token}`).send(fieldtosend).expect(400);
        });

        it('responds with 400 when no attributes to update are sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {};
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/text0?token=${token}`).send(fieldtosend).expect(400);
        });

        it('responds with 404 when the datatype does not exist for the client', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                label: "updatedlabel",
                ishidden: true
            };
            await th.put(`/api/recordtypes/field/invalidtatatypename/text0?token=${token}`).send(fieldtosend).expect(404);
        });

        it('responds with 404 when the datatype does not exist for the client, even when it exists for another client', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                label: "updatedlabel",
                ishidden: true
            };
            await th.put(`/api/recordtypes/field/clientonedatatypenull/boolean0?token=${token}`).send(fieldtosend).expect(404);
        });

        it('responds with 404 when the field does not exist for the datatype', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                label: "updatedlabel",
                ishidden: true
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/unknownfieldname?token=${token}`).send(fieldtosend).expect(404);
        });

        it('responds with 404 when the field does not exist for the datatype even when it exists for another datatype', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                label: "updatedlabel",
                ishidden: true
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/clientonetextnull?token=${token}`).send(fieldtosend).expect(404);
        });

        it('updates the field and sets the attribute "ismanuallyupdated" to true', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                label: "updatedlabel",
                ishidden: true
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/text0?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields.text0;
            assert.strictEqual(fieldfromdatabase.label, fieldtosend.label);
            assert.strictEqual(fieldfromdatabase.ishidden, fieldtosend.ishidden);
            assert.strictEqual(fieldfromdatabase.ismanuallyupdated, true);
        });

        it('does not update the label when it is not set', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                ishidden: true
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/text0?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields.text0;
            assert.strictEqual(fieldfromdatabase.label, "Text0");
        });

        it('does not update the formula when it is not set', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                ishidden: true
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula0?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields.formula0;
            assert.strictEqual(fieldfromdatabase.formula, JSON.stringify({ childsum : "decimal0" }));
        });

        it('does not update the formulaindex when it is not set', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                ishidden: true
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula1?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields.formula1;
            assert.strictEqual(fieldfromdatabase.formulaindex, 1);
        });

        it('does not update the ishidden attribute when it is not set', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                label: "updatedlabel"
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/text0?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields.text0;
            assert.strictEqual(fieldfromdatabase.ishidden, false);
        });

        it('does not update the name when it was sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                name: "newname",
                label: "updatedlabel"
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/text0?token=${token}`).send(fieldtosend).expect(200);
            assert.ok((await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields.text0);
            assert.ok(!(await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields.newname);
        });

        it('does not update the fieldtype when it was sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                fieldtype: "boolean",
                label: "updatedlabel"
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/text0?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields.text0;
            assert.strictEqual(fieldfromdatabase.fieldtype, "text");
        });

        it('does not update isrequired when it was sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                isrequired: true,
                label: "updatedlabel"
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/text0?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields.text0;
            assert.strictEqual(fieldfromdatabase.isrequired, false);
        });

        it('does not update the reference when it was sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                reference: "clientnulldatatypetwo",
                label: "updatedlabel"
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/reference0?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields.reference0;
            assert.strictEqual(fieldfromdatabase.reference, "users");
        });

        it('does not update isnullable when it was sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                isnullable: false,
                label: "updatedlabel"
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/text0?token=${token}`).send(fieldtosend).expect(200);
            var fieldfromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"].fields.text0;
            assert.strictEqual(fieldfromdatabase.isnullable, true);
        });

        it('recalculates the formulas of all instances when the formula changed', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                formula: { sum : ["decimal0", "decimal0"] }
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula0?token=${token}`).send(fieldtosend).expect(200);
            var entities = await Db.getDynamicObjects("client0", "clientnulldatatypenull");
            assert.ok(entities.length > 0);
            for (var i = 0; i < entities.length; i++) {
                var entity = entities[i];
                if (entity.decimal0 === null) {
                    assert.strictEqual(entity.formula0, 0); // 0, not null because of formula type "sum"
                } else {
                    assert.strictEqual(entity.formula0, entity.decimal0 + entity.decimal0);
                }
            }
        });

        it('recalculates the formulas of all instances when the formulaindex changed', async() => {
            // All formulas must be set to zero before recalculation on the entity
            await Db.query("client0", "UPDATE clientnulldatatypenull SET formula0=0;");
            await Db.query("client0", "UPDATE clientnulldatatypenull SET formula1=0;");
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                formulaindex: 2
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula0?token=${token}`).send(fieldtosend).expect(200);
            var entity = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity2");
            assert.strictEqual(entity.formula1, 345.789);
        });

        it('recalculates the formulas of all parents when the formula changed', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                formula: { sum : ["decimal0", "decimal0"] }
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula0?token=${token}`).send(fieldtosend).expect(200);
            var parent = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.strictEqual(parent.formula1, 703.701); // 3 x decimal0
        });

        it('recalculates the formulas of all parents when the formulaindex changed', async() => {
            await Db.query("client0", "UPDATE clientnulldatatypenull SET formula0=0;");
            await Db.query("client0", "UPDATE clientnulldatatypenull SET formula1=0;");
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fieldtosend = {
                formulaindex: 2
            };
            await th.put(`/api/recordtypes/field/clientnulldatatypenull/formula0?token=${token}`).send(fieldtosend).expect(200);
            var parent = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity2");
            assert.strictEqual(parent.formula1, 345.789); // formula0=0 + decimal0=345.789
        });

    });

    describe('PUT/:name', () => {

        function createPutTestRecordtype() {
            return {
                _id: "clientnulldatatypenull",
                label: "testrecordtypelabel",
                plurallabel: "testrecordtypeplurallabel",
                titlefield: "formula0",
                lists: [ "updatedlist1", "updatedlist2" ],
                icon: "testrecordtypeicon",
                permissionkey: "testrecordtypepermissionkey",
                canhaverelations: false,
                candefinename: false
            };
        }

        th.apiTests.put.defaultNegative(co.apis.recordtypes, co.permissions.SETTINGS_CLIENT_RECORDTYPES, createPutTestRecordtype);

        it('responds with 400 when the titlefield is given but there is no field of this name', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            datatypetosend.titlefield = "unknownfield";
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(400);
        });

        it('responds with 400 when label is not of type text', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            datatypetosend.label = 123;
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(400);
        });

        it('responds with 400 when plurallabel is not of type text', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            datatypetosend.plurallabel = 123;
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(400);
        });

        it('responds with 400 when titlefield is not of type text', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            datatypetosend.titlefield = 123;
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(400);
        });

        it('responds with 400 when lists is not an array of type text', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            datatypetosend.lists = "noarray";
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(400);
            datatypetosend.lists = [ 1, "zwei" ];
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(400);
        });

        it('responds with 400 when icon is not of type text', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            datatypetosend.icon = 123;
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(400);
        });

        it('responds with 400 when permissionkey is not of type text', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            datatypetosend.permissionkey = 123;
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(400);
        });

        it('responds with 400 when canhaverelations is not of type boolean', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            datatypetosend.canhaverelations = "notboolean";
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(400);
        });

        it('responds with 400 when candefinename is not of type boolean', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            datatypetosend.candefinename = "notboolean";
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(400);
        });

        it('responds with 400 when no attributes to update are sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = {};
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(400);
        });

        it('responds with 404 when the datatype does not exist for the client', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            await th.put(`/api/recordtypes/unknowndatatype?token=${token}`).send(datatypetosend).expect(404);
        });

        it('responds with 404 when the datatype does not exist for the client, even when it exists for another client', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            await th.put(`/api/recordtypes/clientonedatatypenull?token=${token}`).send(datatypetosend).expect(404);
        });

        it('updates the datatype and sets the attribute "ismanuallyupdated" to true', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"];
            assert.strictEqual(datatypefromdatabase.label, datatypetosend.label);
            assert.strictEqual(datatypefromdatabase.plurallabel, datatypetosend.plurallabel);
            assert.strictEqual(datatypefromdatabase.titlefield, datatypetosend.titlefield);
            assert.strictEqual(JSON.stringify(datatypefromdatabase.lists), JSON.stringify(datatypetosend.lists));
            assert.strictEqual(datatypefromdatabase.icon, datatypetosend.icon);
            assert.strictEqual(datatypefromdatabase.permissionkey, datatypetosend.permissionkey);
            assert.strictEqual(datatypefromdatabase.canhaverelations, datatypetosend.canhaverelations);
            assert.strictEqual(datatypefromdatabase.candefinename, datatypetosend.candefinename);
            assert.strictEqual(datatypefromdatabase.ismanuallyupdated, true);
        });

        it('does not update the label when it is not set', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            delete datatypetosend.label;
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"];
            assert.strictEqual(datatypefromdatabase.label, "label0");
        });

        it('does not update the plurallabel when it is not set', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            delete datatypetosend.plurallabel;
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"];
            assert.strictEqual(datatypefromdatabase.plurallabel, "plurallabel0");
        });

        it('does not update the titlefield when it is not set', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            delete datatypetosend.titlefield;
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"];
            assert.strictEqual(datatypefromdatabase.titlefield, "text0");
        });

        it('does not update the lists when it is not set', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            delete datatypetosend.lists;
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"];
            assert.strictEqual(JSON.stringify(datatypefromdatabase.lists), JSON.stringify(["list0"]));
        });

        it('empties the list when an emtpy list is sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            datatypetosend.lists = [];
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"];
            assert.strictEqual(JSON.stringify(datatypefromdatabase.lists), JSON.stringify([]));
        });

        it('does not update the icon when it is not set', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            delete datatypetosend.icon;
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"];
            assert.strictEqual(datatypefromdatabase.icon, "icon0");
        });

        it('does not update the permissionkey when it is not set', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            delete datatypetosend.permissionkey;
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"];
            assert.strictEqual(datatypefromdatabase.permissionkey, co.permissions.BIM_FMOBJECT);
        });

        it('does not update the permissionkey when it is set but predefined', async() => {
            await Db.query("client0", "UPDATE datatypes SET ispredefined=true WHERE name='clientnulldatatypenull';");
            delete Db.datatypes;
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"];
            assert.strictEqual(datatypefromdatabase.permissionkey, co.permissions.BIM_FMOBJECT);
        });

        it('does not update canhaverelations when it is not set', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            delete datatypetosend.canhaverelations;
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"];
            assert.strictEqual(datatypefromdatabase.canhaverelations, true);
        });

        it('does not update canhaverelations when it is set but predefined', async() => {
            await Db.query("client0", "UPDATE datatypes SET ispredefined=true WHERE name='clientnulldatatypenull';");
            delete Db.datatypes;
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"];
            assert.strictEqual(datatypefromdatabase.canhaverelations, true);
        });

        it('does not update candefinename when it is not set', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            delete datatypetosend.candefinename;
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"];
            assert.strictEqual(datatypefromdatabase.candefinename, true);
        });

        it('does not update candefinename when it is set but predefined', async() => {
            await Db.query("client0", "UPDATE datatypes SET ispredefined=true WHERE name='clientnulldatatypenull';");
            delete Db.datatypes;
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"];
            assert.strictEqual(datatypefromdatabase.candefinename, true);
        });

        it('does not update the name when it was sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            datatypetosend.name = "newname";
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(200);
            assert.ok((await Db.getdatatypes("client0"))["clientnulldatatypenull"]);
            assert.ok(!(await Db.getdatatypes("client0"))["newname"]);
        });

        it('does not update ispredefined when it was sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var datatypetosend = createPutTestRecordtype();
            datatypetosend.ispredefined = true;
            await th.put(`/api/recordtypes/clientnulldatatypenull?token=${token}`).send(datatypetosend).expect(200);
            var datatypefromdatabase = (await Db.getdatatypes("client0"))["clientnulldatatypenull"];
            assert.strictEqual(datatypefromdatabase.ispredefined, false);
        });

    });

    describe('DELETE/field/:datatypename/:fieldname', () => {

        // th.apiTests.delete.defaultNegative(co.apis.activities, co.permissions.OFFICE_ACTIVITY, getDeleteActivityId);
        // th.apiTests.delete.clientDependentNegative(co.apis.activities, getDeleteActivityId);
        // th.apiTests.delete.defaultPositive(co.apis.activities, co.collections.activities.name, getDeleteActivityId);

        xit('responds with 400 when the field is set as titlefield in the datatype', async() => {});

        xit('responds with 400 when the field is predefined', async() => {});

        xit('responds with 404 when the datatype does not exist for the client', async() => {});

        xit('responds with 404 when the datatype does not exist for the client, even when it exists for another client', async() => {});

        xit('responds with 404 when the field does not exist for the datatype', async() => {});

        xit('responds with 404 when the field does not exist for the datatype even when it exists for another datatype', async() => {});

        xit('deletes the field and its corresponding table column and returns 204', async() => {});

        xit('recalculates the formulas of all parents when the field was referenced in a formula', async() => {});

    });

    describe('DELETE/:name', () => {

        // th.apiTests.delete.defaultNegative(co.apis.activities, co.permissions.OFFICE_ACTIVITY, getDeleteActivityId);
        // th.apiTests.delete.clientDependentNegative(co.apis.activities, getDeleteActivityId);
        // th.apiTests.delete.defaultPositive(co.apis.activities, co.collections.activities.name, getDeleteActivityId);

        xit('responds with 400 when the datatype is predefined', async() => {});

        xit('responds with 400 when datatype is still references by a reference field of another datatype', async() => {});

        xit('responds with 400 when datatype is still references within a relation (datatype1name)', async() => {});

        xit('responds with 400 when datatype is still references within a relation (datatype2name)', async() => {});

        xit('responds with 404 when the datatype does not exist for the client', async() => {});

        xit('responds with 404 when the datatype does not exist for the client, even when it exists for another client', async() => {});

        xit('deletes the datatype, its table and returns 204', async() => {});

        xit('deletes the datatype even when it is references within an own field (ring dependencies are possible and okay)', async() => {});

        xit('recalculates the formulas of all parents', async() => {});

    });

});
