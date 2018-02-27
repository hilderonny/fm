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
var createFileForUpload = (fileName, content) => {
    var filePath = path.join(__dirname, fileName);
    fs.writeFileSync(filePath, content);
    return filePath;
}

describe.only('API documents', () =>{

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareActivities();
        await th.prepareFmObjects();
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

    describe('GET/share/:clientid/:documentid', () => {

        var api = `${co.apis.documents}/share/client0`;

        th.apiTests.getId.defaultNegative(api, co.permissions.OFFICE_DOCUMENT, co.collections.documents.name);
        th.apiTests.getId.clientDependentNegative(api, co.collections.documents.name);

        it('responds with valid id of non-shared document with 403', async() =>{
            var elementFromApi = (await th.get(`/api/documents/share/client0/client0_document0`).expect(403)).body;
        });

        it('responds with 404 when client is unknown', async() =>{
            var elementFromApi = (await th.get(`/api/documents/share/unknownclient/client0_document000`).expect(404)).body;
        });

        it('responds with valid id of shared document with document file', async() => {
            var response = await th.get(`/api/documents/share/client0/client0_document000`).expect(200);
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

    // TODO: Noch umstellen!
    describe.only('POST/', () => {

        // Negative tests

        it('responds with correct document with invalid parentFolderId with 400', () => {
            // Prepare file for upload
            var fileName = 'testDocumentPost.txt';
            var fileContent = 'Gaga Bubu';
            var filePath = createFileForUpload(fileName, fileContent);
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                //https://visionmedia.github.io/superagent/#multipart-requests
                return th.post(`/api/documents?token=${token}`).field('parentFolderId', 'invalidid').attach('file', filePath).expect(400);
            });
        });

        it('responds with correct document with a not existing parentFolderId with 400', () => {
            // Prepare file for upload
            var fileName = 'testDocumentPost.txt';
            var fileContent = 'Gaga Bubu';
            var filePath = createFileForUpload(fileName, fileContent);
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                //https://visionmedia.github.io/superagent/#multipart-requests
                return th.post(`/api/documents?token=${token}`).field('parentFolderId', '999999999999999999999999').attach('file', filePath).expect(400);
            });
        });

        it('responds without file with 400', () => {
            return db.get('folders').findOne({name: '1_1_1'}).then((folderOfClient1) => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    //https://visionmedia.github.io/superagent/#multipart-requests
                    return th.post(`/api/documents?token=${token}`).field('parentFolderId', folderOfClient1._id.toString()).expect(400)
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', () => {
            // Prepare file for upload
            var fileName = 'testDocumentPost.txt';
            var fileContent = 'Gaga Bubu';
            var filePath = createFileForUpload(fileName, fileContent);
            return th.removeClientModule('1', 'documents').then(() =>{
                return th.doLoginAndGetToken('1_1_0', 'test').then(function(token){
                    return th.post(`/api/documents?token=${token}`).attach('file', filePath).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', () => {
            // Prepare file for upload
            var fileName = 'testDocumentPost.txt';
            var fileContent = 'Gaga Bubu';
            var filePath = createFileForUpload(fileName, fileContent);
            return th.removeClientModule('1', 'documents').then(() =>{
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                    return th.post(`/api/documents?token=${token}`).attach('file', filePath).expect(403);
                });
            });
        });

        it('responds without authentication with 403', () => {
            var newDocument = {name: 'new_document_name'};
            // TODO: Attach real document, because you would get a 400 otherwise
            return th.post(`/api/documents`).send(newDocument).expect(403);       
        });

        it('responds without write permission with 403', () => {
            // Remove the corresponding permission
            return th.removeWritePermission('1_0_0', 'PERMISSION_OFFICE_DOCUMENT').then(() => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var newDocuments = {name: 'newName'};
                    // TODO: Attach real document, because you would get a 400 otherwise
                    return th.post('/api/documents?token=' + token).send(newDocuments).expect(403);
                });
            });
        });

        // Positive tests

        it('responds with correct document for a client which has no documents the correct status and creates document path for client', (done) => {
            // Prepare file for upload
            var fileName = 'testDocumentPost.txt';
            var fileContent = 'Gaga Bubu';
            var filePath = createFileForUpload(fileName, fileContent);
            // First create a client
            db.insert('clients', { name: 'testclient' }).then((client) => {
                // Now create a client module assignment so that the client can use the documents module
                db.insert('clientmodules', { clientId: client._id, module: 'documents' }).then((clientModule) => {
                    // Next we need a usergroup for the client
                    db.insert('usergroups', { name: client.name + '_0', clientId: client._id }).then((userGroup) => {
                        // And we need an user for authentication
                        db.insert('users', { name: userGroup.name + '_0', pass: '$2a$10$mH67nsfTbmAFqhNo85Mz4.SuQ3kyZbiYslNdRDHhaSO8FbMuNH75S', clientId: userGroup.clientId, userGroupId: userGroup._id, isAdmin: true }).then((user) => {
                            // Now login the new user
                            th.doLoginAndGetToken(user.name, 'test').then((token) => {
                                //https://visionmedia.github.io/superagent/#multipart-requests
                                th.post(`/api/documents?token=${token}`).attach('file', filePath).end((err, res) => {
                                    fs.unlinkSync(filePath); // Immediately delete temporary file, we do not need it anymore
                                    if(err) return done(err);
                                    var id = res.body._id;
                                    assert.ok(id, '_id not returned.');
                                    db.get('documents').findOne(id).then((document) => {
                                        assert.ok(document, 'Document not found in database.');
                                        assert.notStrictEqual(document.clientId, null, 'clientId is null.');
                                        var uploadedFilePath = dh.getDocumentPath(document._id);
                                        assert.ok(fs.existsSync(uploadedFilePath), `Uploaded file not found in ${uploadedFilePath}, so the path also does not exist.`);
                                        done();
                                    }).catch(done);
                                });
                            }).catch(done);
                        });
                    });
                });
            });
        });

        it('responds with correct document for the portal (no clientId) with inserted document and the file is located in the correct path', (done) => {
            // Prepare file for upload
            var fileName = 'testDocumentPost.txt';
            var fileContent = 'Gaga Bubu';
            var filePath = createFileForUpload(fileName, fileContent);
            th.doLoginAndGetToken('_0_0', 'test').then((token) => { // This username is from a portal user
                //https://visionmedia.github.io/superagent/#multipart-requests
                th.post(`/api/documents?token=${token}`).attach('file', filePath).end((err, res) => {
                    fs.unlinkSync(filePath); // Immediately delete temporary file, we do not need it anymore
                    if(err) return done(err);
                    var id = res.body._id;
                    assert.ok(id, '_id not returned.');
                    db.get('documents').findOne(id).then((document) => {
                        assert.ok(document, 'Document not found in database.');
                        assert.strictEqual(document.clientId, null, 'cientId is not null.');
                        var uploadedFilePath = dh.getDocumentPath(document._id);
                        assert.ok(fs.existsSync(uploadedFilePath), `Uploaded file not found in ${uploadedFilePath}.`);
                        done();
                    }).catch(done);
                });
            }).catch(done);
        });

        it('responds with correct document with no parentFolderId with the inserted document and null as parentFolderId', (done) => {
            // Prepare file for upload
            var fileName = 'testDocumentPost.txt';
            var fileContent = 'Gaga Bubu';
            var filePath = createFileForUpload(fileName, fileContent);
            th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                //https://visionmedia.github.io/superagent/#multipart-requests
                th.post(`/api/documents?token=${token}`).attach('file', filePath).end((err, res) => {
                    fs.unlinkSync(filePath); // Immediately delete temporary file, we do not need it anymore
                    if(err) return done(err);
                    var id = res.body._id;
                    assert.ok(id, '_id not returned.');
                    db.get('documents').findOne(id).then((document) => {
                        assert.ok(document, 'Document not found in database.');
                        assert.strictEqual(document.parentFolderId, null, 'Parent folder ID is not null.');
                        done();
                    }).catch(done);
                });
            }).catch(done);
        });

        it('responds with given file with uploaded document containing valid _id field', function(done){
            // Prepare file for upload
            var fileName = 'testDocumentPost.txt';
            var fileContent = 'Gaga Bubu';
            var filePath = createFileForUpload(fileName, fileContent);
            db.get('folders').findOne({name: '1_1_1'}).then((folderOfClient1) => {
                th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var parentFolderId = folderOfClient1._id.toString();
                    //https://visionmedia.github.io/superagent/#multipart-requests
                    th.post(`/api/documents?token=${token}`).field('parentFolderId', parentFolderId).attach('file', filePath).end((err, res) => {
                        fs.unlinkSync(filePath); // Immediately delete temporary file, we do not need it anymore
                        if(err) return done(err);
                        var id = res.body._id;
                        assert.ok(id, '_id not returned.');
                        db.get('documents').findOne(id).then((document) => {
                            assert.ok(document, 'Document not found in database.');
                            assert.strictEqual(document.name, fileName, `Filename ${document.name} not as expected.`);
                            assert.strictEqual(document.parentFolderId.toString(), parentFolderId, 'Parent folder IDs do not match.');
                            var uploadedFilePath = dh.getDocumentPath(document._id);
                            assert.ok(fs.existsSync(uploadedFilePath), `Uploaded file not found in ${uploadedFilePath}.`);
                            var uploadedFileContent = fs.readFileSync(uploadedFilePath).toString();
                            assert.strictEqual(uploadedFileContent, fileContent, 'File content differs.');
                            done();
                        }).catch(done);
                    });
                }).catch(done);
            });
        });

        it('responds with correct document for the portal (no clientId) with inserted document and the file is located in the correct path', (done) => {
            // Prepare file for upload
            var fileName = 'testDocumentPost.txt';
            var fileContent = 'Gaga Bubu';
            var filePath = createFileForUpload(fileName, fileContent);
            th.doLoginAndGetToken('_0_0', 'test').then((token) => { // This username is from a portal user
                //https://visionmedia.github.io/superagent/#multipart-requests
                th.post(`/api/documents?token=${token}`).attach('file', filePath).end((err, res) => {
                    fs.unlinkSync(filePath); // Immediately delete temporary file, we do not need it anymore
                    if(err) return done(err);
                    var id = res.body._id;
                    assert.ok(id, '_id not returned.');
                    db.get('documents').findOne(id).then((document) => {
                        assert.ok(document, 'Document not found in database.');
                        assert.strictEqual(document.clientId, null, 'cientId is not null.');
                        var uploadedFilePath = dh.getDocumentPath(document._id);
                        assert.ok(fs.existsSync(uploadedFilePath), `Uploaded file not found in ${uploadedFilePath}.`);
                        done();
                    }).catch(done);
                });
            }).catch(done);
        });
        
    });

    describe('PUT/:id', () => {

        async function createPutTestObject(client) {
            return { _id: client + "_document0", clientId: "client0", name: "document0" }
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

    });
});