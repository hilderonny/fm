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

    describe('GET/share/:documentid', () => {

        it('responds with valid id of non-shared document with 404', async() =>{
            await th.get(`/api/documents/share/client0_document0`).expect(404);
        });

        it('responds with 404 when document is not existing is unknown', async() =>{
            await th.get(`/api/documents/share/unknowndocumentname`).expect(404);
        });

        it('responds with valid id of shared document with document file', async() => {
            var response = await th.get(`/api/documents/share/client0_document000`).expect(200);
            assert.strictEqual(response.type, 'type');
            assert.strictEqual(response.text, "client0_document000");
        });
        
    });

    describe('GET/download/:id', () => {

        th.apiTests.getId.defaultNegative(co.apis.documents + "/download", co.permissions.OFFICE_DOCUMENT, co.collections.documents.name);
        th.apiTests.getId.clientDependentNegative(co.apis.documents + "/download", co.collections.documents.name);

        it('Downloads the document', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var response = await th.get(`/api/documents/download/client0_document000?token=${token}`).expect(200);
            assert.ok(response.headers["content-disposition"]);
            assert.ok(response.headers["content-disposition"].indexOf("attachment") >= 0);
            assert.strictEqual(response.type, 'type');
            assert.strictEqual(response.text, "client0_document000");
        });
        
    });

    describe('GET/preview/:id', () => {

        th.apiTests.getId.defaultNegative(co.apis.documents + "/preview", co.permissions.OFFICE_DOCUMENT, co.collections.documents.name);
        th.apiTests.getId.clientDependentNegative(co.apis.documents + "/preview", co.collections.documents.name);

        it('Downloads the document for preview', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var response = await th.get(`/api/documents/preview/client0_document000?token=${token}`).expect(200);
            assert.ok(response.headers["content-disposition"]);
            assert.ok(response.headers["content-disposition"].indexOf("inline") >= 0);
            assert.strictEqual(response.type, 'type');
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

});