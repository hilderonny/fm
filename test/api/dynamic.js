var assert = require('assert');
var fs = require("fs");
var th = require('../testhelpers');
var co = require('../../utils/constants');
var ch = require("../../utils/calculationhelper");
var dh = require("../../utils/documentsHelper");
var Db = require("../../utils/db").Db;

describe('API dynamic', () => {

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.preparedatatypes();
        await th.preparedatatypefields();
        await th.preparedynamicobjects();
        await th.preparerelations();
        await th.prepareDocuments();
        await th.prepareDocumentFiles();
        await th.prepareDynamicAttributes("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
        await ch.calculateentityandparentsrecursively("client0", "clientnulldatatypenull", "clientnulldatatypenullentity2");
    });

    afterEach(async() => {
        await th.removeDocumentFiles();
    })

    describe('DELETE/:recordtypename/:entityname', () => {

        it('responds without authentication with 403', async() => {
            return th.del("/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0").expect(403);
        });

        it('responds without write permission with 403', async() => {
            await th.removeWritePermission("client0", "client0_usergroup0", co.permissions.BIM_FMOBJECT);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user1");
            await th.del(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(403);
        });

        it('responds with 403 when the recordtypename is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/invalidrecordtypename/clientnulldatatypenullentity0?token=${token}`).expect(403);
        });

        it('responds with 204 when the entityname is invalid (ignored silently)', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/clientnulldatatypenull/invalidentityname?token=${token}`).expect(204);
        });

        it('responds with 403 when the object to delete does not belong to client of the logged in user', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/clientonedatatypenull/clientonedatatypenullentity0?token=${token}`).expect(403);
        });

        it('deletes the object and return 204', async() => {
            var before = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.ok(before);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(204);
            var after = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.ok(!after);
        });

        it('deletes the object even when there are references (e.g. users-usergroups) to the object', async() => {
            var before = await Db.getDynamicObject("client0", "users", "client0_usergroup0_user1");
            assert.ok(before);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/users/client0_usergroup0_user1?token=${token}`).expect(204);
            var after = await Db.getDynamicObject("client0", "users", "client0_usergroup0_user1");
            assert.ok(!after);
        });

        it('does not delete elements which are connected via parent child relations (no recursive child deletion)', async() => {
            var before = await Db.getDynamicObject("client0", "clientnulldatatypeone", "clientnulldatatypeoneentity0");
            assert.ok(before);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(204);
            var after = await Db.getDynamicObject("client0", "clientnulldatatypeone", "clientnulldatatypeoneentity0");
            assert.ok(after);
        });

        it('all relations, where the element is the source (datatype1name, name1), are also deleted', async() => {
            var before = await Db.getDynamicObject("client0", "relations", { datatype1name: "clientnulldatatypenull", name1: "clientnulldatatypenullentity0" });
            assert.ok(before);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(204);
            var after = await Db.getDynamicObject("client0", "relations", { datatype1name: "clientnulldatatypenull", name1: "clientnulldatatypenullentity0" });
            assert.ok(!after);
        });

        it('all relations, where the element is the target (datatype2name, name2), are also deleted', async() => {
            var before = await Db.getDynamicObject("client0", "relations", { datatype2name: "clientnulldatatypeone", name2: "clientnulldatatypeoneentity0" });
            assert.ok(before);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/clientnulldatatypeone/clientnulldatatypeoneentity0?token=${token}`).expect(204);
            var after = await Db.getDynamicObject("client0", "relations", { datatype2name: "clientnulldatatypeone", name2: "clientnulldatatypeoneentity0" });
            assert.ok(!after);
        });

        it('deletes all dynamic attribute values for the entity', async() => {
            var before = await Db.getDynamicObjects("client0", "dynamicattributevalues", { entityname: "clientnulldatatypenullentity0" });
            assert.ok(before.length > 0);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(204);
            var after = await Db.getDynamicObjects("client0", "dynamicattributevalues", { entityname: "clientnulldatatypenullentity0" });
            assert.ok(after.length === 0);
        });

        it('recalculates all parent objects recursively when the object to delete itself is a relation of type "parentchild"', async() => {
            var before = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.strictEqual(before.formula1, '580.356');
            var token = await th.defaults.login("client0_usergroup0_user0");
            var r = await Db.getDynamicObjects("client0", "relations");
            await th.del(`/api/dynamic/relations/client0_clientnulldatatypenull_clientnulldatatypenullentity0_clientnulldatatypenull_clientnulldatatypenullentity2?token=${token}`).expect(204);
            var after = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.strictEqual(after.formula1, '234.567');
        });

        it('does not trigger recalculation of related objects when the object to delete itself is a relation but not of type "parentchild"', async() => {
            Db.query("client0", "UPDATE clientnulldatatypenull SET formula0=10, formula1=20 WHERE name='clientnulldatatypenullentity0';");
            var before = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.strictEqual(before.formula0, '10');
            assert.strictEqual(before.formula1, '20');
            var token = await th.defaults.login("client0_usergroup0_user0");
            var r = await Db.getDynamicObjects("client0", "relations");
            await th.del(`/api/dynamic/relations/client0_clientnulldatatypenull_clientnulldatatypenullentity0_clientnulldatatypenull_clientnulldatatypenullentity1?token=${token}`).expect(204);
            var after = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.strictEqual(before.formula0, '10');
            assert.strictEqual(before.formula1, '20');
        });

        it('recalculates all parent objects recursively of the object to be deleted', async() => {
            var before = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.strictEqual(before.formula1, '580.356');
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity2?token=${token}`).expect(204);
            var after = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.strictEqual(after.formula1, '234.567');
        });

        it('also deletes attached files when the object is a document', async() => {
            var filepath = dh.getDocumentPath("client0", "client0_document0");
            assert.ok(fs.existsSync(filepath));
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/documents/client0_document0?token=${token}`).expect(204);
            assert.ok(!fs.existsSync(filepath));
        });

        it('also deletes the table and document files when the object is a client', async() => {
            await Db.createClient("testclient", "label");
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.del(`/api/dynamic/clients/testclient?token=${token}`).expect(204);
            var filepath = dh.getDocumentPath("testclient", "");
            assert.ok(!fs.existsSync(filepath));
            var result = await Db.query(Db.PortalDatabaseName, "SELECT 1 FROM information_schema.tables WHERE table_name = 'testclient';");
            assert.strictEqual(result.rowCount, 0);
        });

    });
    
    describe('GET/children/:forlist/:recordtypename/:entityname', () => {

        it('responds without authentication with 403', async() => {
            return th.get("/api/dynamic/children/list0/clientnulldatatypenull/clientnulldatatypenullentity0").expect(403);
        });

        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_FMOBJECT);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/children/list0/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/children/list0/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user1");
            return th.get(`/api/dynamic/children/list0/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(403);
        });

        it('responds with 403 when the recordtypename is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/children/list0/invalidrecordtypename/clientnulldatatypenullentity0?token=${token}`).expect(403);
        });

        it('responds with emtpy list when the entityname is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/children/list0/clientnulldatatypenull/invalidentityname?token=${token}`).expect(200)).body;
            assert.strictEqual(result.length, 0);
        });

        it('responds with empty list when there are no children for the given list name', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/children/unknownlistname/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(200)).body;
            assert.strictEqual(result.length, 0);
        });

        it('responds with 403 when the object to request does not belong to client of the logged in user', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/children/list0/clientonedatatypenull/clientonedatatypenullentity0?token=${token}`).expect(403);
        });

        it('responds with a list of children of a given entity which are contained in the given list', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/children/list0/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(200)).body;
            assert.ok(result.length > 0);
            assert.ok(result.find(c => c.name === "clientnulldatatypenullentity2"));
            assert.ok(result.find(c => c.name === "clientnulldatatypetwoentity0"));
            result.forEach(r => {
                var fieldnames = Object.keys(r);
                assert.ok(fieldnames.indexOf("name") >= 0);
                assert.ok(fieldnames.indexOf("datatypename") >= 0);
                assert.ok(fieldnames.indexOf("icon") >= 0);
                assert.ok(fieldnames.indexOf("haschildren") >= 0);
            });
        });

        it('responds with an empty list when the element has no children', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/children/list0/clientnulldatatypenull/clientnulldatatypenullentity4?token=${token}`).expect(200)).body;
            assert.strictEqual(result.length, 0);
        });

        it('does not return children of recordtypes where the user has no access to', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_AREAS);
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/children/list0/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(200)).body;
            assert.ok(result.length > 0);
            assert.ok(result.find(c => c.name === "clientnulldatatypenullentity2"));
            assert.ok(!result.find(c => c.name === "clientnulldatatypetwoentity0"));
        });

        it('returns the icon of the entity when it has such an attribute "icon"', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/children/list0/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(200)).body;
            var entity3 = result.find(r => r.name === "clientnulldatatypenullentity3");
            assert.strictEqual(entity3.icon, "clientnulldatatypenullentity3_customicon.png");
        });

        it('returns the icon of the datatype when the entity has no own "icon" attribute', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/children/list0/clientnulldatatypetwo/clientnulldatatypetwoentity0?token=${token}`).expect(200)).body;
            var entity1 = result.find(r => r.name === "clientnulldatatypetwoentity1");
            assert.strictEqual(entity1.icon, "icon2");
        });

    });

    describe('GET/hierarchytoelement/:forlist/:recordtypename/:entityname', () => {

        it('responds without authentication with 403', async() => {
            return th.get("/api/dynamic/hierarchytoelement/list0/clientnulldatatypenull/clientnulldatatypenullentity4").expect(403);
        });

        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_FMOBJECT);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/hierarchytoelement/list0/clientnulldatatypenull/clientnulldatatypenullentity4?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/hierarchytoelement/list0/clientnulldatatypenull/clientnulldatatypenullentity4?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user1");
            return th.get(`/api/dynamic/hierarchytoelement/list0/clientnulldatatypenull/clientnulldatatypenullentity4?token=${token}`).expect(403);
        });

        it('responds with 403 when the recordtypename is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/hierarchytoelement/list0/invalidrecordtypename/clientnulldatatypenullentity4?token=${token}`).expect(403);
        });

        it('responds with list containing only root elements when the entityname is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/hierarchytoelement/list0/clientnulldatatypenull/invalidentityname?token=${token}`).expect(200)).body;
            assert.ok(result.length > 0);
            assert.ok(result.find(c => c.name === "clientnulldatatypenullentity0"));
            assert.ok(result.find(c => c.name === "clientnulldatatypenullentity1"));
        });

        it('responds with list containing only root elements when the element is a root element without any parents', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/hierarchytoelement/list0/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(200)).body;
            assert.ok(result.length > 0);
            assert.ok(result.find(c => c.name === "clientnulldatatypenullentity0"));
            assert.ok(result.find(c => c.name === "clientnulldatatypenullentity1"));
        });

        it('responds with empty list when there are no parents for the given list name', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/hierarchytoelement/unknownlistname/clientnulldatatypenull/clientnulldatatypenullentity4?token=${token}`).expect(200)).body;
            assert.strictEqual(result.length, 0);
        });

        it('responds with 403 when the object to request does not belong to client of the logged in user', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/hierarchytoelement/list0/clientonedatatypenull/clientonedatatypenullentity0?token=${token}`).expect(403);
        });

        it('responds with a hierarchy of root elements and their children down to the requested element', async() => {
            function check(e) {
                var fieldnames = Object.keys(e);
                assert.ok(fieldnames.indexOf("name") >= 0);
                assert.ok(fieldnames.indexOf("datatypename") >= 0);
                assert.ok(fieldnames.indexOf("icon") >= 0);
                assert.ok(fieldnames.indexOf("haschildren") >= 0);
            }
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/hierarchytoelement/list0/clientnulldatatypenull/clientnulldatatypenullentity4?token=${token}`).expect(200)).body;
            // clientnulldatatypenullentity0 --> clientnulldatatypenullentity2 --> clientnulldatatypenullentity4
            assert.ok(result.length > 0);
            assert.ok(result.find(c => c.name === "clientnulldatatypenullentity1"));
            var e0 = result.find(c => c.name === "clientnulldatatypenullentity0");
            assert.ok(e0);
            check(e0);
            assert.ok(e0.children);
            assert.ok(e0.children.length > 0);
            assert.ok(e0.children.find(c => c.name === "clientnulldatatypenullentity3")); // clientnulldatatypeoneentity0 is not in list "list0"
            assert.ok(e0.children.find(c => c.name === "clientnulldatatypetwoentity0"));
            var e2 = e0.children.find(c => c.name === "clientnulldatatypenullentity2");
            assert.ok(e2);
            check(e2);
            assert.ok(e2.children);
            assert.ok(e2.children.length > 0);
            var e4 = e2.children.find(c => c.name === "clientnulldatatypenullentity4");
            check(e4);
        });

        it('does not return children of the parents for recordtypes where the user has no access to', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_AREAS);
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/hierarchytoelement/list0/clientnulldatatypenull/clientnulldatatypenullentity4?token=${token}`).expect(200)).body;
            assert.ok(result.length > 0);
            var e0 = result.find(c => c.name === "clientnulldatatypenullentity0");
            assert.ok(e0);
            assert.ok(e0.children);
            assert.ok(e0.children.length > 0);
            assert.ok(!e0.children.find(c => c.name === "clientnulldatatypetwoentity0"));
        });

        it('does not return parents for recordtypes where the user has no access to', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_AREAS);
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/hierarchytoelement/list0/clientnulldatatypenull/clientnulldatatypenullentity5?token=${token}`).expect(200)).body;
            assert.ok(result.length > 0);
            var e0 = result.find(c => c.name === "clientnulldatatypenullentity0");
            assert.ok(e0);
            assert.ok(e0.children);
            assert.ok(e0.children.length > 0);
            assert.ok(!e0.children.find(c => c.name === "clientnulldatatypetwoentity0"));
        });

        it('does not return root elements for recordtypes where the user has no access to', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_FMOBJECT);
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/hierarchytoelement/list0/clientnulldatatypetwo/clientnulldatatypetwoentity1?token=${token}`).expect(200)).body;
            assert.strictEqual(result.length, 1); // Only clientnulldatatypetwoentity2
        });

    });

    describe('GET/parentpath/:forlist/:recordtypename/:entityname', () => {

        it('responds without authentication with 403', async() => {
            return th.get("/api/dynamic/parentpath/list0/clientnulldatatypenull/clientnulldatatypenullentity4").expect(403);
        });

        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_FMOBJECT);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/parentpath/list0/clientnulldatatypenull/clientnulldatatypenullentity4?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/parentpath/list0/clientnulldatatypenull/clientnulldatatypenullentity4?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user1");
            return th.get(`/api/dynamic/parentpath/list0/clientnulldatatypenull/clientnulldatatypenullentity4?token=${token}`).expect(403);
        });

        it('responds with 403 when the recordtypename is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/parentpath/list0/invalidrecordtypename/clientnulldatatypenullentity4?token=${token}`).expect(403);
        });

        it('responds with empty list when the entityname is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/parentpath/list0/clientnulldatatypenull/invalidentityname?token=${token}`).expect(200)).body;
            assert.strictEqual(result.length, 0);
        });

        it('responds with empty list when the element is a root element without any parents', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/parentpath/list0/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(200)).body;
            assert.strictEqual(result.length, 0);
        });

        it('responds with empty list when there are no parents for the given list name', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/parentpath/unknownlistname/clientnulldatatypenull/clientnulldatatypenullentity4?token=${token}`).expect(200)).body;
            assert.strictEqual(result.length, 0);
        });

        it('responds with 403 when the object to request does not belong to client of the logged in user', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/parentpath/list0/clientonedatatypenull/clientonedatatypenullentity0?token=${token}`).expect(403);
        });

        it('responds with a list of parent element titles ordered from root to element', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/parentpath/list0/clientnulldatatypenull/clientnulldatatypenullentity6?token=${token}`).expect(200)).body;
            // clientnulldatatypenullentity0 --> clientnulldatatypenullentity2 --> clientnulldatatypenullentity4
            assert.ok(result.length > 2);
            assert.strictEqual(result[0], "C0D0E0");
            assert.strictEqual(result[1], "clientnulldatatypetwoentity0");
            assert.strictEqual(result[2], "C0D0E5");
        });

        it('does not return parent labels for recordtypes where the user has no access to', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_AREAS);
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/parentpath/list0/clientnulldatatypenull/clientnulldatatypenullentity6?token=${token}`).expect(200)).body;
            assert.ok(result.length > 1);
            assert.strictEqual(result[0], "C0D0E0");
            assert.strictEqual(result[1], "C0D0E5");
        });

        it('returns the name of elements where the datatypes have no labels defined', async() => {
            await Db.query("client0", "UPDATE datatypes SET titlefield = null WHERE name='clientnulldatatypenull';");
            delete Db.datatypes;
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/parentpath/list0/clientnulldatatypenull/clientnulldatatypenullentity6?token=${token}`).expect(200)).body;
            // clientnulldatatypenullentity0 --> clientnulldatatypenullentity2 --> clientnulldatatypenullentity4
            assert.ok(result.length > 2);
            assert.strictEqual(result[0], "clientnulldatatypenullentity0");
        });

    });

    describe('GET/rootelements/:forlist', () => {

        it('responds without authentication with 403', async() => {
            return th.get("/api/dynamic/rootelements/list0").expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to the base module, with 403', async() => {
            await th.removeClientModule("client0", co.modules.base);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/rootelements/list0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to the base module, with 403', async() => {
            await th.removeClientModule("client0", co.modules.base);
            var token = await th.defaults.login("client0_usergroup0_user1");
            return th.get(`/api/dynamic/rootelements/list0?token=${token}`).expect(403);
        });

        it('responds with empty list when there are no root elements for the given list name', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/rootelements/unknownlistname?token=${token}`).expect(200)).body;
            assert.strictEqual(result.length, 0);
        });

        it('responds with a list of root elements', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/rootelements/list0?token=${token}`).expect(200)).body;
            assert.ok(result.length > 0);
            assert.ok(result.find(c => c.name === "clientnulldatatypenullentity0"));
            assert.ok(result.find(c => c.name === "clientnulldatatypenullentity1"));
            assert.ok(result.find(c => c.name === "clientnulldatatypetwoentity2"));
            result.forEach(e => {
                var fieldnames = Object.keys(e);
                assert.ok(fieldnames.indexOf("name") >= 0);
                assert.ok(fieldnames.indexOf("datatypename") >= 0);
                assert.ok(fieldnames.indexOf("icon") >= 0);
                assert.ok(fieldnames.indexOf("haschildren") >= 0);
            });
        });

        it('does not return root elements for recordtypes where the user has no access to', async() => {
            await th.removeClientModule("client0", co.modules.notes);
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/rootelements/list0?token=${token}`).expect(200)).body;
            assert.ok(result.length > 0);
            assert.ok(!result.find(c => c.name === "clientnulldatatypetwoentity2"));
        });

        it('responds with a list of root elements on the portal (there are no clientmodules defined)', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/rootelements/users?token=${token}`).expect(200)).body;
            assert.ok(result.length > 0);
        });

        it('returns the icon of the entity when it has such an attribute "icon"', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/rootelements/list0?token=${token}`).expect(200)).body;
            var entity0 = result.find(r => r.name === "clientnulldatatypenullentity0");
            assert.strictEqual(entity0.icon, "clientnulldatatypenullentity0_customicon.png");
        });

        it('returns the icon of the datatype when the entity has no own "icon" attribute', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/rootelements/list0?token=${token}`).expect(200)).body;
            var entity2 = result.find(r => r.name === "clientnulldatatypetwoentity2");
            assert.strictEqual(entity2.icon, "icon2");
        });

    });

    describe('GET/:recordtypename', () => {

        it('responds without authentication with 403', async() => {
            return th.get("/api/dynamic/clientnulldatatypenull").expect(403);
        });

        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_FMOBJECT);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/clientnulldatatypenull?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/clientnulldatatypenull?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user1");
            return th.get(`/api/dynamic/clientnulldatatypenull?token=${token}`).expect(403);
        });

        it('responds with 403 when the recordtypename is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/invalidrecordtypename?token=${token}`).expect(403);
        });

        it('responds with empty list when there are no elements of the given record type', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/clientnulldatatypethree?token=${token}`).expect(200)).body;
            assert.strictEqual(result.length, 0);
        });

        it('responds with a list of all elements of the given record type', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/clientnulldatatypenull?token=${token}`).expect(200)).body;
            assert.ok(result.length > 0);
            result.forEach(e => {
                assert.ok(e.name);
            });
        });

    });

    describe('GET/:recordtypename/:entityname', () => {

        it('responds without authentication with 403', async() => {
            return th.get("/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0").expect(403);
        });

        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_FMOBJECT);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user1");
            return th.get(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(403);
        });

        it('responds with 403 when the recordtypename is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/invalidrecordtypename/clientnulldatatypenullentity0?token=${token}`).expect(403);
        });

        it('responds with 404 when the entityname is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/clientnulldatatypenull/invalidentityname?token=${token}`).expect(404);
        });

        it('responds with 403 when the object to request does not belong to client of the logged in user', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/clientonedatatypenull/clientonedatatypenullentity0?token=${token}`).expect(403);
        });

        it('responds with the record data of the given entityname', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).expect(200)).body;
            assert.ok(result);
            assert.strictEqual(result.boolean0, true);
            assert.strictEqual(result.datetime0, 123);
            assert.strictEqual(result.decimal0, 234.567);
            assert.strictEqual(result.reference0, "client0_usergroup0_user0");
            assert.strictEqual(result.text0, "C0D0E0");
            assert.strictEqual(result.formula0, '345.789');
            assert.strictEqual(result.formula1, '580.356');
        });

    });

    describe('POST/:recordtypename', () => {

        function prepareEntity() {
            return {
                boolean0: false,
                datetime0: 111,
                decimal0: 222,
                reference0: "client0_usergroup0_user0",
                text0: "AAA"
            }
        }

        it('responds without authentication with 403', async() => {
            var entity = prepareEntity();
            return th.post(`/api/dynamic/clientnulldatatypenull`).send(entity).expect(403);
        });

        it('responds without write permission with 403', async() => {
            var entity = prepareEntity();
            await th.removeWritePermission("client0", "client0_usergroup0", co.permissions.BIM_FMOBJECT);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.post(`/api/dynamic/clientnulldatatypenull?token=${token}`).send(entity).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async() => {
            var entity = prepareEntity();
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/dynamic/clientnulldatatypenull?token=${token}`).send(entity).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async() => {
            var entity = prepareEntity();
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user1");
            await th.post(`/api/dynamic/clientnulldatatypenull?token=${token}`).send(entity).expect(403);
        });

        it('responds with 403 when the recordtypename is invalid', async() => {
            var entity = prepareEntity();
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/dynamic/invalidrecordtypename?token=${token}`).send(entity).expect(403);
        });

        it('responds with 409 when the name can be defined but is used by another entity', async() => {
            var entity = prepareEntity();
            entity.name = "clientnulldatatypenullentity0";
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/dynamic/clientnulldatatypenull?token=${token}`).send(entity).expect(409);
        });

        it('responds with 400 when an attribute is required but missing', async() => {
            var entity = prepareEntity();
            delete entity.boolean0;
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/dynamic/clientnulldatatypenull?token=${token}`).send(entity).expect(400);
        });

        it('responds with 400 when no object is sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/dynamic/clientnulldatatypenull?token=${token}`).send().expect(400);
        });

        it('responds with 400 when an attribute has a wrong datatype', async() => {
            var entity = prepareEntity();
            entity.boolean0 = "Hoppala";
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/dynamic/clientnulldatatypenull?token=${token}`).send(entity).expect(400);
        });

        it('creates a new entity and responds with 200', async() => {
            var entity = prepareEntity();
            var token = await th.defaults.login("client0_usergroup0_user0");
            var name = (await th.post(`/api/dynamic/clientnulldatatypenull?token=${token}`).send(entity).expect(200)).text;
            var createdelement = await Db.getDynamicObject("client0", "clientnulldatatypenull", name);
            assert.ok(createdelement);
            assert.strictEqual(createdelement.boolean0, entity.boolean0);
            assert.strictEqual(createdelement.datetime0, entity.datetime0);
            assert.strictEqual(createdelement.decimal0, entity.decimal0);
            assert.strictEqual(createdelement.reference0, entity.reference0);
            assert.strictEqual(createdelement.text0, entity.text0);
        });

        it('creates a new entity and generates a name when name cannot be defined but was sent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var name = (await th.post(`/api/dynamic/clientnulldatatypeone?token=${token}`).send({name:"predefinedname"}).expect(200)).text; // clientnulldatatypeone
            assert.notStrictEqual(name, "predefinedname");
            var createdelement = await Db.getDynamicObject("client0", "clientnulldatatypeone", name);
            assert.ok(createdelement);
        });

        it('creates a new entity and uses the given name when name can be defined', async() => {
            var entity = prepareEntity();
            entity.name = "definedname";
            var token = await th.defaults.login("client0_usergroup0_user0");
            var name = (await th.post(`/api/dynamic/clientnulldatatypenull?token=${token}`).send(entity).expect(200)).text;
            assert.strictEqual(name, entity.name);
            var createdelement = await Db.getDynamicObject("client0", "clientnulldatatypenull", name);
            assert.ok(createdelement);
        });

        it('creates a new entity and generates a name when name can be defined but was not sent', async() => {
            var entity = prepareEntity();
            var token = await th.defaults.login("client0_usergroup0_user0");
            var name = (await th.post(`/api/dynamic/clientnulldatatypenull?token=${token}`).send(entity).expect(200)).text;
            assert.ok(name);
            var createdelement = await Db.getDynamicObject("client0", "clientnulldatatypenull", name);
            assert.ok(createdelement);
        });

        it('recalculates the referenced parents when the object to create is a relation of type "parent-child"', async() => {
            var relation = {
                datatype1name: "clientnulldatatypenull",
                name1: "clientnulldatatypenullentity0",
                datatype2name: "clientnulldatatypenull",
                name2: "clientnulldatatypenullentity7",
                relationtypename: "parentchild"
            };
            var token = await th.defaults.login("client0_usergroup0_user0");
            var name = (await th.post(`/api/dynamic/relations?token=${token}`).send(relation).expect(200)).text;
            var parent = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.strictEqual(parent.formula0, '445.789');
            assert.strictEqual(parent.formula1, '680.356');
        });

        it('recalculates the formulas of the created entity immediately', async() => {
            var entity = prepareEntity();
            var token = await th.defaults.login("client0_usergroup0_user0");
            var name = (await th.post(`/api/dynamic/clientnulldatatypenull?token=${token}`).send(entity).expect(200)).text;
            var createdelement = await Db.getDynamicObject("client0", "clientnulldatatypenull", name);
            assert.strictEqual(createdelement.formula1, '222');
        });

        it('does not set the formula value when a formula is given as attribute', async() => {
            var entity = prepareEntity();
            entity.formula0 = "newformulavalue";
            var token = await th.defaults.login("client0_usergroup0_user0");
            var name = (await th.post(`/api/dynamic/clientnulldatatypenull?token=${token}`).send(entity).expect(200)).text;
            var createdelement = await Db.getDynamicObject("client0", "clientnulldatatypenull", name);
            assert.notEqual(createdelement.formula0, entity.formula0);
        });

        it('does not fall into an endless calculation loop, when a ring dependency is created', async() => {
            var relation = {
                datatype1name: "clientnulldatatypenull",
                name1: "clientnulldatatypenullentity2",
                datatype2name: "clientnulldatatypenull",
                name2: "clientnulldatatypenullentity0",
                relationtypename: "parentchild"
            };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/dynamic/relations?token=${token}`).send(relation).expect(200);
        });

        it("creates a table and assigns the base and doc modules to the new client when the entity to create is a client", async() => {
            var newclient = {
                label: "posttestclient"
            };
            var token = await th.defaults.login("portal_usergroup0_user0");
            var name = (await th.post(`/api/dynamic/clients?token=${token}`).send(newclient).expect(200)).text;
            var createdclient = await Db.getDynamicObject(Db.PortalDatabaseName, "clients", name);
            assert.ok(createdclient);
            var cms = await Db.getDynamicObjects(Db.PortalDatabaseName, co.collections.clientmodules.name);
            var clientmodules = (await Db.query(Db.PortalDatabaseName, `SELECT * FROM clientmodules WHERE clientname='${name}';`)).rows;
            assert.strictEqual(clientmodules.length, 2);
            assert.ok(clientmodules.find(cm => cm.modulename === co.modules.base));
            assert.ok(clientmodules.find(cm => cm.modulename === co.modules.doc));
        });

    });

    describe('PUT/:recordtypename/:entityname', () => {

        function prepareEntity() {
            return {
                boolean0: false,
                datetime0: 3333,
                decimal0: 4444,
                reference0: "client0_usergroup0_user1",
                text0: "BBBB"
            }
        }

        it('responds without authentication with 403', async() => {
            var entity = prepareEntity();
            return th.put(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0`).send(entity).expect(403);
        });

        it('responds without write permission with 403', async() => {
            var entity = prepareEntity();
            await th.removeWritePermission("client0", "client0_usergroup0", co.permissions.BIM_FMOBJECT);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.put(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).send(entity).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async() => {
            var entity = prepareEntity();
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.put(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).send(entity).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async() => {
            var entity = prepareEntity();
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user1");
            return th.put(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).send(entity).expect(403);
        });

        it('responds with 403 when the recordtypename is invalid', async() => {
            var entity = prepareEntity();
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.put(`/api/dynamic/invalidrecordtypename/clientnulldatatypenullentity0?token=${token}`).send(entity).expect(403);
        });

        it('responds with 404 when the entityname is invalid', async() => {
            var entity = prepareEntity();
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.put(`/api/dynamic/clientnulldatatypenull/invalidentityname?token=${token}`).send(entity).expect(404);
        });

        it('responds with 403 when the object to update does not belong to client of the logged in user', async() => {
            var entity = prepareEntity();
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.put(`/api/dynamic/clientonedatatypenull/clientonedatatypenullentity0?token=${token}`).send(entity).expect(403);
        });

        it('does not update the name when it was sent', async() => {
            var entity = prepareEntity();
            entity.name = "newname";
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).send(entity).expect(200);
            var updatedentity = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.ok(updatedentity);
            var entitywithnewname = await Db.getDynamicObject("client0", "clientnulldatatypenull", "newname");
            assert.ok(!entitywithnewname);
        });

        it('updates all given fields of the entity and returns 200', async() => {
            var entity = prepareEntity();
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).send(entity).expect(200);
            var updatedentity = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.ok(updatedentity);
            assert.strictEqual(updatedentity.boolean0, entity.boolean0);
            assert.strictEqual(updatedentity.datetime0, entity.datetime0);
            assert.strictEqual(updatedentity.decimal0, entity.decimal0);
            assert.strictEqual(updatedentity.reference0, entity.reference0);
            assert.strictEqual(updatedentity.text0, entity.text0);
        });

        it('does not update fields which are not sent', async() => {
            var entity = prepareEntity();
            delete entity.boolean0;
            delete entity.decimal0;
            delete entity.reference0;
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).send(entity).expect(200);
            var updatedentity = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.ok(updatedentity);
            assert.strictEqual(updatedentity.boolean0, true);
            assert.strictEqual(updatedentity.datetime0, entity.datetime0);
            assert.strictEqual(updatedentity.decimal0, 234.567);
            assert.strictEqual(updatedentity.reference0, "client0_usergroup0_user0");
            assert.strictEqual(updatedentity.text0, entity.text0);
        });

        it('recalculates the formerly referenced parents when the object to update is a relation and its type changed away from "parent-child"', async() => {
            var relation = {
                relationtypename: "dependency"
            };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/dynamic/relations/client0_clientnulldatatypenull_clientnulldatatypenullentity0_clientnulldatatypenull_clientnulldatatypenullentity2?token=${token}`).send(relation).expect(200);
            var parent = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.strictEqual(parent.formula0, '0'); // No children anymore
            assert.strictEqual(parent.formula1, '234.567');
        });

        it('recalculates the formerly referenced parents when the object to update is a relation and its type changed to "parent-child"', async() => {
            var relation = {
                relationtypename: "parentchild"
            };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/dynamic/relations/client0_clientnulldatatypenull_clientnulldatatypenullentity0_clientnulldatatypenull_clientnulldatatypenullentity1?token=${token}`).send(relation).expect(200);
            var parent = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.strictEqual(parent.formula0, '456.789');
            assert.strictEqual(parent.formula1, '691.356');
        });

        it('recalculates the formerly referenced parents when the object to update is a relation and its first relation element changed', async() => {
            var relation = {
                name1: "clientnulldatatypenullentity7"
            };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/dynamic/relations/client0_clientnulldatatypenull_clientnulldatatypenullentity0_clientnulldatatypenull_clientnulldatatypenullentity2?token=${token}`).send(relation).expect(200);
            var parent = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.strictEqual(parent.formula0, '0'); // No children anymore
            assert.strictEqual(parent.formula1, '234.567');
        });

        it('recalculates the formerly referenced parents when the object to update is a relation and its second relation element changed', async() => {
            var relation = {
                name2: "clientnulldatatypenullentity7"
            };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/dynamic/relations/client0_clientnulldatatypenull_clientnulldatatypenullentity0_clientnulldatatypenull_clientnulldatatypenullentity2?token=${token}`).send(relation).expect(200);
            var parent = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.strictEqual(parent.formula0, '100'); // Now only entity7
            assert.strictEqual(parent.formula1, '334.567');
        });

        it('recalculates the new referenced parents when the object to update is a relation and its first relation element changed', async() => {
            var relation = {
                name1: "clientnulldatatypenullentity7"
            };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/dynamic/relations/client0_clientnulldatatypenull_clientnulldatatypenullentity0_clientnulldatatypenull_clientnulldatatypenullentity2?token=${token}`).send(relation).expect(200);
            var parent = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity7");
            assert.strictEqual(parent.formula0, '345.789');
            assert.strictEqual(parent.formula1, '445.789');
        });

        it('recalculates the formulas of the updated entity immediately', async() => {
            var entity = prepareEntity();
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).send(entity).expect(200);
            var updatedentity = await Db.getDynamicObject("client0", "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.ok(updatedentity);
            assert.strictEqual(updatedentity.formula1, '4789.789');
        });

        it('responds with 400 when a formula is given as attribute', async() => {
            var entity = prepareEntity();
            entity.formula0 = 100;
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.put(`/api/dynamic/clientnulldatatypenull/clientnulldatatypenullentity0?token=${token}`).send(entity).expect(400);
        });

        it('does not fall into an endless calculation loop, when a ring dependency is created', async() => {
            var relation = {
                name2: "clientnulldatatypenullentity0"
            };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/dynamic/relations/client0_clientnulldatatypenull_clientnulldatatypenullentity0_clientnulldatatypenull_clientnulldatatypenullentity2?token=${token}`).send(relation).expect(200);
        });

    });

});
