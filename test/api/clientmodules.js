/**
 * UNIT Tests for api/clientmodules
 * @see http://softwareengineering.stackexchange.com/a/223376 for running async tasks in parallel
 */
var assert = require('assert');
var fs = require('fs');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');
var async = require('async');

describe('API clientmodules', function() {

    var server = require('../../app');
    
    // Clear and prepare database with clients, user groups and users
    beforeEach(() => {
        return testHelpers.cleanDatabase()
            .then(testHelpers.prepareClients)
            .then(testHelpers.prepareClientModules)
            .then(testHelpers.prepareUserGroups)
            .then(testHelpers.prepareUsers)
            .then(testHelpers.preparePermissions);
    });

    it('responds to GET/available/?clientId=... without authentication with 403', function() {
        return db.get('clients').findOne({name: '1'}).then((client) => {
            return superTest(server).get('/api/clientmodules/available?clientId=' + client._id.toString()).expect(403);
        });
    });

    it('responds to GET/available/?clientId=... when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('clients').findOne({name: '0'}).then(function(clientFromDB){
            return testHelpers.removeClientModule('1', 'clients').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    return superTest(server).get(`/api/clientmodules/available?clientId=${clientFromDB._id}&token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/available/?clientId=... when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('clients').findOne({name: '0'}).then(function(clientFromDB){
            return testHelpers.removeClientModule('1', 'clients').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                    return superTest(server).get(`/api/clientmodules/available?clientId=${clientFromDB._id}&token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/?clientId=... without authentication with 403', function() {
        return db.get('clients').findOne({name: '1'}).then((client) => {
            return superTest(server).get('/api/clientmodules?clientId=' + client._id.toString()).expect(403);
        });
    });

    it('responds to GET/?clientId=... when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('clients').findOne({name: '0'}).then(function(clientFromDatabase){
            return testHelpers.removeClientModule('1', 'clients').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    return superTest(server).get(`/api/clientmodules?clientId=${clientFromDatabase._id}&token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/?clientId=... when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('clients').findOne({name: '0'}).then(function(clientFromDatabase){
            return testHelpers.removeClientModule('1', 'clients').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                    return superTest(server).get(`/api/clientmodules?clientId=${clientFromDatabase._id}&token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/id without authentication with 403', function() {
        return db.get('clientmodules').findOne({module: 'activities'}).then((clientmodule) => {
            return superTest(server).get('/api/clientmodules/' + clientmodule._id.toString()).expect(403);
        });
    });

    it('responds to GET/id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
            return db.get('clientmodules').findOne({clientId: clientFromDatabase._id}).then(function(clientModuleFromDatabase){
                var id = clientModuleFromDatabase._id;
                return testHelpers.removeClientModule('1', 'clients').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return superTest(server).get(`/api/clientmodules/${id}?clientId=${clientFromDatabase._id}&token=${token}`).expect(403);
                    });
                });
            });
        }); 
    });

    it('responds to GET/id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
            return db.get('clientmodules').findOne({clientId: clientFromDatabase._id}).then(function(clientModuleFromDatabase){
                var id = clientModuleFromDatabase._id;
                return testHelpers.removeClientModule('1', 'clients').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                        return superTest(server).get(`/api/clientmodules/${id}?clientId=${clientFromDatabase._id}&token=${token}`).expect(403);
                    });
                });
            });
        }); 
    });

    it('responds to POST/ without authentication with 403', function() {
        return db.get('clients').findOne({name: '1'}).then((client) => {
            return superTest(server).post('/api/clientmodules')
                .send({
                    clientId: client._id.toString(),
                    module: 'clients'
                })
                .expect(403);
        });
    });

    it('responds to POST/ when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
            return testHelpers.removeClientModule('1', 'clients').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    var clientModule = {module: 'base', clientId: clientFromDatabase._id}
                    return superTest(server).post(`/api/clientmodules?token=${token}`).send(clientModule).expect(403);
                });
            });
        });
    });

    it('responds to POST/ when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
            return testHelpers.removeClientModule('1', 'clients').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                    var clientModule = {module: 'base', clientId: clientFromDatabase._id}
                    return superTest(server).post(`/api/clientmodules?token=${token}`).send(clientModule).expect(403);
                });
            });
        });
    });

    it('responds to PUT/id without authentication with 403', function() {
        return db.get('clientmodules').findOne({module: 'activities'}).then((clientmodule) => {
            return superTest(server).put('/api/clientmodules/' + clientmodule._id.toString())
                .send({
                    module: 'clients'
                })
                .expect(403);
        });
    });

    it('responds to PUT/id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
            var clientId = clientFromDatabase._id;
            return db.get('clientmodules').findOne({ module: 'documents', clientId:  clientId}).then((clientModuleFromDatabase) => {
                return testHelpers.removeClientModule('1', 'clients').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                        var id = clientModuleFromDatabase._id;
                        var updatedModule = {module: 'activities'}
                        return superTest(server).put(`/api/clientmodules/${id}?token=${token}`).send(updatedModule).expect(403);
                    });
                });
            });
        });
    });

    it('responds to PUT/id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
            var clientId = clientFromDatabase._id;
            return db.get('clientmodules').findOne({ module: 'documents', clientId:  clientId}).then((clientModuleFromDatabase) => {
                return testHelpers.removeClientModule('1', 'clients').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token) {
                        var id = clientModuleFromDatabase._id;
                        var updatedModule = {module: 'activities'}
                        return superTest(server).put(`/api/clientmodules/${id}?token=${token}`).send(updatedModule).expect(403);
                    });
                });
            });
        });
    });

    it('responds to DELETE/id without authentication with 403', function() {
        return db.get('clientmodules').findOne({module: 'activities'}).then((clientmodule) => {
            return superTest(server).del('/api/clientmodules/' + clientmodule._id.toString()).expect(403);
        });
    });

    it('responds to DELETE/id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
            var clientId = clientFromDatabase._id;
            return db.get('clientmodules').findOne({module: 'documents', clientId:  clientId}).then(function(clientModuleFromDatabase){
                return testHelpers.removeClientModule('1', 'clients').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        var id = clientModuleFromDatabase._id;
                        return superTest(server).del(`/api/clientmodules/${id}?token=${token}`).expect(403);
                    });
                });
             });
        });    
    });

    it('responds to DELETE/id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
            var clientId = clientFromDatabase._id;
            return db.get('clientmodules').findOne({module: 'documents', clientId:  clientId}).then(function(clientModuleFromDatabase){
                return testHelpers.removeClientModule('1', 'clients').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                        var id = clientModuleFromDatabase._id;
                        return superTest(server).del(`/api/clientmodules/${id}?token=${token}`).expect(403);
                    });
                });
             });
        });    
    });

    it('responds to GET/?clientId=... without read permission with 403', function() {
        return db.get('clients').findOne({name: '0'}).then(function(clientFromDatabase){
            // Remove the corresponding permission
            return testHelpers.removeReadPermission('_2_2', 'PERMISSION_ADMINISTRATION_CLIENT').then(function(){
                return testHelpers.doLoginAndGetToken('_2_2', 'test').then(function(token){
                    return superTest(server).get(`/api/clientmodules?clientId=${clientFromDatabase._id}&token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/id without read permission with 403', function() {
         return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
             return db.get('clientmodules').findOne({clientId: clientFromDatabase._id}).then(function(clientModuleFromDatabase){
                 var id = clientModuleFromDatabase._id;
                // Remove the corresponding permission
                return testHelpers.removeReadPermission('_0_2', 'PERMISSION_ADMINISTRATION_CLIENT').then(function(){
                    return testHelpers.doLoginAndGetToken('_0_2', 'test').then(function(token){
                        return superTest(server).get(`/api/clientmodules/${id}?clientId=${clientFromDatabase._id}&token=${token}`).expect(403);
                    });
                });
            });
        }); 
    });

    it('responds to GET/available/?clientId=... without read rights with 403', function(){
        return db.get('clients').findOne({name: '0'}).then(function(clientFromDB){
            // Remove the corresponding permission
            return testHelpers.removeReadPermission('_2_2', 'PERMISSION_ADMINISTRATION_CLIENT').then(function(){
                return testHelpers.doLoginAndGetToken('_2_2', 'test').then(function(token){
                    return superTest(server).get(`/api/clientmodules/available?clientId=${clientFromDB._id}&token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to POST/ without write permission with 403', function() {
        return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
            //Remove the corresponding permission
            return testHelpers.removeWritePermission('_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(function(){
                return testHelpers.doLoginAndGetToken('_0_0', 'test').then(function(token){
                    var clientModule = {module: 'base', clientId: clientFromDatabase._id}
                    return superTest(server).post(`/api/clientmodules?token=${token}`).send(clientModule).expect(403);
                });
            });
        });
    });

    it('responds to PUT/id without write permission with 403', function() {
        return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
            var clientId = clientFromDatabase._id;
            return db.get('clientmodules').findOne({ module: 'documents', clientId:  clientId}).then((clientModuleFromDatabase) => {
                return testHelpers.removeWritePermission('_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(function(){
                    return testHelpers.doLoginAndGetToken('_0_0', 'test').then(function(token) {
                        var id = clientModuleFromDatabase._id;
                        var updatedModule = {module: 'activities'}
                        return superTest(server).put(`/api/clientmodules/${id}?token=${token}`).send(updatedModule).expect(403);
                    });
                });
            });
        });
    });

    it('responds to DELETE/id without write permission with 403', function() {
        return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
            var clientId = clientFromDatabase._id;
            return db.get('clientmodules').findOne({module: 'documents', clientId:  clientId}).then(function(clientModuleFromDatabase){
                //use portal user 
                return testHelpers.removeWritePermission('_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(function(){
                    return testHelpers.doLoginAndGetToken('_0_0', 'test').then(function(token){
                        var id = clientModuleFromDatabase._id;
                        return superTest(server).del(`/api/clientmodules/${id}?token=${token}`).expect(403);
                    });
                });
             });
        });    
    });

    it('responds to GET/available/ without query parameter clientId with 400', function() {
        return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
            return superTest(server).get(`/api/clientmodules/available?token=${token}`).expect(400);
        });
    });

    it('responds to GET/available/ with incorrect query parameter clientId with 400', function() {
        return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
            return superTest(server).get(`/api/clientmodules/available?clientId=invalid&token=${token}`).expect(400);
        });
    });

    it('responds to GET/available/ with not existing clientId with 400', function() {
        return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
            return superTest(server).get(`/api/clientmodules/available?clientId=999999999999999999999999&token=${token}`).expect(400);
        });
    });
    
    it('responds to GET/available/ with correct query parameter clientId with list of all available client module names for the client', function(done) {
        db.get('clients').findOne({name: '1'}).then((clientFromDatabase) => {
            var clientId = clientFromDatabase._id;
            testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                superTest(server).get(`/api/clientmodules/available?token=${token}&clientId=${clientId.toString()}`).expect(200).end(function(err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    var moduleConfig = JSON.parse(fs.readFileSync('./config/module-config.json').toString());
                    var availableClientModuleKeys = Object.keys(moduleConfig.modules);
                    // Remove the ones already assigned in testhelpers
                    availableClientModuleKeys.splice(availableClientModuleKeys.indexOf('base'), 1);
                    availableClientModuleKeys.splice(availableClientModuleKeys.indexOf('activities'), 1);
                    availableClientModuleKeys.splice(availableClientModuleKeys.indexOf('documents'), 1);
                    availableClientModuleKeys.splice(availableClientModuleKeys.indexOf('fmobjects'), 1);
                    availableClientModuleKeys.splice(availableClientModuleKeys.indexOf('licenseserver'), 1);
                    var clientModulesFromApi = res.body;
                    assert.strictEqual(clientModulesFromApi.length, availableClientModuleKeys.length, `Number of client modules differ (${clientModulesFromApi.length} from API, ${availableClientModuleKeys.length} module names in module_config.json)`);
                    availableClientModuleKeys.forEach((availableClientModuleKey) => {
                        var clientModuleFound = false;
                        for (var i = 0; i < clientModulesFromApi.length; i++) {
                            var clientModuleFromApi = clientModulesFromApi[i];
                            if (clientModuleFromApi !== availableClientModuleKey) {
                                continue;
                            }
                            clientModuleFound = true;
                        }
                        assert.ok(clientModuleFound, `Client module "${availableClientModuleKey}" was not returned by API`);
                    });
                    done();
                });
            });
        });
    });

    it('responds to GET/?clientId=... without query parameter clientId with 400', function() {
        return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
            return superTest(server).get(`/api/clientmodules?token=${token}`).expect(400);
        });
    });

    it('responds to GET/?clientId=... with incorrect query parameter clientId with 400', function() {
        return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
            return superTest(server).get(`/api/clientmodules?clientId=invalid&token=${token}`).expect(400);
        });
    });

    it('responds to GET/?clientId=... with not existing clientId with 400', function() {
        return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
            return superTest(server).get(`/api/clientmodules?clientId=999999999999999999999999&token=${token}`).expect(400);
        });
    });

    it('responds to GET/?clientId=... with correct clientId with list of all client module assignments for the client with all details', function(done) {
        db.get('clients').findOne({name: '1'}).then((clientFromDatabase) => {
            var clientId = clientFromDatabase._id;
            db.get('clientmodules').find({clientId: clientId}).then((clientModulesFromDatabase) => {
                testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    superTest(server).get(`/api/clientmodules?token=${token}&clientId=${clientId.toString()}`).expect(200).end(function(err, res) {
                        if (err) {
                            done(err);
                            return;
                        }
                        var clientModulesFromApi = res.body;
                        assert.strictEqual(clientModulesFromApi.length, clientModulesFromDatabase.length, `Number of client modules differ (${clientModulesFromApi.length} from API, ${clientModulesFromDatabase.length} in database)`);
                        clientModulesFromDatabase.forEach((clientModuleFromDatabase) => {
                            var keys = Object.keys(clientModuleFromDatabase); // Include _id every time because it is returned by the API in every case!
                            var clientModuleFound = false;
                            for (var i = 0; i < clientModulesFromApi.length; i++) {
                                var clientModuleFromApi = clientModulesFromApi[i];
                                if (clientModuleFromApi._id !== clientModuleFromDatabase._id.toString()) {
                                    continue;
                                }
                                clientModuleFound = true;
                                testHelpers.compareApiAndDatabaseObjects('client module', keys, clientModuleFromApi, clientModuleFromDatabase);
                            }
                            assert.ok(clientModuleFound, `Client module "${clientModuleFromDatabase.name}" was not returned by API`);
                        });
                        done();
                    });
                });
            });
        });
    });

    it('responds to GET/id with invalid id with 400', function() {
        return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
            return superTest(server).get(`/api/clientmodules/invalid?token=${token}`).expect(400);
        });
    });

    it('responds to GET/id with not existing id with 404', function() {
        return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
            return superTest(server).get(`/api/clientmodules/999999999999999999999999?token=${token}`).expect(404);
        });
    });

    it('responds to GET/id with existing id with all details of the client module assignment', function(done) {
        db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
            testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                var keys = Object.keys(clientModuleFromDatabase); // Include _id every time because it is returned by the API in every case!
                superTest(server).get(`/api/clientmodules/${clientModuleFromDatabase._id}?token=${token}`).expect(200).end(function(err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    var clientModuleFromApi = res.body;
                    testHelpers.compareApiAndDatabaseObjects('client module', keys, clientModuleFromApi, clientModuleFromDatabase);
                    done();
                });
            });
        });
    });

    it('responds to GET/id with existing client module id and specific fields with details of client module containing only the given fields', function(done) {
        db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
            testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                var keys = ['_id', 'module']; // Include _id every time because it is returned by the API in every case!
                superTest(server).get(`/api/clientmodules/${clientModuleFromDatabase._id}?token=${token}&fields=${keys.join('+')}`).expect(200).end(function(err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    var clientModuleFromApi = res.body;
                    testHelpers.compareApiAndDatabaseObjects('client module', keys, clientModuleFromApi, clientModuleFromDatabase);
                    done();
                });
            });
        });
    });

    it('responds to POST/ without giving a client module assignment with 400', function() {
        return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
            return superTest(server).post('/api/clientmodules?token=' + token).send().expect(400);
        });
    });

    it('responds to POST/ without a clientId with 400', function() {
        return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
            var newClientModule = { 
                module: 'activities'
            };
            return superTest(server).post('/api/clientmodules?token=' + token).send(newClientModule).expect(400);
        });
    });

    it('responds to POST/ with an incorrect clientId with 400', function() {
        return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
            var newClientModule = { 
                module: 'activities',
                clientId: 'invalid'
            };
            return superTest(server).post('/api/clientmodules?token=' + token).send(newClientModule).expect(400);
        });
    });

    it('responds to POST/ with a not existing clientId with 400', function() {
        return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
            var newClientModule = { 
                module: 'activities',
                clientId: '999999999999999999999999'
            };
            return superTest(server).post('/api/clientmodules?token=' + token).send(newClientModule).expect(400);
        });
    });

    it('responds to POST/ with correct client module assignment data with inserted client module assignment containing an _id field', function(done) {
        db.get('clients').findOne({name: '1'}).then((clientFromDatabase) => {
            var newClientModule = { 
                module: 'activities',
                clientId: clientFromDatabase._id.toString()
            };
            testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                superTest(server).post('/api/clientmodules?token=' + token).send(newClientModule).expect(200).end(function(err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    var clientModuleFromApi = res.body;
                    assert.ok(clientModuleFromApi['_id'], 'Inserted client module does not contain an _id field');
                    delete clientModuleFromApi['_id'];
                    testHelpers.compareApiAndDatabaseObjects('client module', Object.keys(newClientModule), clientModuleFromApi, newClientModule);
                    done();
                });
            });
        });
    });

    it('responds to PUT/id with an invalid id with 400', function() {
        return db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
            return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return superTest(server).put(`/api/clientmodules/invalid?token=${token}`).send(clientModuleFromDatabase).expect(400);
            });
        });
    });

    it('responds to PUT/id without giving data with 400', function() {
        return db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
            return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return superTest(server).put(`/api/clientmodules/${clientModuleFromDatabase._id}?token=${token}`).send().expect(400);
            });
        });
    });

    it('responds to PUT/id with a client module containing an _id field with an invalid query string id with 404', function() {
        return db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
            return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                var clientModule = {
                    _id: '888888888888888888888888'
                };
                return superTest(server).put(`/api/clientmodules/999999999999999999999999?token=${token}`).send(clientModule).expect(404);
            });
        });
    });

    it('responds to PUT/id with a client module assignment containing an _id field which differs from the id parameter with the updated client module assignment and the original _id (_id cannot be changed)', function(done) {
        db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
            testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                var clientModule = {
                    _id: '999999999999999999999999'
                }
                superTest(server).put(`/api/clientmodules/${clientModuleFromDatabase._id}?token=${token}`).send(clientModule).expect(200).end(function(err, res) {
                    if (err) {
                        done(err);
                        return;
                    }
                    var clientModuleFromApi = res.body;
                    assert.strictEqual(clientModuleFromApi['_id'], clientModuleFromDatabase._id.toString(), `_id of client module was changed with PUT`);
                    done();
                });
            });
        });
    });

    it('responds to PUT/id with an id that does not exist with 404', function() {
        return db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
            var clientModule = {
                module: 'documents'
            }
            return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return superTest(server).put(`/api/clientmodules/999999999999999999999999?token=${token}`).send(clientModule).expect(404);
            });
        });
    });

    it('responds to PUT/id giving a clientId with the updated client module assignment and its old clientId. The clientId cannot be changed', function(done) {
        db.get('clients').findOne({name: '1'}).then((clientFromDatabase) => {
            db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    var clientModule = {
                        module: 'documents',
                        clientId: clientFromDatabase._id.toString()
                    }
                    superTest(server).put(`/api/clientmodules/${clientModuleFromDatabase._id}?token=${token}`).send(clientModule).expect(200).end(function(err, res) {
                        if (err) {
                            done(err);
                            return;
                        }
                        var clientModuleFromApi = res.body;
                        assert.strictEqual(clientModuleFromApi['clientId'], clientModuleFromDatabase.clientId.toString(), `clientId attribute of client module was changed but it must not`);
                        done();
                    });
                });
            });
        });
    });

    it('responds to PUT/id with a correct client module assignment with the updated client module assignment and its new properties', function(done) {
        db.get('clients').findOne({name: '1'}).then((clientFromDatabase) => {
            db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    var clientModule = {
                        module: 'documents'
                    }
                    superTest(server).put(`/api/clientmodules/${clientModuleFromDatabase._id}?token=${token}`).send(clientModule).expect(200).end(function(err, res) {
                        if (err) {
                            done(err);
                            return;
                        }
                        var clientModuleFromApi = res.body;
                        assert.strictEqual(clientModuleFromApi['_id'], clientModuleFromDatabase._id.toString(), `_id of client module was changed with PUT`);
                        assert.strictEqual(clientModuleFromApi['module'], clientModule.module, `module attribute of client module was not changed correctly`);
                        done();
                    });
                });
            });
        });
    });

    it('responds to DELETE/id with an invalid id with 400', function() {
        return db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
            return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return superTest(server).del(`/api/clientmodules/invalid?token=${token}`).send(clientModuleFromDatabase).expect(400);
            });
        });
    });

    it('responds to DELETE/id with an id where no client module exists exists with 404', function() {
        return db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
            return testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return superTest(server).del(`/api/clientmodules/999999999999999999999999?token=${token}`).send(clientModuleFromDatabase).expect(404);
            });
        });
    });

    it('responds to DELETE/id with a correct id with 204', function(done) {
        db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
            testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                superTest(server).del(`/api/clientmodules/${clientModuleFromDatabase._id}?token=${token}`).send(clientModuleFromDatabase).expect(204).end((err, res) => {
                    if (err) {
                        done(err);
                        return;
                    }
                    db.get('clientmodules').findOne(clientModuleFromDatabase._id).then((stillExistingClientModule) => {
                        assert.ok(!stillExistingClientModule, 'client module has not been deleted from database');
                        done();
                    });
                });
            });
        });
    });

});
