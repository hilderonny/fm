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

        it('responds with list of all users of the client of the logged in user containing all details', function() {
            var users;
            // We use client 1
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                return th.get(`/api/${co.apis.users}?token=${token}`).expect(200);
            }).then(function(response){
                users = response.body;
                // Check whether all users of the current client and all of their details are contained in the response
                assert.strictEqual(users.length, 4, `Number of users differ (actual ${users.length}, expected 4)`); // 2 user groups with 2 users each;
                // Get client of current user
                return db.get(co.collections.users).findOne({name: th.defaults.user});
            }).then((currentUser) => {
                var currentUserClientId = currentUser.clientId.toString();
                users.forEach((user) => {
                    // Check properties for existence
                    ['name', 'clientId', 'userGroupId'].forEach((propertyName) => {
                        assert.ok(user[propertyName], `Property "${propertyName}" is missing`);
                    });
                    // Check clientId for correctness
                    assert.strictEqual(user.clientId, currentUserClientId, `ClientId of user in list (${user.clientId}) does not match the clientId of the logged in user (${currentUserClientId})`);
                });
                return Promise.resolve();
            });
        });

        it('contains information about the usergroup when parameter "joinUserGroup" is given', function() {
            var users;
            // We use client 1
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                return th.get(`/api/${co.apis.users}?token=${token}&joinUserGroup=true`).expect(200);
            }).then(function(response){
                users = response.body;
                // Check whether all users of the current client and all of their details are contained in the response
                assert.strictEqual(users.length, 4, `Number of users differ (actual ${users.length}, expected 4)`); // 2 user groups with 2 users each;
                // Get client of current user
                return db.get(co.collections.users).findOne({name: th.defaults.user});
            }).then((currentUser) => {
                var currentUserClientId = currentUser.clientId.toString();
                users.forEach((user) => {
                    // Check properties for existence
                    ['name', 'clientId', 'userGroupId'].forEach((propertyName) => {
                        assert.ok(user[propertyName], `Property "${propertyName}" is missing`);
                    });
                    // Check clientId for correctness
                    assert.strictEqual(user.clientId, currentUserClientId, `ClientId of user in list (${user.clientId}) does not match the clientId of the logged in user (${currentUserClientId})`);
                    // Check usergroup
                    assert.ok(user.userGroup);
                    assert.strictEqual(user.userGroup._id, user.userGroupId);
                });
                return Promise.resolve();
            });
        });

    });

    describe('GET/forIds', function() {

        function createTestUsers() {
            return db.get(co.collections.usergroups).findOne({name:th.defaults.userGroup}).then(function(userGroup) {
                var userGroupId = userGroup._id;
                var clientId = userGroup.clientId;
                var testObjects = ['testUser1', 'testUser2', 'testUser3'].map(function(name) {
                    return {
                        name: name,
                        pass: 'test',
                        userGroupId: userGroupId,
                        clientId: clientId
                    }
                });
                return Promise.resolve(testObjects);
            });
        }

        th.apiTests.getForIds.defaultNegative(co.apis.users, co.permissions.ADMINISTRATION_USER, co.collections.users, createTestUsers);
        th.apiTests.getForIds.clientDependentNegative(co.apis.users, co.collections.users, createTestUsers);

        it('returns a list of users with all details except password for the given IDs', function() {
            var testUserIds, insertedUsers;
            return createTestUsers().then(function(objects) {
                return th.bulkInsert(co.collections.users, objects);
            }).then(function(objects) {
                insertedUsers = objects;
                testUserIds = objects.map((to) => to._id.toString());
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.users}/forIds?ids=${testUserIds.join(',')}&token=${token}`).expect(200);
            }).then(function(response) {
                var users = response.body;
                var idCount = insertedUsers.length;
                assert.equal(users.length, idCount);
                for (var i = 0; i < idCount; i++) {
                    assert.strictEqual(users[i]._id, insertedUsers[i]._id.toString());
                    assert.strictEqual(users[i].name, insertedUsers[i].name);
                    assert.strictEqual(users[i].userGroupId, insertedUsers[i].userGroupId.toString());
                    assert.strictEqual(users[i].clientId, insertedUsers[i].clientId.toString());
                    assert.ok(!users[i].pass);
                }
                return Promise.resolve();
            });
        });
    });

    describe('GET/?userGroupId', function() {

        it('responds with invalid userGroupId with 400', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                return th.get(`/api/${co.apis.users}/?token=${token}&userGroupId=invalidId`).expect(400);
            });
        });

        it('responds with list of all users of the given usergroup containing all details', function() {
            var currentUserGroupId, users;
            return db.get(co.collections.usergroups).findOne({name: th.defaults.userGroup}).then(function(userGroup) {
                currentUserGroupId = userGroup._id.toString();
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.users}?token=${token}&userGroupId=${currentUserGroupId}`).expect(200);
            }).then(function(response) {
                users = response.body;
                // Check whether all users of the current usergroup and all of their details are contained in the response
                assert.strictEqual(users.length, 2, `Number of users differ (actual ${users.length}, expected 2)`);
                // Get client of current user
                return db.get('users').findOne({name: th.defaults.user});
            }).then(function(currentUser) {
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
                return Promise.resolve();
            });
        });
        
    });

    describe('GET/:id', function() {

        th.apiTests.getId.defaultNegative(co.apis.users, co.permissions.ADMINISTRATION_USER, co.collections.users);
        th.apiTests.getId.clientDependentNegative(co.apis.users, co.collections.users);

        it('responds with existing user id with all details of the user', function() {
            var userFromDatabase;
            return db.get(co.collections.users).findOne({name: '1_1_0'}).then(function(user) {
                userFromDatabase = user;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.users}/${userFromDatabase._id}?token=${token}`).expect(200);
            }).then(function(response) {
                var userFromRequest = response.body;
                assert.strictEqual(userFromRequest.name, userFromDatabase.name, `Name of user in database does not match name of user from API ("${userFromDatabase.name}" vs. "${userFromRequest.name}")`);
                assert.strictEqual(userFromRequest.userGroupId, userFromDatabase.userGroupId.toString(), `userGroupId of user in database does not match the one from API ("${userFromDatabase.userGroupId}" vs. "${userFromRequest.userGroupId}")`);
                assert.strictEqual(userFromRequest.clientId, userFromDatabase.clientId.toString(), `clientId of user in database does not match the one from API ("${userFromDatabase.clientId}" vs. "${userFromRequest.clientId}")`);
                assert.strictEqual(userFromRequest.isAdmin, userFromDatabase.isAdmin, `isAdmin property of user in database does not match the one from API ("${userFromDatabase.isAdmin}" vs. "${userFromRequest.isAdmin}")`);
                return Promise.resolve();
            });
        });
        
        it('responds with existing user id and specific fields with details of user containing only the given fields', function() {
            var userFromDatabase;
            var keys = ['_id', 'name']; 
            return db.get(co.collections.users).findOne({name: '1_1_0'}).then(function(user) {
                userFromDatabase = user;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/users/${userFromDatabase._id}?token=${token}&fields=${keys.join('+')}`).expect(200);
            }).then(function(response) {
                var userFromApi = response.body;
                var keyCountFromApi = Object.keys(userFromApi).length;
                var keyCountFromDatabase = keys.length;
                assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of user ${userFromApi._id} differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                assert.strictEqual(userFromApi._id, userFromDatabase._id.toString(), `User id from Api: ${userFromApi._id} differs user id in DB: ${userFromDatabase._id.toString()} `); //compare ID values
                assert.strictEqual(userFromApi.name, userFromDatabase.name.toString(), `User id from Api: ${userFromApi.name} differs user id in DB: ${userFromDatabase.name.toString()} `);                   
                return Promise.resolve();
            });
        });
        
    });

    describe('POST/', function() {

        function createPostTestUser() {
            return db.get(co.collections.usergroups).findOne({name:th.defaults.userGroup}).then(function(userGroup) {
                var testObject = {
                    name: 'newUser',
                    pass: 'newPassword',
                    userGroupId: userGroup._id.toString()
                };
                return Promise.resolve(testObject);
            });
        }

        th.apiTests.post.defaultNegative(co.apis.users, co.permissions.ADMINISTRATION_USER, createPostTestUser);

        it('responds without giving an username with 400', function() {
            var loginToken;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                loginToken = token;
                return createPostTestUser();
            }).then(function(user) {
                delete user.name;
                return th.post(`/api/${co.apis.users}?token=${loginToken}`).send(user).expect(400);
            });
        });

        it('responds without giving an user password with 400', function() {
            var loginToken;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                loginToken = token;
                return createPostTestUser();
            }).then(function(user) {
                delete user.pass;
                return th.post(`/api/${co.apis.users}?token=${loginToken}`).send(user).expect(400);
            });
        });
        
        it('responds without giving an userGroupId with 400', function() {
            var loginToken;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                loginToken = token;
                return createPostTestUser();
            }).then(function(user) {
                delete user.userGroupId;
                return th.post(`/api/${co.apis.users}?token=${loginToken}`).send(user).expect(400);
            });
        });

        it('responds with already used username with 409', function() {
            var loginToken;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                loginToken = token;
                return createPostTestUser();
            }).then(function(user) {
                user.name = th.defaults.user;
                return th.post(`/api/${co.apis.users}?token=${loginToken}`).send(user).expect(409);
            });
        }); 
    
        it('responds with not existing userGroup with 400', function() {
            var loginToken;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                loginToken = token;
                return createPostTestUser();
            }).then(function(user) {
                user.userGroupId = '999999999999999999999999';
                return th.post(`/api/${co.apis.users}?token=${loginToken}`).send(user).expect(400);
            });
        });
        
        it('responds with correct user data with inserted user containing an _id field', function() {
            var newUser, loginToken;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                loginToken = token;
                return createPostTestUser();
            }).then(function(user) {
                newUser = user;
                return th.post(`/api/${co.apis.users}?token=${loginToken}`).send(newUser).expect(200);
            }).then(function(response) {
                var userFromApi = response.body;
                var keyCountFromApi = Object.keys(userFromApi).length - 2; // _id and clientId is returned additionally
                var keys = Object.keys(newUser);
                var keyCountFromDatabase =  keys.length; 
                assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of new user differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                assert.strictEqual( newUser.name, userFromApi.name, 'Names do not match');
                assert.ok(bcryptjs.compareSync(newUser.pass, userFromApi.pass), 'Passwords do not match');
                assert.strictEqual( newUser.userGroupId, userFromApi.userGroupId, 'userGroupIds do not match');
                return Promise.resolve();
            });
        });

    });

    describe('POST/newpassword', function() {

        var api = `${co.apis.users}/newpassword`;

        th.apiTests.post.defaultNegative(api, co.permissions.SETTINGS_USER, function() {
            return Promise.resolve({pass:'newPassword'});
        });

        it('responds with 200 with giving an empty password and updates the password in the database (empty passwords are okay)', function() {
            var objectToSend = {
                pass: ''
            };
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.post(`/api/${api}?token=${token}`).send(objectToSend).expect(200);
            }).then(function() {
                return db.get(co.collections.users).findOne({name: th.defaults.user});
            }).then(function(userAfterPasswordChange) {
                assert.ok(bcryptjs.compareSync(objectToSend.pass, userAfterPasswordChange.pass));
                return Promise.resolve();
            });
        });

        it('responds with 200 with giving a correct new password and updates the password in the database', function() {
            var objectToSend = {
                pass: 'newPassword'
            };
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.post(`/api/${api}?token=${token}`).send(objectToSend).expect(200);
            }).then(function() {
                return db.get(co.collections.users).findOne({name: th.defaults.user});
            }).then(function(userAfterPasswordChange) {
                assert.ok(bcryptjs.compareSync(objectToSend.pass, userAfterPasswordChange.pass));
                return Promise.resolve();
            });
        });

    });

    describe('PUT/:id', function() {

        function createPutTestUser() {
            return db.get(co.collections.users).findOne({name:th.defaults.user}).then(function(user) {
                var testObject = {
                    _id: user._id.toString(), // Needed in testHelpers to construct the URL with ID
                    name: 'newUserName',
                    pass: 'newPassword',
                    userGroupId: user.userGroupId.toString()
                };
                return Promise.resolve(testObject);
            });
        }

        th.apiTests.put.defaultNegative(co.apis.users, co.permissions.ADMINISTRATION_USER, createPutTestUser);
        th.apiTests.put.clientDependentNegative(co.apis.users, createPutTestUser);
        
        it('responds with an user containing a new password with an updated user with the new password', function() {
            var updatedUser = {
                pass: 'newpass'
            };
            var userFromDatabase;
            return db.get(co.collections.users).findOne({name: '1_1_0'}).then(function(user) {
                userFromDatabase = user;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.put(`/api/${co.apis.users}/${userFromDatabase._id.toString()}?token=${token}`).send(updatedUser).expect(200);
            }).then(function(response) {
                var userFromApi = response.body;       
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
                return Promise.resolve();
            });
        });
        
        it('responds without a new password with an updated user with the old password', function() {
            var updatedUser = {
                name: 'newName'
            };
            var userFromDatabase;
            return db.get(co.collections.users).findOne({name: '1_1_0'}).then(function(user) {
                userFromDatabase = user;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.put(`/api/${co.apis.users}/${userFromDatabase._id.toString()}?token=${token}`).send(updatedUser).expect(200);
            }).then(function(response) {
                var userFromApi = response.body;
                assert.strictEqual(updatedUser.name, userFromApi.name, 'User name differs');
                assert.strictEqual(userFromDatabase.pass, userFromApi.pass, 'User pass differs'); 
                return Promise.resolve();
            });
        });

        it('responds with an invalid userGroupId with 400', function() {
            var updatedUser = {
                userGroupId: 'invalidId'
            };
            var userFromDatabase;
            return db.get(co.collections.users).findOne({name: '1_1_0'}).then(function(user) {
                userFromDatabase = user;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.put(`/api/${co.apis.users}/${userFromDatabase._id.toString()}?token=${token}`).send(updatedUser).expect(400);
            });
        });

        it('responds with a new userGroupId which does not exist with 400', function() {
            var updatedUser = {
                userGroupId: '999999999999999999999999'
            };
            var userFromDatabase;
            return db.get(co.collections.users).findOne({name: '1_1_0'}).then(function(user) {
                userFromDatabase = user;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.put(`/api/${co.apis.users}/${userFromDatabase._id.toString()}?token=${token}`).send(updatedUser).expect(400);
            });
        });
        
        it('responds with already used username with 409', function() {
            var updatedUser = {
                name: th.defaults.user
            };
            var userFromDatabase;
            return db.get(co.collections.users).findOne({name: '1_1_0'}).then(function(user) {
                userFromDatabase = user;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.put(`/api/${co.apis.users}/${userFromDatabase._id.toString()}?token=${token}`).send(updatedUser).expect(409);
            });
        });

        it('responds with a correct user with the updated user and its new properties', function() {
            var updatedUser = {
                name: 'newName',
                pass: 'newPass'
            };
            var userFromDatabase;
            return db.get(co.collections.users).findOne({name: '1_1_0'}).then(function(user) {
                userFromDatabase = user;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.put(`/api/${co.apis.users}/${userFromDatabase._id.toString()}?token=${token}`).send(updatedUser).expect(200);
            }).then(function(response) {
                var userFromApi = response.body;
                assert.strictEqual(updatedUser.name, userFromApi.name);
                assert.ok(bcryptjs.compareSync(updatedUser.pass,  userFromApi.pass)); 
                return Promise.resolve();
            });
        });
        
        it('responds with a new userGroup with an updated user with the new userGroupId', function() {
            var updatedUser = {};
            var userFromDatabase;
            return db.get(co.collections.users).findOne({name: '1_1_0'}).then(function(user) {
                userFromDatabase = user;
                return db.get(co.collections.usergroups).findOne({name:'1_1'});
            }).then(function(userGroup) {
                updatedUser.userGroupId = userGroup._id.toString();
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.put(`/api/${co.apis.users}/${userFromDatabase._id.toString()}?token=${token}`).send(updatedUser).expect(200);
            }).then(function(response) {
                var userFromApi = response.body;
                assert.strictEqual(updatedUser.userGroupId.toString(), userFromApi.userGroupId);
                return Promise.resolve();
            });
        });
        
    });

    describe('DELETE/:id', function() {

        function getDeleteUserId() {
            return db.get(co.collections.users).findOne({name:th.defaults.user}).then(function(user) {
                delete user._id;
                user.name = 'newUserToDelete';
                return db.get(co.collections.users).insert(user);
            }).then(function(insertedUser) {
                return Promise.resolve(insertedUser._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.users, co.permissions.ADMINISTRATION_USER, getDeleteUserId);
        th.apiTests.delete.clientDependentNegative(co.apis.users, getDeleteUserId);
        th.apiTests.delete.defaultPositive(co.apis.users, co.collections.users, getDeleteUserId);
        
    });

});
