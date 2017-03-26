/**
 * UNIT Tests for api/permissions
 */

var assert = require('assert');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');
var constants = require('../../utils/constants');

describe('API permissions', function(){

    var server = require('../../app');

    // Clear and prepare database with clients, user groups, users and permissions
    beforeEach(() => {
        return testHelpers.cleanDatabase()
            .then(testHelpers.prepareClients)
            .then(testHelpers.prepareClientModules)
            .then(testHelpers.prepareUserGroups)
            .then(testHelpers.prepareUsers)
            .then(testHelpers.preparePermissions);
    });

    var validPermisionKey = 'PERMISSION_BIM_FMOBJECT';

     ////////////////////////////////////// 400 ////////////////////////////////////////////////////////////  
    it('responds to GET/ with invalid userGroupId with 400', function() {
        return testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token) => {
            return superTest(server).get('/api/permissions?token=' + token + '&userGroupId=invalidId').expect(400);
        });
    });
    
    it('responds to GET/id with invalid id with 400', function() {
        return testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token) => {
            return superTest(server).get('/api/permissions/invalidId?token=' + token).expect(400);
        });
    });

    it('responds to POST/ without any content with 400', function() {
        return testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token) => {
            return superTest(server).post('/api/permissions?token=' + token).send().expect(400);
        });
    });

    it('responds to POST/ without giving a permission userGroupId with 400', function() {
        return testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token) => {
            newPermission = {canRead: true, canWrite: false};
            return superTest(server).post('/api/permissions?token=' + token).send(newPermission).expect(400);
        });
    });

    it('responds to POST/ without giving a permission key with 400', function() {
        return db.get('users').findOne({name: '1_1_1'}).then((userFromDatabase) => {
            return testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token) => {
                newPermission = {userGroupId: userFromDatabase.userGroupId, canRead: true, canWrite: false};
                return superTest(server).post('/api/permissions?token=' + token).send(newPermission).expect(400);
            });
        });
    });

    it('responds to POST/ with off-the-list permission key with 400', function() {
        return db.get('users').findOne({name: '1_1_1'}).then((userFromDatabase) => {
            return testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token) => {
                newPermission = {userGroupId: userFromDatabase.userGroupId, canRead: true, canWrite: false, key: 'MADE_UP_KEY'};
                return superTest(server).post('/api/permissions?token=' + token).send(newPermission).expect(400);
            });
        });
    });


    it('responds to POST/ with non-existing userGroupId with 400', function() {
        return testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token) => {
            var newPermission = {userGroupId: '999999999999999999999999', key: validPermisionKey}; 
            return superTest(server).post('/api/permissions?token=' + token).send(newPermission).expect(400);
        });
    });

    it('responds to POST/ with userGroupId from userGroup of another client with 400', function() {
       //Get an exsiting user to obtain a valid userGroupId for client (2)
        return db.get('users').findOne({name: '2_2_2'}).then ((userFromDatabase) => {
            //Login as representative for  another client (1); i.e. not client (2) whose userGroup is used for the request
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => { 
                var newPermission = {userGroupId: userFromDatabase.userGroupId, key: validPermisionKey, canRead: true };
                return superTest(server).post(`/api/permissions?token=${token}`).send(newPermission).expect(400);
            });
        });
    });

    it('responds to PUT/id with an invalid id with 400', function(){
        return testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token)=>{
            var newPermission = {canRead: true, canWrite: false};
            return superTest(server).put(`/api/permissions/invalidId?token=${token}`).send(newPermission).expect(400);
        });
    });

    it('responds to PUT/id without any content with 400', function(){
        return db.get('users').findOne({name: '1_1_1'}).then((userFromDatabase) =>{
            return db.get('permissions').findOne({ key : 'PERMISSION_ADMINISTRATION_USER', clientId: userFromDatabase.clientId }).then((permissionFromDatabase) => {
                return testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token)=>{
                    var newPermission = {};
                    return superTest(server).put(`/api/permissions/${permissionFromDatabase._id}?token=${token}`).send(newPermission).expect(400);
                });
            });
        });
    });

    it('responds to PUT/id with off-the-list key with 400', function(){
        return db.get('users').findOne({name: '1_1_1'}).then((userFromDatabase) =>{
            return db.get('permissions').findOne({ key : 'PERMISSION_ADMINISTRATION_USER', clientId: userFromDatabase.clientId }).then((permissionFromDatabase) => {
                return testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token)=>{
                    var newPermission = {key: 'MADE_UP_KEY', canRead: true};
                    return superTest(server).put(`/api/permissions/${permissionFromDatabase._id}?token=${token}`).send(newPermission).expect(400);
                });
            });
        });
    });

    it('responds to DELETE/id with an invalid id with 400', function() {
        return testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token) => {
            return superTest(server).del('/api/permissions/invalidId?token=' + token).expect(400);
        });
    });

    ////////////////////////////////////// 403 /////////////////////////////////////////////////////
    it('responds to GET/ without authentication with 403', function() {
        return superTest(server).get('/api/permissions').expect(403);
    }); 

    it('responds to GET/id without authentication with 403', function() {
        // Load a valid id so we have a valid request and do not get a 404
        return db.get('permissions').findOne({key: 'PERMISSION_ADMINISTRATION_USER'}).then((permissionFromDB) => {
            return superTest(server).get('/api/permissions/' + permissionFromDB._id.toString()).expect(403);
        });
    });

    it('responds to GET/ without read permission with 403', function() {
        // Remove the corresponding permission
        return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_ADMINISTRATION_PERMISSION').then(() => {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return superTest(server).get('/api/permissions?token=' + token).expect(403);
            });
        });
    });


    it('responds to GET/id without read permission with 403', function() {
        return db.get('permissions').findOne({ key : 'PERMISSION_ADMINISTRATION_USER' }).then((permissionFromDB) => {
            // Remove the corresponding permission
            return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_ADMINISTRATION_PERMISSION').then(() => {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return superTest(server).get(`/api/permissions/${permissionFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/id with an id of an existing permission which does not belong to the same client as the logged in user with 403', function() {
        //permission.clientId != user.clientId
        //logg-in as user of client 1, but ask for permission of client 2
        return db.get('clients').findOne({name: '2'}).then((clientFormDB) => {
            return db.get('permissions').findOne({key: 'PERMISSION_ADMINISTRATION_USER', clientId: clientFormDB._id}).then((permissionFromDatabase) => {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var permissionId = permissionFromDatabase._id.toString();
                    return superTest(server).get(`/api/folders/${permissionId}?token=${token}`).expect(403);
                });
            });
        });
    });
    
    it('responds to POST/ without authentication with 403', function() {
        return superTest(server).post('/api/permissions')
            .send({ canRead: true })
            .expect(403);
    });

    it('responds to POST/ without write permission with 403', function() {
        return db.get('usergroups').findOne({ name : '1_0' }).then((usergroupFromDatabase) => {
            // Remove the corresponding permission
            return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_PERMISSION').then(() => {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var newPermission = {userGroupId: usergroupFromDatabase._id, canRead: true };
                    return superTest(server).post('/api/permissions?token=' + token).send(newPermission).expect(403);
                });
            });
        });
    });

    it('responds to PUT/id without authentication with 403', function() {
        return db.get('permissions').findOne({key: 'PERMISSION_ADMINISTRATION_USER'}).then((permissionFromDatabase) => {
            var Id = permissionFromDatabase._id.toString();
            var updatedPermission = {permissionId: permissionFromDatabase._id, canRead: true };
            return superTest(server).put('/api/permissions/' + Id)
                .send(updatedPermission)
                .expect(403);
        });
    });

    it('responds to PUT/id without write permission with 403', function() {
        return db.get('permissions').findOne({ key: 'PERMISSION_ADMINISTRATION_USER' }).then((permissionFromDatabase) => {
            //Remove the corresponding permission
            return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_PERMISSION').then(() => {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                     var updatedPermission = {permissionId: permissionFromDatabase._id, canRead: true };
                    return superTest(server).put(`/api/permissions/${permissionFromDatabase._id}?token=${token}`).send(updatedPermission).expect(403);
                });
            });
        });
    });

    it('responds to PUT/id with an id of an existing permission which does not belong to the same client as the logged in user with 403', function() {
        //permission.clientId != user.clientId
        return db.get('clients').findOne({name: '2'}).then((clientFormDB) => {
            return db.get('permissions').findOne({key: 'PERMISSION_ADMINISTRATION_USER', clientId: clientFormDB._id}).then((permissionFromDatabase) => {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var permissionId = permissionFromDatabase._id.toString();
                    var updatedPermission = {canRead: 'false'};
                    return superTest(server).put(`/api/folders/${permissionId}?token=${token}`).send(updatedPermission).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/id with an id of an existing permission which does not belong to the same client as the logged in user with 403', function() {
        //permission.clientId != user.clientId
        return db.get('clients').findOne({name: '2'}).then((clientFormDB) => {
            return db.get('permissions').findOne({key: 'PERMISSION_ADMINISTRATION_USER', clientId: clientFormDB._id}).then((permissionFromDatabase) => {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                    var permissionId = permissionFromDatabase._id.toString();
                    return superTest(server).del(`/api/folders/${permissionId}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/id without authentication with 403', function() {
        // Load a valid permission id so we have a valid request and do not get a 404
        return db.get('permissions').findOne({key: 'PERMISSION_ADMINISTRATION_USER'}).then((permission) => {
            return superTest(server).del('/api/permissions/' + permission._id.toString()).expect(403);
        });
    });

    it('responds to DELETE/id without write permission with 403', function() {
        return db.get('permissions').findOne({key: 'PERMISSION_ADMINISTRATION_USER'}).then((permission) => {
            // Remove the corresponding permission
            return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_PERMISSION').then(() => {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return superTest(server).del(`/api/permissions/${permission._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/id with not existing id with 403', function() {
        // Here the validateSameClientId comes into the game and returns a 403 because the requested element is
        // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
      return testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token) => {
        return superTest(server).get('/api/permissions/999999999999999999999999?token=' + token).expect(403);
      });
    });

    it('responds to PUT/id with non-existing id with 403', function(){

        // Here the validateSameClientId comes into the game and returns a 403 because the requested element is
        // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
        return testHelpers.doLoginAndGetToken('1_1_1', 'test').then(function(token){
            var updatedPermission = { canRead: true };
            return superTest(server).put('/api/permissions/999999999999999999999999?token=' + token).send(updatedPermission).expect(403);
        });
    });

    it('responds to DELETE/id with an id that does not exist with 403', function() {
        // Here the validateSameClientId comes into the game and returns a 403 because the requested element is
        // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
        return testHelpers.doLoginAndGetToken('1_1_1', 'test').then((token) => {
            return superTest(server).del('/api/permissions/999999999999999999999999?token=' + token).expect(403);
        });
    }); 

    it('responds to GET/ when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('2', 'base').then(function(){
            return testHelpers.doLoginAndGetToken('2_0_2', 'test').then(function(token){
                return superTest(server).get(`/api/permissions?token=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/ when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('2', 'base').then(function(){
           return testHelpers.doLoginAndGetToken('2_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                return superTest(server).get(`/api/permissions?token=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('permissions').findOne({ key: validPermisionKey}).then(function(permissionFromDatabase){
            var id = permissionFromDatabase._id;
            return testHelpers.removeClientModule('2', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('2_0_2', 'test').then(function(token){
                    return superTest(server).get(`/api/permissions/${id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('permissions').findOne({key: validPermisionKey}).then(function(permissionFromDatabase){
            var id = permissionFromDatabase._id;
            return testHelpers.removeClientModule('2', 'base').then(function(){
               return testHelpers.doLoginAndGetToken('2_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                    return superTest(server).get(`/api/permissions/${id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/list when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'base').then(function(){
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return superTest(server).get(`/api/permissions/list?toekn=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/list when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'base').then(function(){
            return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                return superTest(server).get(`/api/permissions/list?toekn=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/canRead/:key when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'base').then(function(){
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return superTest(server).get(`/api/permissions/canRead/${validPermisionKey}?token=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/canRead/:key when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'base').then(function(){
            return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                return superTest(server).get(`/api/permissions/canRead/${validPermisionKey}?token=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/canWrite/:key when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'base').then(function(){
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return superTest(server).get(`/api/permissions/canWrite/${validPermisionKey}?token=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/canWrite/:key when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'base').then(function(){
            return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                return superTest(server).get(`/api/permissions/canWrite/${validPermisionKey}?token=${token}`).expect(403);
            });
        });
    });

    it('responds to POST/ when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('usergroups').findOne({name: '1_1'}).then(function(userGroupFromDatabase){
            var newPermission = {key: validPermisionKey, userGroupId: userGroupFromDatabase._id, canWrite: false};
            return testHelpers.removeClientModule('1', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_1', 'test').then(function(token){
                    return superTest(server).post(`/api/permissions?token=${token}`).send(newPermission).expect(403);
                });
            });
        });            
    });

    it('responds to POST/ when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('usergroups').findOne({name: '1_1'}).then(function(userGroupFromDatabase){
            var newPermission = {key: validPermisionKey, userGroupId: userGroupFromDatabase._id, canWrite: false};
            return testHelpers.removeClientModule('1', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                    return superTest(server).post(`/api/permissions?token=${token}`).send(newPermission).expect(403);
                });
            });
        }); 
    });

    it('responds to PUT/id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('permissions').findOne({key: validPermisionKey}).then(function(permissionFromDB){
            return testHelpers.removeClientModule('1', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_1', 'test').then(function(token){
                    var updatedPermission = {key: validPermisionKey, canRead: false};
                    return superTest(server).put(`/api/permissions/${permissionFromDB._id}?token=${token}`).send(updatedPermission).expect(403);
                });
            });
        });
    });

    it('responds to PUT/id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('permissions').findOne({key: validPermisionKey}).then(function(permissionFromDB){
            return testHelpers.removeClientModule('1', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                    var updatedPermission = {key: validPermisionKey, canRead: false};
                    return superTest(server).put(`/api/permissions/${permissionFromDB._id}?token=${token}`).send(updatedPermission).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('permissions').findOne({key: validPermisionKey}).then(function(permissionFromDB){
            return testHelpers.removeClientModule('1', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_1', 'test').then(function(token){
                    return superTest(server).del(`/api/permissions/${permissionFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('permissions').findOne({key: validPermisionKey}).then(function(permissionFromDB){
            return testHelpers.removeClientModule('1', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                    return superTest(server).del(`/api/permissions/${permissionFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    //////////////////////////////////////  GET ////////////////////////////////////////////////////////////
    it('responds to GET/ with all permissions of the client of the logged in user', function(done){
        db.get('clients').findOne({name: '0'}).then(function(currentClientFromDB){
            db.get('permissions').find({clientId: currentClientFromDB._id}).then(function(allPermissionsFromDB){
                testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                    superTest(server).get(`/api/permissions?token=${token}`).expect(200).end(function(err, res) {
                        if (err) {
                            done(err);
                            return;
                        }
                        var allPermissionsFromApi = res.body;
                        assert.strictEqual(allPermissionsFromApi.length, allPermissionsFromDB.length, `Num. permissions from API: ${allPermissionsFromApi.length} differs num. from Database: ${allPermissionsFromDB.length} `);
                        allPermissionsFromDB.forEach((permissionFromDatabase) => {
                            var permissionFound = false;
                            for (var i = 0; i < allPermissionsFromApi.length; i++) {
                                var permissionFromApi = allPermissionsFromApi[i];
                                if (permissionFromApi._id !== permissionFromDatabase._id.toString()) {
                                    continue;
                                }
                                permissionFound = true;
                                var keys = ['_id', 'key', 'userGroupId', 'clientId', 'canRead', 'canWrite']; 
                                keys.forEach((key) => {
                                    var valueFromDatabase = permissionFromDatabase[key].toString(); // Compare on a string basis because the API returns strings only
                                    var valueFromApi = permissionFromApi[key].toString();
                                    assert.strictEqual(valueFromApi, valueFromDatabase, `${key} of permission ${permissionFromApi._id} differs (${valueFromApi} from API, ${valueFromDatabase} in database)`);
                                });
                            }
                            assert.ok(permissionFound, `Permission "${permissionFromDatabase.name}" was not returned by API`);
                        });
                        done();
                    });
                }).catch(done);
            });
        });
    });  


    it('responds to GET/ with specific fields given with list of all permissions of the client of the logged-in user containing only the requested fields', function(done) {
        db.get('clients').findOne({name: '1'}).then(function(currentClientFromDB){
            db.get('permissions').find({clientId: currentClientFromDB._id}).then(function(allPermissionsFromDB){
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    var keys = ['_id', 'key', 'canRead']; // Include _id every time because it is returned by the API in every case!
                    superTest(server).get(`/api/permissions?token=${token}&fields=${keys.join('+')}`).expect(200).end(function(err, res) {
                        if (err) {
                            done(err);
                            return;
                        }
                        var allPermissionsFromApi = res.body;
                        assert.strictEqual(allPermissionsFromApi.length, allPermissionsFromDB.length, `Num. permissions from API: ${allPermissionsFromApi.length} differs num. from Database: ${allPermissionsFromDB.length} `);
                        allPermissionsFromDB.forEach((permissionFromDatabase) => {
                            var permissionFound = false;
                            for (var i = 0; i < allPermissionsFromApi.length; i++) {
                                var permissionFromApi = allPermissionsFromApi[i];
                                if (permissionFromApi._id !== permissionFromDatabase._id.toString()) {
                                    continue;
                                }
                                permissionFound = true;
                                var keyCountFromApi = Object.keys(permissionFromApi).length;
                                var keyCountFromDatabase = keys.length;
                                assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields for permission ${permissionFromApi._id} differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                                keys.forEach((key) => {
                                    var valueFromDatabase = permissionFromDatabase[key].toString(); // Compare on a string basis because the API returns strings only
                                    var valueFromApi = permissionFromApi[key].toString();
                                    assert.strictEqual(valueFromApi, valueFromDatabase, `${key} of user ${permissionFromApi._id} differs (${valueFromApi} from API, ${valueFromDatabase} in database)`);
                                });
                            }
                            assert.ok(permissionFound, `Permission "${permissionFromDatabase.name}" was not returned by API`);
                        });
                        done();
                    });
                }).catch(done);
            });
        });
    });

    it('responds to GET/ with specific userGroupId given with list of all permissions of the client of the logged-in user fitered by this userGroupId', function(done) {
        db.get('users').findOne({name: '1_0_0'}).then(function(currentUserFromDB){
            var userGroupIdFromDB = currentUserFromDB.userGroupId; 
            db.get('permissions').find({clientId: currentUserFromDB.clientId, userGroupId: userGroupIdFromDB}).then(function(allPermissionsFromDB){
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                   // use all currently implemented permission fields, since no additional filtering is applied 
                   var keys = ['_id', 'userGroupId', 'clientId', 'key', 'canRead', 'canWrite']; 
                    superTest(server).get(`/api/permissions?token=${token}&userGroupId=${userGroupIdFromDB}`).expect(200).end(function(err, res) {
                        if (err) {
                            done(err);
                            return;
                        }
                        var allPermissionsFromApi = res.body;
                        assert.strictEqual(allPermissionsFromApi.length, allPermissionsFromDB.length, `Num. permissions from API: ${allPermissionsFromApi.length} differs num. from Database: ${allPermissionsFromDB.length} `);
                        allPermissionsFromDB.forEach((permissionFromDatabase) => {
                            var permissionFound = false;
                            for (var i = 0; i < allPermissionsFromApi.length; i++) {
                                var permissionFromApi = allPermissionsFromApi[i];
                                if (permissionFromApi._id !== permissionFromDatabase._id.toString()) {
                                    continue;
                                }
                                permissionFound = true;
                                var keyCountFromApi = Object.keys(permissionFromApi).length;
                                var keyCountFromDatabase = keys.length;
                                assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields for permission ${permissionFromApi._id} differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                               keys.forEach((key) => {
                                    var valueFromDatabase = permissionFromDatabase[key].toString(); // Compare on a string basis because the API returns strings only
                                    var valueFromApi = permissionFromApi[key].toString();
                                    assert.strictEqual(valueFromApi, valueFromDatabase, `${key} of user ${permissionFromApi._id} differs (${valueFromApi} from API, ${valueFromDatabase} in database)`);
                                });
                            }
                            assert.ok(permissionFound, `Permission "${permissionFromDatabase.name}" was not returned by API`);
                        });
                        done();
                    });
                }).catch(done);
            });
        });
    });

    it('responds to GET/id with existing permission id with all details of the requested permission', function(done) {
        db.get('usergroups').findOne({name: '2_0'}).then((userGroupFromDB) => {
            //find unique Permission as a combination of its key and userGroupId to further use its _id
            db.get('permissions').findOne({key: 'PERMISSION_ADMINISTRATION_USER', userGroupId: userGroupFromDB._id}).then((permissionFromDatabase) => {
                testHelpers.doLoginAndGetToken('2_0_0', 'test').then((token) => {
                    superTest(server)
                        .get(`/api/permissions/${permissionFromDatabase._id}?token=${token}`)
                        .expect(200)
                        .end(function(err, res) {
                            var permissionFromApi = res.body;
                            assert.strictEqual(permissionFromApi._id.toString(), permissionFromDatabase._id.toString(), `Id of permission in database does not match key from API ("${permissionFromDatabase._id.toString()}" vs. "${permissionFromApi._id}")`);
                            assert.strictEqual(permissionFromApi.key.toString(), permissionFromDatabase.key.toString(), `Key of usergroup in database does not match key from API ("${permissionFromDatabase.key}" vs. "${permissionFromApi.key}")`);
                            assert.strictEqual(permissionFromApi.userGroupId.toString(), permissionFromDatabase.userGroupId.toString(), `userGroupId of usergroup in database does not match key from API ("${permissionFromDatabase.userGroupId}" vs. "${permissionFromApi.userGroupId}")`);
                            assert.strictEqual(permissionFromApi.clientId.toString(), permissionFromDatabase.clientId.toString(), `clientId of usergroup in database does not match the one from API ("${permissionFromDatabase.clientId}" vs. "${permissionFromApi.clientId}")`);
                            assert.strictEqual(permissionFromApi.canRead.toString(), permissionFromDatabase.canRead.toString(), `canRead property of usergroup in database does not match key from API ("${permissionFromDatabase.canRead}" vs. "${permissionFromApi.canRead}")`);
                            assert.strictEqual(permissionFromApi.canWrite.toString(), permissionFromDatabase.canWrite.toString(), `canWrite property of usergroup in database does not match key from API ("${permissionFromDatabase.canWrite}" vs. "${permissionFromApi.canWrite}")`);
                            done();
                        });
                }).catch(done);
            });
        });
    });

    it('responds to GET/list with correct and complete list of key', function(done) {
        testHelpers.doAdminLoginAndGetToken().then(function(token) {
            superTest(server)
                .get(`/api/permissions/list?token=${token}`)
                .expect(200)
                .end(function(err,res) {
                    assert.strictEqual(res.body.toString(), constants.allPermissionKeys.toString(), 'Returend list of permission keys is not authentic')
                done();
                });
        }).catch(done);
    });

    it(`responds to GET/canRead/:key with TRUE for Admin users`, function(done) {
        testHelpers.doAdminLoginAndGetToken().then((token)=> {
        var testBool = true;
        superTest(server)
            .get(`/api/permissions/canRead/${validPermisionKey}?token=${token}`)
            .expect(200)
            .end((err, res) => {
                assert.strictEqual(res.body.toString(), testBool.toString(), 'Not matching');
                done();
            });
        }).catch(done);
    });

    it(`responds to GET/canWrite/:key with TRUE for Admin users`, function(done) {
        testHelpers.doAdminLoginAndGetToken().then((token)=> {
        var testBool = true;
        superTest(server)
            .get(`/api/permissions/canWrite/${validPermisionKey}?token=${token}`)
            .expect(200)
            .end((err, res) => {
                assert.strictEqual(res.body.toString(), testBool.toString(), 'Not matching');
                done();
            });
        }).catch(done);
    });

    it(`responds to GET/canRead/:key with TRUE for users with READ-permission for a given valid key`, function(done) {
        testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=> {
            var testBool = true;
                superTest(server)
                .get(`/api/permissions/canRead/${validPermisionKey}?token=${token}`)
                .expect(200)
                .end((err, res) => {
                    assert.strictEqual(res.body.toString(), testBool.toString(), 'Not matching');
                    done();
                });
        }).catch(done);
    });

    it(`responds to GET/canWrite/:key with TRUE for users with WRITE-permission for a given valid key`, function(done) {
        testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=> {
            var testBool = true;
            superTest(server)
                .get(`/api/permissions/canWrite/${validPermisionKey}?token=${token}`)
                .expect(200)
                .end((err, res) => {
                    assert.strictEqual(res.body.toString(), testBool.toString(), 'Not matching');
                    done();
                });
        }).catch(done);
    });

    it(`responds to GET/canRead/:key with FALSE for users without READ-permission for a given valid key`, function(done) {
        testHelpers.removeReadPermission('1_0_0', validPermisionKey).then(() => {
            testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=> {
                var testBool = false;
                superTest(server)
                    .get(`/api/permissions/canRead/${validPermisionKey}?token=${token}`)
                    .expect(200)
                    .end((err, res) => {
                            assert.strictEqual(res.body.toString(), testBool.toString(), 'Not matching');
                            done();
                    });
            }).catch(done);
        });
    });

    it(`responds to GET/canWrite/:key with FALSE for users without WRITE-permission for a given valid key`, function(done) {
        testHelpers.removeWritePermission('1_0_0', validPermisionKey).then(() => {
            testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=> {
                var testBool = false;
                superTest(server)
                    .get(`/api/permissions/canWrite/${validPermisionKey}?token=${token}`)
                    .expect(200)
                    .end((err, res) => {
                            assert.strictEqual(res.body.toString(), testBool.toString(), 'Not matching');
                            done();
                    });
            }).catch(done);
        });
    });

    it(`responds to GET/canRead/:key with FALSE for invalid key`, function(done) {
        testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=> {
            var testBool = false;
            superTest(server)
                .get(`/api/permissions/canRead/fakeKey?token=${token}`)
                .expect(200)
                .end((err, res) => {
                    assert.strictEqual(res.body.toString(), testBool.toString(), 'Not matching');
                    done();
                 });
        }).catch(done);
    });

    it(`responds to GET/canWrite/:key with FALSE for invalid key`, function(done) {
        testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=> {
            var testBool = false;
            superTest(server)
                .get(`/api/permissions/canWrite/fakeKey?token=${token}`)
                .expect(200)
                .end((err, res) => {
                    assert.strictEqual(res.body.toString(), testBool.toString(), 'Not matching');
                    done();
                 });
        }).catch(done);
    });

    //////////////////////////////////////  POST /////////////////////////////////////////////////////////// 
    it('responds to POST/ with correct permission data with inserted new permission containing an _id field', function(done) {
        db.get('usergroups').findOne({name: '1_1'}).then(function(userGroupFromDatabase){ //request user to get valid userGroupId and clientId
            testHelpers.doLoginAndGetToken('1_1_0', 'test').then(function(token){
                var newPermission = {key: validPermisionKey, userGroupId: userGroupFromDatabase._id, canWrite: false};                                
                superTest(server).post('/api/permissions?token=' + token).send(newPermission).expect(200).end(function(err, res) {
                    if(err){
                        done(err);
                        return;
                    }
                    db.get('permissions').find({key: validPermisionKey, userGroupId: userGroupFromDatabase._id, canWrite: false}, {sort: {date: -1}, limit: 1}).then((permissionsFromDatabase) =>{ // http://stackoverflow.com/a/28753115
                        var permissionFromDatabase = permissionsFromDatabase[0];
                        var permissionFromApi = res.body;
                        var keyCountFromApi = Object.keys(permissionFromApi).length;
                        var keys = Object.keys(newPermission);
                        var keyCountFromDatabase =  keys.length + 2; // _id and clientId is returned additionally
                        assert.ok( permissionFromDatabase, 'New permission was not created');
                        assert.strictEqual( keyCountFromApi, keyCountFromDatabase, `Number of returned fields of new user differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                        assert.strictEqual( newPermission.key, permissionFromApi.key, 'Permission key des not match the desired vlaue');
                        assert.strictEqual(permissionFromDatabase._id.toString(), permissionFromApi._id.toString(), 'Permission Ids do not match' ); 
                        assert.strictEqual(permissionFromDatabase.userGroupId.toString(), newPermission.userGroupId.toString(), 'UserGroupIds do not match' ); 
                        assert.strictEqual( permissionFromDatabase.clientId.toString(), permissionFromApi.clientId.toString(), 'clientIds do not match');
                        done();
                    }).catch(done);
                });
            });
        });
    });


    it('responds to POST/ with arbitrary clientId with inserted new permission containing clientId field corresponding to clientId of logged-in user ', function(done) {
        db.get('users').findOne({name: '2_2_2'}).then(function(userFromDatabase){ //request user different than logged-in user to get clientId
            testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                db.get('users').findOne({name: '1_0_0'}).then(function(currentUser) { //request logged-in user to get the valid userGroupId
                    var newPermission = {key: validPermisionKey,
                                        userGroupId: currentUser.userGroupId, 
                                        clientId: userFromDatabase.clientId, 
                                        canWrite: false};                 
                    superTest(server).post('/api/permissions?token=' + token).send(newPermission).expect(200).end(function(err, res) {
                        if(err){
                            done(err);
                            return;
                        }
                        db.get('permissions').findOne({key: newPermission.key, userGroupId: currentUser.userGroupId}).then((permissionFromDatabase) =>{
                            var permissionFromApi = res.body;
                            var keyCountFromApi = Object.keys(permissionFromApi).length;
                            var keys = Object.keys(newPermission);
                            var keyCountFromDatabase =  keys.length + 1; // _id is returned additionally; clientId field already included
                            assert.ok(permissionFromDatabase, 'New permission was not created');
                            assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of new user differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`); 
                            assert.notStrictEqual(permissionFromDatabase.clientId, currentUser.clientId, 'clientId was  substituted with incorrect one');
                            done();
                        }).catch(done);
                    });
                });
            });
        });
    });

    //////////////////////////////////////  PUT ////////////////////////////////////////////////////////////  
    it('responds to PUT/id with the updated permission according to the sent update data', function(done) {
        db.get('usergroups').findOne({name: '1_0'}).then((usergroupFromDatabase) => {
            //find unique Permission as a combination of its key and userGroupId to further use its _id
            db.get('permissions').findOne({key: 'PERMISSION_ADMINISTRATION_USER', userGroupId: usergroupFromDatabase._id}).then((permissionFromDatabase) => {         
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => { 
                    var updatedPermission = {
                        _id: '888888888888888888888888',
                        key: 'PERMISSION_ADMINISTRATION_USERGROUP',
                        userGroupId: '888888888888888888888888',
                        clientId: '888888888888888888888888',
                        canRead: false,
                        canWrite: false
                    };
                    superTest(server)
                        .put(`/api/permissions/${permissionFromDatabase._id}?token=${token}`)
                        .send(updatedPermission).expect(200).end(function(err, res) {
                            if(err){
                                done(err);
                                return;
                            }
                            var IdFromApiResult = res.body._id;
                            var userGroupIdFromApiResult = res.body.userGroupId;
                            var premissionFromApi = res.body; 
                            var keys = ['canRead', 'canWrite']; //these are the only two permission parameters that are allowed to change
                            keys.forEach((key) => {
                                var valueFromDatabase = updatedPermission[key].toString(); // Compare on a string basis because the API returns strings only
                                var valueFromApi = premissionFromApi[key].toString();
                                //check if updates were successful 
                                assert.strictEqual(valueFromApi, valueFromDatabase, `${key} of permission differs (${valueFromApi} from API, ${valueFromDatabase} in database)`);
                            }); 
                            done();
                    });
                }).catch(done);
            });
        });
    });

    it('responds to PUT/id with update data containing userGroupId field with UNCHANGED userGroupId', function(done) {
        db.get('usergroups').findOne({name: '1_0'}).then((usergroupFromDatabase) => {
            //find unique Permission as a combination of its key and userGroupId to further use its _id
            db.get('permissions').findOne({key: 'PERMISSION_ADMINISTRATION_USER', userGroupId: usergroupFromDatabase._id}).then((permissionFromDatabase) => {         
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => { 
                    //try to update userGroupId, which should not be possible
                    var updatedPermission = {
                        _id: '888888888888888888888888',
                        key: 'PERMISSION_ADMINISTRATION_USERGROUP',
                        userGroupId: '888888888888888888888888',
                        clientId: '888888888888888888888888',
                        canRead: false,
                        canWrite: false
                    };
                    superTest(server)
                        .put(`/api/permissions/${permissionFromDatabase._id}?token=${token}`)
                        .send(updatedPermission).expect(200).end(function(err, res) {
                            if(err){
                                done(err);
                                return;
                            }
                            var IdFromApiResult = res.body._id;
                            var userGroupIdFromApiResult = res.body.userGroupId;
                            var premissionFromApi = res.body; 
                            var keys = ['key', 'canRead', 'canWrite']; 
                            //check that userGroupId parameter was NOT changed
                            assert.strictEqual(userGroupIdFromApiResult, usergroupFromDatabase._id.toString(), `userGroupidId has been changed ("${userGroupIdFromApiResult}" vs. "${usergroupFromDatabase._id}")`);
                            done();
                    });
                }).catch(done);
            });
        });
    });

    it('responds to PUT/id with update data containing _id field with UNCHANGED _id', function(done) {
        db.get('usergroups').findOne({name: '1_0'}).then((usergroupFromDatabase) => {
            //find unique Permission as a combination of its key and userGroupId to further use its _id
            db.get('permissions').findOne({key: 'PERMISSION_ADMINISTRATION_USER', userGroupId: usergroupFromDatabase._id}).then((permissionFromDatabase) => {         
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => { 
                    //try to update _id, which should not be possible
                    var updatedPermission = {
                        _id: '888888888888888888888888',
                        key: 'PERMISSION_ADMINISTRATION_USERGROUP',
                        userGroupId: '888888888888888888888888',
                        clientId: '888888888888888888888888',
                        canRead: false,
                        canWrite: false
                    };
                    superTest(server)
                        .put(`/api/permissions/${permissionFromDatabase._id}?token=${token}`)
                        .send(updatedPermission).expect(200).end(function(err, res) {
                            if(err){
                                done(err);
                                return;
                            }
                            var IdFromApiResult = res.body._id;
                            var userGroupIdFromApiResult = res.body.userGroupId;
                            var premissionFromApi = res.body;  
                            //check that id parameter was NOT changed
                            assert.strictEqual(permissionFromDatabase._id.toString(), IdFromApiResult, `_id has been changed (from "${permissionFromDatabase._id}" to "${IdFromApiResult}")`);
                            done();
                    });
                }).catch(done);
            });
        });
    });

    it('responds to PUT/id with update data containing clientId field with UNCHANGED clientId', function(done) {
        db.get('usergroups').findOne({name: '1_0'}).then((usergroupFromDatabase) => {
            //find unique Permission as a combination of its key and userGroupId to further use its _id
            db.get('permissions').findOne({key: 'PERMISSION_ADMINISTRATION_USER', userGroupId: usergroupFromDatabase._id}).then((permissionFromDatabase) => {         
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => { 
                    //try to update clientId, which should not be possible
                    var updatedPermission = {
                        _id: '888888888888888888888888',
                        key: 'PERMISSION_ADMINISTRATION_USERGROUP',
                        userGroupId: '888888888888888888888888',
                        clientId: '888888888888888888888888',
                        canRead: false,
                        canWrite: false
                    };
                    superTest(server)
                        .put(`/api/permissions/${permissionFromDatabase._id}?token=${token}`)
                        .send(updatedPermission).expect(200).end(function(err, res) {
                            if(err){
                                done(err);
                                return;
                            }
                            var IdFromApiResult = res.body._id;
                            var userGroupIdFromApiResult = res.body.userGroupId;
                            var clientIdFromApi = res.body.clientId;
                            var premissionFromApi = res.body; 
                            //check that clientId parameter was NOT changed
                            assert.strictEqual(permissionFromDatabase.clientId.toString(), clientIdFromApi, `clientId has been changed (from "${permissionFromDatabase.clientId}" to "${clientIdFromApi}")`);
                            done();
                    });
                }).catch(done);
            });
        });
    });

    //////////////////////////////////////  DELETE  204 //////////////////////////////////////////////////////
    it('responds to DELETE/id with a correct id with 204', function() {
        //find unique Permission as a combination of its key and userGroupId to further use its _id
        return db.get('usergroups').findOne({name: '2_0'}).then((userGroupFromDB) => {
           return db.get('permissions').findOne({key: 'PERMISSION_ADMINISTRATION_USER', userGroupId: userGroupFromDB._id}).then((permissionFromDatabase) => {
            return testHelpers.doLoginAndGetToken('2_0_0', 'test').then((token) => {
                return superTest(server).del(`/api/permissions/${permissionFromDatabase._id}?token=${token}`).expect(204);
                });
            });
        });
    });

});