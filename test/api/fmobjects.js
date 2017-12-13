/**
 * UNIT Tests for api/fmobjects
 */
var assert = require('assert');
var fs = require('fs');
var newFMobject = {name: 'someName'};
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');

describe('API fmobjects', function() {
    
    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions)
            .then(th.prepareFmObjects)
            .then(th.prepareFolders)
            .then(th.prepareDocuments)
            .then(th.prepareActivities)
            .then(th.prepareRelations);
    });

    describe('GET/', function() {

        // Negative tests

        it('responds without authentication with 403', function() {
            return th.get('/api/fmobjects').expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'fmobjects').then(function(){
                return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    return th.get(`/api/fmobjects?token=${token}`).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'fmobjects').then(function(){
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                    return th.get(`/api/fmobjects?token=${token}`).expect(403);
                });
            });
        });

        it('responds without read permission with 403', function() {
            // Remove the corresponding permission
            return th.removeReadPermission('1_0_0', 'PERMISSION_BIM_FMOBJECT').then(function() {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return th.get('/api/fmobjects?token=' + token).expect(403);
                });
            });
        });

        function makeHierarchy(fmObjects) {
            var dict = { 'root' : { children: [] } };
            // Nachschalgewerk erstellen
            fmObjects.forEach(function(fmObject) {
                dict[fmObject._id] = fmObject;
                fmObject.children = []; // Kinder vorbereiten
            });
            // Kinder zuordnen
            fmObjects.forEach(function(fmObject) {
                var parentId = fmObject.parentId ? fmObject.parentId : 'root';
                dict[parentId].children.push(fmObject);
            });
            // Kinder sortieren
            fmObjects.forEach(function(fmObject) {
                fmObject.children.sort((a, b) => a.name.localeCompare(b.name));
            });
            return dict['root'];
        }

        it('returns a hierarchy of FM objects which are ordered by their names', function() {
            var fmObjectsFromDatabase, clientFromDatabae;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.get(`/api/${co.apis.fmobjects}?token=${token}`).expect(200);
            }).then(function(response) {
                var fmObjectsFromApi = response.body;
                // Check hierarchy hardcoded
                assert.strictEqual(fmObjectsFromApi.length, 2);
                assert.strictEqual(fmObjectsFromApi[0].name, '1_0');
                assert.strictEqual(fmObjectsFromApi[0].type, 'Projekt');
                assert.strictEqual(fmObjectsFromApi[0].children.length, 2);
                assert.strictEqual(fmObjectsFromApi[0].children[0].name, '1_0_0');
                assert.strictEqual(fmObjectsFromApi[0].children[0].type, 'Etage');
                assert.strictEqual(fmObjectsFromApi[0].children[0].children.length, 0);
                assert.strictEqual(fmObjectsFromApi[0].children[1].name, '1_0_1');
                assert.strictEqual(fmObjectsFromApi[0].children[1].type, 'Raum');
                assert.strictEqual(fmObjectsFromApi[0].children[1].children.length, 0);
                assert.strictEqual(fmObjectsFromApi[1].name, '1_1');
                assert.strictEqual(fmObjectsFromApi[1].type, 'Gebäude');
                assert.strictEqual(fmObjectsFromApi[1].children.length, 2);
                assert.strictEqual(fmObjectsFromApi[1].children[0].name, '1_1_0');
                assert.strictEqual(fmObjectsFromApi[1].children[0].type, 'Etage');
                assert.strictEqual(fmObjectsFromApi[1].children[0].children.length, 0);
                assert.strictEqual(fmObjectsFromApi[1].children[1].name, '1_1_1');
                assert.strictEqual(fmObjectsFromApi[1].children[1].type, 'Raum');
                assert.strictEqual(fmObjectsFromApi[1].children[1].children.length, 0);
            });
        });

    });

    describe('GET/forIds', function() {

        function createTestFmObjects() {
            return db.get(co.collections.clients.name).findOne({name:th.defaults.client}).then(function(client) {
                var clientId = client._id;
                var testObjects = ['testFmObject1', 'testFmObject2', 'testFmObject3'].map(function(name) {
                    return {
                        name: name,
                        type: 'Projekt',
                        clientId: clientId,
                        parentId: null
                    }
                });
                return Promise.resolve(testObjects);
            });
        }

        th.apiTests.getForIds.defaultNegative(co.apis.fmobjects, co.permissions.BIM_FMOBJECT, co.collections.fmobjects.name, createTestFmObjects);
        th.apiTests.getForIds.clientDependentNegative(co.apis.fmobjects, co.collections.fmobjects.name, createTestFmObjects);
        th.apiTests.getForIds.defaultPositive(co.apis.fmobjects, co.collections.fmobjects.name, createTestFmObjects);

        it('returns the path to the root for every obtained FM object', function() {
            var ids;
            return db.get(co.collections.fmobjects.name).findOne({name:'1_0_1'}).then(function(fmObject) {
                return db.get(co.collections.fmobjects.name).insert({ name: 'L2FMO', type: 'Raum', parentId: fmObject._id, clientId: fmObject.clientId });
            }).then(function() {
                return db.get(co.collections.fmobjects.name).find({$or:[ {name:'1_0'}, {name:'1_1_0'}, {name:'L2FMO'} ]});
            }).then(function(fmObjects) {
                ids = fmObjects.map(function(fmobject) { return fmobject._id.toString() });
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then((token) => {
                return th.get(`/api/${co.apis.fmobjects}/forIds?ids=${ids.join(',')}&token=${token}`).expect(200);
            }).then(function(response) {
                var fmObjectsFromApi = response.body;
                // Check hierarchy hardcoded
                assert.strictEqual(fmObjectsFromApi.length, 3);
                assert.strictEqual(fmObjectsFromApi[0].name, '1_0');
                assert.strictEqual(fmObjectsFromApi[0].type, 'Projekt');
                assert.strictEqual(fmObjectsFromApi[0].path.length, 0);
                assert.strictEqual(fmObjectsFromApi[1].name, '1_1_0');
                assert.strictEqual(fmObjectsFromApi[1].type, 'Etage');
                assert.strictEqual(fmObjectsFromApi[1].path.length, 1);
                assert.strictEqual(fmObjectsFromApi[1].path[0].name, '1_1');
                assert.strictEqual(fmObjectsFromApi[2].name, 'L2FMO');
                assert.strictEqual(fmObjectsFromApi[2].type, 'Raum');
                assert.strictEqual(fmObjectsFromApi[2].path.length, 2);
                assert.strictEqual(fmObjectsFromApi[2].path[0].name, '1_0');
                assert.strictEqual(fmObjectsFromApi[2].path[1].name, '1_0_1');
                return Promise.resolve();
            });
        });

    });

    describe('GET/:id', function() {

        // Negative tests

        it('responds without authentication with 403', function() {
            return db.get('fmobjects').findOne({type: 'Projekt'}).then(function(fmobjectFromDB){
                return th.get(`/api/fmobjects/${fmobjectFromDB._id}`).expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'fmobjects').then(function(){
                return db.get('fmobjects').findOne({type: 'Projekt'}).then(function(fmobjectFromDB){
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return th.get(`/api/fmobjects/${fmobjectFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'fmobjects').then(function(){
                return db.get('fmobjects').findOne({type: 'Projekt'}).then(function(fmobjectFromDB){
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                        return th.get(`/api/fmobjects/${fmobjectFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds without read permission with 403', function() {
            return th.removeReadPermission('1_0_0', 'PERMISSION_BIM_FMOBJECT').then(function(){
                return db.get('fmobjects').findOne({type: 'Projekt'}).then(function(fmobjectFromDB){
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return th.get(`/api/fmobjects/${fmobjectFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with invalid id with 400', function() {
            return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                var invalidID = 123; 
                return th.get(`/api/fmobjects/${invalidID}?token=${token}`).expect(400);
            });
        });

        it('responds with not existing id with 403', function() {
            return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return th.get(`/api/fmobjects/999999999999999999999999?token=${token}`).expect(403);
            });
        });

        it('responds with 403 when the FM object with the given _id does not belong to the client of the user', function() {
            return db.get('fmobjects').findOne({name: '1_0'}).then(function(fmobjectFromDB){
                return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                     return th.get(`/api/fmobjects/${fmobjectFromDB._id}?token=${token}`).expect(403);
                });
            });
        });

        // Positive tests

        it('returns the FM object with the given _id but without children', function(done) {
            db.get('fmobjects').findOne({ name : '1_0' }).then((fmobjectFromDatabase) => {
                th.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                    var keys = Object.keys(fmobjectFromDatabase); // Include _id every time because it is returned by the API in every case!
                    th.get(`/api/fmobjects/${fmobjectFromDatabase._id}?token=${token}`).expect(200).end(function(err, res) {
                        if (err) {
                            done(err);
                            return;
                        }
                        var fmobjectFromApi = res.body;
                        var keyCountFromApi = Object.keys(fmobjectFromApi).length;
                        var keyCountFromDatabase = keys.length;
                        assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of fmobject ${fmobjectFromApi._id} differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                        keys.forEach((key) => {
                            var valueFromDatabase = fmobjectFromDatabase[key].toString(); // Compare on a string basis because the API returns strings only
                            var valueFromApi = fmobjectFromApi[key].toString();
                            assert.strictEqual(valueFromApi, valueFromDatabase, `${key} of fmobject ${fmobjectFromApi._id} differs (${valueFromApi} from API, ${valueFromDatabase} in database)`);
                        });
                        done();
                    });
                });
            });
        });

        it('Contains the full path in correct order', function() {
            // We use fmobject 1_0_0, so we have the path
            // 1_0  (or sth like test)
            var fmobjId;
            // First login
            return db.get(co.collections.fmobjects.name).findOne({name: '1_0_0'}).then(function(fmobjectFromDatabase){
                fmobjId = fmobjectFromDatabase._id;
                return th.doLoginAndGetToken('1_0_0', 'test');
            }).then(function(token){
                // Then fetch the fnobject from the API
                return th.get(`/api/fmobjects/${fmobjId}?token=${token}`).expect(200);
            }).then(function(response) {
                var fmobject = response.body;
                // Finally analyze the returned path (order, names)
                assert.ok(fmobject.path, 'Property path does not exist');
                assert.strictEqual(fmobject.path.length, 1);
                assert.strictEqual(fmobject.path[0].name, '1_0');
                return Promise.resolve();
            });
        });
    });

    describe('POST/', function() {

        function createPostTestFmObject() {
            var testObject = {
                name: 'newFmObject',
            };
            return Promise.resolve(testObject);
        }

        th.apiTests.post.defaultNegative(co.apis.fmobjects, co.permissions.BIM_FMOBJECT, createPostTestFmObject);
        th.apiTests.post.defaultPositive(co.apis.fmobjects, co.collections.fmobjects.name, createPostTestFmObject);

        it('responds with 400 when there is no FM object with the given parentId (when parentId is set)', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token){
                var newFMobject = {name: 'O1', parentId: '999999999999999999999999'};
                return th.post(`/api/${co.apis.fmobjects}?token=${token}`).send(newFMobject).expect(400);
            })
        });

        it('responds with correctly created FM object with given parent', function() {
            var parentFmObject, newFMobject = {name: 'O1' };
            return db.get(co.collections.clients.name).findOne({name:th.defaults.client}).then(function(client) {
                return db.get(co.collections.fmobjects.name).findOne({clientId:client._id});
            }).then(function(fmObject) {
                parentFmObject = fmObject;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token){
                newFMobject.parentId = parentFmObject._id.toString();
                return th.post(`/api/${co.apis.fmobjects}?token=${token}`).send(newFMobject).expect(200);
            }).then(function(response) {
                return db.get(co.collections.fmobjects.name).findOne(response.body._id);
            }).then(function(createdFmObject) {
                assert.ok(createdFmObject);
                assert.strictEqual(createdFmObject.name, newFMobject.name);
                assert.strictEqual(createdFmObject.parentId.toString(), newFMobject.parentId);
                return Promise.resolve();
            });
        });

        it('Converts a given previewImageId into an ObjectId', async function() {
            var document = await db.get(co.collections.documents.name).findOne({name:'1_0_0'});
            var token = await th.defaults.login();
            var newFMobject = { name: 'O1', previewImageId:document._id.toString() };
            var fmObjectFromApi = (await th.post(`/api/${co.apis.fmobjects}?token=${token}`).send(newFMobject).expect(200)).body;
            var fmObjectFromDatabase = await db.get(co.collections.fmobjects.name).findOne(fmObjectFromApi._id);
            assert.strictEqual(typeof(fmObjectFromDatabase.previewImageId), 'object');
        });

    });

    describe('PUT/:id', function() {

        function createPutTestFmObject() {
            return db.get(co.collections.clients.name).findOne({name:th.defaults.client}).then(function(client) {
                return db.get(co.collections.fmobjects.name).insert({name:'newFmObject', clientId:client._id});
            }).then(function(fmObject) {
                return Promise.resolve(fmObject);
            });
        }

        th.apiTests.put.defaultNegative(co.apis.fmobjects, co.permissions.BIM_FMOBJECT, createPutTestFmObject);
        th.apiTests.put.clientDependentNegative(co.apis.fmobjects, createPutTestFmObject);

        it('responds with 400 when there is no FM object with the given new parentId (when parentId is changed)', function() {
            var fmObjectFromDB;
            return db.get(co.collections.fmobjects.name).findOne({name: '1_0'}).then(function(fmObject){
                fmObjectFromDB = fmObject;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token){
                var updatedFMobject = {name: 'newFMobj', parentId: '999999999999999999999999' };
                return th.put(`/api/${co.apis.fmobjects}/${fmObjectFromDB._id.toString()}?token=${token}`).send(updatedFMobject).expect(400);
           });
        });

        it('responds with correctly updated FM object', function() {
            var fmObjectFromDatabase, newParentFmObject, updatedFmObject;
            return db.get(co.collections.clients.name).findOne({name:th.defaults.client}).then(function(client) {
                return db.get(co.collections.fmobjects.name).findOne({clientId:client._id});
            }).then(function(fmObject) {
                newParentFmObject = fmObject;
                return createPutTestFmObject();
            }).then(function(fmObject) {
                updatedFmObject = {name: 'updatedName', parentId: newParentFmObject._id.toString() };
                fmObjectFromDatabase = fmObject;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.put(`/api/${co.apis.fmobjects}/${fmObjectFromDatabase._id.toString()}?token=${token}`).send(updatedFmObject).expect(200);
            }).then(function(response) {
                var fmObjectFromApi = response.body;
                assert.strictEqual(fmObjectFromApi.name, updatedFmObject.name);
                assert.strictEqual(fmObjectFromApi.parentId, updatedFmObject.parentId.toString());
                return Promise.resolve();
            });
        });

        it('Converts a given previewImageId into an ObjectId', async function() {
            var document = await db.get(co.collections.documents.name).findOne({name:'1_0_0'});
            var token = await th.defaults.login();
            var fmObjectFromDatabaseBeforeUpdate = await db.get(co.collections.fmobjects.name).findOne({name:'1_0_0'});
            var updatedFmObject = { previewImageId:document._id.toString() };
            await th.put(`/api/${co.apis.fmobjects}/${fmObjectFromDatabaseBeforeUpdate._id}?token=${token}`).send(updatedFmObject).expect(200);
            var fmObjectFromDatabaseAfterUpdate = await db.get(co.collections.fmobjects.name).findOne(fmObjectFromDatabaseBeforeUpdate._id);
            assert.strictEqual(typeof(fmObjectFromDatabaseAfterUpdate.previewImageId), 'object');
        });
            
    });

    describe('DELETE/:id', function() {

        function getDeleteFmObjectId() {
            return db.get(co.collections.clients.name).findOne({name:th.defaults.client}).then(function(client) {
                var fmObject = {
                    name: 'newFmObjectToDelete',
                    clientId: client._id,
                    parentId: null
                }
                return db.get(co.collections.fmobjects.name).insert(fmObject);
            }).then(function(insertedFmObject) {
                return th.createRelationsToUser(co.collections.fmobjects.name, insertedFmObject);
            }).then(function(insertedFmObject) {
                return Promise.resolve(insertedFmObject._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.fmobjects, co.permissions.BIM_FMOBJECT, getDeleteFmObjectId);
        th.apiTests.delete.clientDependentNegative(co.apis.fmobjects, getDeleteFmObjectId);
        th.apiTests.delete.defaultPositive(co.apis.fmobjects, co.collections.fmobjects.name, getDeleteFmObjectId);

        // Positive tests

        it('responds with 204 and deletes the FM object itself and all subelements of the FM object', function() {
            var fmobjectFromDB;
            return db.get('fmobjects').findOne({name: '1_0'}).then(function(fmo){
                fmobjectFromDB = fmo;
                return th.doLoginAndGetToken('1_0_0', 'test');
            }).then(function(token){
                return th.del(`/api/fmobjects/${fmobjectFromDB._id}?token=${token}`).expect(204);
            }).then(function(){
                return db.get('fmobjects').findOne({_id: fmobjectFromDB._id});
            }).then((stillExisting) => {
                assert.ok(!stillExisting, 'portal has not been deleted from database');
                return Promise.resolve();
            });
        });

    });

});
