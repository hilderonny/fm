/**
 * UNIT Tests for api/users
 * @example npm run-script testlocal
 * @see http://softwareengineering.stackexchange.com/a/223376 for running async tasks in parallel
 */
var assert = require('assert');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');
var bcryptjs =  require('bcryptjs');


describe('API users', function() {

    var server = require('../../app');
    
    // Clear and prepare database with clients, user groups and users
    beforeEach(() => {
        return testHelpers.cleanDatabase()
            .then(testHelpers.prepareClients)
            .then(testHelpers.prepareClientModules)
            .then(testHelpers.prepareUserGroups)
            .then(testHelpers.prepareUsers)
            .then(testHelpers.preparePermissions)
            .then(testHelpers.prepareRelations);
    });

    describe('GET/', function() {

        it('responds without authentication with 403', function() {
            return superTest(server).get('/api/users').expect(403);
        });

        it('responds without read permission with 403', function() {
            // Remove the corresponding permission
            return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_ADMINISTRATION_USER').then(() => {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return superTest(server).get('/api/users?token=' + token).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return testHelpers.removeClientModule('1', 'base').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return superTest(server).get(`/api/users?token=${token}`).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return testHelpers.removeClientModule('1', 'base').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                    return superTest(server).get(`/api/users?token=${token}`).expect(403);
                });
            });
        });

        it('responds with list of all users of the client of the logged in user containing all details', function(done) {
            // We use client 1
            testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                superTest(server)
                    .get('/api/users?token=' + token)
                    .expect(200)
                    .end(function(err, res) {
                        var users = res.body;
                        // Check whether all users of the current client and all of their details are contained in the response
                        assert.strictEqual(users.length, 4, `Number of users differ (actual ${users.length}, expected 4)`); // 2 user groups with 2 users each;
                        // Get client of current user
                        db.get('users').findOne({name: '1_0_0'}).then((currentUser) => {
                            var currentUserClientId = currentUser.clientId.toString();
                            users.forEach((user) => {
                                // Check properties for existence
                                ['name', 'clientId', 'userGroupId'].forEach((propertyName) => {
                                    assert.ok(user[propertyName], `Property "${propertyName}" is missing`);
                                });
                                // Check clientId for correctness
                                assert.strictEqual(user.clientId, currentUserClientId, `ClientId of user in list (${user.clientId}) does not match the clientId of the logged in user (${currentUserClientId})`);
                            });
                            done();
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

        xit('returns a list of users with all details for the given IDs', function() {
        });
    });

    describe('GET/?userGroupId', function() {

        it('responds with invalid userGroupId with 400', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return superTest(server).get(`/api/users/?token=${token}&userGroupId=invalidId`).expect(400);
            });
        });

        it('responds with list of all users of the given usergroup containing all details', function(done) {
            db.get('usergroups').findOne({name: '1_0'}).then((userGroup) => {
                var currentUserGroupId = userGroup._id.toString();
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    superTest(server)
                        .get(`/api/users?token=${token}&userGroupId=${currentUserGroupId}`)
                        .expect(200)
                        .end(function(err, res) {
                            var users = res.body;
                            // Check whether all users of the current usergroup and all of their details are contained in the response
                            assert.strictEqual(users.length, 2, `Number of users differ (actual ${users.length}, expected 2)`);
                            // Get client of current user
                            db.get('users').findOne({name: '1_0_0'}).then((currentUser) => {
                                var currentUserClientId = currentUser.clientId.toString();
                                users.forEach((user) => {
                                    // Check properties for existence
                                    ['name', 'clientId', 'userGroupId'].forEach((propertyName) => {
                                        assert.ok(user[propertyName], `Property "${propertyName}" is missing`);
                                    });
                                    // Check clientId for correctness
                                    assert.strictEqual(user.clientId, currentUserClientId, `ClientId of user in list (${user.clientId}) does not match the clientId of the logged in user (${currentUserClientId})`);
                                    assert.strictEqual(user.userGroupId, currentUserGroupId, `UserGroupId of user in list (${user.userGroupId}) does not match the userGroupId of the logged in user (${currentUserGroupId})`);
                                });
                                done();
                            }).catch(done);
                        });
                });
            });
        });
        
    });

    describe('GET/:id', function() {

        it('responds without authentication with 403', function() {
            // Load a valid user id so we have a valid request and do not get a 404
            return db.get('users').findOne({name: '1_0_0'}).then((user) => {
                return superTest(server).get('/api/users/' + user._id.toString()).expect(403);
            });
        });

        it('responds without read permission with 403', function() {
            return db.get('users').findOne({ name : '1_0_0' }).then((userFromDatabase) => {
                // Remove the corresponding permission
                return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_ADMINISTRATION_USER').then(() => {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        return superTest(server).get(`/api/users/${userFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('users').findOne({name: '1_0_0'}).then((userFormDB) => {
                return testHelpers.removeClientModule('1', 'base').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var userId = userFormDB._id;
                        return superTest(server).get(`/api/users/${userId}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('users').findOne({name: '1_0_0'}).then((userFormDB) => {
                return testHelpers.removeClientModule('1', 'base').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        var userId = userFormDB._id;
                        return superTest(server).get(`/api/users/${userId}?token=${token}`).expect(403);
                    });
                });
            });
        });
        
        it('responds with invalid id with 400', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return superTest(server).get('/api/users/invalidId?token=' + token).expect(400);
            });
        });

        it('responds with not existing user id with 403', function() {
            // Here the validateSameClientId comes into the game and returns a 403 because the requested element is
            // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return superTest(server).get('/api/users/999999999999999999999999?token=' + token).expect(403);
            });
        });

        it('responds with existing user id with all details of the user', function(done) {
            db.get('users').findOne({name: '1_1_0'}).then((userFromDatabase) => {
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    superTest(server)
                        .get(`/api/users/${userFromDatabase._id}?token=${token}`)
                        .expect(200)
                        .end(function(err, res) {
                            var userFromRequest = res.body;
                            assert.strictEqual(userFromRequest.name, userFromDatabase.name, `Name of user in database does not match name of user from API ("${userFromDatabase.name}" vs. "${userFromRequest.name}")`);
                            assert.strictEqual(userFromRequest.userGroupId, userFromDatabase.userGroupId.toString(), `userGroupId of user in database does not match the one from API ("${userFromDatabase.userGroupId}" vs. "${userFromRequest.userGroupId}")`);
                            assert.strictEqual(userFromRequest.clientId, userFromDatabase.clientId.toString(), `clientId of user in database does not match the one from API ("${userFromDatabase.clientId}" vs. "${userFromRequest.clientId}")`);
                            assert.strictEqual(userFromRequest.isAdmin, userFromDatabase.isAdmin, `isAdmin property of user in database does not match the one from API ("${userFromDatabase.isAdmin}" vs. "${userFromRequest.isAdmin}")`);
                            done();
                        });
                }).catch(done);
            });
        });
        
        it('responds with existing user id and specific fields with details of user containing only the given fields', function(done) {
            db.get('users').findOne({name: '1_1_0'}).then((userFromDatabase) =>{
                testHelpers.doLoginAndGetToken('1_1_0', 'test').then((token) =>{
                    var keys = ['_id', 'name']; 
                    superTest(server).get(`/api/users/${userFromDatabase._id}?token=${token}&fields=${keys.join('+')}`).expect(200).end(function(err, res){
                        if (err) {
                            done(err);
                            return;
                        }
                        var userFromApi = res.body;
                        var keyCountFromApi = Object.keys(userFromApi).length;
                        var keyCountFromDatabase = keys.length;
                        assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of user ${userFromApi._id} differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                        assert.strictEqual(userFromApi._id, userFromDatabase._id.toString(), `User id from Api: ${userFromApi._id} differs user id in DB: ${userFromDatabase._id.toString()} `); //compare ID values
                        assert.strictEqual(userFromApi.name, userFromDatabase.name.toString(), `User id from Api: ${userFromApi.name} differs user id in DB: ${userFromDatabase.name.toString()} `);                   
                    done();
                    });
                });
            });
        });

        it('responds with an id of an existing user which does not belong to the same client as the logged in user with 403', function() {
            //user.clientId != loggedInUser.clientId
            //logg-in as user for client 1, but try to retrieve user of client 2
            return db.get('users').findOne({name:'0_0_0'}).then(function(userFromDatabase){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var id = userFromDatabase._id.toString();
                    return superTest(server).get(`/api/users/${id}?token=${token}`).expect(403);
                });
            });
        });
        
    });

    describe('POST/', function() {
        
        it('responds without write permission with 403', function() {
            // Remove the corresponding permission
            return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_USER').then(() => {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var newUser = { 
                        name: 'newUser'
                    };
                    return superTest(server).post('/api/users?token=' + token).send(newUser).expect(403);
                });
            });
        });

        it('responds without authentication with 403', function() {
            return db.get('usergroups').findOne({name: '1_0'}).then((userGroup) => {
                return superTest(server).post('/api/users')
                    .send({ name: 'schnulli', pass: 'bulli', userGroupId: userGroup._id.toString() })
                    .expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return testHelpers.removeClientModule('1', 'base').then(function() {
                return db.get('usergroups').findOne({name: '1_1'}).then((userGroupFromDB) => {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var newUser = { 
                            name: 'newName',
                            pass: 'test',
                            userGroupId: userGroupFromDB._id,
                            clientId: userGroupFromDB.clientId,
                        };
                        return superTest(server).post(`/api/users?token=${token}`).send(newUser).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return testHelpers.removeClientModule('1', 'base').then(function() {
                return db.get('usergroups').findOne({name: '1_1'}).then((userGroupFromDB) => {
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        var newUser = { 
                            name: 'newName',
                            pass: 'test',
                            userGroupId: userGroupFromDB._id,
                            clientId: userGroupFromDB.clientId,
                        };
                        return superTest(server).post(`/api/users?token=${token}`).send(newUser).expect(403);
                    });
                });
            });
        });

        it('responds without giving an user with 400', function(done) {
            testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    superTest(server)
                        .post('/api/users')
                        .expect(400)
                        .end(function(err, res){
                            done();})
                });      
        });

        it('responds without giving an username with 400', function() {
            return db.get('users').findOne({name: '1_1_0'}).then((userFromDatabase) =>{
                return  testHelpers.doLoginAndGetToken('1_1_0', 'test').then((token) => {
                    return  superTest(server)
                        .post('/api/users?token=' + token)
                        .send({pass : 'test', userGroupId: userFromDatabase.userGroupId.toString()})
                        .expect(400);
                });
            });
        });

        it('responds without giving an user password with 400', function() {
            return db.get('users').findOne({name: '1_1_0'}).then((userFromDatabase) =>{
                return  testHelpers.doLoginAndGetToken('1_1_0', 'test').then((token) => {
                    return  superTest(server)
                        .post('/api/users?token=' + token)
                        .send({name : '1_0_4', userGroupId :userFromDatabase.userGroupId.toString()})
                        .expect(400);
                });
            });
        });
        
        it('responds without giving an userGroupId with 400', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return superTest(server)
                        .post('/api/users?token=' + token)
                        .send({name : '1_0_4', pass : 'test'})
                        .expect(400);
                });
        });

        it('responds with already used username with 409', function() {
            return db.get('users').findOne({name: '1_1_0'}).then((userFromDatabase) =>{
            return  testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return  superTest(server)
                        .post('/api/users?token=' + token)
                        .send({name : userFromDatabase.name, pass : 'test', userGroupId :userFromDatabase.userGroupId.toString()})
                        .expect(409);
                });
            });
        }); 
    
        it('responds with not existing userGroup with 400', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
            return superTest(server)
                    .post('/api/users?token=' + token)
                    .send({name : '1_1_6', pass : 'test', userGroupId : '999999999999999999999999'})
                    .expect(400);
            });
        });
        
        it('responds with correct user data with inserted user containing an _id field', function(done) {
            db.get('users').findOne({name: '1_1_0'}).then(function(userFromDatabase){ //request user to get valid userGroupId and clientId
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    var newUser = {name: '1_1_4', 
                                pass: 'test',
                                userGroupId: userFromDatabase.userGroupId.toString(),
                                clientId: userFromDatabase.clientId.toString()};
                                
                    superTest(server).post('/api/users?token=' + token)
                                    .send(newUser).expect(200)
                                    .end(function(err, res) {
                        if(err){
                                done(err);
                                return;
                            }
                        var userFromApi = res.body;
                        var keyCountFromApi = Object.keys(userFromApi).length - 1; // _id is returned additionally
                        var keys = Object.keys(newUser);
                        var keyCountFromDatabase =  keys.length; 
                        assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of new user differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                        assert.strictEqual( newUser.name, userFromApi.name, 'Names do not match');
                        assert.ok(bcryptjs.compareSync(newUser.pass, userFromApi.pass), 'Passwords do not match');
                        assert.strictEqual( newUser.clientId, userFromApi.clientId, 'clientIds do not match');
                        assert.strictEqual( newUser.userGroupId, userFromApi.userGroupId, 'userGroupIds do not match');
                        done();
                    });
                });
            });
        });

    });

    describe('POST/newpassword', function() {

        xit('responds with 403 without authentication', function() {
        });

        xit('responds with 403 without write permission', function() {
        });

        xit('responds with 403 when the logged in user\'s (normal user) client has no access to this module', function() {
        });

        xit('responds with 403 when the logged in user\'s (administrator) client has no access to this module', function() {
        });

        xit('responds with 400 without giving a password as parameter', function() {
        });

        it('responds with 200 with giving an empty password and updates the password in the database (empty passwords are okay)', function(done) {
            db.get('users').findOne({name: '1_0_0'}).then((userFromDatabase) => {
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var objectToSend = {
                        pass: ''
                    };
                    superTest(server)
                        .post(`/api/users/newpassword?token=${token}`)
                        .send(objectToSend)
                        .expect(200)
                        .end((err, res) =>{
                            if (err) {
                                done(err);
                                return;
                            }
                            db.get('users').findOne({name: '1_0_0'}).then(function getUserAfterPasswordChange(userAfterPasswordChange) {
                                assert.ok(bcryptjs.compareSync(objectToSend.pass, userAfterPasswordChange.pass), `Password of updated user does not match the on in the database`);
                                done();
                            }).catch(done);
                    });
                });
            });
        });

        xit('responds with 200 with giving a correct new password and updates the password in the database', function() {
        });

    });

    describe('PUT/:id', function() {

        it('responds without authentication with 403', function() {
            return db.get('users').findOne({name: '1_0_0'}).then((user) => {
                var userId = user._id.toString();
                return superTest(server).put('/api/users/' + userId)
                    .send({ name: 'othername', pass: 'otherpassword' })
                    .expect(403);
            });
        });

        it('responds without write permission with 403', function() {
            return db.get('users').findOne({ name : '1_0_0' }).then((userFromDatabase) => {
                // Remove the corresponding permission
                return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_USER').then(() => {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var updatedUser = {
                            name: 'newName'
                        };
                        return superTest(server).put(`/api/users/${userFromDatabase._id}?token=${token}`).send(updatedUser).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('users').findOne({ name : '1_1_0' }).then((userFromDatabase) => {
                return testHelpers.removeClientModule('1', 'base').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var updatedUser = {
                            name: 'newName'
                        };
                        return superTest(server).put(`/api/users/${userFromDatabase._id}?token=${token}`).send(updatedUser).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('users').findOne({ name : '1_1_0' }).then((userFromDatabase) => {
                return testHelpers.removeClientModule('1', 'base').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        var updatedUser = {
                            name: 'newName'
                        };
                        return superTest(server).put(`/api/users/${userFromDatabase._id}?token=${token}`).send(updatedUser).expect(403);
                    });
                });
            });
        });

        it('responds with an invalid id with 400', function() {
            return testHelpers.doLoginAndGetToken('1_1_0', 'test').then((token) =>{
                return superTest(server)
                    .put('/api/users/invalidID?token=' + token)
                    .expect(400);
            });
        });

        it('responds without giving an user with 400', function() {
            return db.get('users').findOne({name: '1_1_0'}).then((userFromDatabase) =>{
            return testHelpers.doLoginAndGetToken('1_1_0', 'test').then((token) => {
                return  superTest(server)
                        .put(`/api/users/${userFromDatabase._id}?token=${token}`)
                        .send()
                        .expect(400);
                });
            }); 
        });
        
        it('responds with an user containing an _id field which differs from the id parameter with the updated user (_id cannot be changed)', function(done) {
            db.get('users').findOne({name: '1_1_0'}).then((userFromDatabase) => {
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var updatedUser = {
                        _id: '888888888888888888888888',
                        name: 'Need for another property'
                    };
                    superTest(server)
                        .put(`/api/users/${userFromDatabase._id}?token=${token}`)
                        .send(updatedUser)
                        .expect(200)
                        .end(function(err, res) {
                            if(err){
                                done(err);
                                return;
                            }
                            var idFromApiResult = res.body._id;
                            assert.strictEqual(idFromApiResult, userFromDatabase._id.toString(), `_id cannot be changed ("${idFromApiResult}" vs. "${userFromDatabase._id}")`);
                            done();
                    });
                });
            });
        });
    
        it('responds with an user containing a different clientId with an updated user with the original clientId (clientId cannot be changed)', function(done) {
            db.get('users').findOne({name: '1_0_0'}).then((userFromDatabase) => { // Here we need to fetch user 1_0_0 because we renamed 1_1_0 in the previous test
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var updatedUser = {
                        clientId: '888888888888888888888888',
                        isAdmin: true // Need for another property, but do not use name, because we need the name in the next test
                    };
                    superTest(server)
                        .put(`/api/users/${userFromDatabase._id}?token=${token}`)
                        .send(updatedUser)
                        .expect(200)
                        .end(function(err, res) {
                            if (err) {
                                done(err);
                                return;
                            }
                            var idFromApiResult = res.body.clientId;
                            assert.strictEqual(idFromApiResult, userFromDatabase.clientId.toString(), `clientId cannot be changed ("${idFromApiResult}" vs. "${userFromDatabase.clientId}")`);
                            done();
                    });
                });
            });
        });
        
        it('responds with an user containing a new password with an updated user with the new password', function(done) {
            db.get('users').findOne({name: '1_0_0'}).then((userFromDatabase) => {
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var updatedUser = {
                        pass: 'newpass'
                    };
                    superTest(server)
                        .put(`/api/users/${userFromDatabase._id}?token=${token}`)
                        .send(updatedUser)
                        .expect(200)
                        .end((err, res) =>{
                            if (err) {
                                done(err);
                                return;
                            }
                            var userFromApi = res.body;       
                            var keyCountFromApi = Object.keys(userFromApi).length;
                            var keys = Object.keys(userFromDatabase);
                            var keyCountFromDatabase = keys.length;
                            assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of updated user differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                            assert.strictEqual(userFromApi._id.toString(), userFromDatabase._id.toString(), `_id of updated user differs (${userFromApi._id} from API, ${userFromDatabase._id} in database)`);
                            assert.strictEqual(userFromApi.name, userFromDatabase.name, `name of updated user differs (${userFromApi.name} from API, ${userFromDatabase.name} in database)`);
                            assert.strictEqual(userFromApi.userGroupId.toString(), userFromDatabase.userGroupId.toString(), `userGroupId of updated user differs (${userFromApi.userGroupId} from API, ${userFromDatabase.userGroupId} in database)`);
                            assert.strictEqual(userFromApi.clientId.toString(), userFromDatabase.clientId.toString(), `clientId of updated user differs (${userFromApi.clientId} from API, ${userFromDatabase.clientId} in database)`);
                            assert.strictEqual(userFromApi.isAdmin, userFromDatabase.isAdmin, `isAdmin of updated user differs (${userFromApi.isAdmin} from API, ${userFromDatabase.isAdmin} in database)`);
                            assert.notEqual(userFromApi._id.pass, userFromDatabase.pass, `Password seems to be still the old one`);
                            assert.ok(bcryptjs.compareSync(updatedUser.pass, userFromApi.pass), `Password of updated user does not match the on in the database`);
                            done();
                    });
                });
            });
        });
        
        it('responds without a new password with an updated user with the old password', function(done) {
            db.get('users').findOne({name: '1_1_0'}).then((userFromDatabase) => {
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var updatedUser = {name: 'newName'}
                    superTest(server).put(`/api/users/${userFromDatabase._id}?token=${token}`).send(updatedUser).expect(200).end(function(err,res){
                        if(err){
                            done(err);
                            return;
                        }
                    var userFromApi = res.body;
                    assert.strictEqual(updatedUser.name, userFromApi.name.toString(), 'User name differs');
                    assert.strictEqual(userFromDatabase.pass.toString(), userFromApi.pass, 'User pass differs'); 
                    done();
                    });
                });
            });
        });

        it('responds with an invalid userGroupId with 400', function() {
        return db.get('users').findOne({name: '1_0_0'}).then((userFromDatabase) => {
            var userID = userFromDatabase._id;   
            var updatedUser = {
                    userGroupId: 'newGroup'
                };
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return superTest(server).put('/api/users/' + userID +'?token=' + token).send(updatedUser).expect(400);
                });
            });
        });

        it('responds with a new userGroupId which does not exist with 400', function() {
        return db.get('users').findOne({name: '1_0_0'}).then((userFromDatabase) => {
            var userID = userFromDatabase._id;   
            var updatedUser = {
                    userGroupId: '999999999999999999999999'
                };
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return superTest(server).put('/api/users/' + userID +'?token=' + token).send(updatedUser).expect(400);
                });
            });
        });

        it('responds with an id that does not exist with 403', function() {
            var updatedUser = {
                name: 'newName'
            };
            // Here the validateSameClientId comes into the game and returns a 403 because the requested element is
            // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return superTest(server).put('/api/users/999999999999999999999999?token=' + token).send(updatedUser).expect(403);
            });
        });
        
        it('responds with already used username with 409', function() {
            return db.get('users').findOne({name: '1_1_0'}).then((userFromDatabase) =>{
            return  testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return superTest(server)
                        .put(`/api/users/${userFromDatabase._id}?token=${token}`)
                        .send({name : '1_0_0'})
                        .expect(409);
                });
            });
        });

        it('responds with a correct user with the updated user and its new properties', function(done) {
            db.get('users').findOne({name: '1_1_0'}).then((userFromDatabase) => {
                testHelpers.doLoginAndGetToken('1_1_0', 'test').then((token) =>{
                    var updatedUser = { name: 'newName', pass: 'newPass' }
                    superTest(server).put(`/api/users/${userFromDatabase._id}?token=${token}`).send(updatedUser).expect(200).end(function(err,res){
                        if(err){
                            done(err);
                            return;
                        }
                    var userFromApi = res.body;
                    assert.strictEqual(updatedUser.name, userFromApi.name.toString(), 'User name differs');
                    assert.ok(bcryptjs.compareSync(updatedUser.pass,  userFromApi.pass), 'User pass differs'); 
                    done();
                    });
                });
            });
        });
        
        it('responds with a new userGroup with an updated user with the new userGroupId', function(done) {
            db.get('users').findOne({name: '1_1_0'}).then((userG1FromDB) =>{ //request a user from group 1
                db.get('users').findOne({name: '1_0_0'}).then((userG0FromDB) =>{  //request a user from group 0 from the same client
                    testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                            var updatedUser = {
                                name: '1_newGroup_0',
                                userGroupId: userG1FromDB.userGroupId
                            }
                            superTest(server).put(`/api/users/${userG0FromDB._id}?token=${token}`).send(updatedUser).expect(200).end((err,res) =>{
                                if(err){
                                    done(err);
                                    return;
                                }
                                var updatedUserFromApi = res.body;
                                assert.strictEqual(updatedUser.userGroupId.toString(), updatedUserFromApi.userGroupId.toString(), 'UserGroupId differs, update failed');
                                //assert.strictEqual(updatedUser.name.toString(), updatedUserFromApi.name.toString(), 'User name differs');
                                done();
                            });
                    }).catch(done);
                }); 
            });
        });

        it('responds with an id of an existing user which does not belong to the same client as the logged in user with 403', function() {
            //user.clientId != loggedInUser.clientId
            return db.get('users').findOne({name:'0_0_0'}).then(function(userFromDatabase){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var id = userFromDatabase._id.toString();
                    var updatedUser = {name: 'newName'};
                    return superTest(server).put(`/api/users/${id}?token=${token}`).send(updatedUser).expect(403);
                });
            });
        });
        
    });

    describe('DELETE/:id', function() {

        it('responds without authentication with 403', function() {
            // Load a valid user id so we have a valid request and do not get a 404
            return db.get('users').findOne({name: '1_0_0'}).then((user) => {
                return superTest(server).del('/api/users/' + user._id.toString()).expect(403);
            });
        });

        it('responds without write permission with 403', function() {
            return db.get('users').findOne({ name : '1_0_0' }).then((userFromDatabase) => {
                // Remove the corresponding permission
                return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_USER').then(() => {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        return superTest(server).del(`/api/users/${userFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('users').findOne({ name : '1_1_0' }).then((userFromDatabase) => {
                return testHelpers.removeClientModule('1', 'base').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        return superTest(server).del(`/api/users/${userFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('users').findOne({ name : '1_1_0' }).then((userFromDatabase) => {
                return testHelpers.removeClientModule('1', 'base').then(function() {
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        return superTest(server).del(`/api/users/${userFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });
        
        it('responds with an invalid id with 400', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return superTest(server).del('/api/users/invalidId?token=' + token).expect(400);
            });
        });
        
        it('responds with an id where no user exists with 403', function() {
            // Here the validateSameClientId comes into the game and returns a 403 because the requested element is
            // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return superTest(server).del('/api/users/999999999999999999999999?token=' + token).expect(403);
            });
        });

        it('responds with a correct id with 204', function() {
            return db.get('users').findOne({name:'1_1_0'}).then(function(userFromDatabase){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return superTest(server).del('/api/users/' + userFromDatabase._id.toString() + '?token=' + token).expect(204);
                });
            });
        });

        it('responds with an id of an existing user which does not belong to the same client as the logged in user with 403', function() {
            //user.clientId != loggedInUser.clientId
            //logg-in as user for client 1, but try to delete user of client 2
            return db.get('users').findOne({name:'0_0_0'}).then(function(userFromDatabase){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var id = userFromDatabase._id.toString();
                    return superTest(server).del(`/api/users/${id}?token=${token}`).expect(403);
                });
            });
        });

        xit('All relations, where the element is the source (type1, id1), are also deleted', function() {
        });

        xit('All relations, where the element is the target (type2, id2), are also deleted', function() {
        });
        
    });

});
