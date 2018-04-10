var assert = require('assert');
var fs = require("fs");
var th = require('../testhelpers');
var co = require('../../utils/constants');
var ch = require("../../utils/calculationhelper");
var dh = require("../../utils/documentsHelper");
var Db = require("../../utils/db").Db;

describe.only('API dynamic', () => {

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
        await th.prepareDynamicAttributes("client0", "client0_datatype0", "client0_datatype0_entity0");
        await ch.calculateentityandparentsrecursively("client0", "client0_datatype0", "client0_datatype0_entity2");
    });

    afterEach(async() => {
        await th.removeDocumentFiles();
    })

    describe('DELETE/:recordtypename/:entityname', () => {

        it('responds without authentication with 403', async() => {
            return th.del("/api/dynamic/client0_datatype0/client0_datatype0_entity0").expect(403);
        });

        it('responds without write permission with 403', async() => {
            await th.removeWritePermission("client0", "client0_usergroup0", co.permissions.BIM_FMOBJECT);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/client0_datatype0/client0_datatype0_entity0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/client0_datatype0/client0_datatype0_entity0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user1");
            await th.del(`/api/dynamic/client0_datatype0/client0_datatype0_entity0?token=${token}`).expect(403);
        });

        it('responds with 403 when the recordtypename is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/invalidrecordtypename/client0_datatype0_entity0?token=${token}`).expect(403);
        });

        it('responds with 204 when the entityname is invalid (ignored silently)', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/client0_datatype0/invalidentityname?token=${token}`).expect(204);
        });

        it('responds with 403 when the object to delete does not belong to client of the logged in user', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/client1_datatype0/client1_datatype0_entity0?token=${token}`).expect(403);
        });

        it('deletes the object and return 204', async() => {
            var before = await Db.getDynamicObject("client0", "client0_datatype0", "client0_datatype0_entity0");
            assert.ok(before);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/client0_datatype0/client0_datatype0_entity0?token=${token}`).expect(204);
            var after = await Db.getDynamicObject("client0", "client0_datatype0", "client0_datatype0_entity0");
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
            var before = await Db.getDynamicObject("client0", "client0_datatype1", "client0_datatype1_entity0");
            assert.ok(before);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/client0_datatype0/client0_datatype0_entity0?token=${token}`).expect(204);
            var after = await Db.getDynamicObject("client0", "client0_datatype1", "client0_datatype1_entity0");
            assert.ok(after);
        });

        it('all relations, where the element is the source (datatype1name, name1), are also deleted', async() => {
            var before = await Db.getDynamicObject("client0", "relations", { datatype1name: "client0_datatype0", name1: "client0_datatype0_entity0" });
            assert.ok(before);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/client0_datatype0/client0_datatype0_entity0?token=${token}`).expect(204);
            var after = await Db.getDynamicObject("client0", "relations", { datatype1name: "client0_datatype0", name1: "client0_datatype0_entity0" });
            assert.ok(!after);
        });

        it('all relations, where the element is the target (datatype2name, name2), are also deleted', async() => {
            var before = await Db.getDynamicObject("client0", "relations", { datatype2name: "client0_datatype1", name2: "client0_datatype1_entity0" });
            assert.ok(before);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/client0_datatype1/client0_datatype1_entity0?token=${token}`).expect(204);
            var after = await Db.getDynamicObject("client0", "relations", { datatype2name: "client0_datatype1", name2: "client0_datatype1_entity0" });
            assert.ok(!after);
        });

        it('deletes all dynamic attribute values for the entity', async() => {
            var before = await Db.getDynamicObjects("client0", "dynamicattributevalues", { entityname: "client0_datatype0_entity0" });
            assert.ok(before.length > 0);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/client0_datatype0/client0_datatype0_entity0?token=${token}`).expect(204);
            var after = await Db.getDynamicObjects("client0", "dynamicattributevalues", { entityname: "client0_datatype0_entity0" });
            assert.ok(after.length === 0);
        });

        it('recalculates all parent objects recursively when the object to delete itself is a relation of type "parentchild"', async() => {
            var before = await Db.getDynamicObject("client0", "client0_datatype0", "client0_datatype0_entity0");
            assert.strictEqual(before.formula1, 580.356);
            var token = await th.defaults.login("client0_usergroup0_user0");
            var r = await Db.getDynamicObjects("client0", "relations");
            await th.del(`/api/dynamic/relations/client0_client0_datatype0_client0_datatype0_entity0_client0_datatype0_client0_datatype0_entity2?token=${token}`).expect(204);
            var after = await Db.getDynamicObject("client0", "client0_datatype0", "client0_datatype0_entity0");
            assert.strictEqual(after.formula1, 234.567);
        });

        it('does not trigger recalculation of related objects when the object to delete itself is a relation but not of type "parentchild"', async() => {
            Db.query("client0", "UPDATE client0_datatype0 SET formula0=10, formula1=20 WHERE name='client0_datatype0_entity0';");
            var before = await Db.getDynamicObject("client0", "client0_datatype0", "client0_datatype0_entity0");
            assert.strictEqual(before.formula0, 10);
            assert.strictEqual(before.formula1, 20);
            var token = await th.defaults.login("client0_usergroup0_user0");
            var r = await Db.getDynamicObjects("client0", "relations");
            await th.del(`/api/dynamic/relations/client0_client0_datatype0_client0_datatype0_entity0_client0_datatype0_client0_datatype0_entity1?token=${token}`).expect(204);
            var after = await Db.getDynamicObject("client0", "client0_datatype0", "client0_datatype0_entity0");
            assert.strictEqual(before.formula0, 10);
            assert.strictEqual(before.formula1, 20);
        });

        it('recalculates all parent objects recursively of the object to be deleted', async() => {
            var before = await Db.getDynamicObject("client0", "client0_datatype0", "client0_datatype0_entity0");
            assert.strictEqual(before.formula1, 580.356);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/client0_datatype0/client0_datatype0_entity2?token=${token}`).expect(204);
            var after = await Db.getDynamicObject("client0", "client0_datatype0", "client0_datatype0_entity0");
            assert.strictEqual(after.formula1, 234.567);
        });

        it('also deletes attached files when the object is a document', async() => {
            var filepath = dh.getDocumentPath("client0", "client0_document0");
            assert.ok(fs.existsSync(filepath));
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/dynamic/documents/client0_document0?token=${token}`).expect(204);
            assert.ok(!fs.existsSync(filepath));
        });

    });
    
    describe('GET/children/:forlist/:recordtypename/:entityname', () => {

        it('responds without authentication with 403', async() => {
            return th.get("/api/dynamic/children/list0/client0_datatype0/client0_datatype0_entity0").expect(403);
        });

        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_FMOBJECT);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/children/list0/client0_datatype0/client0_datatype0_entity0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/children/list0/client0_datatype0/client0_datatype0_entity0?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user1");
            return th.get(`/api/dynamic/children/list0/client0_datatype0/client0_datatype0_entity0?token=${token}`).expect(403);
        });

        it('responds with 403 when the recordtypename is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/children/list0/invalidrecordtypename/client0_datatype0_entity0?token=${token}`).expect(403);
        });

        it('responds with emtpy list when the entityname is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/children/list0/client0_datatype0/invalidentityname?token=${token}`).expect(200)).body;
            assert.strictEqual(result.length, 0);
        });

        it('responds with empty list when there are no children for the given list name', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/children/unknownlistname/client0_datatype0/client0_datatype0_entity0?token=${token}`).expect(200)).body;
            assert.strictEqual(result.length, 0);
        });

        it('responds with 403 when the object to request does not belong to client of the logged in user', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/children/list0/client1_datatype0/client1_datatype0_entity0?token=${token}`).expect(403);
        });

        it('responds with a list of children of a given entity which are contained in the given list', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/children/list0/client0_datatype0/client0_datatype0_entity0?token=${token}`).expect(200)).body;
            assert.ok(result.length > 0);
            assert.ok(result.find(c => c.name === "client0_datatype0_entity2"));
            assert.ok(result.find(c => c.name === "client0_datatype2_entity0"));
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
            var result = (await th.get(`/api/dynamic/children/list0/client0_datatype0/client0_datatype0_entity4?token=${token}`).expect(200)).body;
            assert.strictEqual(result.length, 0);
        });

        it('does not return children of recordtypes where the user has no access to', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_AREAS);
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/children/list0/client0_datatype0/client0_datatype0_entity0?token=${token}`).expect(200)).body;
            assert.ok(result.length > 0);
            assert.ok(result.find(c => c.name === "client0_datatype0_entity2"));
            assert.ok(!result.find(c => c.name === "client0_datatype2_entity0"));
        });

    });

    describe('GET/hierarchytoelement/:forlist/:recordtypename/:entityname', () => {

        it('responds without authentication with 403', async() => {
            return th.get("/api/dynamic/hierarchytoelement/list0/client0_datatype0/client0_datatype0_entity4").expect(403);
        });

        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_FMOBJECT);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/hierarchytoelement/list0/client0_datatype0/client0_datatype0_entity4?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/hierarchytoelement/list0/client0_datatype0/client0_datatype0_entity4?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async() => {
            await th.removeClientModule("client0", co.modules.fmobjects);
            var token = await th.defaults.login("client0_usergroup0_user1");
            return th.get(`/api/dynamic/hierarchytoelement/list0/client0_datatype0/client0_datatype0_entity4?token=${token}`).expect(403);
        });

        it('responds with 403 when the recordtypename is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/hierarchytoelement/list0/invalidrecordtypename/client0_datatype0_entity4?token=${token}`).expect(403);
        });

        it('responds with list containing only root elements when the entityname is invalid', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/hierarchytoelement/list0/client0_datatype0/invalidentityname?token=${token}`).expect(200)).body;
            assert.ok(result.length > 0);
            assert.ok(result.find(c => c.name === "client0_datatype0_entity0"));
            assert.ok(result.find(c => c.name === "client0_datatype0_entity1"));
        });

        it('responds with list containing only root elements when the element is a root element without any parents', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/hierarchytoelement/list0/client0_datatype0/client0_datatype0_entity0?token=${token}`).expect(200)).body;
            assert.ok(result.length > 0);
            assert.ok(result.find(c => c.name === "client0_datatype0_entity0"));
            assert.ok(result.find(c => c.name === "client0_datatype0_entity1"));
        });

        it('responds with empty list when there are no parents for the given list name', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/hierarchytoelement/unknownlistname/client0_datatype0/client0_datatype0_entity4?token=${token}`).expect(200)).body;
            assert.strictEqual(result.length, 0);
        });

        it('responds with 403 when the object to request does not belong to client of the logged in user', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            return th.get(`/api/dynamic/hierarchytoelement/list0/client1_datatype0/client1_datatype0_entity0?token=${token}`).expect(403);
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
            var result = (await th.get(`/api/dynamic/hierarchytoelement/list0/client0_datatype0/client0_datatype0_entity4?token=${token}`).expect(200)).body;
            // client0_datatype0_entity0 --> client0_datatype0_entity2 --> client0_datatype0_entity4
            assert.ok(result.length > 0);
            assert.ok(result.find(c => c.name === "client0_datatype0_entity1"));
            var e0 = result.find(c => c.name === "client0_datatype0_entity0");
            assert.ok(e0);
            check(e0);
            assert.ok(e0.children);
            assert.ok(e0.children.length > 0);
            assert.ok(e0.children.find(c => c.name === "client0_datatype0_entity3")); // client0_datatype1_entity0 is not in list "list0"
            assert.ok(e0.children.find(c => c.name === "client0_datatype2_entity0"));
            var e2 = e0.children.find(c => c.name === "client0_datatype0_entity2");
            assert.ok(e2);
            check(e2);
            assert.ok(e2.children);
            assert.ok(e2.children.length > 0);
            var e4 = e2.children.find(c => c.name === "client0_datatype0_entity4");
            check(e4);
        });

        it('does not return children of the parents for recordtypes where the user has no access to', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_AREAS);
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/hierarchytoelement/list0/client0_datatype0/client0_datatype0_entity4?token=${token}`).expect(200)).body;
            assert.ok(result.length > 0);
            var e0 = result.find(c => c.name === "client0_datatype0_entity0");
            assert.ok(e0);
            assert.ok(e0.children);
            assert.ok(e0.children.length > 0);
            assert.ok(!e0.children.find(c => c.name === "client0_datatype2_entity0"));
        });

        it('does not return parents for recordtypes where the user has no access to', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_AREAS);
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/hierarchytoelement/list0/client0_datatype0/client0_datatype0_entity5?token=${token}`).expect(200)).body;
            assert.ok(result.length > 0);
            var e0 = result.find(c => c.name === "client0_datatype0_entity0");
            assert.ok(e0);
            assert.ok(e0.children);
            assert.ok(e0.children.length > 0);
            assert.ok(!e0.children.find(c => c.name === "client0_datatype2_entity0"));
        });

        it('does not return root elements for recordtypes where the user has no access to (emtpy list)', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.BIM_FMOBJECT);
            var token = await th.defaults.login("client0_usergroup0_user0");
            var result = (await th.get(`/api/dynamic/hierarchytoelement/list0/client0_datatype2/client0_datatype2_entity1?token=${token}`).expect(200)).body;
            assert.strictEqual(result.length, 0);
        });

    });

    describe('GET/parentpath/:forlist/:recordtypename/:entityname', () => {

        xit('responds without authentication with 403', async() => {
        });

        xit('responds without read permission with 403', async() => {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async() => {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async() => {
        });

        xit('responds with 400 when the recordtypename is invalid', async() => {
        });

        xit('responds with 404 when the entityname is invalid', async() => {
        });

        xit('responds with empty list when the element is a root element without any parents', async() => {
        });

        xit('responds with empty list when there are no parents for the given list name', async() => {
        });

        xit('responds with 404 when the object to request does not belong to client of the logged in user', async() => {
        });

        xit('responds with a list of parents ordered from root (1st) to the element (last)', async() => {
        });

        xit('does not return parents for recordtypes where the user has no access to', async() => {
        });

    });

    describe('GET/rootelements/:forlist', () => {

        xit('responds without authentication with 403', async() => {
        });

        xit('responds without read permission with 403', async() => {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to the base module, with 403', async() => {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to the base module, with 403', async() => {
        });

        xit('responds with empty list when there are no root elements for the given list name', async() => {
        });

        xit('responds with a list of root elements', async() => {
            // check for haschildren!
        });

        xit('does not return root elements for recordtypes where the user has no access to', async() => {
        });

    });

    describe('GET/:recordtypename', () => {

        xit('responds without authentication with 403', async() => {
        });

        xit('responds without read permission with 403', async() => {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async() => {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async() => {
        });

        xit('responds with 400 when the recordtypename is invalid', async() => {
        });

        xit('responds with empty list when there are no elements of the given record type', async() => {
        });

        xit('responds with empty list when the user has no access to the record type', async() => {
        });

        xit('responds with a list of all elements of the given record type', async() => {
        });

    });

    describe('GET/:recordtypename/:entityname', () => {

        xit('responds without authentication with 403', async() => {
        });

        xit('responds without read permission with 403', async() => {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async() => {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async() => {
        });

        xit('responds with 400 when the recordtypename is invalid', async() => {
        });

        xit('responds with 404 when the entityname is invalid', async() => {
        });

        xit('responds with 404 when the object to request does not belong to client of the logged in user', async() => {
        });

        xit('responds with the record data of the given entityname', async() => {
        });

    });

    describe('POST/:recordtypename', () => {

        xit('responds without authentication with 403', async() => {
        });

        xit('responds without write permission with 403', async() => {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async() => {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async() => {
        });

        xit('responds with 400 when the recordtypename is invalid', async() => {
        });

        xit('responds with 409 when the name can be defined but is used by another entity', async() => {
        });

        xit('creates a new entity and generates a name when name cannot be defined', async() => {
        });

        xit('creates a new entity and generates a name when name can be defined but was not sent', async() => {
        });

        xit('recalculates the referenced parents when the object to create is a relation of type "parent-child"', async() => {
        });

        xit('returns the name of the created entity', async() => {
        });

        xit('recalculates the formulas of the created entity immediately', async() => {
        });

    });

    describe('PUT/:recordtypename/:entityname', () => {

        xit('responds without authentication with 403', async() => {
        });

        xit('responds without write permission with 403', async() => {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async() => {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async() => {
        });

        xit('responds with 400 when the recordtypename is invalid', async() => {
        });

        xit('responds with 404 when the entityname is invalid', async() => {
        });

        xit('responds with 404 when the object to update does not belong to client of the logged in user', async() => {
        });

        xit('does not update the name when it was sent', async() => {
        });

        xit('updates all given fields of the entity and returns 200', async() => {
        });

        xit('does not update fields which are not sent', async() => {
        });

        xit('recalculates the formerly referenced parents when the object to update is a relation and its type changed away from "parent-child"', async() => {
        });

        xit('recalculates the formerly referenced parents when the object to update is a relation and its type changed to "parent-child"', async() => {
        });

        xit('recalculates the formerly referenced parents when the object to update is a relation and its first relation element changed', async() => {
        });

        xit('recalculates the formerly referenced parents when the object to update is a relation and its second relation element changed', async() => {
        });

        xit('recalculates the new referenced parents when the object to update is a relation and its type changed away from "parent-child"', async() => {
        });

        xit('recalculates the new referenced parents when the object to update is a relation and its type changed to "parent-child"', async() => {
        });

        xit('recalculates the new referenced parents when the object to update is a relation and its first relation element changed', async() => {
        });

        xit('recalculates the new referenced parents when the object to update is a relation and its second relation element changed', async() => {
        });

        xit('recalculates the formulas of the updated entity immediately', async() => {
        });

    });

});
