/**
 * UNIT Tests for api/clients
 * @see http://softwareengineering.stackexchange.com/a/223376 for running async tasks in parallel
 */
var assert = require('assert');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');
var async = require('async');
var constants = require('../../utils/constants');
var monk = require('monk');

describe('API clients', function() {

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
            .then(testHelpers.prepareDocuments)
            .then(testHelpers.prepareRelations);
    });

    describe('GET/', function() {

        it('responds with 403 without authentication', function() {
            return superTest(server).get('/api/clients').expect(403);
        });

        it('responds with 403 when the logged in user\'s (normal user) client has no access to this module', function() {
            return testHelpers.removeClientModule('1', 'clients').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return superTest(server).get(`/api/clients?token=${token}`).expect(403);
                });
            });
        });

        it('responds with 403 when the logged in user\'s (administrator) client has no access to this module', function() {
            return testHelpers.removeClientModule('1', 'clients').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                    return superTest(server).get(`/api/clients?token=${token}`).expect(403);
                });
            });
        });

        it('responds with 403 without read permission', function() {
            // Remove the corresponding permission
            return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(() => {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return superTest(server).get('/api/clients?token=' + token).expect(403);
                });
            });
        });

        it('responds with list of all clients containing all details', function(done) {
            db.get('clients').find().then((allClientsFromDatabase) => {
                testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    superTest(server).get(`/api/clients?token=${token}`).expect(200).end(function(err, res) {
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
                testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var keys = ['_id', 'name']; // Include _id every time because it is returned by the API in every case!
                    superTest(server).get(`/api/clients?token=${token}&fields=${keys.join('+')}`).expect(200).end(function(err, res) {
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

        // Positive tests

        xit('returns a list of clients with all details for the given IDs', function() {
        });
    });

    describe('GET/:id', function() {

        it('responds with 403 without authentication', function() {
            // Load a valid user id so we have a valid request and do not get a 404
            return db.get('clients').findOne({name: '0'}).then((client) => {
                return superTest(server).get('/api/clients/' + client._id.toString()).expect(403);
            });
        });

        it('responds with 403 when the logged in user\'s (normal user) client has no access to this module', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                var id = clientFromDatabase._id;
                return testHelpers.removeClientModule('1', 'clients').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return superTest(server).get(`/api/clients/${id}?token=${token}`).expect(403);
                    });
                });
            }); 
        });

        it('responds with 403 when the logged in user\'s (administrator) client has no access to this module', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                var id = clientFromDatabase._id;
                return testHelpers.removeClientModule('1', 'clients').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return superTest(server).get(`/api/clients/${id}?token=${token}`).expect(403);
                    });
                });
            }); 
        });

        it('responds with 403 without read permission', function() {
            return db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                // Remove the corresponding permission
                return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(() => {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        return superTest(server).get(`/api/clients/${clientFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with 403 when id is invalid', function() {
            return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return superTest(server).get('/api/clients/invalidId?token=' + token).expect(400);
            });
        });

        it('responds with 404 when no client exists for given id', function() {
            return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return superTest(server).get('/api/clients/999999999999999999999999?token=' + token).expect(404);
            });
        });

        it('responds with all details of the client', function(done) {
            db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var keys = Object.keys(clientFromDatabase); // Include _id every time because it is returned by the API in every case!
                    superTest(server).get(`/api/clients/${clientFromDatabase._id}?token=${token}`).expect(200).end(function(err, res) {
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
                testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var keys = ['_id', 'name']; // Include _id every time because it is returned by the API in every case!
                    superTest(server).get(`/api/clients/${clientFromDatabase._id}?token=${token}&fields=${keys.join('+')}`).expect(200).end(function(err, res) {
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
            return superTest(server).post('/api/clients')
                .send({ name: 'TestClient' })
                .expect(403);
        });

        it('responds with 403 when the logged in user\'s (normal user) client has no access to this module', function() {
            return testHelpers.removeClientModule('1', 'clients').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    var newClient = {name: 'newName'};
                    return superTest(server).post(`/api/clients?token=${token}`).send(newClient).expect(403);
                });
            });
        });

        it('responds with 403 when the logged in user\'s (administrator) client has no access to this module', function() {
            return testHelpers.removeClientModule('1', 'clients').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                    var newClient = {name: 'newName'};
                    return superTest(server).post(`/api/clients?token=${token}`).send(newClient).expect(403);
                });
            });
        });

        it('responds with 403 without write permission', function() {
            // Remove the corresponding permission
            return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(() => {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var newClient = { 
                        name: 'newClient'
                    };
                    return superTest(server).post('/api/clients?token=' + token).send(newClient).expect(403);
                });
            });
        });

        it('responds with 400 when no client is given', function() {
            return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return superTest(server).post('/api/clients?token=' + token).send().expect(400);
            });
        });

        it('responds with inserted client containing an _id field', function(done) {
            testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                var newClient = { 
                    name: 'newClient'
                };
                superTest(server).post('/api/clients?token=' + token).send(newClient).expect(200).end((err, res) => {
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

        it('a client module assignment for the "base" module is created automatically', function(done) {
            testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                var newClient = { 
                    name: 'newClient'
                };
                superTest(server).post('/api/clients?token=' + token).send(newClient).expect(200).end((err, res) => {
                    if (err) return done(err);
                    var id = res.body._id;
                    db.get('clientmodules').findOne({clientId: monk.id(res.body._id)}).then(function(clientModuleFromDatabase){
                        assert.ok(clientModuleFromDatabase, 'No module assignment to "base" module created.');
                        done();
                    });
                });
            }).catch(done);
        });

    });

    describe('POST/newadmin', function() {

        it('responds with 400 when no user is given', function() {
            return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return superTest(server).post('/api/clients/newadmin?token=' + token).send().expect(400);
            });
        });

        it('responds with 400 when no username is given', function() {
            return db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var newAdmin = {
                        pass: 'password', // No username set
                        clientId: clientFromDatabase._id.toString()
                    };
                    return superTest(server).post('/api/clients/newadmin?token=' + token).send(newAdmin).expect(400);
                });
            });
        });

        it('responds with 409 when username is in use', function() {
            return db.get('users').findOne({ name : '1_0_0' }).then((userFromDatabase) => {
                return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var newAdmin = {
                        name: userFromDatabase.name,
                        pass: 'password',
                        clientId: userFromDatabase.clientId
                    };
                    return superTest(server).post('/api/clients/newadmin?token=' + token).send(newAdmin).expect(409);
                });
            });
        });

        it('responds with 400 when no clientId is given', function() {
            return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                var newAdmin = {
                    name: 'newAdmin',
                    pass: 'password'
                };
                return superTest(server).post('/api/clients/newadmin?token=' + token).send(newAdmin).expect(400);
            });
        });

        it('responds with 400 when clientId is invalid', function() {
            return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                var newAdmin = {
                    name: 'newAdmin',
                    pass: 'password',
                    clientId: 'dampfhappen'
                };
                return superTest(server).post('/api/clients/newadmin?token=' + token).send(newAdmin).expect(400);
            });
        });

        it('responds with 400 when there is no client with the given clientId', function() {
            return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                var newAdmin = {
                    name: 'newAdmin',
                    pass: 'password',
                    clientId: '999999999999999999999999'
                };
                return superTest(server).post('/api/clients/newadmin?token=' + token).send(newAdmin).expect(400);
            });
        });

        it('responds with 403 without authentication', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                var newAdmin = {
                    name: 'newAdmin',
                    pass: 'parola',
                    clientId: clientFromDatabase._id
                };
                return superTest(server).post(`/api/clients/newadmin`).send(newAdmin).expect(403);
            });
        });

        it('responds with 403 when the logged in user\'s (normal user) client has no access to this module', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                return testHelpers.removeClientModule('1', 'clients').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        var newAdmin ={
                            name: 'newAdmin',
                            pass: 'parola',
                            clientId: clientFromDatabase._id
                        };
                        return superTest(server).post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(403);
                    });
                });
            });
        });

        it('responds with 403 when the logged in user\'s (administrator) client has no access to this module', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                return testHelpers.removeClientModule('1', 'clients').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        var newAdmin ={
                            name: 'newAdmin',
                            pass: 'parola',
                            clientId: clientFromDatabase._id
                        };
                        return superTest(server).post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(403);
                    });
                });
            });
        });

        it('responds with 403 without write permission', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                // Remove the corresponding permission
                return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(() => {
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        var newAdmin ={
                            name: 'newAdmin',
                            pass: 'parola',
                            clientId: clientFromDatabase._id
                        };
                        return superTest(server).post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(403);
                    });
                });
            });
        });

        it('responds with 200 and creates a new admin in a new user group with the same name as the username', function() {
            return db.get('clients').findOne({name: '1'}).then((clientFromDatabase) => {
                return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var newAdminName = '1_newAdmin';
                    var newAdmin = {
                        name: newAdminName,
                        pass: 'password',
                        clientId: clientFromDatabase._id.toString()
                    };
                    return superTest(server).post('/api/clients/newadmin?token=' + token).send(newAdmin).expect(200).then((res) => {
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
                return superTest(server).put('/api/clients/' + clientId)
                    .send({ name: 'OtherClientName' })
                    .expect(403);
            });
        });

        it('responds with 403 when the logged in user\'s (normal user) client has no access to this module', function() {
            return db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                return testHelpers.removeClientModule('1', 'clients').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var updatedClient = {
                            name: 'newName'
                        };
                        return superTest(server).put(`/api/clients/${clientFromDatabase._id}?token=${token}`).send(updatedClient).expect(403);
                    });
                });
            });
        });

        it('responds with 403 when the logged in user\'s (administrator) client has no access to this module', function() {
            return db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                return testHelpers.removeClientModule('1', 'clients').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        var updatedClient = {
                            name: 'newName'
                        };
                        return superTest(server).put(`/api/clients/${clientFromDatabase._id}?token=${token}`).send(updatedClient).expect(403);
                    });
                });
            });
        });

        it('responds with 403 without write permission', function() {
            return db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                // Remove the corresponding permission
                return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(() => {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var updatedClient = {
                            name: 'newName'
                        };
                        return superTest(server).put(`/api/clients/${clientFromDatabase._id}?token=${token}`).send(updatedClient).expect(403);
                    });
                });
            });
        });

        it('responds with 400 when the id is invalid', function() {
            var updatedClient = {
                name: 'newName'
            };
            return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return superTest(server).put('/api/clients/invalidId?token=' + token).send(updatedClient).expect(400);
            });
        });

        it('responds with 400 when no client is given', function() {
            return db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    return superTest(server).put(`/api/clients/${clientFromDatabase._id}?token=${token}`).send().expect(400);
                });
            });
        });

        it('responds with a client with the original _id when a new _id is given (_id cannot be changed)', function(done) {
            db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var updatedClient = {
                        _id: '888888888888888888888888'
                    };
                    superTest(server).put(`/api/clients/${clientFromDatabase._id}?token=${token}`).send(updatedClient).expect(200).end((err, res) => {
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
            return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return superTest(server).put('/api/clients/999999999999999999999999?token=' + token).send(updatedClient).expect(404);
            });
        });

        it('responds with 404 when there is no client with the given id and when only _id is given as update value', function() {
            var updatedClient = {
                _id: '888888888888888888888888'
            };
            return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return superTest(server).put('/api/clients/999999999999999999999999?token=' + token).send(updatedClient).expect(404);
            });
        });

        it('responds with the updated client and its new properties', function(done) {
            db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var updatedClient = {
                        name: 'newName'
                    };
                    superTest(server).put(`/api/clients/${clientFromDatabase._id}?token=${token}`).send(updatedClient).expect(200).end((err, res) => {
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

        it('responds with 403 without authentication', function() {
            // Load a valid user id so we have a valid request and do not get a 404
            return db.get('clients').findOne({name: '0'}).then((client) => {
                return superTest(server).del('/api/clients/' + client._id.toString()).expect(403);
            });
        });

        it('responds with 403 when the logged in user\'s (normal user) client has no access to this module', function() {
            return db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                return testHelpers.removeClientModule('1', 'clients').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        return superTest(server).del(`/api/clients/${clientFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with 403 when the logged in user\'s (administrator) client has no access to this module', function() {
            return db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                return testHelpers.removeClientModule('1', 'clients').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        return superTest(server).del(`/api/clients/${clientFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with 403 without write permission', function() {
            return db.get('clients').findOne({ name : '1' }).then((clientFromDatabase) => {
                // Remove the corresponding permission
                return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(() => {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        return superTest(server).del(`/api/clients/${clientFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with 400 when the id is invalid', function() {
            return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return superTest(server).delete('/api/clients/invalidId?token=' + token).expect(400);
            });
        });

        it('responds with 404 when there is no client for the given id', function() {
            return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return superTest(server).delete('/api/clients/999999999999999999999999?token=' + token).expect(404);
            });
        });

        it('responds with 204 and deletes all dependent objects (activities, clientmodules, documents, fmobjects, folders, permissions, usergroups, users)', function(done) {
            db.get('clients').findOne({ name : '0' }).then((clientFromDatabase) => {
                testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    var clientId = clientFromDatabase._id;
                    superTest(server).delete(`/api/clients/${clientId}?token=${token}`).expect(204).then((res) => {
                        var dependentCollections = constants.collections;
                        async.eachSeries(dependentCollections, (dependentCollection, callback) => {
                            db.get(dependentCollection).count({ clientId: clientId }, (err, count) => {
                                if (err) {
                                    callback(err);
                                    return;
                                }
                                assert.equal(count, 0, `Not all ${dependentCollection} of the deleted client were also deleted`);
                                callback();
                            });
                        }, (err) => {
                            if (err) {
                                done(err);
                            } else {
                                done();
                            }
                        });
                    });
                });
            });
        });

        xit('All relations, where the element is the source (type1, id1), are also deleted', function() {
        });

        xit('All relations, where the element is the target (type2, id2), are also deleted', function() {
        });

    });

});
