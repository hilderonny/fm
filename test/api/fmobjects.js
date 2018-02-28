/**
 * UNIT Tests for api/fmobjects
 */
var assert = require('assert');
var fs = require('fs');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('API fmobjects', () => {
    
    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareFmObjects();
        await th.prepareFolders();
        await th.prepareDocuments();
        await th.prepareRelations();
    });

    var areaTypeCategories = {
        "Wohnen und Aufenthalt" : "FMOBJECTS_CATEGORY_NUF",
        "Büroarbeit" : "FMOBJECTS_CATEGORY_NUF",
        "Produktion, Hand- und Maschinenarbeit, Experimente" : "FMOBJECTS_CATEGORY_NUF",
        "Lagern, Verteilen und Verkaufen" : "FMOBJECTS_CATEGORY_NUF",
        "Bildung, Unterricht und Kultur" : "FMOBJECTS_CATEGORY_NUF",
        "Heilen und Pflegen" : "FMOBJECTS_CATEGORY_NUF",
        "Sonstige Nutzung" : "FMOBJECTS_CATEGORY_NUF",
        "Technische Anlagen" : "FMOBJECTS_CATEGORY_TF",
        "Verkehrserschließung und -sicherung" : "FMOBJECTS_CATEGORY_VF",
    }

    function mapFields(e, clientname) {
        return {
            _id: e.name,
            clientId: clientname,
            name: e.label,
            parentId: e.parentfmobjectname,
            type: e.fmobjecttypename,
            areatype: e.areatypename,
            category: areaTypeCategories[e.areacategoryname],
            f: e.f,
            bgf: e.bgf,
            usagestate: e.areausagestatename,
            previewImageId: e.previewimagedocumentname,
            nrf: e.nrf,
            nuf: e.nuf,
            tf: e.tf,
            vf: e.vf,
            
        }
    }

    describe('GET/', () => {

        th.apiTests.get.defaultNegative(co.apis.fmobjects, co.permissions.BIM_FMOBJECT);

        it('returns a hierarchy of FM objects which are ordered by their names', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fmObjectsFromApi = (await th.get(`/api/${co.apis.fmobjects}?token=${token}`).expect(200)).body;
            assert.strictEqual(fmObjectsFromApi.length, 2);
            assert.strictEqual(fmObjectsFromApi[0].name, 'label0');
            assert.strictEqual(fmObjectsFromApi[0].type, 'FMOBJECTS_TYPE_PROJECT');
            assert.strictEqual(fmObjectsFromApi[0].children.length, 2);
            assert.strictEqual(fmObjectsFromApi[0].children[0].name, 'label00');
            assert.strictEqual(fmObjectsFromApi[0].children[0].type, 'FMOBJECTS_TYPE_BUILDING');
            assert.strictEqual(fmObjectsFromApi[0].children[0].children.length, 1);
            assert.strictEqual(fmObjectsFromApi[0].children[0].children[0].name, 'label000');
            assert.strictEqual(fmObjectsFromApi[0].children[0].children[0].type, 'FMOBJECTS_TYPE_AREA');
            assert.strictEqual(fmObjectsFromApi[0].children[0].children[0].children.length, 0);
            assert.strictEqual(fmObjectsFromApi[0].children[1].name, 'label01');
            assert.strictEqual(fmObjectsFromApi[0].children[1].type, 'FMOBJECTS_TYPE_LEVEL');
            assert.strictEqual(fmObjectsFromApi[0].children[1].children.length, 0);
            assert.strictEqual(fmObjectsFromApi[1].name, 'label1');
            assert.strictEqual(fmObjectsFromApi[1].type, 'FMOBJECTS_TYPE_PROPERTY');
            assert.strictEqual(fmObjectsFromApi[1].children.length, 0);
        });

    });

    describe('GET/forIds', () => {

        async function createTestFmObjects() {
            return [
                { _id: "client0_fmobject0", name: "label0" },
                { _id: "client0_fmobject00", name: "label00" }
            ];
        }

        th.apiTests.getForIds.defaultNegative(co.apis.fmobjects, co.permissions.BIM_FMOBJECT, co.collections.fmobjects.name, createTestFmObjects);
        th.apiTests.getForIds.clientDependentNegative(co.apis.fmobjects, co.collections.fmobjects.name, createTestFmObjects);
        th.apiTests.getForIds.defaultPositive(co.apis.fmobjects, co.collections.fmobjects.name, createTestFmObjects);

        it('returns the path to the root for every obtained FM object', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fmObjectsFromApi = (await th.get(`/api/${co.apis.fmobjects}/forids?ids=client0_fmobject0,client0_fmobject00,client0_fmobject000&token=${token}`).expect(200)).body;
            // Check hierarchy hardcoded
            assert.strictEqual(fmObjectsFromApi.length, 3);
            assert.strictEqual(fmObjectsFromApi[0].name, 'label0');
            assert.strictEqual(fmObjectsFromApi[0].type, 'FMOBJECTS_TYPE_PROJECT');
            assert.strictEqual(fmObjectsFromApi[0].path.length, 0);
            assert.strictEqual(fmObjectsFromApi[1].name, 'label00');
            assert.strictEqual(fmObjectsFromApi[1].type, 'FMOBJECTS_TYPE_BUILDING');
            assert.strictEqual(fmObjectsFromApi[1].path.length, 1);
            assert.strictEqual(fmObjectsFromApi[1].path[0].name, 'label0');
            assert.strictEqual(fmObjectsFromApi[2].name, 'label000');
            assert.strictEqual(fmObjectsFromApi[2].type, 'FMOBJECTS_TYPE_AREA');
            assert.strictEqual(fmObjectsFromApi[2].path.length, 2);
            assert.strictEqual(fmObjectsFromApi[2].path[0].name, 'label0');
            assert.strictEqual(fmObjectsFromApi[2].path[1].name, 'label00');
        });

    });

    describe('GET/:id', () => {

        th.apiTests.getId.defaultNegative(co.apis.fmobjects, co.permissions.BIM_FMOBJECT, co.collections.fmobjects.name);
        th.apiTests.getId.clientDependentNegative(co.apis.fmobjects, co.collections.fmobjects.name);

        it('returns the FM object with the given _id', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fmobjectFromApi = (await th.get(`/api/${co.apis.fmobjects}/client0_fmobject00?token=${token}`).expect(200)).body;
            assert.ok(fmobjectFromApi);
            assert.strictEqual(fmobjectFromApi._id, "client0_fmobject00");
            assert.strictEqual(fmobjectFromApi.name, "label00");
            assert.strictEqual(fmobjectFromApi.type, "FMOBJECTS_TYPE_BUILDING");
            assert.strictEqual(fmobjectFromApi.parentId, "client0_fmobject0");
            assert.strictEqual(fmobjectFromApi.previewImageId, "client0_document01");
            assert.strictEqual(fmobjectFromApi.category, "FMOBJECTS_CATEGORY_NUF");
            assert.strictEqual(fmobjectFromApi.areatype, "Büroarbeit");
            assert.strictEqual(fmobjectFromApi.f, 10);
            assert.strictEqual(fmobjectFromApi.bgf, 50);
            assert.strictEqual(fmobjectFromApi.usagestate, "Eigengenutzt");
            assert.strictEqual(fmobjectFromApi.nrf, 30);
            assert.strictEqual(fmobjectFromApi.nuf, 5);
            assert.strictEqual(fmobjectFromApi.tf, 3);
            assert.strictEqual(fmobjectFromApi.vf, 2);
        });

        it('Contains the full path in correct order', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var fmobjectFromApi = (await th.get(`/api/${co.apis.fmobjects}/client0_fmobject000?token=${token}`).expect(200)).body;
            assert.ok(fmobjectFromApi);
            assert.strictEqual(fmobjectFromApi.path.length, 2);
            assert.strictEqual(fmobjectFromApi.path[0].name, "label0");
            assert.strictEqual(fmobjectFromApi.path[1].name, "label00");
        });

    });

    describe('POST/', () => {

        async function createPostTestFmObject() {
            return { name: 'newFmObject' };
        }

        th.apiTests.post.defaultNegative(co.apis.fmobjects, co.permissions.BIM_FMOBJECT, createPostTestFmObject);
        th.apiTests.post.defaultPositive(co.apis.fmobjects, co.collections.fmobjects.name, createPostTestFmObject, (fmobjects) => fmobjects.map(mapFields));

        it('responds with 400 when there is no FM object with the given parentId (when parentId is set)', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var newFMobject = {name: 'O1', parentId: '999999999999999999999999' };
            await th.post(`/api/${co.apis.fmobjects}?token=${token}`).send(newFMobject).expect(400);
        });

        it('responds with correctly created FM object with given parent', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var newFMobject = {name: 'O1', parentId: 'client0_fmobject0' };
            var fmobjectfromapi = (await th.post(`/api/${co.apis.fmobjects}?token=${token}`).send(newFMobject).expect(200)).body;
            assert.ok(fmobjectfromapi);
            assert.ok(fmobjectfromapi._id);
            var fmobjectfromdatabase = await Db.getDynamicObject("client0", co.collections.fmobjects.name, fmobjectfromapi._id);
            assert.ok(fmobjectfromdatabase);
            assert.strictEqual(fmobjectfromdatabase.label, newFMobject.name);
            assert.strictEqual(fmobjectfromdatabase.parentfmobjectname, newFMobject.parentId);
        });

        it('Returns 400 when the given previewImageId is not a valid document id', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var newFMobject = {name: 'O1', previewImageId: '999999999999999999999999' };
            await th.post(`/api/${co.apis.fmobjects}?token=${token}`).send(newFMobject).expect(400);
        });

    });

    describe('PUT/:id', () => {

        async function createPutTestFmObject(clientname) {
            return { _id: clientname + "_fmobject0", clientId: clientname, name: "newlabeö" };
        }

        th.apiTests.put.defaultNegative(co.apis.fmobjects, co.permissions.BIM_FMOBJECT, createPutTestFmObject);
        th.apiTests.put.clientDependentNegative(co.apis.fmobjects, createPutTestFmObject);

        it('responds with 400 when there is no FM object with the given new parentId (when parentId is changed)', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var updateset = { parentId: '999999999999999999999999' };
            await th.put(`/api/${co.apis.fmobjects}/client0_fmobject00?token=${token}`).send(updateset).expect(400);
        });

        it('responds with correctly updated FM object', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var updateset = { name: "newlabel", parentId: 'client0_fmobject1' };
            await th.put(`/api/${co.apis.fmobjects}/client0_fmobject00?token=${token}`).send(updateset).expect(200);
            var fmobjectfromdatabase = await Db.getDynamicObject("client0", co.collections.fmobjects.name, "client0_fmobject00");
            assert.strictEqual(fmobjectfromdatabase.label, updateset.name);
            assert.strictEqual(fmobjectfromdatabase.parentfmobjectname, updateset.parentId);
        });

        it('Returns 400 when the given previewImageId is not a valid document id', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var updateset = { previewImageId: '999999999999999999999999' };
            await th.put(`/api/${co.apis.fmobjects}/client0_fmobject00?token=${token}`).send(updateset).expect(400);
        });
            
    });

    describe('DELETE/:id', () => {

        async function getDeleteFmObjectId(clientname) {
            return clientname + "_fmobject0";
        }

        th.apiTests.delete.defaultNegative(co.apis.fmobjects, co.permissions.BIM_FMOBJECT, getDeleteFmObjectId);
        th.apiTests.delete.clientDependentNegative(co.apis.fmobjects, getDeleteFmObjectId);
        th.apiTests.delete.defaultPositive(co.apis.fmobjects, co.collections.fmobjects.name, getDeleteFmObjectId);

        it('responds with 204 and deletes the FM object itself and all subelements of the FM object', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/fmobjects/client0_fmobject0?token=${token}`).expect(204);
            var fmobjects = await Db.getDynamicObjects("client0", co.collections.fmobjects.name);
            assert.ok(!fmobjects.find((f) => f.parentfmobjectname && f.parentfmobjectname.indexOf("client0_fmobject0") === 0));
        });

    });

});
