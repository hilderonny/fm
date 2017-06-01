/**
 * UNIT Tests for api/fmobjects
 */
var assert = require('assert');
var fs = require('fs');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');
var async = require('async');
var newFMobject = {name: 'someName'};

describe('API fmobjects', function() {

    var server = require('../../app');
    
    beforeEach(() => {
        return testHelpers.cleanDatabase()
            .then(testHelpers.prepareClients)
            .then(testHelpers.prepareClientModules)
            .then(testHelpers.prepareUserGroups)
            .then(testHelpers.prepareUsers)
            .then(testHelpers.preparePermissions)
            .then(testHelpers.prepareFmObjects)
            .then(testHelpers.prepareFolders)
            .then(testHelpers.prepareDocuments)
            .then(testHelpers.prepareActivities)
            .then(testHelpers.prepareRelations);
    });

    describe('GET/', function() {

        // Negative tests

        it('responds without authentication with 403', function() {
            return superTest(server).get('/api/fmobjects').expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return testHelpers.removeClientModule('1', 'fmobjects').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    return superTest(server).get(`/api/fmobjects?token=${token}`).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return testHelpers.removeClientModule('1', 'fmobjects').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                    return superTest(server).get(`/api/fmobjects?token=${token}`).expect(403);
                });
            });
        });

        it('responds without read permission with 403', function() {
            // Remove the corresponding permission
            return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_BIM_FMOBJECT').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return superTest(server).get('/api/fmobjects?token=' + token).expect(403);
                });
            });
        });

        // Positive tests

        //TODO: API doesn't send back full hierarchy of FM objects
        //problem maybe commes from line 45: fmobject coulf have no parentId, but it can still have children 
        /*
        RH: No, the API returns all FM objects but in a hierarchy. The top level (fmobjectsFromApi)
        contains only two root elements but these root elements contain further elements.
        The request to the database returns all elements, even non-root elements. But you need to compare
        only the two root elements 1_0 and 1_1.
        */
        it.skip('returns a hierarchy of FM objects which are ordered by their names', function(done) {
            db.get('clients').findOne({name: '1'}).then(function(client1FromDB){
                db.get('fmobjects').find({clientId: client1FromDB._id}).then(function(fmobjectsFromDB){
                    testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                        superTest(server).get(`/api/fmobjects?token=${token}`).expect(200).end(function(err, res){
                            if (err) {
                                    done(err);
                                    return;
                                }
                            var fmobjectsFromApi = res.body; 
                            console.log(fmobjectsFromApi);
                            console.log(fmobjectsFromDB);
                            assert.strictEqual(fmobjectsFromDB.length, fmobjectsFromApi.length, 'Number of retrieved fmobjects does not match number of expected fmobjects');
                            done();
                        });
                    }).catch(done);
                });
            });
        });

    });

    describe('GET/forIds', function() {

        // Negative tests
        
        xit('responds without authentication with 403', function() {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        });

        xit('responds with empty list when user has no read permission', function() {
        });

        xit('responds with empty list when query parameter "ids" does not exist', function() {
        });

        xit('returns only elements of correct ids when parameter "ids" contains faulty IDs', function() {
        });

        xit('returns only elements of correct ids when parameter "ids" contains IDs where no entities exist for', function() {
        });

        xit('returns only elements of the client of the logged in user when "ids" contains IDs of entities of another client', function() {
        });

        // Positive tests

        xit('returns a list of FM objects with all details for the given IDs', function() {
        });
    });

    describe('GET/:id', function() {

        // Negative tests

        it('responds without authentication with 403', function() {
            return db.get('fmobjects').findOne({type: 'Projekt'}).then(function(fmobjectFromDB){
                return superTest(server).get(`/api/fmobjects/${fmobjectFromDB._id}`).expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return testHelpers.removeClientModule('1', 'fmobjects').then(function(){
                return db.get('fmobjects').findOne({type: 'Projekt'}).then(function(fmobjectFromDB){
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return superTest(server).get(`/api/fmobjects/${fmobjectFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return testHelpers.removeClientModule('1', 'fmobjects').then(function(){
                return db.get('fmobjects').findOne({type: 'Projekt'}).then(function(fmobjectFromDB){
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                        return superTest(server).get(`/api/fmobjects/${fmobjectFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds without read permission with 403', function() {
            return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_BIM_FMOBJECT').then(function(){
                return db.get('fmobjects').findOne({type: 'Projekt'}).then(function(fmobjectFromDB){
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return superTest(server).get(`/api/fmobjects/${fmobjectFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with invalid id with 400', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                var invalidID = 123; 
                return superTest(server).get(`/api/fmobjects/${invalidID}?token=${token}`).expect(400);
            });
        });

        it('responds with not existing id with 403', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return superTest(server).get(`/api/fmobjects/999999999999999999999999?token=${token}`).expect(403);
            });
        });

        it('responds with 403 when the FM object with the given _id does not belong to the client of the user', function() {
            return db.get('fmobjects').findOne({name: '1_0'}).then(function(fmobjectFromDB){
                return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                     return superTest(server).get(`/api/fmobjects/${fmobjectFromDB._id}?token=${token}`).expect(403);
                });
            });
        });

        // Positive tests

        it('returns the FM object with the given _id but without children', function(done) {
            db.get('fmobjects').findOne({ name : '1_0' }).then((fmobjectFromDatabase) => {
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                    var keys = Object.keys(fmobjectFromDatabase); // Include _id every time because it is returned by the API in every case!
                    superTest(server).get(`/api/fmobjects/${fmobjectFromDatabase._id}?token=${token}`).expect(200).end(function(err, res) {
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

    });

    describe('POST/', function() {

        // Negative tests

        it('responds without authentication with 403', function() {
            var newFMobject = {name: 'someName'};
            return superTest(server).post(`/api/fmobjects`).send(newFMobject).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return testHelpers.removeClientModule('1', 'fmobjects').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    return superTest(server).post(`/api/fmobjects?token=${token}`).send(newFMobject).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return testHelpers.removeClientModule('1', 'fmobjects').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                    return superTest(server).post(`/api/fmobjects?token=${token}`).send(newFMobject).expect(403);
                });
            });
        });
 
        it('responds without write permission with 403', function() {
            return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_BIM_FMOBJECT').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    return superTest(server).post(`/api/fmobjects?token=${token}`).send(newFMobject).expect(403);
                });
            })
        });

        it('responds with 400 when there is no FM object with the given parentId (when parentId is set)', function() {
            return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                var newFMobject = {name: 'O1', parentId: '999999999999999999999999'};
                return superTest(server).post(`/api/fmobjects?token=${token}`).send(newFMobject).expect(400);
            })
        });

        it('responds with 400 when sent FM object had no keys', function(){
            var FMobject = {};
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return superTest(server).post(`/api/fmobjects?token=${token}`).send(FMobject).expect(400);
            });
        });

        // Positive tests

        it('responds with an FM object where the path is set correctly', function(done) {
            db.get('fmobjects').findOne({name: '0_0'}).then(function(fmobjectFromDB){
                var parentId = fmobjectFromDB._id;
                testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                    var newFMobject = {type: 'Etage', parentId: parentId};
                    superTest(server).post(`/api/fmobjects?token=${token}`).send(newFMobject).expect(200).end(function(err,res){
                        if(err){
                            done(err);
                            return;
                        }
                        var fmobjectFromApi = res.body; 
                        assert.strictEqual(fmobjectFromApi.path , `,${parentId},`, 'Incorect path to newly created fmobject');
                       done();
                    });
                }).catch(done);
            });
        });

        it('responds with an FM object with "," as path when no parentId is given', function(done) {
            testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                var newFMobject = {name: 'newObject'};
                superTest(server).post(`/api/fmobjects?token=${token}`).send(newFMobject).expect(200).end(function(err,res){
                    if(err){
                        done(err);
                        return;
                    }
                    var fmobjectFromApi = res.body; 
                    assert.strictEqual(fmobjectFromApi.path , ',', 'Incorect path to newly created fmobject');
                    done();
                });
            }).catch(done);
        });

    });

    describe('PUT/:id', function() {

        // Negative tests

        it('responds without authentication with 403', function() {
            return db.get('fmobjects').findOne({type: 'Projekt'}).then(function(fmobjectFromDB){
                var updatedFMobject = {name: 'newFMobj'};
                return superTest(server).put(`/api/fmobjects/${fmobjectFromDB._id}`).send(updatedFMobject).expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('fmobjects').findOne({name: '1_0'}).then(function(fmobjectFromDB){
                return testHelpers.removeClientModule('1', 'fmobjects').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        var id = fmobjectFromDB._id;
                        return superTest(server).put(`/api/fmobjects/${id}?token=${token}`).send(newFMobject).expect(403);
                    });
                });
             });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('fmobjects').findOne({name: '1_0'}).then(function(fmobjectFromDB){
                return testHelpers.removeClientModule('1', 'fmobjects').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                        var id = fmobjectFromDB._id;
                        return superTest(server).put(`/api/fmobjects/${id}?token=${token}`).send(newFMobject).expect(403);
                    });
                });
            });
        });

        it('responds without write permission with 403', function() {
            return db.get('fmobjects').findOne({name: '1_0'}).then(function(fmobjectFromDB){
                return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_BIM_FMOBJECT').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        var updatedFMobject = {name: 'newFMobj'};
                        return superTest(server).put(`/api/fmobjects/${fmobjectFromDB._id}?toke=${token}`).send(updatedFMobject).expect(403);
                    });
                });  
            });
        });

        it('responds with an invalid id with 400', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                var updatedFMobject = {name: 'newFMobj'};
                var invalidID = 123;
                return superTest(server).put(`/api/fmobjects/${invalidID}?token=${token}`).send(updatedFMobject).expect(400);
            });
        });

        it('responds with an id that does not exist with 403', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                var id = '999999999999999999999999';
                var updatedFMobject = {name: 'newFMobj'};
                return superTest(server).put(`/api/fmobjects/${id}?token=${token}`).send(updatedFMobject).expect(403);
            });
        });

        it('responds without giving data with 400', function() {
            return db.get('fmobjects').findOne({name: '1_0'}).then(function(fmobjectFromDB){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    var id = fmobjectFromDB._id;
                    return superTest(server).put(`/api/fmobjects/${id}?token=${token}`).send().expect(400);
                });
            });
        });

        it('responds with entity with original _id when _id is given as parameter (_id cannot be changed)', function(done) {
            db.get('fmobjects').findOne({name: '0_0'}).then(function(fmobjectFromDB){
                testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                    var undatedFmobject = {type: 'Inventar', _id: '999999999999999999999999'};
                    superTest(server).put(`/api/fmobjects/${fmobjectFromDB._id}?token=${token}`).send(undatedFmobject).expect(200).end(function(err, res){
                        if (err) {
                            done(err);
                            return;
                        }
                        var fmobjectFromApi = res.body;
                        assert.strictEqual(fmobjectFromDB._id.toString(), fmobjectFromApi._id, '_id was changed');
                        done();
                    });
                }).catch(done);
            });
        });

        it('responds with entity with original clientId when clientId is given as parameter (clientId cannot be changed)', function(done) {
            db.get('fmobjects').findOne({name: '0_0'}).then(function(fmobjectFromDB){
                testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                    var undatedFmobject = {type: 'Inventar', clientId: '999999999999999999999999'};
                    superTest(server).put(`/api/fmobjects/${fmobjectFromDB._id}?token=${token}`).send(undatedFmobject).expect(200).end(function(err, res){
                        if (err) {
                            done(err);
                            return;
                        }
                        var fmobjectFromApi = res.body;
                        assert.strictEqual(fmobjectFromDB.clientId.toString(), fmobjectFromApi.clientId, 'clientId was changed');
                        done();
                    });
                }).catch(done);
            });
        });

        it('responds with entity with original path when path is given as parameter (path cannot be changed)', function(done) {
            db.get('fmobjects').findOne({name: '0_0'}).then(function(fmobjectFromDB){
                testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                    var undatedFmobject = {type: 'Inventar', path: 'newPath'};
                    superTest(server).put(`/api/fmobjects/${fmobjectFromDB._id}?token=${token}`).send(undatedFmobject).expect(200).end(function(err, res){
                        if (err) {
                            done(err);
                            return;
                        }
                        var fmobjectFromApi = res.body;
                        assert.strictEqual(fmobjectFromDB.path, fmobjectFromApi.path, 'path was changed');
                        done();
                    });
                }).catch(done);
            });
        });

        it('responds with 400 when there is no FM object with the given new parentId (when parentId is changed)', function() {
           return db.get('fmobjects').findOne({name: '1_0'}).then(function(fmobjectFromDB){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    var id = fmobjectFromDB._id;
                    var updatedFMobject = {name: 'newFMobj',
                                           parentId: '999999999999999999999999'};
                    return superTest(server).put(`/api/fmobjects/${id}?token=${token}`).send(updatedFMobject).expect(400);
                });
           });
        });

        it('responds with 403 when the FM object with the given _id does not belong to the client of the user', function() {
           return db.get('fmobjects').findOne({name: '0_0'}).then(function(fmobjectFromDB){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    var id = fmobjectFromDB._id;
                    var updatedFMobject = {name: 'newFMobj'};
                    return superTest(server).put(`/api/fmobjects/${id}?token=${token}`).send(updatedFMobject).expect(403);
                });
           });
        });

        // Positive tests

        it('responds with an updated FM object with the original path and parentId when parentId was not set in request', function(done) {
            db.get('fmobjects').findOne({name: '0_0'}).then(function(fmobjectFromDB){
                testHelpers.doLoginAndGetToken('0_1_0', 'test').then(function(token){
                    var updatedFMobject = {name: 'newName'};
                    superTest(server).put(`/api/fmobjects/${fmobjectFromDB._id}?token=${token}`).send(updatedFMobject).expect(200).end(function(err, res){
                    if(err){
                        done(err);
                        return;
                    }
                    done();
                    });
                }).catch(done);
            });
        });

        it('responds with an updated FM object with a new path and parentId when parentId was set to a new one', function(done) {
            db.get('fmobjects').findOne({name: '0_0'}).then(function(fmobject00FromDB){
                db.get('fmobjects').findOne({name: '0_1'}).then(function(fmobject01FromDB){
                    testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                        var updatedFMobject = {name: 'someName', parentId: fmobject00FromDB._id};
                        var id = fmobject01FromDB._id;
                        superTest(server).put(`/api/fmobjects/${id}?token=${token}`).send(updatedFMobject).expect(200).end(function(err, res){
                            if(err){
                                done(err);
                                return;
                            }
                            var undatedFmobjectFromApi = res.body;
                            assert.strictEqual(undatedFmobjectFromApi.parentId, fmobject00FromDB._id.toString(), 'parentId was not updated successfully');
                            assert.notStrictEqual(undatedFmobjectFromApi.path, fmobject01FromDB.path, 'path was not updated successfully');
                            done(); 
                        });
                    }).catch(done);
                });
            });
        });

        it('responds with an FM object with "," as path when parentId was set to null (move to root)', function(done) {
            db.get('fmobjects').findOne({name: '0_1_0'}).then(function(fmobjectFromDB){ //fmobject has parentId different form null
                testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                    var updatedFMobject = {parentId: null};
                    var id = fmobjectFromDB._id;
                    superTest(server).put(`/api/fmobjects/${id}?token=${token}`).send(updatedFMobject).expect(200).end(function(err, res){
                        if(err){
                            done(err);
                            return;
                        }
                        var undatedFmobjectFromApi = res.body;
                        assert.strictEqual(undatedFmobjectFromApi.path, ',', 'path was not updated successfully');
                        assert.notStrictEqual(undatedFmobjectFromApi.path, fmobjectFromDB.path, 'path was not updated successfully');
                        done(); 
                    });
                }).catch(done);
            });
        });

    });

    describe('DELETE/:id', function() {

        // Negative tests

        it('responds without authentication with 403', function() {
            return db.get('fmobjects').findOne({name: '1_0'}).then(function(fmobjectFromDB){
                return superTest(server).del(`/api/fmobjects/${fmobjectFromDB._id}`).expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return testHelpers.removeClientModule('1', 'fmobjects').then(function(){
                return db.get('fmobjects').findOne({name: '1_0'}).then(function(fmobjectFromDB){
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return superTest(server).del(`/api/fmobjects/${fmobjectFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return testHelpers.removeClientModule('1', 'fmobjects').then(function(){
                return db.get('fmobjects').findOne({name: '1_0'}).then(function(fmobjectFromDB){
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                        return superTest(server).del(`/api/fmobjects/${fmobjectFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds without write permission with 403', function() {
            return db.get('fmobjects').findOne({name: '1_0'}).then(function(fmobjectFromDB){
                return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_BIM_FMOBJECT').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return superTest(server).del(`/api/fmobjects/${fmobjectFromDB._id}?toke=${token}`).expect(403);
                    });
                });  
            });
        });

        it('responds with an invalid id with 400', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                var id = 123;
                return superTest(server).del(`/api/fmobjects/${id}?token=${token}`).expect(400);
            });   
        });

        it('responds with 403 when there is no entity for the given _id', function() {
            //use valid but not existing ID
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                 return superTest(server).del(`/api/fmobjects/999999999999999999999999?token=${token}`).expect(403);
            });
        });

        it('responds with 403 when the FM object with the given _id does not belong to the client of the user', function() {
            return db.get('fmobjects').findOne({name: '0_0'}).then(function(fmobjectFromDB){ //fmobject of client 0
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){ //user of client 1
                    return superTest(server).del(`/api/fmobjects/${fmobjectFromDB._id.toString()}?token=${token}`).expect(403);
                });
            });
        });

        // Positive tests

        it('responds with 204 and deletes the FM object itself and all subelements of the FM object', function(done) {
            db.get('fmobjects').findOne({name: '1_0'}).then(function(fmobjectFromDB){
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    superTest(server).del(`/api/fmobjects/${fmobjectFromDB._id}?token=${token}`).expect(204).end(function(err, res){
                        if(err){
                            done(err);
                            return;
                        }
                        db.get('fmobjects').findOne({_id: fmobjectFromDB._id}).then((stillExisting) => {
                            assert.ok(!stillExisting, 'portal has not been deleted from database');
                        });
                        done();
                    });
                }).catch(done);
            });
        });
    
        xit('All relations, where the element is the source (type1, id1), are also deleted', function() {
        });

        xit('All relations, where the element is the target (type2, id2), are also deleted', function() {
        });

    });

});
