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

    describe('GET/forClient/:id', function() {

        it('responds without authentication with 403', function() {
            return db.get('clients').findOne({name: '1'}).then((client) => {
                return th.get('/api/clientmodules/forClient/' + client._id.toString()).expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '0'}).then(function(clientFromDatabase){
                return th.removeClientModule('1', 'clients').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return th.get(`/api/clientmodules/forClient/${clientFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '0'}).then(function(clientFromDatabase){
                return th.removeClientModule('1', 'clients').then(function() {
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                        return th.get(`/api/clientmodules/forClient/${clientFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds without read permission with 403', function() {
            return db.get('clients').findOne({name: '0'}).then(function(clientFromDatabase){
                // Remove the corresponding permission
                return th.removeReadPermission('_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(function(){
                    return th.doLoginAndGetToken('_0_0', 'test').then(function(token){
                        return th.get(`/api/clientmodules/forClient/${clientFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds without query parameter clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return th.get(`/api/clientmodules/forClient?token=${token}`).expect(400);
            });
        });

        it('responds with incorrect query parameter clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return th.get(`/api/clientmodules/forClient/invalid?token=${token}`).expect(400);
            });
        });

        it('responds with not existing clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return th.get(`/api/clientmodules/forClient/999999999999999999999999?token=${token}`).expect(400);
            });
        });

        it('responds with correct clientId with list of all client module assignments for the client with all details', function(done) {
            db.get('clients').findOne({name: '1'}).then((clientFromDatabase) => {
                var clientId = clientFromDatabase._id;
                db.get('clientmodules').find({clientId: clientId}).then((clientModulesFromDatabase) => {
                    th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                        th.get(`/api/clientmodules/forClient/${clientId.toString()}?token=${token}`).expect(200).end(function(err, res) {
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
