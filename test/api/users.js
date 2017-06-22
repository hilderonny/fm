/**
 * UNIT Tests for api/users
 * @example npm run-script testlocal
 * @see http://softwareengineering.stackexchange.com/a/223376 for running async tasks in parallel
 */
var assert = require('assert');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var bcryptjs =  require('bcryptjs');
var co = require('../../utils/constants');

describe('API users', function() {
    
    // Clear and prepare database with clients, user groups and users
    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions)
            .then(th.prepareRelations);
    });

    describe('GET/', function() {

        th.apiTests.get.defaultNegative(co.apis.users, co.permissions.ADMINISTRATION_USER);

        it('responds with list of all users of the client of the logged in user containing all details', function(done) {
            // We use client 1
            th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                th
                    .get(`/api/${co.apis.users}?token=${token}`)
                    .expect(200)
                    .end(function(err, res) {
                        var users = res.body;
                        // Check whether all users of the current client and all of their details are contained in the response
                        assert.strictEqual(users.length, 4, `Number of users differ (actual ${users.length}, expected 4)`); // 2 user groups with 2 users each;
                        // Get client of current user
                        db.get(co.collections.users).findOne({name: th.defaults.user}).then((currentUser) => {
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
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return th.get(`/api/users/?token=${token}&userGroupId=invalidId`).expect(400);
            });
        });

        it('responds with list of all users of the given usergroup containing all details', function(done) {
            db.get('usergroups').findOne({name: '1_0'}).then((userGroup) => {
                var currentUserGroupId = userGroup._id.toString();
                th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    th
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

        th.apiTests.getId.defaultNegative(co.apis.users, co.permissions.ADMINISTRATION_USER, co.collections.users);
        th.apiTests.getId.clientDependentNegative(co.apis.users, co.collections.users);

        it('responds with existing user id with all details of the user', function(done) {
            db.get(co.collections.users).findOne({name: '1_1_0'}).then((userFromDatabase) => {
                th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                    th
                        .get(`/api/${co.apis.users}/${userFromDatabase._id}?token=${token}`)
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
                th.doLoginAndGetToken('1_1_0', 'test').then((token) =>{
                    var keys = ['_id', 'name']; 
                    th.get(`/api/users/${userFromDatabase._id}?token=${token}&fields=${keys.join('+')}`).expect(200).end(function(err, res){
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
        
    });

    describe('POST/', function() {

        th.apiTests.post.defaultNegative(co.apis.users, co.permissions.ADMINISTRATION_USER);

        it('responds without giving an username with 400', function() {
            var newUser = {
                pass: 'test'
            };
            return db.get(co.collections.users).findOne({name: '1_1_0'}).then((user) =>{
                newUser.userGroupId = user.userGroupId.toString();
                return  th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then((token) => {
                return th.post(`/api/${co.apis.users}?token=${token}`).send(newUser).expect(400);
            });
        });

        it('responds without giving an user password with 400', function() {
            var newUser = {
                name: 'newUser'
            };
            return db.get(co.collections.users).findOne({name: '1_1_0'}).then((user) =>{
                newUser.userGroupId = user.userGroupId.toString();
                return  th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then((token) => {
                return th.post(`/api/${co.apis.users}?token=${token}`).send(newUser).expect(400);
            });
        });
        
        it('responds without giving an userGroupId with 400', function() {
            var newUser = {
                name: 'newUser', 
                pass: 'test'
            };
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                return th.post(`/api/${co.apis.users}?token=${token}`).send(newUser).expect(400);
            });
        });

        it('responds with already used username with 409', function() {
            var newUser = {
                name: '1_0_0', 
                pass: 'test'
            };
            return db.get('users').findOne({name: '1_1_0'}).then((user) =>{
                newUser.userGroupId = user.userGroupId.toString();
                return  th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then((token) => {
                return th.post(`/api/${co.apis.users}?token=${token}`).send(newUser).expect(409);
            });
        }); 
    
        it('responds with not existing userGroup with 400', function() {
            var newUser = {
                name: 'newUser', 
                pass: 'test', 
                userGroupId: '999999999999999999999999'
            };
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                return th.post(`/api/${co.apis.users}?token=${token}`).send(newUser).expect(400);
            });
        });
        
        it('responds with correct user data with inserted user containing an _id field', function() {
            var newUser = {
                name: 'newUser',
                pass: 'test'
            }
            return db.get(co.collections.users).findOne({name: '1_1_0'}).then(function(user) {
                newUser.userGroupId = user.userGroupId.toString();
                newUser.clientId = user.clientId.toString();
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post(`/api/${co.apis.users}?token=${token}`).send(newUser).expect(200);
            }).then(function(response) {
                var userFromApi = response.body;
                var keyCountFromApi = Object.keys(userFromApi).length - 1; // _id is returned additionally
                var keys = Object.keys(newUser);
                var keyCountFromDatabase =  keys.length; 
                assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of new user differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                assert.strictEqual( newUser.name, userFromApi.name, 'Names do not match');
                assert.ok(bcryptjs.compareSync(newUser.pass, userFromApi.pass), 'Passwords do not match');
                assert.strictEqual( newUser.clientId, userFromApi.clientId, 'clientIds do not match');
                assert.strictEqual( newUser.userGroupId, userFromApi.userGroupId, 'userGroupIds do not match');
                return Promise.resolve();
            });
        });

    });

    describe('POST/newpassword', function() {

        var api = `${co.apis.users}/newpassword`;

        th.apiTests.post.defaultNegative(api, co.permissions.SETTINGS_USER);

        it('responds with 200 with giving an empty password and updates the password in the database (empty passwords are okay)', function() {
            var objectToSend = {
                pass: ''
            };
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.post(`/api/${api}?token=${token}`).send(objectToSend).expect(200);
            }).then(function() {
                return db.get(co.collections.users).findOne({name: th.defaults.user});
            }).then(function(userAfterPasswordChange) {
                assert.ok(bcryptjs.compareSync(objectToSend.pass, userAfterPasswordChange.pass), `Password of updated user does not match the one in the database`);
                return Promise.resolve();
            });
        });

        xit('responds with 200 with giving a correct new password and updates the password in the database', function() {
        });

    });

    describe('PUT/:id', function() {

        it('responds without authentication with 403', function() {
            return db.get('users').findOne({name: '1_0_0'}).then((user) => {
                var userId = user._id.toString();
                return th.put('/api/users/' + userId)
                    .send({ name: 'othername', pass: 'otherpassword' })
                    .expect(403);
            });
        });

        it('responds without write permission with 403', function() {
            return db.get('users').findOne({ name : '1_0_0' }).then((userFromDatabase) => {
                // Remove the corresponding permission
                return th.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_USER').then(() => {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var updatedUser = {
                            name: 'newName'
                        };
                        return th.put(`/api/users/${userFromDatabase._id}?token=${token}`).send(updatedUser).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('users').findOne({ name : '1_1_0' }).then((userFromDatabase) => {
                return th.removeClientModule('1', 'base').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var updatedUser = {
                            name: 'newName'
                        };
                        return th.put(`/api/users/${userFromDatabase._id}?token=${token}`).send(updatedUser).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('users').findOne({ name : '1_1_0' }).then((userFromDatabase) => {
                return th.removeClientModule('1', 'base').then(function() {
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        var updatedUser = {
                            name: 'newName'
                        };
                        return th.put(`/api/users/${userFromDatabase._id}?token=${token}`).send(updatedUser).expect(403);
                    });
                });
            });
        });

        it('responds with an invalid id with 400', function() {
            return th.doLoginAndGetToken('1_1_0', 'test').then((token) =>{
                return th
                    .put('/api/users/invalidID?token=' + token)
                    .expect(400);
            });
        });

        it('responds without giving an user with 400', function() {
            return db.get('users').findOne({name: '1_1_0'}).then((userFromDatabase) =>{
            return th.doLoginAndGetToken('1_1_0', 'test').then((token) => {
                return  th
                        .put(`/api/users/${userFromDatabase._id}?token=${token}`)
                        .send()
                        .expect(400);
                });
            }); 
        });
        
        it('responds with an user containing an _id field which differs from the id parameter with the updated user (_id cannot be changed)', function(done) {
            db.get('users').findOne({name: '1_1_0'}).then((userFromDatabase) => {
                th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var updatedUser = {
                        _id: '888888888888888888888888',
                        name: 'Need for another property'
                    };
                    th
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
                th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var updatedUser = {
                        clientId: '888888888888888888888888',
                        isAdmin: true // Need for another property, but do not use name, because we need the name in the next test
                    };
                    th
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
                th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var updatedUser = {
                        pass: 'newpass'
                    };
                    th
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
                th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var updatedUser = {name: 'newName'}
                    th.put(`/api/users/${userFromDatabase._id}?token=${token}`).send(updatedUser).expect(200).end(function(err,res){
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
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return th.put('/api/users/' + userID +'?token=' + token).send(updatedUser).expect(400);
                });
            });
        });

        it('responds with a new userGroupId which does not exist with 400', function() {
        return db.get('users').findOne({name: '1_0_0'}).then((userFromDatabase) => {
            var userID = userFromDatabase._id;   
            var updatedUser = {
                    userGroupId: '999999999999999999999999'
                };
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return th.put('/api/users/' + userID +'?token=' + token).send(updatedUser).expect(400);
                });
            });
        });

        it('responds with an id that does not exist with 403', function() {
            var updatedUser = {
                name: 'newName'
            };
            // Here the validateSameClientId comes into the game and returns a 403 because the requested element is
            // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return th.put('/api/users/999999999999999999999999?token=' + token).send(updatedUser).expect(403);
            });
        });
        
        it('responds with already used username with 409', function() {
            return db.get('users').findOne({name: '1_1_0'}).then((userFromDatabase) =>{
            return  th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return th
                        .put(`/api/users/${userFromDatabase._id}?token=${token}`)
                        .send({name : '1_0_0'})
                        .expect(409);
                });
            });
        });

        it('responds with a correct user with the updated user and its new properties', function(done) {
            db.get('users').findOne({name: '1_1_0'}).then((userFromDatabase) => {
                th.doLoginAndGetToken('1_1_0', 'test').then((token) =>{
                    var updatedUser = { name: 'newName', pass: 'newPass' }
                    th.put(`/api/users/${userFromDatabase._id}?token=${token}`).send(updatedUser).expect(200).end(function(err,res){
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
                    th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                            var updatedUser = {
                                name: '1_newGroup_0',
                                userGroupId: userG1FromDB.userGroupId
                            }
                            th.put(`/api/users/${userG0FromDB._id}?token=${token}`).send(updatedUser).expect(200).end((err,res) =>{
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
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var id = userFromDatabase._id.toString();
                    var updatedUser = {name: 'newName'};
                    return th.put(`/api/users/${id}?token=${token}`).send(updatedUser).expect(403);
                });
            });
        });
        
    });

    describe('DELETE/:id', function() {

        it('responds without authentication with 403', function() {
            // Load a valid user id so we have a valid request and do not get a 404
            return db.get('users').findOne({name: '1_0_0'}).then((user) => {
                return th.del('/api/users/' + user._id.toString()).expect(403);
            });
        });

        it('responds without write permission with 403', function() {
            return db.get('users').findOne({ name : '1_0_0' }).then((userFromDatabase) => {
                // Remove the corresponding permission
                return th.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_USER').then(() => {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        return th.del(`/api/users/${userFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('users').findOne({ name : '1_1_0' }).then((userFromDatabase) => {
                return th.removeClientModule('1', 'base').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        return th.del(`/api/users/${userFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('users').findOne({ name : '1_1_0' }).then((userFromDatabase) => {
                return th.removeClientModule('1', 'base').then(function() {
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        return th.del(`/api/users/${userFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });
        
        it('responds with an invalid id with 400', function() {
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return th.del('/api/users/invalidId?token=' + token).expect(400);
            });
        });
        
        it('responds with an id where no user exists with 403', function() {
            // Here the validateSameClientId comes into the game and returns a 403 because the requested element is
            // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return th.del('/api/users/999999999999999999999999?token=' + token).expect(403);
            });
        });

        it('responds with a correct id with 204', function() {
            return db.get('users').findOne({name:'1_1_0'}).then(function(userFromDatabase){
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return th.del('/api/users/' + userFromDatabase._id.toString() + '?token=' + token).expect(204);
                });
            });
        });

        it('responds with an id of an existing user which does not belong to the same client as the logged in user with 403', function() {
            //user.clientId != loggedInUser.clientId
            //logg-in as user for client 1, but try to delete user of client 2
            return db.get('users').findOne({name:'0_0_0'}).then(function(userFromDatabase){
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var id = userFromDatabase._id.toString();
                    return th.del(`/api/users/${id}?token=${token}`).expect(403);
                });
            });
        });

        xit('All relations, where the element is the source (type1, id1), are also deleted', function() {
        });

        xit('All relations, where the element is the target (type2, id2), are also deleted', function() {
        });
        
    });

});
