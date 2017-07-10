/**
 * UNIT Tests for api/clientmodules
 */
var assert = require('assert');
var fs = require('fs');
var th = require('../testHelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');

describe('API clientmodules', function() {

    var server = require('../../app');
    
    // Clear and prepare database with clients, user groups and users
    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions);
    });

    describe('GET/available/?clientId=...', function() {


        it('responds without authentication with 403', function() {
            return db.get('clients').findOne({name: '1'}).then((client) => {
                return th.get('/api/clientmodules/available?clientId=' + client._id.toString()).expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '0'}).then(function(clientFromDB){
                return th.removeClientModule('1', 'clients').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return th.get(`/api/clientmodules/available?clientId=${clientFromDB._id}&token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '0'}).then(function(clientFromDB){
                return th.removeClientModule('1', 'clients').then(function() {
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                        return th.get(`/api/clientmodules/available?clientId=${clientFromDB._id}&token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds without read rights with 403', function(){
            return db.get('clients').findOne({name: '0'}).then(function(clientFromDB){
                // Remove the corresponding permission
                return th.removeReadPermission('_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(function(){
                    return th.doLoginAndGetToken('_0_0', 'test').then(function(token){
                        return th.get(`/api/clientmodules/available?clientId=${clientFromDB._id}&token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds without query parameter clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return th.get(`/api/clientmodules/available?token=${token}`).expect(400);
            });
        });

        it('responds with incorrect query parameter clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return th.get(`/api/clientmodules/available?clientId=invalid&token=${token}`).expect(400);
            });
        });

        it('responds with not existing clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return th.get(`/api/clientmodules/available?clientId=999999999999999999999999&token=${token}`).expect(400);
            });
        });
        
        it('responds with correct query parameter clientId with list of all available client module names for the client', function(done) {
            db.get('clients').findOne({name: '1'}).then((clientFromDatabase) => {
                var clientId = clientFromDatabase._id;
                th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    th.get(`/api/clientmodules/available?token=${token}&clientId=${clientId.toString()}`).expect(200).end(function(err, res) {
                        if (err) {
                            done(err);
                            return;
                        }
                        var moduleConfig = JSON.parse(fs.readFileSync('./config/module-config.json').toString());
                        var availableClientModuleKeys = Object.keys(moduleConfig.modules);
                        // Remove the ones already assigned in th
                        availableClientModuleKeys.splice(availableClientModuleKeys.indexOf('base'), 1);
                        availableClientModuleKeys.splice(availableClientModuleKeys.indexOf('clients'), 1);
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

        it('responds with list of available modules after assigning one. The list must not contain the assigned module', function() {
            var moduleToTest = 'activities';
            var relevantClient, token;
            return th.removeClientModule(th.defaults.client, moduleToTest).then(function() {
                return db.get(co.collections.clients).findOne({name:th.defaults.client});
            }).then(function(client) {
                relevantClient = client;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(tok) {
                token = tok;
                return th.get(`/api/${co.apis.clientmodules}/available?token=${token}&clientId=${relevantClient._id.toString()}`).expect(200);
            }).then(function(response) {
                // Check the list of available modules, it must contain the activities module (remove it before the test if needed)
                var availableModules = response.body;
                assert.ok(availableModules.indexOf(moduleToTest) >= 0);
                // Assign the activities module
                return db.get(co.collections.clientmodules).insert({ clientId: relevantClient._id, module: moduleToTest });
            }).then(function() {
                // Retreive the list of available modules, it must not contain the activities now
                return th.get(`/api/${co.apis.clientmodules}/available?token=${token}&clientId=${relevantClient._id.toString()}`).expect(200);
            }).then(function(response) {
                var availableModules = response.body;
                assert.ok(availableModules.indexOf(moduleToTest) < 0);
            });
        });

    });

    describe('GET/?clientId=...', function() {

        it('responds without authentication with 403', function() {
            return db.get('clients').findOne({name: '1'}).then((client) => {
                return th.get('/api/clientmodules?clientId=' + client._id.toString()).expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '0'}).then(function(clientFromDatabase){
                return th.removeClientModule('1', 'clients').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return th.get(`/api/clientmodules?clientId=${clientFromDatabase._id}&token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '0'}).then(function(clientFromDatabase){
                return th.removeClientModule('1', 'clients').then(function() {
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                        return th.get(`/api/clientmodules?clientId=${clientFromDatabase._id}&token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds without read permission with 403', function() {
            return db.get('clients').findOne({name: '0'}).then(function(clientFromDatabase){
                // Remove the corresponding permission
                return th.removeReadPermission('_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(function(){
                    return th.doLoginAndGetToken('_0_0', 'test').then(function(token){
                        return th.get(`/api/clientmodules?clientId=${clientFromDatabase._id}&token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds without query parameter clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return th.get(`/api/clientmodules?token=${token}`).expect(400);
            });
        });

        it('responds with incorrect query parameter clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return th.get(`/api/clientmodules?clientId=invalid&token=${token}`).expect(400);
            });
        });

        it('responds with not existing clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return th.get(`/api/clientmodules?clientId=999999999999999999999999&token=${token}`).expect(400);
            });
        });

        it('responds with correct clientId with list of all client module assignments for the client with all details', function(done) {
            db.get('clients').findOne({name: '1'}).then((clientFromDatabase) => {
                var clientId = clientFromDatabase._id;
                db.get('clientmodules').find({clientId: clientId}).then((clientModulesFromDatabase) => {
                    th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                        th.get(`/api/clientmodules?token=${token}&clientId=${clientId.toString()}`).expect(200).end(function(err, res) {
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
                                    th.compareApiAndDatabaseObjects('client module', keys, clientModuleFromApi, clientModuleFromDatabase);
                                }
                                assert.ok(clientModuleFound, `Client module "${clientModuleFromDatabase.name}" was not returned by API`);
                            });
                            done();
                        });
                    });
                });
            });
        });

    });

    describe('GET/:id', function() {

        it('responds without authentication with 403', function() {
            return db.get('clientmodules').findOne({module: 'activities'}).then((clientmodule) => {
                return th.get('/api/clientmodules/' + clientmodule._id.toString()).expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                return db.get('clientmodules').findOne({clientId: clientFromDatabase._id}).then(function(clientModuleFromDatabase){
                    var id = clientModuleFromDatabase._id;
                    return th.removeClientModule('1', 'clients').then(function() {
                        return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                            return th.get(`/api/clientmodules/${id}?clientId=${clientFromDatabase._id}&token=${token}`).expect(403);
                        });
                    });
                });
            }); 
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                return db.get('clientmodules').findOne({clientId: clientFromDatabase._id}).then(function(clientModuleFromDatabase){
                    var id = clientModuleFromDatabase._id;
                    return th.removeClientModule('1', 'clients').then(function() {
                        return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                            return th.get(`/api/clientmodules/${id}?clientId=${clientFromDatabase._id}&token=${token}`).expect(403);
                        });
                    });
                });
            }); 
        });

        it('responds without read permission with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                return db.get('clientmodules').findOne({clientId: clientFromDatabase._id}).then(function(clientModuleFromDatabase){
                    var id = clientModuleFromDatabase._id;
                    // Remove the corresponding permission
                    return th.removeReadPermission('_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(function(){
                        return th.doLoginAndGetToken('_0_0', 'test').then(function(token){
                            return th.get(`/api/clientmodules/${id}?clientId=${clientFromDatabase._id}&token=${token}`).expect(403);
                        });
                    });
                });
            }); 
        });

        it('responds with invalid id with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return th.get(`/api/clientmodules/invalid?token=${token}`).expect(400);
            });
        });

        it('responds with not existing id with 404', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return th.get(`/api/clientmodules/999999999999999999999999?token=${token}`).expect(404);
            });
        });

        it('responds with existing id with all details of the client module assignment', function(done) {
            db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    var keys = Object.keys(clientModuleFromDatabase); // Include _id every time because it is returned by the API in every case!
                    th.get(`/api/clientmodules/${clientModuleFromDatabase._id}?token=${token}`).expect(200).end(function(err, res) {
                        if (err) {
                            done(err);
                            return;
                        }
                        var clientModuleFromApi = res.body;
                        th.compareApiAndDatabaseObjects('client module', keys, clientModuleFromApi, clientModuleFromDatabase);
                        done();
                    });
                });
            });
        });

        it('responds with existing client module id and specific fields with details of client module containing only the given fields', function(done) {
            db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    var keys = ['_id', 'module']; // Include _id every time because it is returned by the API in every case!
                    th.get(`/api/clientmodules/${clientModuleFromDatabase._id}?token=${token}&fields=${keys.join('+')}`).expect(200).end(function(err, res) {
                        if (err) {
                            done(err);
                            return;
                        }
                        var clientModuleFromApi = res.body;
                        th.compareApiAndDatabaseObjects('client module', keys, clientModuleFromApi, clientModuleFromDatabase);
                        done();
                    });
                });
            });
        });

    });

    describe('POST/', function() {

        it('responds without authentication with 403', function() {
            return db.get('clients').findOne({name: '1'}).then((client) => {
                return th.post('/api/clientmodules')
                    .send({
                        clientId: client._id.toString(),
                        module: 'clients'
                    })
                    .expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                return th.removeClientModule('1', 'clients').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        var clientModule = {module: 'base', clientId: clientFromDatabase._id}
                        return th.post(`/api/clientmodules?token=${token}`).send(clientModule).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                return th.removeClientModule('1', 'clients').then(function() {
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                        var clientModule = {module: 'base', clientId: clientFromDatabase._id}
                        return th.post(`/api/clientmodules?token=${token}`).send(clientModule).expect(403);
                    });
                });
            });
        });

        it('responds without write permission with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                //Remove the corresponding permission
                return th.removeWritePermission('_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(function(){
                    return th.doLoginAndGetToken('_0_0', 'test').then(function(token){
                        var clientModule = {module: 'base', clientId: clientFromDatabase._id}
                        return th.post(`/api/clientmodules?token=${token}`).send(clientModule).expect(403);
                    });
                });
            });
        });

        it('responds without giving a client module assignment with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return th.post('/api/clientmodules?token=' + token).send().expect(400);
            });
        });

        it('responds without a clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                var newClientModule = { 
                    module: 'activities'
                };
                return th.post('/api/clientmodules?token=' + token).send(newClientModule).expect(400);
            });
        });

        it('responds with an incorrect clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                var newClientModule = { 
                    module: 'activities',
                    clientId: 'invalid'
                };
                return th.post('/api/clientmodules?token=' + token).send(newClientModule).expect(400);
            });
        });

        it('responds with a not existing clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                var newClientModule = { 
                    module: 'activities',
                    clientId: '999999999999999999999999'
                };
                return th.post('/api/clientmodules?token=' + token).send(newClientModule).expect(400);
            });
        });

        it('responds with correct client module assignment data with inserted client module assignment containing an _id field', function() {
            var moduleToTest = 'activities';
            var newClientModule = { module: moduleToTest };
            return th.removeClientModule(th.defaults.client, moduleToTest).then(function() {
                return db.get(co.collections.clients).findOne({name:th.defaults.client});
            }).then(function(client) {
                newClientModule.clientId = client._id.toString();
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post(`/api/${co.apis.clientmodules}?token=${token}`).send(newClientModule).expect(200);
            }).then(function(response) {
                var clientModuleFromApi = response.body;
                assert.ok(clientModuleFromApi._id, 'Inserted client module does not contain an _id field');
                delete clientModuleFromApi._id;
                th.compareApiAndDatabaseObjects(co.collections.clientmodules, Object.keys(newClientModule), clientModuleFromApi, newClientModule);
                return Promise.resolve();
            });
        });

        it('responds with the existing assignment when an assignment between a client and a module already exists', function() {
            var moduleToTest = 'activities';
            var relevantClient, existingClientModule;
            return db.get(co.collections.clients).findOne({name:th.defaults.client}).then(function(client) {
                relevantClient = client;
                return db.get(co.collections.clientmodules).findOne({clientId:client._id, module:moduleToTest});
            }).then(function(clientModule) {
                existingClientModule = clientModule;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                var newClientModule = { 
                    module: moduleToTest,
                    clientId: relevantClient._id.toString()
                };
                return th.post(`/api/${co.apis.clientmodules}?token=${token}`).send(newClientModule).expect(200);
            }).then(function(response) {
                assert.strictEqual(response.body._id, existingClientModule._id.toString());
            });
        });

    });

    describe('PUT/:id', function() {

        it('responds without authentication with 403', function() {
            return db.get('clientmodules').findOne({module: 'activities'}).then((clientmodule) => {
                return th.put('/api/clientmodules/' + clientmodule._id.toString())
                    .send({
                        module: 'clients'
                    })
                    .expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                var clientId = clientFromDatabase._id;
                return db.get('clientmodules').findOne({ module: 'documents', clientId:  clientId}).then((clientModuleFromDatabase) => {
                    return th.removeClientModule('1', 'clients').then(function() {
                        return th.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                            var id = clientModuleFromDatabase._id;
                            var updatedModule = {module: 'activities'}
                            return th.put(`/api/clientmodules/${id}?token=${token}`).send(updatedModule).expect(403);
                        });
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                var clientId = clientFromDatabase._id;
                return db.get('clientmodules').findOne({ module: 'documents', clientId:  clientId}).then((clientModuleFromDatabase) => {
                    return th.removeClientModule('1', 'clients').then(function() {
                        return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token) {
                            var id = clientModuleFromDatabase._id;
                            var updatedModule = {module: 'activities'}
                            return th.put(`/api/clientmodules/${id}?token=${token}`).send(updatedModule).expect(403);
                        });
                    });
                });
            });
        });

        it('responds without write permission with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                var clientId = clientFromDatabase._id;
                return db.get('clientmodules').findOne({ module: 'documents', clientId:  clientId}).then((clientModuleFromDatabase) => {
                    return th.removeWritePermission('_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(function(){
                        return th.doLoginAndGetToken('_0_0', 'test').then(function(token) {
                            var id = clientModuleFromDatabase._id;
                            var updatedModule = {module: 'activities'}
                            return th.put(`/api/clientmodules/${id}?token=${token}`).send(updatedModule).expect(403);
                        });
                    });
                });
            });
        });

        it('responds with an invalid id with 400', function() {
            return db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    return th.put(`/api/clientmodules/invalid?token=${token}`).send(clientModuleFromDatabase).expect(400);
                });
            });
        });

        it('responds without giving data with 400', function() {
            return db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    return th.put(`/api/clientmodules/${clientModuleFromDatabase._id}?token=${token}`).send().expect(400);
                });
            });
        });

        it('responds with a client module containing an _id field with an invalid query string id with 404', function() {
            return db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    var clientModule = {
                        _id: '888888888888888888888888'
                    };
                    return th.put(`/api/clientmodules/999999999999999999999999?token=${token}`).send(clientModule).expect(404);
                });
            });
        });

        it('responds with a client module assignment containing an _id field which differs from the id parameter with the updated client module assignment and the original _id (_id cannot be changed)', function(done) {
            db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    var clientModule = {
                        _id: '999999999999999999999999'
                    }
                    th.put(`/api/clientmodules/${clientModuleFromDatabase._id}?token=${token}`).send(clientModule).expect(200).end(function(err, res) {
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

        it('responds with an id that does not exist with 404', function() {
            return db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                var clientModule = {
                    module: 'documents'
                }
                return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    return th.put(`/api/clientmodules/999999999999999999999999?token=${token}`).send(clientModule).expect(404);
                });
            });
        });

        it('responds giving a clientId with the updated client module assignment and its old clientId. The clientId cannot be changed', function(done) {
            db.get('clients').findOne({name: '1'}).then((clientFromDatabase) => {
                db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                    th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                        var clientModule = {
                            module: 'documents',
                            clientId: clientFromDatabase._id.toString()
                        }
                        th.put(`/api/clientmodules/${clientModuleFromDatabase._id}?token=${token}`).send(clientModule).expect(200).end(function(err, res) {
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

        it('responds with a correct client module assignment with the updated client module assignment and its new properties', function(done) {
            db.get('clients').findOne({name: '1'}).then((clientFromDatabase) => {
                db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                    th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                        var clientModule = {
                            module: 'documents'
                        }
                        th.put(`/api/clientmodules/${clientModuleFromDatabase._id}?token=${token}`).send(clientModule).expect(200).end(function(err, res) {
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

    });

    describe('DELETE/:id', function() {

        it('responds without authentication with 403', function() {
            return db.get('clientmodules').findOne({module: 'activities'}).then((clientmodule) => {
                return th.del('/api/clientmodules/' + clientmodule._id.toString()).expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                var clientId = clientFromDatabase._id;
                return db.get('clientmodules').findOne({module: 'documents', clientId:  clientId}).then(function(clientModuleFromDatabase){
                    return th.removeClientModule('1', 'clients').then(function() {
                        return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                            var id = clientModuleFromDatabase._id;
                            return th.del(`/api/clientmodules/${id}?token=${token}`).expect(403);
                        });
                    });
                });
            });    
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                var clientId = clientFromDatabase._id;
                return db.get('clientmodules').findOne({module: 'documents', clientId:  clientId}).then(function(clientModuleFromDatabase){
                    return th.removeClientModule('1', 'clients').then(function() {
                        return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                            var id = clientModuleFromDatabase._id;
                            return th.del(`/api/clientmodules/${id}?token=${token}`).expect(403);
                        });
                    });
                });
            });    
        });

        it('responds without write permission with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                var clientId = clientFromDatabase._id;
                return db.get('clientmodules').findOne({module: 'documents', clientId:  clientId}).then(function(clientModuleFromDatabase){
                    //use portal user 
                    return th.removeWritePermission('_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(function(){
                        return th.doLoginAndGetToken('_0_0', 'test').then(function(token){
                            var id = clientModuleFromDatabase._id;
                            return th.del(`/api/clientmodules/${id}?token=${token}`).expect(403);
                        });
                    });
                });
            });    
        });

        it('responds with an invalid id with 400', function() {
            return db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    return th.del(`/api/clientmodules/invalid?token=${token}`).send(clientModuleFromDatabase).expect(400);
                });
            });
        });

        it('responds with an id where no client module exists exists with 404', function() {
            return db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    return th.del(`/api/clientmodules/999999999999999999999999?token=${token}`).send(clientModuleFromDatabase).expect(404);
                });
            });
        });

        it('responds with a correct id with 204', function(done) {
            db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    th.del(`/api/clientmodules/${clientModuleFromDatabase._id}?token=${token}`).send(clientModuleFromDatabase).expect(204).end((err, res) => {
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

});
