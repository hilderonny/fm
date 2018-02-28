/**
 * UNIT Tests for api/folders
 */
var assert = require('assert');
var fs = require('fs');
var documentsHelper = require('../../utils/documentsHelper');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');
var dh = require('../../utils/documentsHelper');
var Db = require("../../utils/db").Db;

describe('API folders', () => {
    
    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareFolders();
        await th.prepareDocuments();
        await th.prepareDocumentFiles();
        await th.prepareRelations();
    });

    // Delete temporary documents
    afterEach(() => {
        return th.removeDocumentFiles();
    });

    function compareElement(actual, expected) {
        ["_id", "clientId", "name", "parentFolderId"].forEach((f) => {
            assert.ok(typeof(actual[f]) !== "undefined");
            assert.strictEqual(actual[f], expected[f]);
        });
    }

    function mapFields(e) {
        return {
            _id: e.name,
            clientId: "client0",
            name: e.label,
            parentFolderId: e.parentfoldername
        }
    }

    describe('GET/', () => {

        it('responds with 404', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.get(`/api/folders`).expect(404);
        });

    });

    describe('GET/allFoldersAndDocuments', () => {

        var api = `${co.apis.folders}/allFoldersAndDocuments`;

        th.apiTests.get.defaultNegative(api, co.permissions.OFFICE_DOCUMENT);

        it('returns a hierarchy of all folders and documents available to the user\'s client', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementsFromApi = (await th.get(`/api/${api}?token=${token}`).expect(200)).body;
            assert.strictEqual(elementsFromApi.length, 9);
            var sortedList = elementsFromApi.sort((a, b) => a._id.localeCompare(b._id));
            assert.strictEqual(sortedList[0]._id, "client0_document0");
            assert.strictEqual(sortedList[1]._id, "client0_document00");
            assert.strictEqual(sortedList[2]._id, "client0_document000");
            assert.strictEqual(sortedList[3]._id, "client0_document01");
            assert.strictEqual(sortedList[4]._id, "client0_folder0");
            assert.strictEqual(sortedList[5]._id, "client0_folder00");
            assert.strictEqual(sortedList[6]._id, "client0_folder000");
            assert.strictEqual(sortedList[7]._id, "client0_folder01");
            assert.strictEqual(sortedList[8]._id, "client0_folder1");
            assert.strictEqual(sortedList[0].type, "document");
            assert.strictEqual(sortedList[1].type, "document");
            assert.strictEqual(sortedList[2].type, "document");
            assert.strictEqual(sortedList[3].type, "document");
            assert.strictEqual(sortedList[4].type, "folder");
            assert.strictEqual(sortedList[5].type, "folder");
            assert.strictEqual(sortedList[6].type, "folder");
            assert.strictEqual(sortedList[7].type, "folder");
            assert.strictEqual(sortedList[8].type, "folder");
            sortedList.forEach((e) => {
                assert.ok(typeof(e._id) !== "undefined");
                assert.ok(typeof(e.name) !== "undefined");
                assert.ok(typeof(e.type) !== "undefined");
                assert.ok(typeof(e.parentFolderId) !== "undefined");
            });
        });

        it('returns only those documents matching the given type parameter (startsWith)', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementsFromApi = (await th.get(`/api/${api}?type=image&token=${token}`).expect(200)).body;
            assert.strictEqual(elementsFromApi.length, 7);
            var sortedList = elementsFromApi.sort((a, b) => a._id.localeCompare(b._id));
            assert.strictEqual(sortedList[0]._id, "client0_document0");
            assert.strictEqual(sortedList[1]._id, "client0_document01");
        });

    });

    describe('GET/forIds', () => {

        async function createTestFolders(clientname) {
            return [ { _id: clientname + "_folder0" } ];
        }

        th.apiTests.getForIds.defaultNegative(co.apis.folders, co.permissions.OFFICE_DOCUMENT, co.collections.folders.name, createTestFolders);
        th.apiTests.getForIds.clientDependentNegative(co.apis.folders, co.collections.folders.name, createTestFolders);
        th.apiTests.getForIds.defaultPositive(co.apis.folders, co.collections.folders.name, createTestFolders);

        it('returns the full path for each folder', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var foldersFromApi = (await th.get(`/api/folders/forIds?ids=client0_folder0,client0_folder00,client0_folder000&token=${token}`).expect(200)).body;
            assert.strictEqual(foldersFromApi.length, 3);
            var sortedFolders = foldersFromApi.sort((a, b) => a._id.localeCompare(b._id));
            assert.strictEqual(sortedFolders[0]._id, "client0_folder0");
            assert.strictEqual(sortedFolders[0].path.length, 0);
            assert.strictEqual(sortedFolders[1]._id, "client0_folder00");
            assert.strictEqual(sortedFolders[1].path.length, 1);
            assert.strictEqual(sortedFolders[1].path[0].name, "folder0");
            assert.strictEqual(sortedFolders[2]._id, "client0_folder000");
            assert.strictEqual(sortedFolders[2].path.length, 2);
            assert.strictEqual(sortedFolders[2].path[0].name, "folder0");
            assert.strictEqual(sortedFolders[2].path[1].name, "folder00");
        });

    });

    describe('GET/:id', () => {

        th.apiTests.getId.defaultNegative(co.apis.folders, co.permissions.OFFICE_DOCUMENT, co.collections.folders.name);
        th.apiTests.getId.clientDependentNegative(co.apis.folders, co.collections.folders.name);

        it('responds with existing folder id with all details of the folder', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementFromDatabase = mapFields(await Db.getDynamicObject("client0", "folders", "client0_folder00"));
            var elementFromApi = (await th.get(`/api/folders/client0_folder00?token=${token}`).expect(200)).body;
            compareElement(elementFromApi, elementFromDatabase);
        });

        it('folder contains information about direct child elements', async() => {
            /**
             * +- client0_folder0
             *      +- client0_folder00
             *          +- client0_document000
             *      +- client0_folder01
             *      +- client0_document00
             *      +- client0_document01
             * +- client0_folder1
             * +- client0_document0
             */
            //Note: delivered subfolders are from one lever below the current folder
            //The actual complete folder structure can be deeper 
            var token = await th.defaults.login("client0_usergroup0_user0");
            var folderFromApi = (await th.get(`/api/folders/client0_folder0?token=${token}`).expect(200)).body;
            assert.ok(folderFromApi.elements);
            assert.strictEqual(folderFromApi.elements.length, 4);
            assert.strictEqual(folderFromApi.elements[0]._id, "client0_folder00");
            assert.strictEqual(folderFromApi.elements[1]._id, "client0_folder01");
            assert.strictEqual(folderFromApi.elements[2]._id, "client0_document00");
            assert.strictEqual(folderFromApi.elements[3]._id, "client0_document01");
            folderFromApi.elements.forEach((e) => {
                assert.ok(typeof(e._id) !== "undefined");
                assert.ok(typeof(e.name) !== "undefined");
                assert.ok(typeof(e.type) !== "undefined");
            });
        });

        it('Contains the full path in correct order', async() => {
            // For client0_folder000: client0_folder0 » client0_folder00
            var token = await th.defaults.login("client0_usergroup0_user0");
            var folderFromApi = (await th.get(`/api/folders/client0_folder000?token=${token}`).expect(200)).body;
            assert.ok(folderFromApi.path);
            assert.strictEqual(folderFromApi.path.length, 2);
            assert.strictEqual(folderFromApi.path[0].name, 'folder0');
            assert.strictEqual(folderFromApi.path[1].name, 'folder00');
        });

    });

    describe('POST/', () => {

        async function createPostTestObject() {
            return { name: "client0_testfolder", parentFolderId: "client0_folder00" }
        }

        th.apiTests.post.defaultNegative(co.apis.folders, co.permissions.OFFICE_DOCUMENT, createPostTestObject);
        th.apiTests.post.defaultPositive(co.apis.folders, co.collections.folders.name, createPostTestObject, (folders) => folders.map(mapFields));

        it('responds with correct folder with invalid parentFolderId with 400', async() => {
            var folder = await createPostTestObject();
            folder.parentFolderId = "invalidid";
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/folders?token=${token}`).send(folder).expect(400);
        });

        it('responds with correct folder with no parentFolderId with the inserted folder and null as parentFolderId', async() => {
            var folder = await createPostTestObject();
            delete folder.parentFolderId;
            var token = await th.defaults.login("client0_usergroup0_user0");
            var folderFromApi = (await th.post(`/api/folders?token=${token}`).send(folder).expect(200)).body;
            assert.strictEqual(folderFromApi.parentFolderId, null);
        });

        it('responds with correct folder with correct parentFolderId with the inserted folder and the ID of the parent folder as parentFolderId', async() => {
            var folder = await createPostTestObject();
            var token = await th.defaults.login("client0_usergroup0_user0");
            var folderFromApi = (await th.post(`/api/folders?token=${token}`).send(folder).expect(200)).body;
            assert.strictEqual(folderFromApi.parentFolderId, "client0_folder00");
        });

    });

    describe('PUT/:id', () => {

        async function createPutTestObject(client) {
            return { _id: client + "_folder0", clientId: "client0", name: "folder0" }
        }

        th.apiTests.put.defaultNegative(co.apis.folders, co.permissions.OFFICE_DOCUMENT, createPutTestObject);
        th.apiTests.put.clientDependentNegative(co.apis.folders, createPutTestObject);

        it('responds with correct folder with invalid new parentFolderId with 400', async() => {
            var elementupdate = { parentFolderId: "invalidid" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/folders/client0_folder00?token=${token}`).send(elementupdate).expect(400);
        });

        it(`updates the folder and returns the updated entity`, async() => {
            var elementupdate = { name: "newfoldername" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/folders/client0_folder00?token=${token}`).send(elementupdate).expect(200);
            var elementFromDatabase = await Db.getDynamicObject("client0", co.collections.folders.name, "client0_folder00");
            assert.strictEqual(elementFromDatabase.label, elementupdate.name);
        });

        it('responds with correct folder without parentFolderId with updated folder and old parentFolderId', async() => {
            var elementupdate = { name: "newfoldername" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/folders/client0_folder00?token=${token}`).send(elementupdate).expect(200);
            var elementFromDatabase = await Db.getDynamicObject("client0", co.collections.folders.name, "client0_folder00");
            assert.strictEqual(elementFromDatabase.parentfoldername, "client0_folder0");
        });

        it('responds with correct folder containing null as parentFolderId with updated folder and null as parentFolderId', async() => {
            var elementupdate = { parentFolderId: null };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/folders/client0_folder00?token=${token}`).send(elementupdate).expect(200);
            var elementFromDatabase = await Db.getDynamicObject("client0", co.collections.folders.name, "client0_folder00");
            assert.strictEqual(elementFromDatabase.parentfoldername, null);
        });

        it('responds with correct folder with correct new parentFolderId with the updated folder and the ID of the new parent folder as parentFolderId', async() => {
            var elementupdate = { parentFolderId: "client0_folder1" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/folders/client0_folder00?token=${token}`).send(elementupdate).expect(200);
            var elementFromDatabase = await Db.getDynamicObject("client0", co.collections.folders.name, "client0_folder00");
            assert.strictEqual(elementFromDatabase.parentfoldername, "client0_folder1");
        });

    });

    describe('DELETE/:id', function() {

        async function getDeleteFolderId(clientname) {
            return clientname + "_folder00";
        }

        th.apiTests.delete.defaultNegative(co.apis.folders, co.permissions.OFFICE_DOCUMENT, getDeleteFolderId);
        th.apiTests.delete.clientDependentNegative(co.apis.folders, getDeleteFolderId);
        th.apiTests.delete.defaultPositive(co.apis.folders, co.collections.folders.name, getDeleteFolderId);

        it('responds with an id of an existing folder without deleting parent folder', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/folders/client0_folder00?token=${token}`).expect(204);
            assert.ok(await Db.getDynamicObject("client0", co.collections.folders.name, "client0_folder0"));
        });

        it('responds with 204 without deleting documents or sibling folders on the same level', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/folders/client0_folder00?token=${token}`).expect(204);
            var foldersOnSameLevel = await Db.getDynamicObjects("client0", co.collections.folders.name, { parentfoldername: "client0_folder0" });
            assert.strictEqual(foldersOnSameLevel.length, 1);
            var documentsOnSameLevel = await Db.getDynamicObjects("client0", co.collections.documents.name, { parentfoldername: "client0_folder0" });
            assert.strictEqual(documentsOnSameLevel.length, 2);
        });

        it('responds with a correct id with 204 and deletes all contained folders and documents', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/folders/client0_folder0?token=${token}`).expect(204);
            var folders = await Db.getDynamicObjects("client0", co.collections.folders.name);
            assert.ok(!folders.find((f) => f.parentfoldername && f.parentfoldername.indexOf("client0_folder0") === 0));
            var documents = await Db.getDynamicObjects("client0", co.collections.documents.name);
            assert.ok(!documents.find((d) => d.parentfoldername && d.parentfoldername.indexOf("client0_folder0") === 0));
        });

        it('deletes all files of the affected documents', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/folders/client0_folder0?token=${token}`).expect(204);
            // Only client0_document0 must still exist
            var filePath = dh.getDocumentPath("client0", '');
            var files = fs.readdirSync(filePath);
            assert.strictEqual(files.length, 1);
            assert.strictEqual(files[0], "client0_document0");
        });

    });

});
