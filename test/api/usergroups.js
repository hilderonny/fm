/**
 * UNIT Tests for api/usergroups
 */
var assert = require('assert');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');

describe('API usergroups', function(){

    // Clear and prepare database with clients, user groups, users and permissions
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

        it('responds without authentication with 403', function() {
            return th.get('/api/usergroups').expect(403);
        });

        it('responds without read permission with 403', function() {
            // Remove the corresponding permission
            return th.removeReadPermission('1_0_0', 'PERMISSION_ADMINISTRATION_USERGROUP').then(() => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return th.get('/api/usergroups?token=' + token).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'base').then(function() {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return th.get(`/api/usergroups?token=${token}`).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'base').then(function() {
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                    return th.get(`/api/usergroups?token=${token}`).expect(403);
                });
            });
        });

        it('responds with list of all usergroups of the client of the logged-in user containing all details', function(done) {
            db.get('clients').findOne({name: '1'}).then(function(currentClientFromDB){
                db.get('usergroups').find({clientId: currentClientFromDB._id}).then(function(allUsergroupsFromDB){
                    th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        th.get(`/api/usergroups?token=${token}`).expect(200).end(function(err, res) {
                            if (err) {
                                done(err);
                                return;
                            }
                            var allUsergroupsFromApi = res.body;
                            assert.strictEqual(allUsergroupsFromApi.length, allUsergroupsFromDB.length, `Num. usergroups from API: ${allUsergroupsFromApi.length} differs num. from Database: ${allUsergroupsFromDB.length} `);
                            allUsergroupsFromDB.forEach((usergroupFromDatabase) => {
                                var usergroupFound = false;
                                for (var i = 0; i < allUsergroupsFromApi.length; i++) {
                                    var usergroupFromApi = allUsergroupsFromApi[i];
                                    if (usergroupFromApi._id !== usergroupFromDatabase._id.toString()) {
                                        continue;
                                    }
                                    usergroupFound = true;
                                    var keys = ['_id', 'name', 'clientId']; 
                                    keys.forEach((key) => {
                                        var valueFromDatabase = usergroupFromDatabase[key].toString(); // Compare on a string basis because the API returns strings only
                                        var valueFromApi = usergroupFromApi[key].toString();
                                        assert.strictEqual(valueFromApi, valueFromDatabase, `${key} of usergroup ${usergroupFromApi._id} differs (${valueFromApi} from API, ${valueFromDatabase} in database)`);
                                    });
                                }
                                assert.ok(usergroupFound, `User "${usergroupFromDatabase.name}" was not returned by API`);
                            });
                            done();
                        });
                    }).catch(done);
                });
            });
        });

        it('responds with specific fields given with list of all usergroups of the client of the logged-in user containing only the requested fields', function(done) {
            db.get('clients').findOne({name: '1'}).then(function(currentClientFromDB){
                db.get('usergroups').find({clientId: currentClientFromDB._id}).then(function(allUsergroupsFromDB){
                    th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        var keys = ['_id', 'name']; // Include _id every time because it is returned by the API in every case!
                        th.get(`/api/usergroups?token=${token}&fields=${keys.join('+')}`).expect(200).end(function(err, res) {
                            if (err) {
                                done(err);
                                return;
                            }
                            var allUsergroupsFromApi = res.body;
                            assert.strictEqual(allUsergroupsFromApi.length, allUsergroupsFromDB.length, `Num. usergroups from API: ${allUsergroupsFromApi.length} differs num. from Database: ${allUsergroupsFromDB.length} `);
                            allUsergroupsFromDB.forEach((usergroupFromDatabase) => {
                                var usergroupFound = false;
                                for (var i = 0; i < allUsergroupsFromApi.length; i++) {
                                    var usergroupFromApi = allUsergroupsFromApi[i];
                                    if (usergroupFromApi._id !== usergroupFromDatabase._id.toString()) {
                                        continue;
                                    }
                                    usergroupFound = true;
                                    var keyCountFromApi = Object.keys(usergroupFromApi).length;
                                    var keyCountFromDatabase = keys.length;
                                    assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of user ${usergroupFromApi._id} differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                                    keys.forEach((key) => {
                                        var valueFromDatabase = usergroupFromDatabase[key].toString(); // Compare on a string basis because the API returns strings only
                                        var valueFromApi = usergroupFromApi[key].toString();
                                        assert.strictEqual(valueFromApi, valueFromDatabase, `${key} of user ${usergroupFromApi._id} differs (${valueFromApi} from API, ${valueFromDatabase} in database)`);
                                    });
                                }
                                assert.ok(usergroupFound, `User "${usergroupFromDatabase.name}" was not returned by API`);
                            });
                            done();
                        });
                    }).catch(done);
                });
            });
        });

    });

    describe('GET/forIds', function() {

        function createTestUserGroups() {
            return db.get(co.collections.clients).findOne({name:th.defaults.client}).then(function(client) {
                var clientId = client._id;
                var testObjects = ['testUserGroup1', 'testUserGroup2', 'testUserGroup3'].map(function(name) {
                    return {
                        name: name,
                        clientId: clientId
                    }
                });
                return Promise.resolve(testObjects);
            });
        }

        th.apiTests.getForIds.defaultNegative(co.apis.usergroups, co.permissions.ADMINISTRATION_USERGROUP, co.collections.usergroups, createTestUserGroups);
        th.apiTests.getForIds.clientDependentNegative(co.apis.usergroups, co.collections.usergroups, createTestUserGroups);
        th.apiTests.getForIds.defaultPositive(co.apis.usergroups, co.collections.usergroups, createTestUserGroups);

    });

    describe('GET/:id', function() {

        it('responds without authentication with 403', function() {
            // Load a valid id so we have a valid request and do not get a 404
            return db.get('usergroups').findOne({name: '1_0'}).then((usergroup) => {
                return th.get('/api/usergroups/' + usergroup._id.toString()).expect(403);
            });
        });

        it('responds without read permission with 403', function() {
            return db.get('usergroups').findOne({ name : '1_0' }).then((usergroupFromDatabase) => {
                // Remove the corresponding permission
                return th.removeReadPermission('1_0_0', 'PERMISSION_ADMINISTRATION_USERGROUP').then(() => {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        return th.get(`/api/usergroups/${usergroupFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with an id of an existing usergroup which does not belong to the same client as the logged in user with 403', function() {
            //usergroup.clientId != user.clientId
            //logg-in as user for client 1, but ask for usergroup of client 2 
            return db.get('usergroups').findOne({name: '0_0'}).then((usergroupOfUser2) => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var id = usergroupOfUser2._id.toString();
                    return th.get(`/api/folders/${id}?token=${token}`).expect(403);
                });
            }); 
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('usergroups').findOne({name: '1_0'}).then((userFormDB) => {
                return th.removeClientModule('1', 'base').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var userId = userFormDB._id;
                        return th.get(`/api/usergroups/${userId}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('usergroups').findOne({name: '1_0'}).then((userFormDB) => {
                return th.removeClientModule('1', 'base').then(function() {
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        var userId = userFormDB._id;
                        return th.get(`/api/usergroups/${userId}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with invalid id with 400', function() {
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return th.get('/api/usergroups/invalidId?token=' + token).expect(400);
            });
        });

        it('responds with not existing id with 403', function() {
            // Here the validateSameClientId comes into the game and returns a 403 because the requested element is
            // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return th.get('/api/usergroups/999999999999999999999999?token=' + token).expect(403);
            });
        });

        it('responds with existing usergroup id with all details of the usergroup', function(done) {
            db.get('usergroups').findOne({name: '1_1'}).then((usergroupFromDatabase) => {
                th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    th
                        .get(`/api/usergroups/${usergroupFromDatabase._id}?token=${token}`)
                        .expect(200)
                        .end(function(err, res) {
                            var usergroupFromApi = res.body;
                            assert.strictEqual(usergroupFromApi.name, usergroupFromDatabase.name, `Name of usergroup in database does not match name from API ("${usergroupFromDatabase.name}" vs. "${usergroupFromApi.name}")`);
                            assert.strictEqual(usergroupFromApi._id, usergroupFromDatabase._id.toString(), `Id of usergroup in database does not match usergroup Id from API ("${usergroupFromDatabase._id}" vs. "${usergroupFromApi._id}")`);
                            assert.strictEqual(usergroupFromApi.clientId, usergroupFromDatabase.clientId.toString(), `ClientId of usergroup in database does not match the one from API ("${usergroupFromDatabase.clientId}" vs. "${usergroupFromApi.clientId}")`);
                            done();
                        });
                }).catch(done);
            });
        });

        it('responds with existing usergroup id and specific fields with details of usergroup containing only the given fields', function(done) {
            db.get('usergroups').findOne({name: '1_1'}).then((usergroupFromDatabase) =>{
                th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var keys = ['_id', 'name']; // Include _id every time because it is returned by the API in every case 
                    th.get(`/api/usergroups/${usergroupFromDatabase._id}?token=${token}&fields=${keys.join('+')}`).expect(200).end(function(err, res){
                        if (err) {
                            done(err);
                            return;
                        }
                        var usergroupFromApi = res.body;
                        var keyCountFromApi = Object.keys(usergroupFromApi).length;
                        var keyCountFromDatabase = keys.length;
                        assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of usergroup ${usergroupFromApi.name} differs (${keyCountFromApi} from API, ${keyCountFromDatabase} from DB)`);
                        assert.strictEqual(usergroupFromApi._id, usergroupFromDatabase._id.toString(), `User id from Api: ${usergroupFromApi._id} differs user id in DB: ${usergroupFromDatabase._id.toString()} `); //compare ID values
                        assert.strictEqual(usergroupFromApi.name, usergroupFromDatabase.name.toString(), `User id from Api: ${usergroupFromApi.name} differs user id in DB: ${usergroupFromDatabase.name.toString()} `);                   
                        done();
                    });
                }).catch(done);
            });
        });

    });
    
    describe('POST/', function() {

        it('responds without authentication with 403', function() {
            return th.post('/api/usergroups')
                .send({ name: 'UserGroup' })
                .expect(403);
        });

        it('responds without write permission with 403', function() {
            // Remove the corresponding permission
            return th.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_USERGROUP').then(() => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var newUsergroup = { 
                        name: 'newName'
                    };
                    return th.post('/api/usergroups?token=' + token).send(newUsergroup).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'base').then(function() {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var newUsergroup = { 
                        name: 'newName'
                    };
                    return th.post(`/api/usergroups?token=${token}`).send(newUsergroup).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'base').then(function() {
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                    var newUsergroup = { 
                        name: 'newName'
                    };
                    return th.post(`/api/usergroups?token=${token}`).send(newUsergroup).expect(403);
                });
            });
        });

        it('responds without giving a usergroup with 400', function() {
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return th.post('/api/usergroups?token=' + token).send().expect(400);
            });
        });

        it('responds with correct usergroup data with inserted usergroup containing an _id field', function(done) {
            db.get('users').findOne({name: '1_0_0'}).then(function(userFromDatabase){ //request user to get valid userGroupId and clientId
                th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    var newUsergroup = {name: 'new_test_group'}; //This name doesn't not need to be unique in the DB
                                    
                    th.post('/api/usergroups?token=' + token).send(newUsergroup).expect(200).end(function(err, res) {
                        if(err){
                            done(err);
                            return;
                        }
                        db.get('usergroups').findOne({name: newUsergroup.name}).then((usergroupFromDatabase) =>{
                            var usergroupFromApi = res.body;
                            var keyCountFromApi = Object.keys(usergroupFromApi).length;
                            var keys = Object.keys(newUsergroup);
                            var keyCountFromDatabase =  keys.length + 2; // _id and clientId is returned additionally
                            assert.ok( usergroupFromDatabase, 'New usergroup was not created');
                            assert.strictEqual( keyCountFromApi, keyCountFromDatabase, `Number of returned fields of new user differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                            assert.strictEqual( newUsergroup.name, usergroupFromApi.name, 'Names do not match');
                            assert.strictEqual(usergroupFromDatabase._id.toString(), usergroupFromApi._id.toString(), 'Usergroup Ids do not match' ); 
                            assert.strictEqual( userFromDatabase.clientId.toString(), usergroupFromApi.clientId.toString(), 'clientIds do not match');
                            done();
                        }).catch(done);
                    });
                });
            });
        });

        it('responds with clientId from another client with inserted usergroup containing an _id field and clientId same as the one of logged-in user', function(done) {
            db.get('users').findOne({name: '1_1_0'}).then(function(userFromDatabase){ //request user tp get valid userGroupId and clientId, client 1
                th.doLoginAndGetToken('0_1_0', 'test').then(function(token){ //logg in as user from a different client, namely 0
                    db.get('users').findOne({name: '0_1_0'}).then(function(loggedInUser) {
                        //Make an attepmt to send wrong clinetId
                        var newUsergroup = {name: 'new_test_group', clientId: userFromDatabase.clientId};
                
                        th.post('/api/usergroups?token=' + token).send(newUsergroup).expect(200).end(function(err, res) {
                            if(err){
                                done(err);
                                return;
                            }
                            db.get('usergroups').findOne({name: newUsergroup.name}).then((usergroupFromDatabase) =>{
                                var usergroupFromApi = res.body;
                                var keyCountFromApi = Object.keys(usergroupFromApi).length - 1; // _id is returned additionally
                                var keys = Object.keys(newUsergroup);
                                var keyCountFromDatabase =  keys.length; 
                                assert.ok( usergroupFromDatabase, 'New usergroup was not created');
                                assert.strictEqual( keyCountFromApi, keyCountFromDatabase, `Number of returned fields of new user differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                                assert.strictEqual( newUsergroup.name, usergroupFromApi.name, 'Names do not match');
                                assert.strictEqual(usergroupFromDatabase._id.toString(), usergroupFromApi._id.toString(), 'Usergroup Ids do not match' ); 
                                assert.strictEqual( loggedInUser.clientId.toString(), usergroupFromApi.clientId.toString(), `clientId of the new group (${usergroupFromApi.clientId}) is not the same as the clientId of the logged-in user (${loggedInUser.clientId})`);
                                done();
                            }).catch(done);
                        });
                    });
                });
            });
        });

    });
    
    describe('PUT/:id', function() {

        it('responds without authentication with 403', function() {
            return db.get('usergroups').findOne({name: '1_0'}).then((usergroup) => {
                var usergroupId = usergroup._id.toString();
                return th.put('/api/usergroups/' + usergroupId)
                    .send({ name: 'UserGroup' })
                    .expect(403);
            });
        });

        it('responds without write permission with 403', function() {
            return db.get('usergroups').findOne({ name : '1_1' }).then((usergroupFromDatabase) => {
                // Remove the corresponding permission
                return th.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_USERGROUP').then(() => {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var updatedUsergroup = {
                            name: 'newName'
                        };
                        return th.put(`/api/usergroups/${usergroupFromDatabase._id}?token=${token}`).send(updatedUsergroup).expect(403);
                    });
                });
            });
        });

        it('responds with an id of an existing usergroup which does not belong to the same client as the logged in user with 403', function() {
            //usergroup.clientId != user.clientId
            return db.get('usergroups').findOne({name: '0_0'}).then((usergroupOfUser2) => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var id = usergroupOfUser2._id.toString();
                    var updatedUsergroup = {name: 'new_name'};
                    return th.put(`/api/folders/${id}?token=${token}`).expect(403);
                });
            });   
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('usergroups').findOne({ name : '1_0' }).then((usergroupFromDatabase) => {
                return th.removeClientModule('1', 'base').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var updatedUsergroup = {
                            name: 'newName'
                        };
                        return th.put(`/api/usergroups/${usergroupFromDatabase._id}?token=${token}`).send(updatedUsergroup).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('usergroups').findOne({ name : '1_0' }).then((usergroupFromDatabase) => {
                return th.removeClientModule('1', 'base').then(function() {
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        var updatedUsergroup = {
                            name: 'newName'
                        };
                        return th.put(`/api/usergroups/${usergroupFromDatabase._id}?token=${token}`).send(updatedUsergroup).expect(403);
                    });
                });
            });
        });

        it('responds with an invalid id with 400', function() {
            var updatedUsergroup = {
                name: 'newName'
            };
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return th.put('/api/usergroups/invalidId?token=' + token).send(updatedUsergroup).expect(400);
            });
        });

        it('responds without giving a usergroup with 400', function() {
            return db.get('usergroups').findOne({ name : '1_0' }).then((usergroupFromDatabase) => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return th.put(`/api/usergroups/${usergroupFromDatabase._id}?token=${token}`).send().expect(400);
                });
            });
        });

        it('responds without giving relevant usergroup parameters with 400', function() {
            
            //attempts to update IDs shuold be ignored, which make this undate data object irrelevant 
            var updatedUsergroup = {
                _id: '888888888888888888888888',
                clientId: '888888888888888888888888'
            };
            return db.get('usergroups').findOne({ name : '1_0' }).then((usergroupFromDatabase) => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return th.put(`/api/usergroups/${usergroupFromDatabase._id}?token=${token}`).send(updatedUsergroup).expect(400);
                });
            });
        });
    
        it('responds with an id that does not exist with 403', function() {
            // Here the validateSameClientId comes into the game and returns a 403 because the requested element is
            // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
            var updatedUsergroup = {
                name: 'newGroup'
            };
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return th.put('/api/usergroups/999999999999999999999999?token=' + token).send(updatedUsergroup).expect(403);
            });
        });

        it('responds with an usergroup containing an _id field which differs from the id parameter with the updated usergroup (_id cannot be changed)', function(done) {
            db.get('usergroups').findOne({name: '1_0'}).then((usergroupFromDatabase) => {
                th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var updatedUsergroup = {
                        _id: '888888888888888888888888',
                        name: 'renamed Usergroup'
                    };
                    th
                        .put(`/api/usergroups/${usergroupFromDatabase._id}?token=${token}`)
                        .send(updatedUsergroup).expect(200).end(function(err, res) {
                            if(err){
                                done(err);
                                return;
                            }
                            var idFromApiResult = res.body._id;
                            assert.strictEqual(idFromApiResult, usergroupFromDatabase._id.toString(), `_id has been changed ("${idFromApiResult}" vs. "${usergroupFromDatabase._id}")`);
                            done();
                    });
                }).catch(done);
            });
        });

        it('responds with an usergroup containing a new clientId field with the updated usergroup (clientId cannot be changed)', function(done) {
            db.get('usergroups').findOne({name: '1_0'}).then((usergroupFromDatabase) => {
                th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var updatedUsergroup = {
                        clientId: '888888888888888888888888',
                        name: 'renamed Usergroup'
                    };
                    th
                        .put(`/api/usergroups/${usergroupFromDatabase._id}?token=${token}`)
                        .send(updatedUsergroup).expect(200).end(function(err, res) {
                            if(err){
                                done(err);
                                return;
                            }
                            var idFromApiResult = res.body.clientId;
                            assert.strictEqual(idFromApiResult, usergroupFromDatabase.clientId.toString(), `cientId has been changed ("${idFromApiResult}" vs. "${usergroupFromDatabase.clientId}")`);
                            done();
                    });
                }).catch(done);
            });
        });

        //currently the only meanigful update for a usergroup is the name field
        it('responds with correctly updated Usergroup name', function(done){
            db.get('usergroups').findOne({name: '1_0'}).then((usergroupFromDatabase) => {
                th.doLoginAndGetToken('1_1_0', 'test').then(function(token){
                    var updatedUsergroup = {name: 'updated name'};
                    th
                        .put(`/api/usergroups/${usergroupFromDatabase._id}?token=${token}`)
                        .send(updatedUsergroup).expect(200).end(function(err, res) {
                            if(err){
                                done(err);
                                return;
                            }
                            var updatedUsergroupFromApi = res.body; 
                            assert.strictEqual(updatedUsergroupFromApi.name, updatedUsergroup.name, `Name undate failed: ${updatedUsergroupFromApi.name} vs ${updatedUsergroup.name}`);
                            done();
                    }); 
                }).catch(done);
            });
        }); 

    });
    
    describe('DELETE/:id', function() {

        function getDeleteUserGroupId() {
            return db.get(co.collections.usergroups).findOne({name:th.defaults.userGroup}).then(function(usergroup) {
                delete usergroup._id;
                usergroup.name = 'newUserGroupToDelete';
                return db.get(co.collections.usergroups).insert(usergroup);
            }).then(function(insertedUserGroup) {
                return Promise.resolve(insertedUserGroup._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.usergroups, co.permissions.ADMINISTRATION_USERGROUP, getDeleteUserGroupId);
        th.apiTests.delete.clientDependentNegative(co.apis.usergroups, getDeleteUserGroupId);
        th.apiTests.delete.defaultPositive(co.apis.usergroups, co.collections.usergroups, getDeleteUserGroupId);

        it('returns with 403 when the usergroup contains users', function() {
            var userGroupId;
            return db.get(co.collections.usergroups).findOne({name:th.defaults.userGroup}).then(function(usergroup) {
                userGroupId = usergroup._id;
                var user = {
                    name: 'testUser',
                    pass: 'password',
                    userGroupId : userGroupId,
                    clientId: usergroup.clientId
                }
                return db.get(co.collections.users).insert(user);
            }).then(function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.del(`/api/${co.apis.usergroups}/${userGroupId.toString()}?token=${token}`).expect(403);
            });
        });

    });

});