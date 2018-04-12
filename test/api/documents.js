/**
 * UNIT Tests for api/documents
 */
var assert = require('assert');
var dh = require('../../utils/documentsHelper');
var fs = require('fs');
var path = require('path');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

/**
 * Creates a temporary file with the given file name and content and returns
 * its absolute path.
 */
var createFileForUpload = () => {
    var fileName = 'testDocumentPost.txt';
    var content = 'Gaga Bubu';
    var filePath = path.join(__dirname, fileName);
    fs.writeFileSync(filePath, content);
    return filePath;
}

describe('API documents', () =>{

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
        th.removeDocumentFiles();
        var filepath = path.join(__dirname, "testDocumentPost.txt");
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    });

    function compareElement(actual, expected) {
        ["_id", "clientId", "name", "parentFolderId", "type", "isShared"].forEach((f) => {
            assert.ok(typeof(actual[f]) !== "undefined");
            assert.strictEqual(actual[f], expected[f]);
        });
    }

    function mapFields(e, clientname) {
        return {
            _id: e.name,
            clientId: clientname,
            name: e.label,
            parentFolderId: e.parentfoldername,
            type: e.type,
            isShared: e.isshared
        }
    }
    
    describe('GET/forIds', () => {

        async function createTestDocuments(clientname) {
            return [ { _id: clientname + "_document0" } ];
        }

        th.apiTests.getForIds.defaultNegative(co.apis.documents, co.permissions.OFFICE_DOCUMENT, co.collections.documents.name, createTestDocuments);
        th.apiTests.getForIds.clientDependentNegative(co.apis.documents, co.collections.documents.name, createTestDocuments);
        th.apiTests.getForIds.defaultPositive(co.apis.documents, co.collections.documents.name, createTestDocuments);

        it('returns the full path for each document', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var documentsFromApi = (await th.get(`/api/documents/forIds?ids=client0_document0,client0_document00,client0_document000&token=${token}`).expect(200)).body;
            assert.strictEqual(documentsFromApi.length, 3);
            var sortedDocuments = documentsFromApi.sort((a, b) => a._id.localeCompare(b._id));
            assert.strictEqual(sortedDocuments[0]._id, "client0_document0");
            assert.strictEqual(sortedDocuments[0].path.length, 0);
            assert.strictEqual(sortedDocuments[1]._id, "client0_document00");
            assert.strictEqual(sortedDocuments[1].path.length, 1);
            assert.strictEqual(sortedDocuments[1].path[0].name, "folder0");
            assert.strictEqual(sortedDocuments[2]._id, "client0_document000");
            assert.strictEqual(sortedDocuments[2].path.length, 2);
            assert.strictEqual(sortedDocuments[2].path[0].name, "folder0");
            assert.strictEqual(sortedDocuments[2].path[1].name, "folder00");
        });

    });

    describe('GET/share/:documentid', () => {

        it('responds with valid id of non-shared document with 404', async() =>{
            await th.get(`/api/documents/share/client0_document0`).expect(404);
        });

        it('responds with 404 when document is not existing is unknown', async() =>{
            await th.get(`/api/documents/share/unknowndocumentname`).expect(404);
        });

        it('responds with valid id of shared document with document file', async() => {
            var response = await th.get(`/api/documents/share/client0_document000`).expect(200);
            assert.strictEqual(response.type, 'application/octet-stream');
            assert.strictEqual(response.text, "client0_document000");
        });
        
    });

    describe('GET/:id', () => {

        th.apiTests.getId.defaultNegative(co.apis.documents, co.permissions.OFFICE_DOCUMENT, co.collections.documents.name);
        th.apiTests.getId.clientDependentNegative(co.apis.documents, co.collections.documents.name);

        it('responds with existing document id with all details of the document', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementFromDatabase = mapFields(await Db.getDynamicObject("client0", co.collections.documents.name, "client0_document00"), "client0");
            var elementFromApi = (await th.get(`/api/documents/client0_document00?token=${token}`).expect(200)).body;
            compareElement(elementFromApi, elementFromDatabase);
        });

        it('Contains the full path in correct order', async() => {
            // For client0_document000: client0_folder0 » client0_folder00
            var token = await th.defaults.login("client0_usergroup0_user0");
            var documentFromApi = (await th.get(`/api/documents/client0_document000?token=${token}`).expect(200)).body;
            assert.ok(documentFromApi.path);
            assert.strictEqual(documentFromApi.path.length, 2);
            assert.strictEqual(documentFromApi.path[0].name, 'folder0');
            assert.strictEqual(documentFromApi.path[1].name, 'folder00');
        });

        it('Downloads the document when ?action=download is given', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var response = await th.get(`/api/documents/client0_document000?action=download&token=${token}`).expect(200);
            assert.strictEqual(response.type, 'application/octet-stream');
            assert.strictEqual(response.text, "client0_document000");
        });
        
    });

    describe('POST/', () => {

        async function createPostTestObject() {
            return { name: "client0_testdocument" }
        }

        function deleteDocumentsFolder() {
            var clientfolder = dh.getDocumentPath("client0", "");
            if (fs.existsSync(clientfolder)) {
                fs.readdirSync(clientfolder).forEach((filename) => fs.unlinkSync(path.join(clientfolder, filename)));
                fs.rmdirSync(clientfolder);
            }
        }

        th.apiTests.post.defaultNegative(co.apis.documents, co.permissions.OFFICE_DOCUMENT, createPostTestObject);

        it('responds without file with 400', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/documents?token=${token}`).field("parentdatatypename", "folders", "parententityname", "client0_folder0").expect(400);
        });

        it('responds with correct document for a client which has no documents the correct status and creates document path for client', async() => {
            deleteDocumentsFolder();
            var filePath = createFileForUpload();
            var token = await th.defaults.login("client0_usergroup0_user0");
            var createddocumentname = (await th.post(`/api/documents?token=${token}`).field("parentdatatypename", "folders", "parententityname", "client0_folder0").attach('file', filePath).expect(200)).text;
            assert.ok(createddocumentname);
            var documentFromDatabase = await Db.getDynamicObject("client0", co.collections.documents.name, createddocumentname);
            assert.ok(documentFromDatabase);
            assert.strictEqual(documentFromDatabase.label, "testDocumentPost.txt");
            assert.strictEqual(documentFromDatabase.type, "text/plain");
            assert.ok(fs.existsSync(dh.getDocumentPath("client0", documentFromDatabase.name)));
        });
        
    });

    describe('PUT/:id', () => {

        async function createPutTestObject(client) {
            return { _id: client + "_document0", clientId: client, name: "document0" }
        }

        th.apiTests.put.defaultNegative(co.apis.documents, co.permissions.OFFICE_DOCUMENT, createPutTestObject);
        th.apiTests.put.clientDependentNegative(co.apis.documents, createPutTestObject);

        it('responds with correct document with invalid new parentFolderId with 400', async() => {
            var elementupdate = { parentFolderId: "invalidid" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/documents/client0_document00?token=${token}`).send(elementupdate).expect(400);
        });

        it(`updates the document and returns the updated entity`, async() => {
            var elementupdate = { name: "newdocumentname" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/documents/client0_document00?token=${token}`).send(elementupdate).expect(200);
            var elementFromDatabase = await Db.getDynamicObject("client0", co.collections.documents.name, "client0_document00");
            assert.strictEqual(elementFromDatabase.label, elementupdate.name);
        });

        it('responds with correct document without parentFolderId with updated document and old parentFolderId', async() => {
            var elementupdate = { name: "newdocumentname" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/documents/client0_document00?token=${token}`).send(elementupdate).expect(200);
            var elementFromDatabase = await Db.getDynamicObject("client0", co.collections.documents.name, "client0_document00");
            assert.strictEqual(elementFromDatabase.parentfoldername, "client0_folder0");
        });

        it('responds with correct document containing null as parentFolderId with updated document and null as parentFolderId', async() => {
            var elementupdate = { parentFolderId: null };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/documents/client0_document00?token=${token}`).send(elementupdate).expect(200);
            var elementFromDatabase = await Db.getDynamicObject("client0", co.collections.documents.name, "client0_document00");
            assert.strictEqual(elementFromDatabase.parentfoldername, null);
        });

        it('responds with correct document with correct new parentFolderId with the updated document and the ID of the new parent folder as parentFolderId', async() => {
            var elementupdate = { parentFolderId: "client0_folder1" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/documents/client0_document00?token=${token}`).send(elementupdate).expect(200);
            var elementFromDatabase = await Db.getDynamicObject("client0", co.collections.documents.name, "client0_document00");
            assert.strictEqual(elementFromDatabase.parentfoldername, "client0_folder1");
        });
        
    });

    describe('DELETE/:id', () => {

        async function getDeleteDocumentId(clientname) {
            return clientname + "_document00";
        }

        th.apiTests.delete.defaultNegative(co.apis.documents, co.permissions.OFFICE_DOCUMENT, getDeleteDocumentId);
        th.apiTests.delete.clientDependentNegative(co.apis.documents, getDeleteDocumentId);
        th.apiTests.delete.defaultPositive(co.apis.documents, co.collections.documents.name, getDeleteDocumentId);

        it('responds with a correct id with 204 and deletes the document', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/documents/client0_document00?token=${token}`).expect(204);
            var document = await Db.getDynamicObject("client0", co.collections.documents.name, "client0_document00");
            assert.ok(!document);
        });

        it('deletes all files of the affected documents', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/documents/client0_document00?token=${token}`).expect(204);
            var filePath = dh.getDocumentPath("client0", 'client0_document00');
            assert.ok(!fs.existsSync(filePath));
        });

        xit('Sets the previewImageId of all FM objects to null where it was the id of the deleted document previously', async() => {
            // var token = await th.defaults.login("client0_usergroup0_user0");
            // await th.del(`/api/documents/client0_document01?token=${token}`).expect(204);
            // var fmobjects = await Db.getDynamicObjects("client0", co.collections.fmobjects.name, { previewimagedocumentname: "client0_document01" });
            // assert.strictEqual(fmobjects.length, 0);
        });

    });
});