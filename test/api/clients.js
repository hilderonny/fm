/**
 * UNIT Tests for api/clients
 * @see http://softwareengineering.stackexchange.com/a/223376 for running async tasks in parallel
 */
var assert = require('assert');
var superTest = require('supertest');
var async = require('async');
var monk = require('monk');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');

describe('API clients', function() {

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
        await th.prepareRelations();
    });

    describe('GET/', function() {

        it('responds with 403 without authentication', function() {
            return th.get('/api/clients').expect(403);
        });

        it('responds with 403 when the logged in user\'s (normal user) client has no access to this module', function() {
            return th.removeClientModule('1', 'clients').then(function() {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return th.get(`/api/clients?token=${token}`).expect(403);
                });
            });
        });

        it('responds with 403 when the logged in user\'s (administrator) client has no access to this module', function() {
            return th.removeClientModule('1', 'clients').then(function() {
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                    return th.get(`/api/clients?token=${token}`).expect(403);
                });
            });
        });

        it('responds with 403 without read permission', function() {
            // Remove the corresponding permission
            return th.removeReadPermission('1_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(() => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return th.get('/api/clients?token=' + token).expect(403);
                });
            });
        });

        it('responds with list of all clients containing all details', function(done) {
            db.get('clients').find().then((allClientsFromDatabase) => {
                th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    th.get(`/api/clients?token=${token}`).expect(200).end(function(err, res) {
                        if (err) {
                            done(err);
                            return;
                        }
                        var clientsFromApi = res.body;
                        assert.strictEqual(clientsFromApi.length, allClientsFromDatabase.length, `Number of clients differ (${clientsFromApi.length} from API, ${allClientsFromDatabase.length} in database)`);
                        allClientsFromDatabase.forEach((clientFromDatabase) => {
                            var clientFound = false;
                            for (var i = 0; i < clientsFromApi.length; i++) {
                                var clientFromApi = clientsFromApi[i];
                                if (clientFromApi._id !== clientFromDatabase._id.toString()) {
                                    continue;
                                }
                                clientFound = true;
                                Object.keys(clientFromDatabase).forEach((key) => {
                                    var valueFromDatabase = clientFromDatabase[key].toString(); // Compare on a string basis because the API returns strings only
                                    var valueFromApi = clientFromApi[key].toString();
                                    assert.strictEqual(valueFromApi, valueFromDatabase, `${key} of client ${clientFromApi._id} differs (${valueFromApi} from API, ${valueFromDatabase} in database)`);
                                });
                            }
                            assert.ok(clientFound, `Client "${clientFromDatabase.name}" was not returned by API`);
                        });
                        done();
                    });
                });
            });
        });

        it('responds with list of all clients containing only the requested fields when only specific fields are given', function(done) {
            db.get('clients').find().then((allClientsFromDatabase) => {
                th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var keys = ['_id', 'name']; // Include _id every time because it is returned by the API in every case!
                    th.get(`/api/clients?token=${token}&fields=${keys.join('+')}`).expect(200).end(function(err, res) {
                        if (err) {
                            done(err);
                            return;
                        }
                        var clientsFromApi = res.body;
                        assert.strictEqual(clientsFromApi.length, allClientsFromDatabase.length, `Number of clients differ (${clientsFromApi.length} from API, ${allClientsFromDatabase.length} in database)`);
                        allClientsFromDatabase.forEach((clientFromDatabase) => {
                            var clientFound = false;
                            for (var i = 0; i < clientsFromApi.length; i++) {
                                var clientFromApi = clientsFromApi[i];
                                if (clientFromApi._id !== clientFromDatabase._id.toString()) {
                                    continue;
                                }
                                clientFound = true;
                                var keyCountFromApi = Object.keys(clientFromApi).length;
                                var keyCountFromDatabase = keys.length;
                                assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of client ${clientFromApi._id} differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                                keys.forEach((key) => {
                                    var valueFromDatabase = clientFromDatabase[key].toString(); // Compare on a string basis because the API returns strings only
                                    var valueFromApi = clientFromApi[key].toString();
                                    assert.strictEqual(valueFromApi, valueFromDatabase, `${key} of client ${clientFromApi._id} differs (${valueFromApi} from API, ${valueFromDatabase} in database)`);
                                });
                            }
                            assert.ok(clientFound, `Client "${clientFromDatabase.name}" was not returned by API`);
                        });
                        done();
                    });
                });
            });
        });

    });

    describe('GET/forIds', function() {

        function createTestClients() {
            var testObjects = ['testClient1', 'testClient2', 'testClient3'].map(function(name) {
                return {
                    name: name
                }
            });
            return Promise.resolve(testObjects);
        }

        th.apiTests.getForIds.defaultNegative(co.apis.clients, co.permissions.ADMINISTRATION_CLIENT, co.collections.clients.name, createTestClients);
        th.apiTests.getForIds.defaultPositive(co.apis.clients, co.collections.clients.name, createTestClients);

    });

    describe('GET/:id', function() {

        it('responds with 403 without authentication', function() {
            // Load a valid user id so we have a valid request and do not get a 404
            return db.get('clients').findOne({name: '0'}).then((client) => {
                return th.get('/api/clients/' + client._id.toString()).expect(403);
            });
        });

        it('responds with 403 when the logged in user\'s (normal user) client has no access to this module', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                var id = clientFromDatabase._id;
                return th.removeClientModule('1', 'clients').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return th.get(`/api/clients/${id}?token=${token}`).expect(403);
                    });
                });
            }); 
        });

        it('responds with 403 when the logged in user\'s (administrator) client has no access to this module', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                var id = clientFromDatabase._id;
                return th.removeClientModule('1', 'clients').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return th.get(`/api/clients/${id}?token=${token}`).expect(403);
                    });
                });
            }); 
        });

        it('responds with 403 without read permission', function() {
            return db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                // Remove the corresponding permission
                return th.removeReadPermission('1_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(() => {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        return th.get(`/api/clients/${clientFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with 403 when id is invalid', function() {
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return th.get('/api/clients/invalidId?token=' + token).expect(400);
            });
        });

        it('responds with 404 when no client exists for given id', function() {
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return th.get('/api/clients/999999999999999999999999?token=' + token).expect(404);
            });
        });

        it('responds with all details of the client', function(done) {
            db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var keys = Object.keys(clientFromDatabase); // Include _id every time because it is returned by the API in every case!
                    th.get(`/api/clients/${clientFromDatabase._id}?token=${token}`).expect(200).end(function(err, res) {
                        if (err) {
                            done(err);
                            return;
                        }
                        var clientFromApi = res.body;
                        var keyCountFromApi = Object.keys(clientFromApi).length;
                        var keyCountFromDatabase = keys.length;
                        assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of client ${clientFromApi._id} differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                        keys.forEach((key) => {
                            var valueFromDatabase = clientFromDatabase[key].toString(); // Compare on a string basis because the API returns strings only
                            var valueFromApi = clientFromApi[key].toString();
                            assert.strictEqual(valueFromApi, valueFromDatabase, `${key} of client ${clientFromApi._id} differs (${valueFromApi} from API, ${valueFromDatabase} in database)`);
                        });
                        done();
                    });
                });
            });
        });

        it('responds with details of client containing only the given fields when specific fields are given', function(done) {
            db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var keys = ['_id', 'name']; // Include _id every time because it is returned by the API in every case!
                    th.get(`/api/clients/${clientFromDatabase._id}?token=${token}&fields=${keys.join('+')}`).expect(200).end(function(err, res) {
                        if (err) {
                            done(err);
                            return;
                        }
                        var clientFromApi = res.body;
                        var keyCountFromApi = Object.keys(clientFromApi).length;
                        var keyCountFromDatabase = keys.length;
                        assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of client ${clientFromApi._id} differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                        keys.forEach((key) => {
                            var valueFromDatabase = clientFromDatabase[key].toString(); // Compare on a string basis because the API returns strings only
                            var valueFromApi = clientFromApi[key].toString();
                            assert.strictEqual(valueFromApi, valueFromDatabase, `${key} of client ${clientFromApi._id} differs (${valueFromApi} from API, ${valueFromDatabase} in database)`);
                        });
                        done();
                    });
                });
            });
        });

    });

    describe('POST/', function() {

        it('responds with 403 without authentication', function() {
            return th.post('/api/clients')
                .send({ name: 'TestClient' })
                .expect(403);
        });

        it('responds with 403 when the logged in user\'s (normal user) client has no access to this module', function() {
            return th.removeClientModule('1', 'clients').then(function(){
                return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    var newClient = {name: 'newName'};
                    return th.post(`/api/clients?token=${token}`).send(newClient).expect(403);
                });
            });
        });

        it('responds with 403 when the logged in user\'s (administrator) client has no access to this module', function() {
            return th.removeClientModule('1', 'clients').then(function(){
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                    var newClient = {name: 'newName'};
                    return th.post(`/api/clients?token=${token}`).send(newClient).expect(403);
                });
            });
        });

        it('responds with 403 without write permission', function() {
            // Remove the corresponding permission
            return th.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(() => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var newClient = { 
                        name: 'newClient'
                    };
                    return th.post('/api/clients?token=' + token).send(newClient).expect(403);
                });
            });
        });

        it('responds with 400 when no client is given', function() {
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return th.post('/api/clients?token=' + token).send().expect(400);
            });
        });

        it('responds with inserted client containing an _id field', function(done) {
            th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                var newClient = { 
                    name: 'newClient'
                };
                th.post('/api/clients?token=' + token).send(newClient).expect(200).end((err, res) => {
                    if (err) {
                        done(err);
                        return;
                    }
                    var clientFromApi = res.body;
                    var keyCountFromApi = Object.keys(clientFromApi).length - 1; // _id is returned additionally
                    var keys = Object.keys(newClient);
                    var keyCountFromDatabase = keys.length;
                    assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of new client differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                    keys.forEach((key) => {
                        var valueFromDatabase = newClient[key].toString(); // Compare on a string basis because the API returns strings only
                        var valueFromApi = clientFromApi[key].toString();
                        assert.strictEqual(valueFromApi, valueFromDatabase, `${key} of new client differs (${valueFromApi} from API, ${valueFromDatabase} in database)`);
                    });
                    done();
                });
            });
        });

        it('creates client module assignments for modules "base" and "doc"', async function() {
            var token = await th.defaults.login(th.defaults.portalAdminUser);
            var newClient = { 
                name: 'newClient'
            };
            var createdClient = (await th.post(`/api/${co.apis.clients}?token=${token}`).send(newClient).expect(200)).body;
            var createdClientModules = await db.get(co.collections.clientmodules.name).find({clientId: monk.id(createdClient._id)});
            assert.strictEqual(createdClientModules.length, 2);
            assert.ok(createdClientModules.find((m) => m.module === co.modules.base));
            assert.ok(createdClientModules.find((m) => m.module === co.modules.doc));
        });

    });

    describe('POST/newadmin', function() {

        it('responds with 400 when no user is given', function() {
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return th.post('/api/clients/newadmin?token=' + token).send().expect(400);
            });
        });

        it('responds with 400 when no username is given', function() {
            return db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var newAdmin = {
                        pass: 'password', // No username set
                        clientId: clientFromDatabase._id.toString()
                    };
                    return th.post('/api/clients/newadmin?token=' + token).send(newAdmin).expect(400);
                });
            });
        });

        it('responds with 409 when username is in use', function() {
            return db.get('users').findOne({ name : '1_0_0' }).then((userFromDatabase) => {
                return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var newAdmin = {
                        name: userFromDatabase.name,
                        pass: 'password',
                        clientId: userFromDatabase.clientId
                    };
                    return th.post('/api/clients/newadmin?token=' + token).send(newAdmin).expect(409);
                });
            });
        });

        it('responds with 400 when no clientId is given', function() {
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                var newAdmin = {
                    name: 'newAdmin',
                    pass: 'password'
                };
                return th.post('/api/clients/newadmin?token=' + token).send(newAdmin).expect(400);
            });
        });

        it('responds with 400 when clientId is invalid', function() {
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                var newAdmin = {
                    name: 'newAdmin',
                    pass: 'password',
                    clientId: 'dampfhappen'
                };
                return th.post('/api/clients/newadmin?token=' + token).send(newAdmin).expect(400);
            });
        });

        it('responds with 400 when there is no client with the given clientId', function() {
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                var newAdmin = {
                    name: 'newAdmin',
                    pass: 'password',
                    clientId: '999999999999999999999999'
                };
                return th.post('/api/clients/newadmin?token=' + token).send(newAdmin).expect(400);
            });
        });

        it('responds with 403 without authentication', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                var newAdmin = {
                    name: 'newAdmin',
                    pass: 'parola',
                    clientId: clientFromDatabase._id
                };
                return th.post(`/api/clients/newadmin`).send(newAdmin).expect(403);
            });
        });

        it('responds with 403 when the logged in user\'s (normal user) client has no access to this module', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                return th.removeClientModule('1', 'clients').then(function(){
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        var newAdmin ={
                            name: 'newAdmin',
                            pass: 'parola',
                            clientId: clientFromDatabase._id
                        };
                        return th.post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(403);
                    });
                });
            });
        });

        it('responds with 403 when the logged in user\'s (administrator) client has no access to this module', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                return th.removeClientModule('1', 'clients').then(function(){
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        var newAdmin ={
                            name: 'newAdmin',
                            pass: 'parola',
                            clientId: clientFromDatabase._id
                        };
                        return th.post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(403);
                    });
                });
            });
        });

        it('responds with 403 without write permission', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                // Remove the corresponding permission
                return th.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(() => {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var newAdmin ={
                            name: 'newAdmin',
                            pass: 'parola',
                            clientId: clientFromDatabase._id
                        };
                        return th.post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(403);
                    });
                });
            });
        });

        it('responds with 200 and creates a new admin in a new user group with the same name as the username', function() {
            return db.get('clients').findOne({name: '1'}).then((clientFromDatabase) => {
                return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var newAdminName = '1_newAdmin';
                    var newAdmin = {
                        name: newAdminName,
                        pass: 'password',
                        clientId: clientFromDatabase._id.toString()
                    };
                    return th.post('/api/clients/newadmin?token=' + token).send(newAdmin).expect(200).then((res) => {
                        return db.get('users').findOne({ name : newAdminName }).then((userFromDatabase) => {
                            assert.ok(userFromDatabase, 'New admin was not created');
                            assert.strictEqual(userFromDatabase.name, newAdminName, 'Usernames do not match');
                            assert.strictEqual(userFromDatabase.clientId.toString(), clientFromDatabase._id.toString(), 'Client IDs do not match');
                            assert.ok(userFromDatabase.isAdmin, 'New admin user does not have the isAdmin flag');
                            return db.get('usergroups').findOne(userFromDatabase.userGroupId).then((userGroupFromDatabase) => {
                                assert.ok(userGroupFromDatabase, 'Usergroup for new admin was not created');
                                assert.strictEqual(userGroupFromDatabase.name, newAdminName, 'The name of new usergroup does not match the name of the new admin');
                            });
                        });
                    });
                });
            });
        });

    });

    describe('PUT/:id', function() {

        it('responds with 403 without authentication', function() {
            return db.get('clients').findOne({name: '0'}).then((client) => {
                var clientId = client._id.toString();
                return th.put('/api/clients/' + clientId)
                    .send({ name: 'OtherClientName' })
                    .expect(403);
            });
        });

        it('responds with 403 when the logged in user\'s (normal user) client has no access to this module', function() {
            return db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                return th.removeClientModule('1', 'clients').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var updatedClient = {
                            name: 'newName'
                        };
                        return th.put(`/api/clients/${clientFromDatabase._id}?token=${token}`).send(updatedClient).expect(403);
                    });
                });
            });
        });

        it('responds with 403 when the logged in user\'s (administrator) client has no access to this module', function() {
            return db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                return th.removeClientModule('1', 'clients').then(function() {
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        var updatedClient = {
                            name: 'newName'
                        };
                        return th.put(`/api/clients/${clientFromDatabase._id}?token=${token}`).send(updatedClient).expect(403);
                    });
                });
            });
        });

        it('responds with 403 without write permission', function() {
            return db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                // Remove the corresponding permission
                return th.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(() => {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var updatedClient = {
                            name: 'newName'
                        };
                        return th.put(`/api/clients/${clientFromDatabase._id}?token=${token}`).send(updatedClient).expect(403);
                    });
                });
            });
        });

        it('responds with 400 when the id is invalid', function() {
            var updatedClient = {
                name: 'newName'
            };
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return th.put('/api/clients/invalidId?token=' + token).send(updatedClient).expect(400);
            });
        });

        it('responds with 400 when no client is given', function() {
            return db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    return th.put(`/api/clients/${clientFromDatabase._id}?token=${token}`).send().expect(400);
                });
            });
        });

        it('responds with a client with the original _id when a new _id is given (_id cannot be changed)', function(done) {
            db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var updatedClient = {
                        _id: '888888888888888888888888'
                    };
                    th.put(`/api/clients/${clientFromDatabase._id}?token=${token}`).send(updatedClient).expect(200).end((err, res) => {
                        if (err) {
                            done(err);
                            return;
                        }
                        var idFromApiResult = res.body._id;
                        assert.strictEqual(idFromApiResult, clientFromDatabase._id.toString(), `_id of client was updated but it must not be (${idFromApiResult} from API, ${clientFromDatabase._id} originally)`);
                        done();
                    });
                });
            });
        });

        it('responds with 404 when there is no client with the given id', function() {
            var updatedClient = {
                name: 'newName'
            };
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return th.put('/api/clients/999999999999999999999999?token=' + token).send(updatedClient).expect(404);
            });
        });

        it('responds with 404 when there is no client with the given id and when only _id is given as update value', function() {
            var updatedClient = {
                _id: '888888888888888888888888'
            };
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return th.put('/api/clients/999999999999999999999999?token=' + token).send(updatedClient).expect(404);
            });
        });

        it('responds with the updated client and its new properties', function(done) {
            db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var updatedClient = {
                        name: 'newName'
                    };
                    th.put(`/api/clients/${clientFromDatabase._id}?token=${token}`).send(updatedClient).expect(200).end((err, res) => {
                        if (err) {
                            done(err);
                            return;
                        }
                        var clientFromApi = res.body;
                        var keyCountFromApi = Object.keys(clientFromApi).length - 1; // _id is returned additionally
                        var keys = Object.keys(updatedClient);
                        var keyCountFromDatabase = keys.length;
                        assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of updated client differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                        keys.forEach((key) => {
                            var updateValue = updatedClient[key].toString(); // Compare on a string basis because the API returns strings only
                            var valueFromApi = clientFromApi[key].toString();
                            assert.strictEqual(valueFromApi, updateValue, `${key} of updated client differs (${valueFromApi} from API, ${updateValue} in database)`);
                        });
                        done();
                    });
                });
            });
        });

    });

    describe('DELETE/:id', function() {

        function getDeleteClientId() {
            return db.get(co.collections.clients.name).insert({ name: 'newClient' }).then(function(client) {
                return th.createRelationsToUser(co.collections.clients.name, client);
            }).then(function(insertedClient) {
                return Promise.resolve(insertedClient._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.clients, co.permissions.ADMINISTRATION_CLIENT, getDeleteClientId);
        th.apiTests.delete.defaultPositive(co.apis.clients, co.collections.clients.name, getDeleteClientId);

        it('responds with 204 and deletes all dependent objects (activities, clientmodules, documents, fmobjects, folders, permissions, usergroups, users)', function() {
            var clientIdToDelete;
            return getDeleteClientId().then(function(clientId) {
                clientIdToDelete = clientId;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.del(`/api/${co.apis.clients}/${clientIdToDelete.toString()}?token=${token}`).expect(204);
            }).then(function() {
                return new Promise(function(resolve, reject) {
                    var dependentCollections = Object.keys(co.collections).map((key) => co.collections[key].name);
                    async.eachSeries(dependentCollections, (dependentCollection, callback) => {
                        db.get(dependentCollection).count({ clientId: clientIdToDelete }, (err, count) => {
                            if (err) {
                                callback(err);
                                return;
                            }
                            assert.equal(count, 0, `Not all ${dependentCollection} of the deleted client were also deleted`);
                            callback();
                        });
                    }, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            });
        });

    });

});
