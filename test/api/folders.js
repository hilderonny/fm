/**
 * UNIT Tests for api/folders
 */
var assert = require('assert');
var fs = require('fs');
var documentsHelper = require('../../utils/documentsHelper');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');

// xdescribe and xit are used for test stubs which should not run now and are to be implemented later
describe('API folders', function() {
    
    // Clear and prepare database with clients, user groups and users
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
            .then(th.prepareRelations);
    });

    // Delete temporary documents
    afterEach(() => {
        return th.removeDocumentFiles()
    });

    describe('GET/', function() {

        // Negative tests

        it('responds without authentication with 403', function() {
            return th.get('/api/folders').expect(403);
        });

        it('responds without read permission with 403', function() {
            // Remove the corresponding permission
            return th.removeReadPermission('1_0_0', 'PERMISSION_OFFICE_DOCUMENT').then(() => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return th.get(`/api/folders?token=${token}`).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'documents').then(function() {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return th.get(`/api/folders?token=${token}`).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'documents').then(function() {
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                    return th.get(`/api/folders?token=${token}`).expect(403);
                });
            });
        });

        // Positive tests

        it('responds with object containing all folders and documents (and their details) which have no parent folder', function(done) {
            //user belonging to client 1 has 2 folders with 2 documents each
            th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                db.get('clients').findOne({name: '1'}).then((clientFromDatabase) =>{
                    th.get(`/api/folders?token=${token}`).expect(200).end(function(err, res){
                        if (err) {
                            done(err);
                            return;
                        }
                        var rootFolder = res.body;
                        var rootFolderFolders = rootFolder.folders;
                        var rootFolderDocuments = rootFolder.documents;
                        var clientId = clientFromDatabase._id;
                        assert.strictEqual(2, rootFolderFolders.length, 'Expected number of folders in the root is wrong');
                        assert.strictEqual(2, rootFolderDocuments.length, 'Expected number of documents in the root is wrong');
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

        it('responds with object containing empty folders array when no folders exist', function(done) {
            // First we need to delete all folders from the test preparations
            db.get('folders').remove().then(() => {
                th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    th.get(`/api/folders?token=${token}`).expect(200).end(function(err, res){
                        if (err) return done(err);
                        var resultFromApi = res.body;
                        //check for empty folders array
                        assert.strictEqual(0, Object.keys(resultFromApi.folders).length, 'Unexpected content');
                        done();
                    });
                }).catch(done);
            });
        });

        it('responds with object containing empty documents array when no documents exist', function(done) {
            // First we need to delete all documents from the test preparations
            db.get('documents').remove().then(() => {
                th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    th.get(`/api/folders?token=${token}`).expect(200).end(function(err, res){
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

    });

    describe('GET/allFoldersAndDocuments', function() {

        var api = `${co.apis.folders}/allFoldersAndDocuments`;

        function createTestFolders() {
            return db.get(co.collections.clients.name).findOne({name:th.defaults.client}).then(function(client) {
                var clientId = client._id;
                var testObjects = ['testFolder1', 'testFolder2', 'testFolder3'].map(function(name) {
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

        th.apiTests.get.defaultNegative(api, co.permissions.OFFICE_DOCUMENT, co.collections.folders.name, createTestFolders);

        it('returns a hierarchy of all folders and documents available to the user\'s client', function() {
            var client, documentsFromDatabase, foldersFromDatabase;
            return db.get(co.collections.clients.name).findOne({name:'1'}).then(function(c) {
                client = c;
                return db.get(co.collections.documents.name).find({clientId:client._id});
            }).then(function(documents) {
                documentsFromDatabase = documents;
                return db.get(co.collections.folders.name).find({clientId:client._id});
            }).then(function(folders) {
                foldersFromDatabase = folders;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${api}?token=${token}`).expect(200);
            }).then(function(response) {
                var hierarchyFromApi = response.body;
                assert.equal(hierarchyFromApi.length, documentsFromDatabase.length + foldersFromDatabase.length);
                var idMap = {};
                hierarchyFromApi.forEach(function(element) {
                    idMap[element._id] = element;
                });
                documentsFromDatabase.forEach(function(document) {
                    var id = document._id.toString();
                    assert.ok(idMap[document._id]);
                    delete idMap[document._id];
                });
                foldersFromDatabase.forEach(function(folder) {
                    var id = folder._id.toString();
                    assert.ok(idMap[folder._id]);
                    delete idMap[folder._id];
                });
                assert.equal(Object.keys(idMap).length, 0);
            });
        });

    });

    describe('GET/forIds', function() {

        function createTestFolders() {
            return db.get(co.collections.clients.name).findOne({name:th.defaults.client}).then(function(client) {
                var clientId = client._id;
                var testObjects = ['testFolder1', 'testFolder2', 'testFolder3'].map(function(name) {
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

        th.apiTests.getForIds.defaultNegative(co.apis.folders, co.permissions.OFFICE_DOCUMENT, co.collections.folders.name, createTestFolders);
        th.apiTests.getForIds.clientDependentNegative(co.apis.folders, co.collections.folders.name, createTestFolders);
        th.apiTests.getForIds.defaultPositive(co.apis.folders, co.collections.folders.name, createTestFolders);

        function checkPath(folder, folders) {
            assert.ok(folder.path);
            var parentFolders = [];
            var parentFolderId = folder.parentFolderId;
            while (parentFolderId) {
                var parentFolder = folders[parentFolderId];
                // Reihenfolge von API ist umgekehrt, daher vorn dran hängen
                parentFolders.unshift(parentFolder);
                parentFolderId = parentFolder.parentFolderId;
            }
            assert.strictEqual(folder.path.length, parentFolders.length);
            for (var i = 0; i < parentFolders.length; i++) {
                assert.strictEqual(folder.path[i]._id.toString(), parentFolders[i]._id.toString());
                assert.strictEqual(folder.path[i].name, parentFolders[i].name);
            }
        }

        it('returns the full path for each folder', function() {
            var foldersInDatabase = th.dbObjects[co.collections.folders.name];
            var ids = foldersInDatabase.map(function(doc) { return doc._id.toString() });
            return db.get(co.collections.folders.name).find().then(function(folders) {
                folders.forEach(function(folder) {
                    foldersInDatabase[folder._id] = folder;
                });
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then((token) => {
                return th.get(`/api/${co.apis.folders}/forIds?ids=${ids.join(',')}&token=${token}`).expect(200);
            }).then(function(response) {
                var foldersFromApi = response.body;
                foldersFromApi.forEach(function(folderFromApi) {
                    checkPath(folderFromApi, foldersInDatabase);
                });
                return Promise.resolve();
            });
        });

    });

    describe('GET/:id', function() {

        // Negative tests

        it('responds without authentication with 403', function() {
            return db.get('folders').findOne({name: '0_0'}).then((folderFromDatabase) => {
                return th.get(`/api/folders/${folderFromDatabase._id}`).expect(403);
            });
        });

        it('responds without read permission with 403', function() {
            // Remove the corresponding permission
            return th.removeReadPermission('1_0_0', 'PERMISSION_OFFICE_DOCUMENT').then(() => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return db.get('folders').findOne({name: '1_0'}).then((folderFromDatabase) =>{
                        var folderId = folderFromDatabase._id.toString(); 
                        return th.get(`/api/folders/${folderId}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with invalid id with 400', function() {
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                return th.get(`/api/folders/InvalidId?token=${token}`).expect(400);
            });
        });

        it('responds with not existing folder id with 403', function() {
            // Here the validateSameClientId comes into the game and returns a 403 because the requested folder is
            // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                return th.get(`/api/folders/999999999999999999999999?token=${token}`).expect(403);
            });
        });
    
        it('responds with an id of an existing folder which does not belong to the same client as the logged in user with 403', function() {
            //folder.clientId != user.clientId
            //logg-in as user for client 1, but ask for folder of client 2 
            return db.get('folders').findOne({name: '0_0'}).then((folderOfUser2) => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var folderId = folderOfUser2._id.toString();
                    return th.get(`/api/folders/${folderId}?token=${token}`).expect(403);
                });
            });        
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('folders').findOne({name: '1_0'}).then((folderOfUser) => {
                return th.removeClientModule('1', 'documents').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var folderId = folderOfUser._id.toString();
                        return th.get(`/api/folders/${folderId}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('folders').findOne({name: '1_0'}).then((folderOfUser) => {
                return th.removeClientModule('1', 'documents').then(function() {
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        var folderId = folderOfUser._id.toString();
                        return th.get(`/api/folders/${folderId}?token=${token}`).expect(403);
                    });
                });
            });
        });

        // Positive tests

        it('responds with existing folder id with all details of the folder and its subfolders and documents', function(done) {
            //Note: delivered subfolders are from one lever below the current folder
            //The actual complete folder structure can be deeper  
            db.get('folders').findOne({name: '1_0_0'}).then((folderFromDatabase)=>{ 
                th.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                    var id = folderFromDatabase._id.toString();
                    th.get(`/api/folders/${id}?token=${token}`).expect(200).end(function(err, res){
                        if (err) {
                                done(err);
                                return;
                                }
                        var resultFromApi = res.body;
                        var numberOfDucments = 2; //number of documents contained in the current folder
                        var numDocumentsFromApi = resultFromApi.documents.length;
                        var numberOfSubfolders = 2; //number of subfolders one level below current folder 
                        var numSubfoldersFromApi = resultFromApi.folders.length;
                        assert.strictEqual(numberOfDucments, numDocumentsFromApi, `folder does not contian the expected number of documents`);
                        assert.strictEqual(numberOfSubfolders, numSubfoldersFromApi, `folder does not contian the expected number of subfolders`);
                        done();
                    });
                }).catch(done);
            });
        });

    });

    describe('POST/', function() {

        // Negative tests

        it('responds without authentication with 403', function() {
            return th.post('/api/folders').send({name: 'test_name'}).expect(403);
        });

        it('responds without write permission with 403', function() {
            // Remove the corresponding permission
            return th.removeWritePermission('1_0_0', 'PERMISSION_OFFICE_DOCUMENT').then(() => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var newFolder = { 
                        name: 'newName'
                    };
                    return th.post('/api/folders?token=' + token).send(newFolder).expect(403);
                });
            });
        });

        it('responds without giving a folder with 400', function() {
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                return th.post(`/api/folders?token=${token}`).send().expect(400);
            });
        });

        it('responds with correct folder with invalid parentFolderId with 400', function() {
            // parentFolderId = null means that the folder becomes a root folder
            return th.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                var newFolder = {name: 'test_folder', parentFolderId: '999999999999999999999999'};
                return th.post(`/api/folders?token=${token}`).send(newFolder).expect(400);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'documents').then(function() {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var newFolder = { 
                        name: 'newName'
                    };
                    return th.post('/api/folders?token=' + token).send(newFolder).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'documents').then(function() {
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                    var newFolder = { 
                        name: 'newName'
                    };
                    return th.post('/api/folders?token=' + token).send(newFolder).expect(403);
                });
            });
        });

        // Positive tests

        it('responds with correct folder data with inserted folder containing an _id field', function(done) {
            th.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                var newFolder = {name: 'test_folder'};
                th.post(`/api/folders?token=${token}`).send(newFolder).expect(200).end(function(err, res){
                    if (err) {
                        done(err);
                        return;
                    }
                    var resultFromApi = res.body;
                    db.get(`clients`).findOne({name: '1'}).then((clientFromDatabase) =>{
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

        it('responds with correct folder containing an _id with the inserted folder containing a generated _id', function(done) {
            // _id must not be settable on POST
            th.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                var newFolder = {name: 'test_folder', _id: '999999999999999999999999'};
                th.post(`/api/folders?token=${token}`).send(newFolder).expect(200).end(function(err, res){
                    if (err) {
                        done(err);
                        return;
                    }
                    var resultFromApi = res.body;
                    db.get(`clients`).findOne({name: '1'}).then((clientFromDatabase) =>{
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

        it('responds with correct folder containing a specific clientId with the inserted folder where the clientId is the one of the logged in user', function(done) {
            // clientId must not be settable on POST
            th.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                var newFolder = {name: 'test_folder', clientId: '999999999999999999999999'};
                th.post(`/api/folders?token=${token}`).send(newFolder).expect(200).end(function(err, res){
                    if (err) {
                                done(err);
                                return;
                            }
                    var resultFromApi = res.body;
                    db.get(`clients`).findOne({name: '1'}).then((clientFromDatabase) =>{
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

        it('responds with correct folder with no parentFolderId with the inserted folder and null as parentFolderId', function(done) {
            // parentFolderId = null means that the folder becomes a root folder
            th.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                var newFolder = {name: 'test_folder', parentFolderId: null};
                th.post(`/api/folders?token=${token}`).send(newFolder).expect(200).end(function(err, res){
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

        it('responds with correct folder with correct parentFolderId with the inserted folder and the ID of the parent folder as parentFolderId', function(done) {
            db.get('folders').findOne({name: '1_1_1'}).then((parentFolder) =>{
                th.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                    var newFolder = { name: 'test_folder', parentFolderId: parentFolder._id.toString() };
                    th.post(`/api/folders?token=${token}`).send(newFolder).expect(200).end(function(err, res){
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

    });

    describe('PUT/:id', function() {

        // Negative tests

        it('responds without authentication with 403', function() {
            return db.get('folders').findOne({name: '0_0'}).then((folderFromDatabase) => {
                var folderId = folderFromDatabase._id.toString();
                return th.put('/api/folders/'+ folderId).send().expect(403);
            });
        });

        it('responds without write permission with 403', function() {
            return db.get('folders').findOne({ name : '1_1' }).then((folderFromDatabase) => {
                // Remove the corresponding permission
                return th.removeWritePermission('1_0_0', 'PERMISSION_OFFICE_DOCUMENT').then(() => {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var updatedFolder = {
                            name: 'newName'
                        };
                        return th.put(`/api/folders/${folderFromDatabase._id}?token=${token}`).send(updatedFolder).expect(403);
                    });
                });
            });
        });

        it('responds with an invalid id with 400', function() {
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                return th.put(`/api/folders/InvalidId?token=${token}`).send({name: 'newFolderName'}).expect(400);
            });
        });

        it('responds with an id that does not exist with 403', function() {
            // Here the validateSameClientId comes into the game and returns a 403 because the requested folder is
            // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
            var updatedFolder = {
                name: 'newName'
            };
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return th.put(`/api/folders/999999999999999999999999?token=${token}`).send(updatedFolder).expect(403);
            });
        });

        it('responds without giving a folder with 400', function() {
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                return db.get('folders').findOne({name: '1_0'}).then((folderFromDatabase)=>{
                    var folderId = folderFromDatabase._id.toString();
                    return th.put(`/api/folders/${folderId}?token=${token}`).send().expect(400);
                });
            });
        });

        it('responds with an id of an existing folder which does not belong to the same client as the logged in user with 403', function() {
            //folder.clientId != user.clientId
            return db.get('folders').findOne({name: '0_0'}).then((folderOfUser2) => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var folderId = folderOfUser2._id.toString();
                    var updatedFolder = {name: 'new_folder_name'};
                    return th.put(`/api/folders/${folderId}?token=${token}`).send(updatedFolder).expect(403);
                });
            });
        });

        it('responds with correct folder with invalid new parentFolderId with 400', function() {
            return db.get('folders').findOne({name: '1_1'}).then((folderFromDatabase) => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var updatedFolder = { name: 'new_folder_name', parentFolderId: '999999999999999999999999' };
                    return th.put(`/api/folders/${folderFromDatabase._id}?token=${token}`).send(updatedFolder).expect(400);
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('folders').findOne({ name : '1_0' }).then((folderFromDatabase) => {
                return th.removeClientModule('1', 'documents').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var updatedFolder = {
                            name: 'newName'
                        };
                        return th.put(`/api/folders/${folderFromDatabase._id}?token=${token}`).send(updatedFolder).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('folders').findOne({ name : '1_0' }).then((folderFromDatabase) => {
                return th.removeClientModule('1', 'documents').then(function() {
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        var updatedFolder = {
                            name: 'newName'
                        };
                        return th.put(`/api/folders/${folderFromDatabase._id}?token=${token}`).send(updatedFolder).expect(403);
                    });
                });
            });
        });

        // Positive tests

        it('responds with a folder containing an _id field which differs from the id parameter with the updated folder and the original _id (_id cannot be changed)', function(done) {
            db.get('folders').findOne({name: '1_1'}).then(function(folderFromDatabase){
                th.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                    var updatedFolder = {name: '1_2', _id: '999999999999999999999999'};
                    var id = folderFromDatabase._id.toString();
                    th.put(`/api/folders/${id}?token=${token}`).send(updatedFolder).expect(200).end(function(err, res){
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

        it('responds with a folder containing a clientId field with a different client id with the updated folder and the original clientId (clientId cannot be changed)', function(done) {
            db.get('folders').findOne({name: '1_1'}).then((folderFromDatabase) =>{ //looking for the folder first to obtain a valid _id
                db.get('clients').findOne({name: '0'}).then((differentClientFromDB)=>{//then look for another cliet to use his/her _id as subsitute clientId
                    th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                        var folderId = folderFromDatabase._id;
                        var updatedFolder = {name: 'new_folder_name',
                                            clientId: differentClientFromDB._id} //try to substitute the exsiting clientId
                        th.put(`/api/folders/${folderId}?token=${token}`).send(updatedFolder).expect(200).end((err, res) =>{
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

        it('responds with a folder with the updated folder and its new properties', function(done) {
            db.get('folders').findOne({name: '1_1'}).then((folderFromDatabase) => {
                th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var updatedFolder = {name: 'new_folder_name'};
                    th.put(`/api/folders/${folderFromDatabase._id}?token=${token}`).send(updatedFolder).expect(200).end((err,res) =>{
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

        it('responds with correct folder without parentFolderId with updated folder and old parentFolderId', function(done) {
            db.get('folders').findOne({name: '1_1_1'}).then((folderFromDatabase) => {
                th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var updatedFolder = { name: 'new_folder_name' };
                    th.put(`/api/folders/${folderFromDatabase._id}?token=${token}`).send(updatedFolder).expect(200).end((err,res) =>{
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

        it('responds with correct folder containing null as parentFolderId with updated folder and null as parentFolderId', function(done) {
            // Move folder to root
            db.get('folders').findOne({name: '1_1_1'}).then((folderFromDatabase) => {
                th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var updatedFolder = { name: 'new_folder_name', parentFolderId: null };
                    th.put(`/api/folders/${folderFromDatabase._id}?token=${token}`).send(updatedFolder).expect(200).end((err,res) =>{
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

        it('responds with correct folder with correct new parentFolderId with the updated folder and the ID of the new parent folder as parentFolderId', function(done) {
            // Move between subfolders
            db.get('folders').findOne({name: '1_1'}).then((newParentFolder) => {
                var newParentFolderId = newParentFolder._id.toString();
                db.get('folders').findOne({name: '1_1_1'}).then((folderFromDatabase) => {
                    th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                        var updatedFolder = { name: 'new_folder_name', parentFolderId: newParentFolderId };
                        th.put(`/api/folders/${folderFromDatabase._id}?token=${token}`).send(updatedFolder).expect(200).end((err,res) =>{
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

    });

    describe('DELETE/:id', function() {

        function getDeleteFolderId() {
            return db.get(co.collections.clients.name).findOne({name:th.defaults.client}).then(function(client) {
                var folder = {
                    name: 'newFolderToDelete',
                    clientId: client._id,
                    parentFolderId: null
                }
                return db.get(co.collections.folders.name).insert(folder);
            }).then(function(folder) {
                return th.createRelationsToUser(co.collections.folders.name, folder);
            }).then(function(insertedFolder) {
                return Promise.resolve(insertedFolder._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.folders, co.permissions.OFFICE_DOCUMENT, getDeleteFolderId);
        th.apiTests.delete.clientDependentNegative(co.apis.folders, getDeleteFolderId);
        th.apiTests.delete.defaultPositive(co.apis.folders, co.collections.folders.name, getDeleteFolderId);

        // Positive tests

        it('responds with an id of an existing folder without deleting parent folder', function(){
            var folderId, parentId;
            return db.get('folders').findOne({name: '1_1_0_1'}).then(function(folderFromDatabase){
                folderId = folderFromDatabase._id;
                parentId = folderFromDatabase.parentFolderId;
                return th.doLoginAndGetToken('1_0_0', 'test');
            }).then(function(token){
                return th.del(`/api/folders/${folderId}?token=${token}`).expect(204);
            }).then(function(){
                //check if parent folder is still existing 
                return db.get('folders').findOne({_id: parentId});
            }).then(function(resultFromDatabase) {
                assert.strictEqual(resultFromDatabase.name, '1_1_0' , `Parent folder was deleted`);
                return Promise.resolve();
            });
        });

        it('responds with an id of an existing folder without deleting documents or sibling folders on the same level', function(){
            //Note: folder 1_1_1 had 2 sibling folders and 3 sibling documents; parent folder is 1_1
            var folderId, parentId, token;
            return db.get('folders').findOne({name: '1_1_1'}).then(function(folderFromDatabase){
                folderId = folderFromDatabase._id;
                parentId = folderFromDatabase.parentFolderId;
                return th.doLoginAndGetToken('1_0_0', 'test');
            }).then(function(tok){
                token = tok;
                return th.del(`/api/folders/${folderId}?token=${token}`).expect(204);
            }).then(function(){
                //check if siblings on the same level  still exist
                return th.get(`/api/folders/${parentId}?token=${token}`).expect(200);
            }).then(function(response){
                var numSubFolders = response.body.folders.length;
                var numDocuments = response.body.documents.length;
                assert.strictEqual(numSubFolders, 1 , `Incorrect number of expected folders: 1 vs ${numSubFolders}`);
                assert.strictEqual(numDocuments, 2 , `Incorrect number of expected documents: 2 vs ${numSubFolders}`);
                return Promise.resolve();
            });
        });

        it('responds with a correct id with 204 and deletes all contained folders, documents and their files', function() {
            // Give us more time because this is a complex test
            this.timeout(30000);
            var folderName = '1_1_1';
            var folderFromDatabase, relevantDocuments;
            return th.prepareDocumentFiles().then(() => {
                // Retrieve all contained documents for testing that their files are deleted
                return db.get('documents').find({ name: { $regex: '^' + folderName + '_' } }, '_id clientId');
            }).then((documents) => {
                relevantDocuments = documents;
                // Now get the folder from the database and perform the deletion, WARNING: Here comes the callback hell :)
                return db.get('folders').findOne({name: folderName}, '_id');
            }).then((folder) => {
                folderFromDatabase = folder;
                return th.doLoginAndGetToken('1_0_0', 'test');
            }).then((token) => {
                // Trigger deletion
                return th.del(`/api/folders/${folderFromDatabase._id.toString()}?token=${token}`).expect(204);
            }).then(function() {
                // Check whether the folder itself and the subfolders were deleted by filtering by their names
                return db.get('folders').count({ name: { $regex: '^' + folderName } });
            }).then((folderCount) => {
                assert.equal(folderCount, 0, 'Not all folders of the deleted folder were also deleted');
                // Check whether documents were deleted by filtering by their names, but here with '_' otherwise the document with the same name as the folder would also be checked
                return db.get('documents').count({ name: { $regex: '^' + folderName + '_' } });
            }).then((documentCount) => {
                assert.equal(documentCount, 0, 'Not all documents and subdocuments of the deleted folder were also deleted');
                // Retrieve all contained documents for testing that their files are deleted
                return db.get('documents').find({ name: { $regex: '^' + folderName + '_' } }, '_id clientId');
            }).then((relevantDocuments) => {
                // Finally check whether all files were removed
                relevantDocuments.forEach((document) => {
                    var path = documentsHelper.getDocumentPath(document._id);
                    assert.ok(!fs.existsSync(path), `Document file ${path} still exists after deletion`);
                });
                return Promise.resolve();
            });
        });

    });

});
