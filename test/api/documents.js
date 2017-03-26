/**
 * UNIT Tests for api/documents
 */

var assert = require('assert');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');
var fs = require('fs');
var path = require('path');

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

    var server = require('../../app');

    // Clear and prepare database with clients, user groups, users... 
    beforeEach(() => {
        return testHelpers.cleanDatabase()
            .then(testHelpers.prepareClients)
            .then(testHelpers.prepareClientModules)
            .then(testHelpers.prepareUserGroups)
            .then(testHelpers.prepareUsers)
            .then(testHelpers.preparePermissions)
            .then(testHelpers.prepareActivities)
            .then(testHelpers.prepareFmObjects)
            .then(testHelpers.prepareFolders)
            .then(testHelpers.prepareDocuments)
            .then(testHelpers.prepareDocumentFiles);
    });

    // Delete temporary documents
    afterEach(() => {
        return testHelpers.removeDocumentFiles()
    });

    it('responds to GET/id with an invalid id with 400', function() {
         return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
            return superTest(server).put(`/api/documents/InvalidId?token=${token}`).expect(400);
        });
    });

    it('responds to GET/id with valid id and authentication with retrieved document', function(done){
        db.get('documents').findOne({name: '2_1'}).then(function(documentFromDatabase){
            var documentId = documentFromDatabase._id;
            testHelpers.doLoginAndGetToken('2_2_2', 'test').then(function(token){
                superTest(server).get(`/api/documents/${documentId}?token=${token}`).expect(200).end(function(err, res){
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
    
    it('responds to GET/id with valid id and authentication plus download request with correct document downloaded', function(done){
        db.get('documents').findOne({name: '2_1'}).then(function(documentFromDatabase){
            var documentId = documentFromDatabase._id;
            testHelpers.doLoginAndGetToken('2_2_2', 'test').then(function(token){
                superTest(server).get(`/api/documents/${documentId}?token=${token}&action=download`).expect(200).end(function(err, res){
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

    it('responds to GET/id without authentication with 403', function() {
        //load valid id to avoid 404 error 
        return db.get('documents').findOne({name: '1_1_1'}).then(function(documentFromDB){
            var id = documentFromDB._id;
            return superTest(server).get(`/api/documents/${id}`).expect(403);
        });           
    });

    it('responds to GET/id with not existing folder id with 403', function() {
        // Here the validateSameClientId comes into the game and returns a 403 because the requested folder is
        // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
            return superTest(server).get(`/api/documents/999999999999999999999999?token=${token}`).expect(403);
        });
    });

    it('responds to GET/id without read permission with 403', function(){
        // Remove the corresponding permission
        return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_OFFICE_DOCUMENT').then(() => {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return db.get('documents').findOne({name: '1_0_1'}).then((documentFromDatabase) =>{
                    var documentId = documentFromDatabase._id; 
                    return superTest(server).get(`/api/documents/${documentId}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/id with an id of an existing document which does not belong to the same client as the logged in user with 403', function() {
        //document.clientId != user.clientId
        //login as user for client 1, but ask for document of client 2 
        return db.get('documents').findOne({name: '2_0_2'}).then((documentOfUser2) => {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                var id = documentOfUser2._id;
                return superTest(server).get(`/api/documents/${id}?token=${token}`).expect(403);
            });
        });        
    });

    xit('responds to GET/id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to GET/id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    it('responds to GET/share/id with invalid id with 400', function(){
        //for shared documents no user authentication is required 
        return db.get('documents').findOne({name: '1_1_1'}).then(function(documentFromDatabase){
            return superTest(server).get(`/api/documents/share/invalidid`).expect(400);
        });
    });

    it('responds to GET/share/id with id where no document exists with 404', function(){
        //for shared documents no user authentication is required 
        return db.get('documents').findOne({name: '1_1_1'}).then(function(documentFromDatabase){
            return superTest(server).get(`/api/documents/share/999999999999999999999999`).expect(404);
        });
    });

    it('responds to GET/share/id with valid id of non-shared document with 403', function(){
        //for shared documents no user authentication is required 
        return db.get('documents').findOne({name: '1_1_1'}).then(function(documentFromDatabase){
            return superTest(server).get(`/api/documents/share/${documentFromDatabase._id}`).expect(403);
        });
    });

    it('responds to GET/share/id with valid id of shared document with document file', function(done){
        db.get('documents').findOne({name: '2_1'}).then(function(documentFromDatabase){
            var documentId = documentFromDatabase._id;
            // First we ned to share the document
            db.update('documents', documentId, { $set: { isShared: true } }).then((updatedDocument) => {
                superTest(server).get(`/api/documents/share/${documentId}`).expect(200).end(function(err, res){
                    if(err) return done(err);
                    assert.strictEqual(res.type, 'application/octet-stream', 'Document type is not as expected.');
                    assert.strictEqual(res.text, documentId.toString(), 'Document content is not as expected');
                    done();
                });
            }).catch(done);
        }); 
    });

    xit('responds to GET/share/id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to GET/share/id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    it('responds to POST/ without file with 400', () => {
        return db.get('folders').findOne({name: '1_1_1'}).then((folderOfClient1) => {
            return testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token) => {
                //https://visionmedia.github.io/superagent/#multipart-requests
                return superTest(server).post(`/api/documents?token=${token}`).field('parentFolderId', folderOfClient1._id.toString()).expect(400)
            });
        });
    });

    xit('responds to POST/ when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to POST/ when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    it('responds to POST/ without authentication with 403', function() {
        var newDocument = {name: 'new_document_name'};
        // TODO: Attach real document, because you would get a 400 otherwise
        return superTest(server).post(`/api/documents`).send(newDocument).expect(403);       
    });

    it('responds to POST/ without write permission with 403', function() {
        // Remove the corresponding permission
        return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_OFFICE_DOCUMENT').then(() => {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                var newDocuments = {name: 'newName'};
                // TODO: Attach real document, because you would get a 400 otherwise
                return superTest(server).post('/api/documents?token=' + token).send(newDocuments).expect(403);
            });
        });
    });

    it('responds to POST/ with given file with uploaded document containing valid _id field', function(done){
        // Prepare file for upload
        var fileName = 'testDocumentPost.txt';
        var fileContent = 'Gaga Bubu';
        var filePath = createFileForUpload(fileName, fileContent);
        db.get('folders').findOne({name: '1_1_1'}).then((folderOfClient1) => {
            testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token) => {
                var parentFolderId = folderOfClient1._id.toString();
                //https://visionmedia.github.io/superagent/#multipart-requests
                superTest(server).post(`/api/documents?token=${token}`).field('parentFolderId', parentFolderId).attach('file', filePath).end((err, res) => {
                    fs.unlinkSync(filePath); // Immediately delete temporary file, we do not need it anymore
                    if(err) return done(err);
                    var id = res.body._id;
                    assert.ok(id, '_id not returned.');
                    db.get('documents').findOne(id).then((document) => {
                        assert.ok(document, 'Document not found in database.');
                        assert.strictEqual(document.name, fileName, `Filename ${document.name} not as expected.`);
                        assert.strictEqual(document.parentFolderId.toString(), parentFolderId, 'Parent folder IDs do not match.');
                        var uploadedFilePath = testHelpers.getDocumentPath(document);
                        assert.ok(fs.existsSync(uploadedFilePath), `Uploaded file not found in ${uploadedFilePath}.`);
                        var uploadedFileContent = fs.readFileSync(uploadedFilePath).toString();
                        assert.strictEqual(uploadedFileContent, fileContent, 'File content differs.');
                        done();
                    }).catch(done);
                });
            }).catch(done);
        });
    });

    it('responds to POST/ with correct document with no parentFolderId with the inserted document and null as parentFolderId', (done) => {
        // Prepare file for upload
        var fileName = 'testDocumentPost.txt';
        var fileContent = 'Gaga Bubu';
        var filePath = createFileForUpload(fileName, fileContent);
        testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token) => {
            //https://visionmedia.github.io/superagent/#multipart-requests
            superTest(server).post(`/api/documents?token=${token}`).attach('file', filePath).end((err, res) => {
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

    it('responds to POST/ with correct document with invalid parentFolderId with 400', () => {
        // Prepare file for upload
        var fileName = 'testDocumentPost.txt';
        var fileContent = 'Gaga Bubu';
        var filePath = createFileForUpload(fileName, fileContent);
        return testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token) => {
            //https://visionmedia.github.io/superagent/#multipart-requests
            return superTest(server).post(`/api/documents?token=${token}`).field('parentFolderId', 'invalidid').attach('file', filePath).expect(400);
        });
    });

    it('responds to POST/ with correct document with a not existing parentFolderId with 400', () => {
        // Prepare file for upload
        var fileName = 'testDocumentPost.txt';
        var fileContent = 'Gaga Bubu';
        var filePath = createFileForUpload(fileName, fileContent);
        return testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token) => {
            //https://visionmedia.github.io/superagent/#multipart-requests
            return superTest(server).post(`/api/documents?token=${token}`).field('parentFolderId', '999999999999999999999999').attach('file', filePath).expect(400);
        });
    });

    it('responds to POST/ with correct document for a client which has no documents the correct status and creates document path for client', (done) => {
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
                        testHelpers.doLoginAndGetToken(user.name, 'test').then((token) => {
                            //https://visionmedia.github.io/superagent/#multipart-requests
                            superTest(server).post(`/api/documents?token=${token}`).attach('file', filePath).end((err, res) => {
                                fs.unlinkSync(filePath); // Immediately delete temporary file, we do not need it anymore
                                if(err) return done(err);
                                var id = res.body._id;
                                assert.ok(id, '_id not returned.');
                                db.get('documents').findOne(id).then((document) => {
                                    assert.ok(document, 'Document not found in database.');
                                    assert.notStrictEqual(document.clientId, null, 'clientId is null.');
                                    var uploadedFilePath = testHelpers.getDocumentPath(document);
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

    it('responds to POST/ with correct document for the portal (no clientId) with inserted document and the file is located in the correct path', (done) => {
        // Prepare file for upload
        var fileName = 'testDocumentPost.txt';
        var fileContent = 'Gaga Bubu';
        var filePath = createFileForUpload(fileName, fileContent);
        testHelpers.doLoginAndGetToken('_1_1', 'test').then((token) => { // This username is from a portal user
            //https://visionmedia.github.io/superagent/#multipart-requests
            superTest(server).post(`/api/documents?token=${token}`).attach('file', filePath).end((err, res) => {
                fs.unlinkSync(filePath); // Immediately delete temporary file, we do not need it anymore
                if(err) return done(err);
                var id = res.body._id;
                assert.ok(id, '_id not returned.');
                db.get('documents').findOne(id).then((document) => {
                    assert.ok(document, 'Document not found in database.');
                    assert.strictEqual(document.clientId, null, 'cientId is not null.');
                    var uploadedFilePath = testHelpers.getDocumentPath(document);
                    assert.ok(fs.existsSync(uploadedFilePath), `Uploaded file not found in ${uploadedFilePath}.`);
                    done();
                }).catch(done);
            });
        }).catch(done);
    });

    it('responds to PUT/id with an invalid id with 400', function() {
         return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
            return superTest(server).put(`/api/documents/InvalidId?token=${token}`).send({name: 'new_document_name'}).expect(400);
        });
    });

    it('responds to PUT/id with valid id but no actual update data with 400', function(){
        return db.get('documents').findOne({name: '2_1_1'}).then(function(documentFromDB){
            return testHelpers.doLoginAndGetToken('2_2_2', 'test').then(function(token){
                var id = documentFromDB._id;
                return superTest(server).put(`/api/documents/${id}?token=${token}`).send().expect(400);
            });
        });
    });

    it('responds to PUT/id with valid id but no actual update data with 400', function(){
        return db.get('documents').findOne({name: '2_1_1'}).then(function(documentFromDB){
            return testHelpers.doLoginAndGetToken('2_2_2', 'test').then(function(token){
                var id = documentFromDB._id;
                return superTest(server).put(`/api/documents/${id}?token=${token}`).send().expect(400);
            });
        });
    });

    it('responds to PUT/id without authentication with 403', function() {
        //load valid id to avoid 404 error 
        return db.get('documents').findOne({name: '1_1_1'}).then(function(documentFromDB){
            var id = documentFromDB._id;
            var updatedDoc = {name: 'new_document_name'};
            return superTest(server).put(`/api/documents/${id}`).send(updatedDoc).expect(403);
        });          
    });

    it('responds to PUT/id without write permission with 403', function() {
        return db.get('documents').findOne({ name : '1_2' }).then((documentFromDatabase) => {
            // Remove the corresponding permission
            return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_OFFICE_DOCUMENT').then(() => {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var updatedDoc = {name: 'new_document_name'};
                    return superTest(server).put(`/api/documents/${documentFromDatabase._id}?token=${token}`).send(updatedDoc).expect(403);
                });
            });
        });
    });

    it('responds to PUT/id with an id that does not exist with 403', function() {
        // Here the validateSameClientId comes into the game and returns a 403 because the requested folder is
        // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
        var updatedDoc = {name: 'new_document_name'};
        return testHelpers.doAdminLoginAndGetToken().then((token) => {
            return superTest(server).put(`/api/documents/999999999999999999999999?token=${token}`).send(updatedDoc).expect(403);
        });
    });

    it('responds to PUT/id with an id of an existing document which does not belong to the same client as the logged in user with 403', function() {
        //document.clientId != user.clientId
        //logged user belongs to client 1, but requested documet to client 2 
         return db.get('documents').findOne({name: '2_0'}).then((documentOfUser2) => {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                var id = documentOfUser2._id;
                var updatedDocument = {name: 'new_document_name'};
                return superTest(server).put(`/api/documents/${id}?token=${token}`).send(updatedDocument).expect(403);
            });
        });
    });

    it('responds to PUT/id with valid _id with correcly updated document', (done) => {
        db.get('documents').findOne({name: '2_2_1'}).then((documentFromDatabase) => {
            testHelpers.doLoginAndGetToken('2_0_0', 'test').then((token) => {
                var id = documentFromDatabase._id.toString();
                var updatedDocument = {name: 'new_document_name'};
                superTest(server).put(`/api/documents/${id}?token=${token}`).send(updatedDocument).expect(200).end((err,res) => {
                    var idFromResponse = res.body._id;
                    assert.ok(idFromResponse, '_id not returned.');
                    //Ask the database directly
                    db.get('documents').findOne(idFromResponse).then((updatedDocumentFromDatabase) => {
                        assert.ok(updatedDocumentFromDatabase, 'Document not found in database.');
                        assert.strictEqual(updatedDocumentFromDatabase.name, updatedDocument.name, 'Name not changed correctly.');
                        done();
                    }).catch(done);
                });
            }).catch(done);
        });
    });

    it('responds to PUT/id giving a new _id with updated document without changing its original _id', (done) => {
        db.get('documents').findOne({name: '2_2_1'}).then((documentFromDatabase) => {
            testHelpers.doLoginAndGetToken('2_0_0', 'test').then((token) => {
                var id = documentFromDatabase._id.toString();
                var updatedDocument = {_id: '999999999999999999999999', name: 'new_document_name'};
                superTest(server).put(`/api/documents/${id}?token=${token}`).send(updatedDocument).expect(200).end((err,res) => {
                    var idFromResponse = res.body._id;
                    assert.ok(idFromResponse, '_id not returned.');
                    assert.strictEqual(idFromResponse, id, '_id was changed.');
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

    it('responds to PUT/id giving a new clientId with updated document without changing its original clientId', (done) => {
        db.get('clients').findOne({name: '1'}).then((client) => {
            db.get('documents').findOne({name: '2_2_1'}).then((documentFromDatabase) => {
                testHelpers.doLoginAndGetToken('2_0_0', 'test').then((token) => {
                    var id = documentFromDatabase._id.toString();
                    var updatedDocument = {clientId: client._id.toString, name: 'new_document_name'};
                    superTest(server).put(`/api/documents/${id}?token=${token}`).send(updatedDocument).expect(200).end((err,res) => {
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

    it('responds to PUT/id with correct document with invalid new parentFolderId with 400', () => {
        return db.get('documents').findOne({name: '2_2_1'}).then((documentFromDatabase) => {
            return testHelpers.doLoginAndGetToken('2_0_0', 'test').then((token) => {
                var id = documentFromDatabase._id.toString();
                var updatedDocument = {parentFolderId: '999999999999999999999999', name: 'new_document_name'};
                return superTest(server).put(`/api/documents/${id}?token=${token}`).send(updatedDocument).expect(400);
            });
        });
    });

    it('responds to PUT/id with correct document without parentFolderId with updated document and old parentFolderId', (done) => {
        db.get('documents').findOne({name: '2_2_1'}).then((documentFromDatabase) => {
            testHelpers.doLoginAndGetToken('2_0_0', 'test').then((token) => {
                var id = documentFromDatabase._id.toString();
                var updatedDocument = {name: 'new_document_name'};
                superTest(server).put(`/api/documents/${id}?token=${token}`).send(updatedDocument).expect(200).end((err,res) => {
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

    it('responds to PUT/id with correct document containing null as parentFolderId with updated document and null as parentFolderId', (done) => {
        db.get('documents').findOne({name: '2_2_1'}).then((documentFromDatabase) => {
            testHelpers.doLoginAndGetToken('2_0_0', 'test').then((token) => {
                var id = documentFromDatabase._id.toString();
                var updatedDocument = {parentFolderId: null, name: 'new_document_name'};
                superTest(server).put(`/api/documents/${id}?token=${token}`).send(updatedDocument).expect(200).end((err,res) => {
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

    it('responds to PUT/id with correct document containing a new parentFolderId with updated document and the new parentFolderId', (done) => {
        db.get('folders').findOne({name: '2_1'}).then((folder) => {
            var folderId = folder._id.toString();
            db.get('documents').findOne({name: '2_2_1'}).then((documentFromDatabase) => {
                testHelpers.doLoginAndGetToken('2_0_0', 'test').then((token) => {
                    var id = documentFromDatabase._id.toString();
                    var updatedDocument = {parentFolderId: folderId, name: 'new_document_name'};
                    superTest(server).put(`/api/documents/${id}?token=${token}`).send(updatedDocument).expect(200).end((err,res) => {
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

    xit('responds to PUT/id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to PUT/id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to DELETE/id without write permission with 403', function() {
    });

    it('responds to DELETE/id with an invalid id with 400', function() {
         return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
            return superTest(server).del(`/api/documents/InvalidId?token=${token}`).expect(400);
        });
    });

    it('responds to DELETE/id without authentication with 403', function() {
        //load valid id to avoid 404 error 
        return db.get('documents').findOne({name: '1_1_1'}).then(function(documentFromDB){
            var id = documentFromDB._id;
            return superTest(server).put(`/api/documents/${id}`).expect(403);
        });          
    });

    it('responds to DELETE/id with an id of an existing document which does not belong to the same client as the logged in user with 403', function() {
        //document.clientId != user.clientId
        //logg-in as user for client 1, but ask for document of client 2 
        return db.get('documents').findOne({name: '2_0_2'}).then((documentOfUser2) => {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                var id = documentOfUser2._id;
                return superTest(server).del(`/api/documents/${id}?token=${token}`).expect(403);
            });
        });        
    });

    it('responds to DELETE/id with valid id with 204 and deletes the respective document, its file and its relations to activities', (done) => {
        // Give us more time because this is a complex test
        this.timeout(10000);
        testHelpers.prepareRelations().then(testHelpers.prepareDocumentFiles).then(() => { // Relations and document files are needed only in this test
            // Retrieve the relations for the document
            db.get('documents').findOne({name: '1_0_2'}).then((document) => {
                db.get('relations').find({ $or: [ { type1: 'documents', id1: document._id }, { type2: 'documents', id2: document._id } ] }, '_id').then((relations) => {
                    var relationIds = relations.map((relation) => relation._id);
                    testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        // Trigger deletion
                        superTest(server).del(`/api/documents/${document._id}?token=${token}`).expect(204).end((err, res) => {
                            if (err) return done(err);
                            // Check whether document was deleted
                            db.get('documents').findOne(document._id).then((documentAfterDeletion) => {
                                assert.equal(documentAfterDeletion, null, 'Document still exists in database');
                                // And at least check the relations
                                db.get('relations').count({ _id: { $in: relationIds } }).then((relationCount) => {
                                    assert.equal(relationCount, 0, 'Not all relations of the deleted document were also deleted');
                                    // But there must still be other relations
                                    db.get('relations').count().then((otherRelationCount) => {
                                        assert.notEqual(otherRelationCount, 0, 'The other relations were also deleted');
                                        // Finally check whether all files were removed
                                        var path = testHelpers.getDocumentPath(document);
                                        assert.ok(!fs.existsSync(path), `Document file ${path} still exists after deletion`);
                                        done();
                                    }).catch(done); // Must be at each level where an assertion is made
                                }).catch(done);
                            }).catch(done);
                        });
                    });
                });
            });
        });
    });

    it('responds to DELETE/id with valid id assigned to the portal (no clientId) with 204 and deletes the respective document, its file and its relations to activities', (done) => {
        // Give us more time because this is a complex test
        this.timeout(10000);
        testHelpers.prepareRelations().then(testHelpers.prepareDocumentFiles).then(() => { // Relations and document files are needed only in this test
            // Retrieve the relations for the document
            db.get('documents').findOne({name: 'portalfolder_0_2'}).then((document) => {
                db.get('relations').find({ $or: [ { type1: 'documents', id1: document._id }, { type2: 'documents', id2: document._id } ] }, '_id').then((relations) => {
                    var relationIds = relations.map((relation) => relation._id);
                    testHelpers.doLoginAndGetToken('_1_1', 'test').then((token) => {
                        // Trigger deletion
                        superTest(server).del(`/api/documents/${document._id}?token=${token}`).expect(204).end((err, res) => {
                            if (err) return done(err);
                            // Check whether document was deleted
                            db.get('documents').findOne(document._id).then((documentAfterDeletion) => {
                                assert.equal(documentAfterDeletion, null, 'Document still exists in database');
                                // And at least check the relations
                                db.get('relations').count({ _id: { $in: relationIds } }).then((relationCount) => {
                                    assert.equal(relationCount, 0, 'Not all relations of the deleted document were also deleted');
                                    // But there must still be other relations
                                    db.get('relations').count().then((otherRelationCount) => {
                                        assert.notEqual(otherRelationCount, 0, 'The other relations were also deleted');
                                        // Finally check whether all files were removed
                                        var path = testHelpers.getDocumentPath(document);
                                        assert.ok(!fs.existsSync(path), `Document file ${path} still exists after deletion`);
                                        done();
                                    }).catch(done); // Must be at each level where an assertion is made
                                }).catch(done);
                            }).catch(done);
                        });
                    });
                });
            });
        });
    });

    xit('responds to DELETE/id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to DELETE/id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    it('responds to POST/ with correct document for the portal (no clientId) with inserted document and the file is located in the correct path', (done) => {
        // Prepare file for upload
        var fileName = 'testDocumentPost.txt';
        var fileContent = 'Gaga Bubu';
        var filePath = createFileForUpload(fileName, fileContent);
        testHelpers.doLoginAndGetToken('_1_1', 'test').then((token) => { // This username is from a portal user
            //https://visionmedia.github.io/superagent/#multipart-requests
            superTest(server).post(`/api/documents?token=${token}`).attach('file', filePath).end((err, res) => {
                fs.unlinkSync(filePath); // Immediately delete temporary file, we do not need it anymore
                if(err) return done(err);
                var id = res.body._id;
                assert.ok(id, '_id not returned.');
                db.get('documents').findOne(id).then((document) => {
                    assert.ok(document, 'Document not found in database.');
                    assert.strictEqual(document.clientId, null, 'cientId is not null.');
                    var uploadedFilePath = testHelpers.getDocumentPath(document);
                    assert.ok(fs.existsSync(uploadedFilePath), `Uploaded file not found in ${uploadedFilePath}.`);
                    done();
                }).catch(done);
            });
        }).catch(done);
    });

});