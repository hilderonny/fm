/**
 * UNIT Tests for api/documents
 */
var assert = require('assert');
var documentsHelper = require('../../utils/documentsHelper');
var fs = require('fs');
var path = require('path');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');

/**
 * Creates a temporary file with the given file name and content and returns
 * its absolute path.
 */
var createFileForUpload = (fileName, content) => {
    var filePath = path.join(__dirname, fileName);
    fs.writeFileSync(filePath, content);
    return filePath;
}

describe('API documents', function(){

    // Clear and prepare database with clients, user groups, users... 
    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions)
            .then(th.prepareActivities)
            .then(th.prepareFmObjects)
            .then(th.prepareFolders)
            .then(th.prepareDocuments)
            .then(th.prepareDocumentFiles)
            .then(th.prepareRelations);
    });

    // Delete temporary documents
    afterEach(() => {
        return th.removeDocumentFiles();
    });

    describe('GET/forIds', function() {

        function createTestDocuments() {
            return db.get(co.collections.clients.name).findOne({name:th.defaults.client}).then(function(client) {
                var clientId = client._id;
                var testObjects = ['testDocument1', 'testDocument2', 'testDocument3'].map(function(name) {
                    return {
                        name: name,
                        type: 'text/plain',
                        clientId: clientId,
                        parentFolderId: null
                    }
                });
                return Promise.resolve(testObjects);
            });
        }

        th.apiTests.getForIds.defaultNegative(co.apis.documents, co.permissions.OFFICE_DOCUMENT, co.collections.documents.name, createTestDocuments);
        th.apiTests.getForIds.clientDependentNegative(co.apis.documents, co.collections.documents.name, createTestDocuments);
        th.apiTests.getForIds.defaultPositive(co.apis.documents, co.collections.documents.name, createTestDocuments);

        function checkPath(document, folders) {
            assert.ok(document.path);
            var parentFolders = [];
            var parentFolderId = document.parentFolderId;
            while (parentFolderId) {
                var parentFolder = folders[parentFolderId];
                // Reihenfolge von API ist umgekehrt, daher vorn dran hängen
                parentFolders.unshift(parentFolder);
                parentFolderId = parentFolder.parentFolderId;
            }
            assert.strictEqual(document.path.length, parentFolders.length);
            for (var i = 0; i < parentFolders.length; i++) {
                assert.strictEqual(document.path[i]._id.toString(), parentFolders[i]._id.toString());
                assert.strictEqual(document.path[i].name, parentFolders[i].name);
            }
        }

        it('returns the full path for each document', function() {
            var documentsInDatabase = th.dbObjects[co.collections.documents.name];
            var foldersInDatabase = {};
            var ids = documentsInDatabase.map(function(doc) { return doc._id.toString() });
            return db.get(co.collections.folders.name).find().then(function(folders) {
                folders.forEach(function(folder) {
                    foldersInDatabase[folder._id] = folder;
                });
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then((token) => {
                return th.get(`/api/${co.apis.documents}/forIds?ids=${ids.join(',')}&token=${token}`).expect(200);
            }).then(function(response) {
                var documentsFromApi = response.body;
                documentsFromApi.forEach(function(documentFromApi) {
                    checkPath(documentFromApi, foldersInDatabase);
                });
                return Promise.resolve();
            });
        });

    });

    describe('GET/share/:id', function() {

        // Negative tests

        it('responds with invalid id with 400', function(){
            //for shared documents no user authentication is required 
            return db.get('documents').findOne({name: '1_1_1'}).then(function(documentFromDatabase){
                return th.get(`/api/documents/share/invalidid`).expect(400);
            });
        });

        it('responds with id where no document exists with 404', function(){
            //for shared documents no user authentication is required 
            return db.get('documents').findOne({name: '1_1_1'}).then(function(documentFromDatabase){
                return th.get(`/api/documents/share/999999999999999999999999`).expect(404);
            });
        });

        it('responds with valid id of non-shared document with 403', function(){
            //for shared documents no user authentication is required 
            return db.get('documents').findOne({name: '1_1_1'}).then(function(documentFromDatabase){
                return th.get(`/api/documents/share/${documentFromDatabase._id}`).expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('documents').findOne({name: '1_1_1'}).then(function(documentFromDB){
                return th.removeClientModule('1', 'documents').then(function(){
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return th.get(`/api/documents/share/${documentFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('documents').findOne({name: '1_1_1'}).then(function(documentFromDB){
                return th.removeClientModule('1', 'documents').then(function(){
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                        return th.get(`/api/documents/share/${documentFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        // Positive tests

        it('responds with valid id of shared document with document file', function(done){
            db.get('documents').findOne({name: '1_1'}).then(function(documentFromDatabase){
                var documentId = documentFromDatabase._id;
                // First we ned to share the document
                db.update('documents', documentId, { $set: { isShared: true } }).then((updatedDocument) => {
                    th.get(`/api/documents/share/${documentId}`).expect(200).end(function(err, res){
                        if(err) return done(err);
                        assert.strictEqual(res.type, 'application/octet-stream', 'Document type is not as expected.');
                        assert.strictEqual(res.text, documentId.toString(), 'Document content is not as expected');
                        done();
                    });
                }).catch(done);
            }); 
        });
        
    });

    describe('GET/:id', function() {

        // Negative tests

        it('responds with an invalid id with 400', function() {
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                return th.put(`/api/documents/InvalidId?token=${token}`).expect(400);
            });
        });

        it('responds without authentication with 403', function() {
            //load valid id to avoid 404 error 
            return db.get('documents').findOne({name: '1_1_1'}).then(function(documentFromDB){
                var id = documentFromDB._id;
                return th.get(`/api/documents/${id}`).expect(403);
            });           
        });

        it('responds with not existing folder id with 403', function() {
            // Here the validateSameClientId comes into the game and returns a 403 because the requested folder is
            // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                return th.get(`/api/documents/999999999999999999999999?token=${token}`).expect(403);
            });
        });

        it('responds without read permission with 403', function(){
            // Remove the corresponding permission
            return th.removeReadPermission('1_0_0', 'PERMISSION_OFFICE_DOCUMENT').then(() => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return db.get('documents').findOne({name: '1_0_1'}).then((documentFromDatabase) =>{
                        var documentId = documentFromDatabase._id; 
                        return th.get(`/api/documents/${documentId}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with an id of an existing document which does not belong to the same client as the logged in user with 403', function() {
            //document.clientId != user.clientId
            //login as user for client 1, but ask for document of client 2 
            return db.get('documents').findOne({name: '0_0_1'}).then((documentOfUser2) => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var id = documentOfUser2._id;
                    return th.get(`/api/documents/${id}?token=${token}`).expect(403);
                });
            });        
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('documents').findOne({name: '1_0_1'}).then(function(documentFromDB){
                //remove module assignment for client 1
                return th.removeClientModule('1', 'documents').then(function(){
                    return th.doLoginAndGetToken('1_1_0', 'test').then(function(token){
                        return th.get(`/api/documents/${documentFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('documents').findOne({name: '1_0_1'}).then(function(documentFromDB){
                //remove module assignment for client 1
                return th.removeClientModule('1', 'documents').then(function(){
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                        return th.get(`/api/documents/${documentFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        // Positive tests
        
        it('responds with valid id and authentication with retrieved document', function(done){
            db.get('documents').findOne({name: '1_1'}).then(function(documentFromDatabase){
                var documentId = documentFromDatabase._id;
                th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    th.get(`/api/documents/${documentId}?token=${token}`).expect(200).end(function(err, res){
                        if(err){
                            done(err);
                            return;
                        }
                        var resultFromApi = res.body;
                        assert.strictEqual(resultFromApi._id, documentId.toString(), 'Id of retrieved document does not match!');
                        //TODO check for other document properties as well
                        done();
                    });
                }).catch(done);
            }); 
        });
        
        it('responds with valid id and authentication plus download request with correct document downloaded', function(done){
            db.get('documents').findOne({name: '1_1'}).then(function(documentFromDatabase){
                var documentId = documentFromDatabase._id;
                th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    th.get(`/api/documents/${documentId}?token=${token}&action=download`).expect(200).end(function(err, res){
                        if(err){
                            done(err);
                            return;
                        }
                        assert.strictEqual(res.type, 'application/octet-stream', 'Document type is not as expected.');
                        assert.strictEqual(res.text, documentId.toString(), 'Document content is not as expected');
                        done();
                    });
                }).catch(done);
            }); 
        });

        it('Contains the full path in correct order', function() {
            // We use document 1_0_0_0_0, so we have the path
            // 1_0 » 1_0_0 » 1_0_0_0  (or sth like test » d3 » d3.1)
            var documentId;
            // First login
            return db.get(co.collections.documents.name).findOne({name: '1_0_0_0_0'}).then(function(documentFromDatabase){
                documentId = documentFromDatabase._id;
                return th.doLoginAndGetToken('1_0_0', 'test');
            }).then(function(token){
                // Then fetch the document from the API
                return th.get(`/api/documents/${documentId}?token=${token}`).expect(200);
            }).then(function(response) {
                var doc = response.body;
                // Finally analyze the returned path (order, names)
                assert.ok(doc.path, 'Property path does not exist');
                assert.strictEqual(doc.path.length, 3);
                assert.strictEqual(doc.path[0].name, '1_0');
                assert.strictEqual(doc.path[1].name, '1_0_0');
                assert.strictEqual(doc.path[2].name, '1_0_0_0');
                return Promise.resolve();
            });
        });
        
    });

    describe('POST/', function() {

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

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            // Prepare file for upload
            var fileName = 'testDocumentPost.txt';
            var fileContent = 'Gaga Bubu';
            var filePath = createFileForUpload(fileName, fileContent);
            return th.removeClientModule('1', 'documents').then(function(){
                return th.doLoginAndGetToken('1_1_0', 'test').then(function(token){
                    return th.post(`/api/documents?token=${token}`).attach('file', filePath).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            // Prepare file for upload
            var fileName = 'testDocumentPost.txt';
            var fileContent = 'Gaga Bubu';
            var filePath = createFileForUpload(fileName, fileContent);
            return th.removeClientModule('1', 'documents').then(function(){
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                    return th.post(`/api/documents?token=${token}`).attach('file', filePath).expect(403);
                });
            });
        });

        it('responds without authentication with 403', function() {
            var newDocument = {name: 'new_document_name'};
            // TODO: Attach real document, because you would get a 400 otherwise
            return th.post(`/api/documents`).send(newDocument).expect(403);       
        });

        it('responds without write permission with 403', function() {
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
                                        var uploadedFilePath = documentsHelper.getDocumentPath(document._id);
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
                        var uploadedFilePath = documentsHelper.getDocumentPath(document._id);
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
                            var uploadedFilePath = documentsHelper.getDocumentPath(document._id);
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
                        var uploadedFilePath = documentsHelper.getDocumentPath(document._id);
                        assert.ok(fs.existsSync(uploadedFilePath), `Uploaded file not found in ${uploadedFilePath}.`);
                        done();
                    }).catch(done);
                });
            }).catch(done);
        });
        
    });

    describe('PUT/:id', function() {

        // Negative tests

        it('responds with an invalid id with 400', function() {
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                return th.put(`/api/documents/InvalidId?token=${token}`).send({name: 'new_document_name'}).expect(400);
            });
        });

        it('responds with valid id but no actual update data with 400', function(){
            return db.get('documents').findOne({name: '1_1_1'}).then(function(documentFromDB){
                return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    var id = documentFromDB._id;
                    return th.put(`/api/documents/${id}?token=${token}`).send().expect(400);
                });
            });
        });

        it('responds with valid id but no actual update data with 400', function(){
            return db.get('documents').findOne({name: '1_1_1'}).then(function(documentFromDB){
                return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    var id = documentFromDB._id;
                    return th.put(`/api/documents/${id}?token=${token}`).send().expect(400);
                });
            });
        });

        it('responds without authentication with 403', function() {
            //load valid id to avoid 404 error 
            return db.get('documents').findOne({name: '1_1_1'}).then(function(documentFromDB){
                var id = documentFromDB._id;
                var updatedDoc = {name: 'new_document_name'};
                return th.put(`/api/documents/${id}`).send(updatedDoc).expect(403);
            });          
        });

        it('responds without write permission with 403', function() {
            return db.get('documents').findOne({ name : '1_0' }).then((documentFromDatabase) => {
                // Remove the corresponding permission
                return th.removeWritePermission('1_0_0', 'PERMISSION_OFFICE_DOCUMENT').then(() => {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var updatedDoc = {name: 'new_document_name'};
                        return th.put(`/api/documents/${documentFromDatabase._id}?token=${token}`).send(updatedDoc).expect(403);
                    });
                });
            });
        });

        it('responds with an id that does not exist with 403', function() {
            // Here the validateSameClientId comes into the game and returns a 403 because the requested folder is
            // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
            var updatedDoc = {name: 'new_document_name'};
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return th.put(`/api/documents/999999999999999999999999?token=${token}`).send(updatedDoc).expect(403);
            });
        });

        it('responds with an id of an existing document which does not belong to the same client as the logged in user with 403', function() {
            //document.clientId != user.clientId
            //logged user belongs to client 1, but requested documet to client 2 
            return db.get('documents').findOne({name: '0_0'}).then((documentOfUser2) => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var id = documentOfUser2._id;
                    var updatedDocument = {name: 'new_document_name'};
                    return th.put(`/api/documents/${id}?token=${token}`).send(updatedDocument).expect(403);
                });
            });
        });

        it('responds with correct document with invalid new parentFolderId with 400', () => {
            return db.get('documents').findOne({name: '1_1_1'}).then((documentFromDatabase) => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var id = documentFromDatabase._id.toString();
                    var updatedDocument = {parentFolderId: '999999999999999999999999', name: 'new_document_name'};
                    return th.put(`/api/documents/${id}?token=${token}`).send(updatedDocument).expect(400);
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('documents').findOne({name: '1_0_1'}).then(function(documentFromDB){
                //remove module assigment for client 1
                return th.removeClientModule('1', 'documents').then(function(){
                    return th.doLoginAndGetToken('1_1_0', 'test').then(function(token){
                        var updates = {name: 'newName'};
                        return th.put(`/api/documents/${documentFromDB._id}?token=${token}`).send(updates).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('documents').findOne({name: '1_0_1'}).then(function(documentFromDB){
                //remove module assigment for client 1
                return th.removeClientModule('1', 'documents').then(function(){
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                        var updates = {name: 'newName'};
                        return th.put(`/api/documents/${documentFromDB._id}?token=${token}`).send(updates).expect(403);
                    });
                });
            });
        });

        // Positive tests

        it('responds with valid _id with correcly updated document', (done) => {
            db.get('documents').findOne({name: '1_1_1'}).then((documentFromDatabase) => {
                th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var id = documentFromDatabase._id.toString();
                    var updatedDocument = {name: 'new_document_name'};
                    th.put(`/api/documents/${id}?token=${token}`).send(updatedDocument).expect(200).end((err,res) => {
                        var idFromrespondse = res.body._id;
                        assert.ok(idFromrespondse, '_id not returned.');
                        //Ask the database directly
                        db.get('documents').findOne(idFromrespondse).then((updatedDocumentFromDatabase) => {
                            assert.ok(updatedDocumentFromDatabase, 'Document not found in database.');
                            assert.strictEqual(updatedDocumentFromDatabase.name, updatedDocument.name, 'Name not changed correctly.');
                            done();
                        }).catch(done);
                    });
                }).catch(done);
            });
        });

        it('responds giving a new _id with updated document without changing its original _id', (done) => {
            db.get('documents').findOne({name: '1_1_1'}).then((documentFromDatabase) => {
                th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var id = documentFromDatabase._id.toString();
                    var updatedDocument = {_id: '999999999999999999999999', name: 'new_document_name'};
                    th.put(`/api/documents/${id}?token=${token}`).send(updatedDocument).expect(200).end((err,res) => {
                        var idFromrespondse = res.body._id;
                        assert.ok(idFromrespondse, '_id not returned.');
                        assert.strictEqual(idFromrespondse, id, '_id was changed.');
                        //Ask the database directly
                        db.get('documents').findOne(id).then((updatedDocumentFromDatabase) => {
                            assert.ok(updatedDocumentFromDatabase, 'Document not found in database.');
                            assert.strictEqual(updatedDocumentFromDatabase.name, updatedDocument.name, 'Name not changed correctly.');
                            done();
                        }).catch(done);
                    });
                }).catch(done);
            });
        });

        it('responds giving a new clientId with updated document without changing its original clientId', (done) => {
            db.get('clients').findOne({name: '1'}).then((client) => {
                db.get('documents').findOne({name: '0_0_1'}).then((documentFromDatabase) => {
                    th.doLoginAndGetToken('0_0_0', 'test').then((token) => {
                        var id = documentFromDatabase._id.toString();
                        var updatedDocument = {clientId: client._id.toString, name: 'new_document_name'};
                        th.put(`/api/documents/${id}?token=${token}`).send(updatedDocument).expect(200).end((err,res) => {
                            //Ask the database directly
                            db.get('documents').findOne(id).then((updatedDocumentFromDatabase) => {
                                assert.ok(updatedDocumentFromDatabase, 'Document not found in database.');
                                assert.strictEqual(updatedDocumentFromDatabase.name, updatedDocument.name, 'Name not changed correctly.');
                                assert.strictEqual(updatedDocumentFromDatabase.clientId.toString(), documentFromDatabase.clientId.toString(), 'clientId was changed.');
                                done();
                            }).catch(done);
                        });
                    }).catch(done);
                });
            });
        });

        it('responds with correct document without parentFolderId with updated document and old parentFolderId', (done) => {
            db.get('documents').findOne({name: '1_1_1'}).then((documentFromDatabase) => {
                th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var id = documentFromDatabase._id.toString();
                    var updatedDocument = {name: 'new_document_name'};
                    th.put(`/api/documents/${id}?token=${token}`).send(updatedDocument).expect(200).end((err,res) => {
                        //Ask the database directly
                        db.get('documents').findOne(id).then((updatedDocumentFromDatabase) => {
                            assert.ok(updatedDocumentFromDatabase, 'Document not found in database.');
                            assert.strictEqual(updatedDocumentFromDatabase.name, updatedDocument.name, 'Name not changed correctly.');
                            assert.strictEqual(updatedDocumentFromDatabase.parentFolderId.toString(), documentFromDatabase.parentFolderId.toString(), 'parentFolderId was changed.');
                            done();
                        }).catch(done);
                    });
                }).catch(done);
            });
        });

        it('responds with correct document containing null as parentFolderId with updated document and null as parentFolderId', (done) => {
            db.get('documents').findOne({name: '1_1_1'}).then((documentFromDatabase) => {
                th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var id = documentFromDatabase._id.toString();
                    var updatedDocument = {parentFolderId: null, name: 'new_document_name'};
                    th.put(`/api/documents/${id}?token=${token}`).send(updatedDocument).expect(200).end((err,res) => {
                        //Ask the database directly
                        db.get('documents').findOne(id).then((updatedDocumentFromDatabase) => {
                            assert.ok(updatedDocumentFromDatabase, 'Document not found in database.');
                            assert.strictEqual(updatedDocumentFromDatabase.name, updatedDocument.name, 'Name not changed correctly.');
                            assert.strictEqual(updatedDocumentFromDatabase.parentFolderId, null, 'parentFolderId was not changed correctly.');
                            done();
                        }).catch(done);
                    });
                }).catch(done);
            });
        });

        it('responds with correct document containing a new parentFolderId with updated document and the new parentFolderId', (done) => {
            db.get('folders').findOne({name: '1_1'}).then((folder) => {
                var folderId = folder._id.toString();
                db.get('documents').findOne({name: '1_1_1'}).then((documentFromDatabase) => {
                    th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var id = documentFromDatabase._id.toString();
                        var updatedDocument = {parentFolderId: folderId, name: 'new_document_name'};
                        th.put(`/api/documents/${id}?token=${token}`).send(updatedDocument).expect(200).end((err,res) => {
                            //Ask the database directly
                            db.get('documents').findOne(id).then((updatedDocumentFromDatabase) => {
                                assert.ok(updatedDocumentFromDatabase, 'Document not found in database.');
                                assert.strictEqual(updatedDocumentFromDatabase.name, updatedDocument.name, 'Name not changed correctly.');
                                assert.strictEqual(updatedDocumentFromDatabase.parentFolderId.toString(), folderId, 'parentFolderId was not changed correctly.');
                                done();
                            }).catch(done);
                        });
                    }).catch(done);
                });
            });
        });
        
    });

    describe('DELETE/:id', function() {

        function getDeleteDocumentId() {
            return db.get(co.collections.clients.name).findOne({name:th.defaults.client}).then(function(client) {
                var document = {
                    name: 'newDocumentToDelete',
                    type: 'text/plain',
                    clientId: client._id,
                    parentFolderId: null
                }
                return db.get(co.collections.documents.name).insert(document);
            }).then(function(insertedDocument) {
                return th.createRelationsToUser(co.collections.documents.name, insertedDocument);
            }).then(function(insertedDocument) {
                return Promise.resolve(insertedDocument._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.documents, co.permissions.OFFICE_DOCUMENT, getDeleteDocumentId);
        th.apiTests.delete.clientDependentNegative(co.apis.documents, getDeleteDocumentId);
        th.apiTests.delete.defaultPositive(co.apis.documents, co.collections.documents.name, getDeleteDocumentId);

        // Positive tests

        it('responds with valid id with 204 and deletes the respective document and its file', () => {
            var document;
            // Give us more time because this is a complex test
            this.timeout(10000);
            return th.prepareRelations().then(th.prepareDocumentFiles).then(() => { // Relations and document files are needed only in this test
                return db.get('documents').findOne({name: '1_0_1'});
            }).then((doc) => {
                document = doc;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then((token) => {
                // Trigger deletion
                return th.del(`/api/documents/${document._id}?token=${token}`).expect(204);
            }).then((response) => {
                // Check whether document was deleted
                return db.get('documents').findOne(document._id);
            }).then((documentAfterDeletion) => {
                // Finally check whether all files were removed
                var documentPath = documentsHelper.getDocumentPath(document._id);
                assert.ok(!fs.existsSync(documentPath), `Document file ${documentPath} still exists after deletion`);
                return Promise.resolve();
            });
        });

    });
});