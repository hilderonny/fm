/**
 * UNIT Tests for api/folders
 */
var assert = require('assert');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');
var async = require('async');
var fs = require('fs');

// xdescribe and xit are used for test stubs which should not run now and are to be implemented later
describe('API folders', function() {

    var server = require('../../app');
    
    // Clear and prepare database with clients, user groups and users
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
            .then(testHelpers.prepareDocuments); // Relations and document files are prepared in one test only to save time
    });

    // Delete temporary documents
    afterEach(() => {
        return testHelpers.removeDocumentFiles()
    });

    it('responds to GET/ without authentication with 403', function() {
        return superTest(server).get('/api/folders').expect(403);
    });

    it('responds to GET/ without read permission with 403', function() {
        // Remove the corresponding permission
        return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_OFFICE_DOCUMENT').then(() => {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return superTest(server).get(`/api/folders?token=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/ with object containing all folders and documents (and their details) which have no parent folder', function(done) {
        //user belonging to client 1 has 3 folders with 3 documents each
        testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
            db.get('clients').findOne({name: '1'}).then((clientFromDatabase) =>{
                superTest(server).get(`/api/folders?token=${token}`).expect(200).end(function(err, res){
                    if (err) {
                        done(err);
                        return;
                    }
                    var rootFolder = res.body;
                    var rootFolderFolders = rootFolder.folders;
                    var rootFolderDocuments = rootFolder.documents;
                    var clientId = clientFromDatabase._id;
                    assert.strictEqual(3, rootFolderFolders.length, 'Expected number of folders in the root is wrong');
                    assert.strictEqual(3, rootFolderDocuments.length, 'Expected number of documents in the root is wrong');
                    rootFolderFolders.forEach(function(currentFolder){
                        assert.strictEqual(currentFolder.clientId, clientId.toString(), 'clientId of retrieved folder is not correct');
                    });
                    rootFolderDocuments.forEach(function(currentDocument){
                        assert.strictEqual(currentDocument.clientId, clientId.toString(), 'clientId of retrieved document is not correct');
                    });
                    // TODO: Check folder names
                    // TODO: check document names
                    done();
                });
            }).catch(done); // catch(done) immer auf dem Level des innersten "then"
        });
    });

    it('responds to GET/ with object containing empty folders array when no folders exist', function(done) {
        // First we need to delete all folders from the test preparations
        db.get('folders').remove().then(() => {
            testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                superTest(server).get(`/api/folders?token=${token}`).expect(200).end(function(err, res){
                    if (err) return done(err);
                    var resultFromApi = res.body;
                    //check for empty folders array
                    assert.strictEqual(0, Object.keys(resultFromApi.folders).length, 'Unexpected content');
                    done();
                });
            }).catch(done);
        });
    });

    it('responds to GET/ with object containing empty documents array when no documents exist', function(done) {
        // First we need to delete all documents from the test preparations
        db.get('documents').remove().then(() => {
            testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                superTest(server).get(`/api/folders?token=${token}`).expect(200).end(function(err, res){
                    if (err) {
                        done(err);
                        return;
                    }
                    var resultFromApi = res.body;
                    //check for empty documents array
                    assert.strictEqual(0, Object.keys(resultFromApi.documents).length, 'Unexpected content');
                    done();
                });
            }).catch(done);
        });
    });

    it('responds to GET/ when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'documents').then(function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return superTest(server).get(`/api/folders?token=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/ when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'documents').then(function() {
            return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                return superTest(server).get(`/api/folders?token=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/id without authentication with 403', function() {
        return db.get('folders').findOne({name: '0_0'}).then((folderFromDatabase) => {
             return superTest(server).get(`/api/folders/${folderFromDatabase._id}`).expect(403);
        });
    });

    it('responds to GET/id without read permission with 403', function() {
        // Remove the corresponding permission
        return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_OFFICE_DOCUMENT').then(() => {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return db.get('folders').findOne({name: '1_0'}).then((folderFromDatabase) =>{
                    var folderId = folderFromDatabase._id.toString(); 
                    return superTest(server).get(`/api/folders/${folderId}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/id with invalid id with 400', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
            return superTest(server).get(`/api/folders/InvalidId?token=${token}`).expect(400);
        });
    });

    it('responds to GET/id with not existing folder id with 403', function() {
        // Here the validateSameClientId comes into the game and returns a 403 because the requested folder is
        // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
            return superTest(server).get(`/api/folders/999999999999999999999999?token=${token}`).expect(403);
        });
    });

    it('responds to GET/id with existing folder id with all details of the folder and its subfolders and documents', function(done) {
        //Note: delivered subfolders are from one lever below the current folder
        //The actual complete folder structure can be deeper  
        db.get('folders').findOne({name: '1_0_0'}).then((folderFromDatabase)=>{ 
            testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                var id = folderFromDatabase._id.toString();
                superTest(server).get(`/api/folders/${id}?token=${token}`).expect(200).end(function(err, res){
                    if (err) {
                            done(err);
                            return;
                            }
                    var resultFromApi = res.body;
                    var numberOfDucments = 3; //number of documents contained in the current folder
                    var numDocumentsFromApi = resultFromApi.documents.length;
                    var numberOfSubfolders = 3; //number of subfolders one level below current folder 
                    var numSubfoldersFromApi = resultFromApi.folders.length;
                    assert.strictEqual(numberOfDucments, numDocumentsFromApi, `folder does not contian the expected number of documents`);
                    assert.strictEqual(numberOfSubfolders, numSubfoldersFromApi, `folder does not contian the expected number of subfolders`);
                    done();
                });
            }).catch(done);
        });
    });
  
    it('responds to GET/id with an id of an existing folder which does not belong to the same client as the logged in user with 403', function() {
        //folder.clientId != user.clientId
        //logg-in as user for client 1, but ask for folder of client 2 
        return db.get('folders').findOne({name: '2_0'}).then((folderOfUser2) => {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                var folderId = folderOfUser2._id.toString();
                return superTest(server).get(`/api/folders/${folderId}?token=${token}`).expect(403);
            });
        });        
    });

    it('responds to GET/id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('folders').findOne({name: '1_0'}).then((folderOfUser) => {
            return testHelpers.removeClientModule('1', 'documents').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var folderId = folderOfUser._id.toString();
                    return superTest(server).get(`/api/folders/${folderId}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('folders').findOne({name: '1_0'}).then((folderOfUser) => {
            return testHelpers.removeClientModule('1', 'documents').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                    var folderId = folderOfUser._id.toString();
                    return superTest(server).get(`/api/folders/${folderId}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to POST/ without authentication with 403', function() {
        return superTest(server).post('/api/folders').send({name: 'test_name'}).expect(403);
    });

    it('responds to POST/ without write permission with 403', function() {
           // Remove the corresponding permission
        return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_OFFICE_DOCUMENT').then(() => {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                var newFolder = { 
                    name: 'newName'
                };
                return superTest(server).post('/api/folders?token=' + token).send(newFolder).expect(403);
            });
        });
    });

    it('responds to POST/ without giving a folder with 400', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
            return superTest(server).post(`/api/folders?token=${token}`).send().expect(400);
        });
    });

    it('responds to POST/ with correct folder data with inserted folder containing an _id field', function(done) {
        testHelpers.doLoginAndGetToken('2_0_0', 'test').then((token)=>{
            var newFolder = {name: 'test_folder'};
            superTest(server).post(`/api/folders?token=${token}`).send(newFolder).expect(200).end(function(err, res){
                if (err) {
                    done(err);
                    return;
                }
                var resultFromApi = res.body;
                db.get(`clients`).findOne({name: '2'}).then((clientFromDatabase) =>{
                    var clientId = clientFromDatabase._id.toString();
                    db.get(`folders`).findOne({name: 'test_folder'}).then((resultFromDatabase) =>{
                        assert.ok(resultFromDatabase, 'New folder was not created');
                        assert.strictEqual(clientId, resultFromApi.clientId, `clientId of returned object is not as expected`);
                        assert.strictEqual(newFolder.name, resultFromApi.name, `name of returned object is not as expected`); 
                        var keys = Object.keys(newFolder).length + 2; //_id and clientId are returned additionally 
                        assert.strictEqual(keys, Object.keys(resultFromApi).length, `result doesn't contain expected number of fields`);
                        done();
                    }).catch(done);
                });
            });
        });
    });

    it('responds to POST/ with correct folder containing an _id with the inserted folder containing a generated _id', function(done) {
        // _id must not be settable on POST
        testHelpers.doLoginAndGetToken('2_0_0', 'test').then((token)=>{
            var newFolder = {name: 'test_folder', _id: '999999999999999999999999'};
            superTest(server).post(`/api/folders?token=${token}`).send(newFolder).expect(200).end(function(err, res){
                if (err) {
                    done(err);
                    return;
                }
                var resultFromApi = res.body;
                db.get(`clients`).findOne({name: '2'}).then((clientFromDatabase) =>{
                    var clientId = clientFromDatabase._id.toString();
                    db.get(`folders`).findOne({name: 'test_folder'}).then((resultFromDatabase) =>{
                        assert.ok(resultFromDatabase, 'New folder was not created');
                        assert.strictEqual(clientId, resultFromApi.clientId, `clientId of returned object is not as expected`);
                        assert.strictEqual(newFolder.name, resultFromApi.name, `name of returned object is not as expected`); 
                        assert.notStrictEqual(resultFromApi._id.toString(), newFolder._id.toString(), 'Id manipulation!'); 
                        var keys = Object.keys(newFolder).length + 1; //clientId field is returned additionally 
                        assert.strictEqual(keys, Object.keys(resultFromApi).length, `result doesn't contain expected number of fields`);
                        done();
                    }).catch(done);
                });
            });
        });
    });

    it('responds to POST/ with correct folder containing a specific clientId with the inserted folder where the clientId is the one of the logged in user', function(done) {
        // clientId must not be settable on POST
        testHelpers.doLoginAndGetToken('2_0_0', 'test').then((token)=>{
            var newFolder = {name: 'test_folder', clientId: '999999999999999999999999'};
            superTest(server).post(`/api/folders?token=${token}`).send(newFolder).expect(200).end(function(err, res){
                if (err) {
                            done(err);
                            return;
                         }
                var resultFromApi = res.body;
                db.get(`clients`).findOne({name: '2'}).then((clientFromDatabase) =>{
                    var clientFromDatabaseId = clientFromDatabase._id.toString();
                    db.get(`folders`).findOne({name: 'test_folder'}).then((resultFromDatabase) =>{
                        assert.ok(resultFromDatabase, 'New folder was not created');
                        assert.strictEqual(clientFromDatabaseId, resultFromDatabase.clientId.toString(), `clientId of returned object is not as expected`);
                        assert.strictEqual(newFolder.name, resultFromDatabase.name, `name of returned object is not as expected`); 
                        assert.notStrictEqual(resultFromDatabase.clientId.toString(), newFolder.clientId, 'Id manipulation!'); 
                        var keys = Object.keys(newFolder).length + 1; //_id field is returned additionally 
                        assert.strictEqual(keys, Object.keys(resultFromApi).length, `result doesn't contain expected number of fields`);
                        done();
                    }).catch(done);
                });
            });
        });
    });

    it('responds to POST/ with correct folder with no parentFolderId with the inserted folder and null as parentFolderId', function(done) {
        // parentFolderId = null means that the folder becomes a root folder
        testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
            var newFolder = {name: 'test_folder', parentFolderId: null};
            superTest(server).post(`/api/folders?token=${token}`).send(newFolder).expect(200).end(function(err, res){
                if (err) {
                    done(err);
                    return;
                }
                var resultFromApi = res.body;
                db.get(`folders`).findOne({name: 'test_folder'}).then((resultFromDatabase) =>{
                    assert.ok(resultFromDatabase, 'New folder was not created');
                    assert.strictEqual(null, resultFromDatabase.parentFolderId, `parentFolderId of returned object is not as expected`);
                    done();
                }).catch(done);
            });
        });
    });

    it('responds to POST/ with correct folder with invalid parentFolderId with 400', function() {
        // parentFolderId = null means that the folder becomes a root folder
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
            var newFolder = {name: 'test_folder', parentFolderId: '999999999999999999999999'};
            return superTest(server).post(`/api/folders?token=${token}`).send(newFolder).expect(400);
        });
    });

    it('responds to POST/ with correct folder with correct parentFolderId with the inserted folder and the ID of the parent folder as parentFolderId', function(done) {
        db.get('folders').findOne({name: '1_1_1'}).then((parentFolder) =>{
            testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                var newFolder = { name: 'test_folder', parentFolderId: parentFolder._id.toString() };
                superTest(server).post(`/api/folders?token=${token}`).send(newFolder).expect(200).end(function(err, res){
                    if (err) {
                        done(err);
                        return;
                    }
                    var resultFromApi = res.body;
                    db.get(`folders`).findOne({name: 'test_folder'}).then((resultFromDatabase) =>{
                        assert.ok(resultFromDatabase, 'New folder was not created');
                        assert.strictEqual(parentFolder._id.toString(), resultFromDatabase.parentFolderId.toString(), `parentFolderId of returned object is not as expected`);
                        done();
                    }).catch(done);
                });
            });
        });
    });

    it('responds to POST/ when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'documents').then(function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                var newFolder = { 
                    name: 'newName'
                };
                return superTest(server).post('/api/folders?token=' + token).send(newFolder).expect(403);
            });
        });
    });

    it('responds to POST/ when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'documents').then(function() {
            return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                var newFolder = { 
                    name: 'newName'
                };
                return superTest(server).post('/api/folders?token=' + token).send(newFolder).expect(403);
            });
        });
    });

    it('responds to PUT/id without authentication with 403', function() {
        return db.get('folders').findOne({name: '0_0'}).then((folderFromDatabase) => {
            var folderId = folderFromDatabase._id.toString();
            return superTest(server).put('/api/folders/'+ folderId).send().expect(403);
        });
    });

    it('responds to PUT/id without write permission with 403', function() {
        return db.get('folders').findOne({ name : '1_2' }).then((folderFromDatabase) => {
            // Remove the corresponding permission
            return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_OFFICE_DOCUMENT').then(() => {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var updatedFolder = {
                        name: 'newName'
                    };
                    return superTest(server).put(`/api/folders/${folderFromDatabase._id}?token=${token}`).send(updatedFolder).expect(403);
                });
            });
        });
    });

    it('responds to PUT/id with an invalid id with 400', function() {
         return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
            return superTest(server).put(`/api/folders/InvalidId?token=${token}`).send({name: 'newFolderName'}).expect(400);
        });
    });

    it('responds to PUT/id with an id that does not exist with 403', function() {
        // Here the validateSameClientId comes into the game and returns a 403 because the requested folder is
        // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
        var updatedFolder = {
            name: 'newName'
        };
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
            return superTest(server).put(`/api/folders/999999999999999999999999?token=${token}`).send(updatedFolder).expect(403);
        });
    });

    it('responds to PUT/id without giving a folder with 400', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
            return db.get('folders').findOne({name: '1_0'}).then((folderFromDatabase)=>{
                var folderId = folderFromDatabase._id.toString();
                return superTest(server).put(`/api/folders/${folderId}?token=${token}`).send().expect(400);
            });
        });
    });

    it('responds to PUT/id with a folder containing an _id field which differs from the id parameter with the updated folder and the original _id (_id cannot be changed)', function(done) {
        db.get('folders').findOne({name: '2_2'}).then(function(folderFromDatabase){
            testHelpers.doLoginAndGetToken('2_0_0', 'test').then((token)=>{
                var updatedFolder = {name: '2_3', _id: '999999999999999999999999'};
                var id = folderFromDatabase._id.toString();
                superTest(server).put(`/api/folders/${id}?token=${token}`).send(updatedFolder).expect(200).end(function(err, res){
                    if (err) {
                        done(err);
                        return;
                    }
                    var resultFromApi = res.body;
                    var clientId = folderFromDatabase.clientId.toString();
                    assert.strictEqual(clientId, resultFromApi.clientId, `clientId of returned object is not as expected`);
                    assert.strictEqual(updatedFolder.name, resultFromApi.name, `name of returned object is not updated as expected`); 
                    assert.notStrictEqual(resultFromApi._id.toString(), updatedFolder._id.toString(), 'Id manipulation!'); 
                    var keys = Object.keys(updatedFolder).length + 1; //clientId field is returned additionally 
                    assert.strictEqual(keys, Object.keys(resultFromApi).length, `result doesn't contain expected number of fields: 3 vs ${Object.keys(resultFromApi).length}`);
                    done();
                });
            }).catch(done);
        });
    });

    it('responds to PUT/id with a folder containing a clientId field with a different client id with the updated folder and the original clientId (clientId cannot be changed)', function(done) {
        db.get('folders').findOne({name: '1_1'}).then((folderFromDatabase) =>{ //looking for the folder first to obtain a valid _id
            db.get('clients').findOne({name: '2'}).then((differentClientFromDB)=>{//then look for another cliet to use his/her _id as subsitute clientId
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var folderId = folderFromDatabase._id;
                    var updatedFolder = {name: 'new_folder_name',
                                        clientId: differentClientFromDB._id} //try to substitute the exsiting clientId
                    superTest(server).put(`/api/folders/${folderId}?token=${token}`).send(updatedFolder).expect(200).end((err, res) =>{
                        if(err){ 
                            done(err);
                            return;
                        }
                        var resultFromApi = res.body; 
                        assert.notStrictEqual(resultFromApi.clientId.toString(), updatedFolder.clientId.toString(), 'clientId manipulation!'); 
                        assert.strictEqual(updatedFolder.name, resultFromApi.name, `name of returned object is not updated as expected`);
                        var actualSize =  Object.keys(resultFromApi).length;
                        var expectedSize = Object.keys(updatedFolder).length + 1; // _id returned additionally
                        assert.strictEqual(expectedSize, actualSize, 'Number of expected object fields is wrong');
                        done();
                    });
                }).catch(done);
            });
        });
    });

    it('responds to PUT/id with a folder with the updated folder and its new properties', function(done) {
        db.get('folders').findOne({name: '1_1'}).then((folderFromDatabase) => {
            testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                var updatedFolder = {name: 'new_folder_name'};
                superTest(server).put(`/api/folders/${folderFromDatabase._id}?token=${token}`).send(updatedFolder).expect(200).end((err,res) =>{
                    if(err){ 
                        done(err);
                        return;
                    }
                    var resultFromApi = res.body;
                    assert.strictEqual(resultFromApi.name, updatedFolder.name, 'Name change failed');
                    done();
                });
            }).catch(done);
        });
    });

    it('responds to PUT/id with an id of an existing folder which does not belong to the same client as the logged in user with 403', function() {
        //folder.clientId != user.clientId
         return db.get('folders').findOne({name: '2_0'}).then((folderOfUser2) => {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                var folderId = folderOfUser2._id.toString();
                var updatedFolder = {name: 'new_folder_name'};
                return superTest(server).put(`/api/folders/${folderId}?token=${token}`).send(updatedFolder).expect(403);
            });
        });
    });

    it('responds to PUT/id with correct folder with invalid new parentFolderId with 400', function() {
        return db.get('folders').findOne({name: '1_1'}).then((folderFromDatabase) => {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                var updatedFolder = { name: 'new_folder_name', parentFolderId: '999999999999999999999999' };
                return superTest(server).put(`/api/folders/${folderFromDatabase._id}?token=${token}`).send(updatedFolder).expect(400);
            });
        });
    });

    it('responds to PUT/id with correct folder without parentFolderId with updated folder and old parentFolderId', function(done) {
        db.get('folders').findOne({name: '1_1_1'}).then((folderFromDatabase) => {
            testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                var updatedFolder = { name: 'new_folder_name' };
                superTest(server).put(`/api/folders/${folderFromDatabase._id}?token=${token}`).send(updatedFolder).expect(200).end((err,res) =>{
                    if(err){ 
                        done(err);
                        return;
                    }
                    var resultFromApi = res.body;
                    assert.strictEqual(resultFromApi.parentFolderId, folderFromDatabase.parentFolderId.toString(), 'ParentFolderId was changed');
                    done();
                });
            }).catch(done);
        });
    });

    it('responds to PUT/id with correct folder containing null as parentFolderId with updated folder and null as parentFolderId', function(done) {
        // Move folder to root
        db.get('folders').findOne({name: '1_1_1'}).then((folderFromDatabase) => {
            testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                var updatedFolder = { name: 'new_folder_name', parentFolderId: null };
                superTest(server).put(`/api/folders/${folderFromDatabase._id}?token=${token}`).send(updatedFolder).expect(200).end((err,res) =>{
                    if(err){ 
                        done(err);
                        return;
                    }
                    var resultFromApi = res.body;
                    assert.strictEqual(resultFromApi.parentFolderId, null, 'ParentFolderId was not changed correctly');
                    done();
                });
            }).catch(done);
        });
    });

    it('responds to PUT/id with correct folder with correct new parentFolderId with the updated folder and the ID of the new parent folder as parentFolderId', function(done) {
        // Move between subfolders
        db.get('folders').findOne({name: '1_2'}).then((newParentFolder) => {
            var newParentFolderId = newParentFolder._id.toString();
            db.get('folders').findOne({name: '1_1_1'}).then((folderFromDatabase) => {
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var updatedFolder = { name: 'new_folder_name', parentFolderId: newParentFolderId };
                    superTest(server).put(`/api/folders/${folderFromDatabase._id}?token=${token}`).send(updatedFolder).expect(200).end((err,res) =>{
                        if(err){ 
                            done(err);
                            return;
                        }
                        var resultFromApi = res.body;
                        assert.strictEqual(resultFromApi.parentFolderId, newParentFolderId, 'ParentFolderId was not changed correctly');
                        done();
                    });
                }).catch(done);
            });
        });
    });

    it('responds to PUT/id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('folders').findOne({ name : '1_0' }).then((folderFromDatabase) => {
            return testHelpers.removeClientModule('1', 'documents').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var updatedFolder = {
                        name: 'newName'
                    };
                    return superTest(server).put(`/api/folders/${folderFromDatabase._id}?token=${token}`).send(updatedFolder).expect(403);
                });
            });
        });
    });

    it('responds to PUT/id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('folders').findOne({ name : '1_0' }).then((folderFromDatabase) => {
            return testHelpers.removeClientModule('1', 'documents').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                    var updatedFolder = {
                        name: 'newName'
                    };
                    return superTest(server).put(`/api/folders/${folderFromDatabase._id}?token=${token}`).send(updatedFolder).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/id without authentication with 403', function() {
        return db.get('folders').findOne({name: '1_0'}).then((folderFromDatabase) =>{
            var folderId = folderFromDatabase._id.toString();
            return superTest(server).del(`/api/folders/${folderId}`).expect(403);
        });
    });

    it('responds to DELETE/id without write permission with 403', function() {
          return db.get('folders').findOne({ name : '1_0' }).then((folderFromDatabase) => {
            // Remove the corresponding permission
            return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_OFFICE_DOCUMENT').then(() => {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return superTest(server).del(`/api/folders/${folderFromDatabase._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/id with an invalid id with 400', function() {
          return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
            return superTest(server).del('/api/folders/invalidId?token=' + token).expect(400);
        });
    });

    it('responds to DELETE/id with an id where no folders exists with 403', function() {
        // Here the validateSameClientId comes into the game and returns a 403 because the requested folder is
        // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
            return superTest(server).del(`/api/folders/999999999999999999999999?token=${token}`).expect(403);
        });
    });

    it('responds to DELETE/id with an id of an existing folder without deleting parent folder', function(done){
        db.get('folders').findOne({name: '2_2_0_1'}).then(function(folderFromDatabase){
            var folderId = folderFromDatabase._id;
            var parentId = folderFromDatabase.parentFolderId;
            testHelpers.doLoginAndGetToken('2_0_0', 'test').then(function(token){
                superTest(server).del(`/api/folders/${folderId}?token=${token}`).expect(204).end(function(err, res){
                    if(err){
                        done(err);
                        return;
                    }
                    else{
                         //check if parent folder is still existing 
                         db.get('folders').findOne({_id: parentId}).then(function(resultFromDatabase) {
                            assert.strictEqual(resultFromDatabase.name, '2_2_0' , `Parent folder was deleted`);
                            done();
                        });
                    }
                });
            }).catch(done);
        });
    });

    it('responds to DELETE/id with an id of an existing folder without deleting documents or sibling folders on the same level', function(done){
        //Note: folder 1_1_1 had 2 sibling folders and 3 sibling documents; parent folder is 1_1
        db.get('folders').findOne({name: '1_1_1'}).then(function(folderFromDatabase){
            var folderId = folderFromDatabase._id;
            var parentId = folderFromDatabase.parentFolderId;
            testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                superTest(server).del(`/api/folders/${folderId}?token=${token}`).expect(204).end(function(err, res){
                    if(err){
                        done(err);
                        return;
                    }
                    else{
                         //check if siblings on the same level  still exist
                        superTest(server).get(`/api/folders/${parentId}?token=${token}`).expect(204).end(function(err, res){
                             var numSubFolders = res.body.folders.length;
                             var numDocuments = res.body.documents.length;
                             assert.strictEqual(numSubFolders, 2 , `Incorrect number of expected folders: 2 vs ${numSubFolders}`);
                             assert.strictEqual(numDocuments, 3 , `Incorrect number of expected documents: 3 vs ${numSubFolders}`);
                             done();
                        });
                    }
                });
            }).catch(done);
        });
    });

    it('responds to DELETE/id with an id of an existing folder which does not belong to the same client as the logged in user with 403', function() {
        //folder.clientId != user.clientId
         return db.get('folders').findOne({name: '2_0'}).then((folderOfUser2) => {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                var folderId = folderOfUser2._id.toString();
                return superTest(server).del(`/api/folders/${folderId}?token=${token}`).expect(403);
            });
        });
    });

    it('responds to DELETE/id with a correct id with 204 and deletes all contained folders, documents and their files and the relations of the documents to activities', function(done) {
        // Give us more time because this is a complex test
        this.timeout(30000);
        var folderName = '1_1_1';
        testHelpers.prepareRelations().then(testHelpers.prepareDocumentFiles).then(() => { // Relations and document files are needed only in this test
            // Retrieve the relations for all documents
            db.get('documents').find({ name: { $regex: '^' + folderName + '_' } }, '_id clientId').then((relevantDocuments) => {
                var documentIds = relevantDocuments.map((doc) => doc._id);
                db.get('relations').find({ $or: [ { type1: 'documents', id1: { $in: documentIds } }, { type2: 'documents', id2: { $in: documentIds } } ] }, '_id').then((relations) => {
                    var relationIds = relations.map((relation) => relation._id);
                    // Now get the folder from the database and perform the deletion, WARNING: Here comes the callback hell :)
                    db.get('folders').findOne({name: folderName}, '_id').then((folderFromDatabase) => {
                        testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                            var folderId = folderFromDatabase._id;
                            // Trigger deletion
                            superTest(server).del(`/api/folders/${folderId}?token=${token}`).expect(204).end((err, res) => {
                                if (err) return done(err);
                                // Check whether the folder itself and the subfolders were deleted by filtering by their names
                                db.get('folders').count({ name: { $regex: '^' + folderName } }).then((folderCount) => {
                                    assert.equal(folderCount, 0, 'Not all folders of the deleted folder were also deleted');
                                    // Check whether documents were deleted by filtering by their names, but here with '_' otherwise the document with the same name as the folder would also be checked
                                    db.get('documents').count({ name: { $regex: '^' + folderName + '_' } }).then((documentCount) => {
                                        assert.equal(documentCount, 0, 'Not all documents and subdocuments of the deleted folder were also deleted');
                                        // And at least check the relations
                                        db.get('relations').count({ _id: { $in: relationIds } }).then((relationCount) => {
                                            assert.equal(relationCount, 0, 'Not all relations of the deleted folder were also deleted');
                                            // But there must still be other relations
                                            db.get('relations').count().then((otherRelationCount) => {
                                                assert.notEqual(otherRelationCount, 0, 'The other relations were also deleted');
                                                // Finally check whether all files were removed
                                                relevantDocuments.forEach((document) => {
                                                    var path = testHelpers.getDocumentPath(document);
                                                    assert.ok(!fs.existsSync(path), `Document file ${path} still exists after deletion`);
                                                });
                                                done();
                                            }).catch(done); // Must be at each level where an assertion is made
                                        }).catch(done);
                                    }).catch(done);
                                }).catch(done);
                            });
                        });
                    });
                });
            });
        });
    });

    it('responds to DELETE/id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('folders').findOne({ name : '1_0' }).then((folderFromDatabase) => {
            return testHelpers.removeClientModule('1', 'documents').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return superTest(server).del(`/api/folders/${folderFromDatabase._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('folders').findOne({ name : '1_0' }).then((folderFromDatabase) => {
            return testHelpers.removeClientModule('1', 'documents').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                    return superTest(server).del(`/api/folders/${folderFromDatabase._id}?token=${token}`).expect(403);
                });
            });
        });
    });

});
