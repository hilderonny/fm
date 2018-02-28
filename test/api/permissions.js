/**
 * UNIT Tests for api/permissions
 */
var assert = require('assert');
var th = require('../testHelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');
var ch = require('../../utils/configHelper');
var Db = require("../../utils/db").Db;

describe.only('API permissions', () => {

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
    });

    describe('GET/forLoggedInUser', () => {

        var api = `${co.apis.permissions}/forLoggedInUser`;

        th.apiTests.get.defaultNegative(api, undefined);

        it('returns all permissions available to the client when the user is admin', async() => {
            await th.cleanTable("permissions", true, true);
            var token = await th.defaults.login("client0_usergroup0_user1");
            var permissionsFromApi = (await th.get(`/api/${api}?token=${token}`).expect(200)).body;
            var expectedPermissions = Object.keys(co.permissions).map((k) => co.permissions[k]);
            assert.strictEqual(permissionsFromApi.length, expectedPermissions.length);
            permissionsFromApi.forEach(function(permission) {
                assert.ok(expectedPermissions.indexOf(permission.key) >= 0);
                assert.ok(permission.canRead);
                assert.ok(permission.canWrite);
            });
        });

        it('returns only permissions available to the logged in user (depending on usergroup and client modules', async() => {
            await th.cleanTable("permissions", true, true);
            var expectedPermissions = [
                { permission: co.permissions.BIM_FMOBJECT, canwrite: true },
                { permission: co.permissions.OFFICE_NOTE, canwrite: false },
            ]
            for (var i = 0; i < expectedPermissions.length; i++) {
                var expectedPermission = expectedPermissions[i];
                await Db.query("client0", `INSERT INTO permissions (usergroupname, key, canwrite) VALUES('client0_usergroup0', '${expectedPermission.permission}', ${expectedPermission.canwrite});`);
            }
            var token = await th.defaults.login("client0_usergroup0_user0");
            var permissionsFromApi = (await th.get(`/api/${api}?token=${token}`).expect(200)).body;
            assert.strictEqual(permissionsFromApi.length, expectedPermissions.length);
            permissionsFromApi.forEach(function(permission) {
                var expectedPermission = expectedPermissions.find((p) => p.permission === permission.key);
                assert.ok(expectedPermission);
                assert.ok(typeof(permission.canRead) !== "undefined");
                assert.ok(typeof(permission.canWrite) !== "undefined");
                assert.strictEqual(permission.canWrite, expectedPermission.canwrite);
            });
        });

    });

    // TODO: Hier weiter

    describe('GET/forUserGroup/:id', function() {

        var api = `${co.apis.permissions}/forUserGroup`;

        th.apiTests.getId.defaultNegative(api, co.permissions.ADMINISTRATION_USERGROUP, co.collections.usergroups.name);
        th.apiTests.getId.clientDependentNegative(api, co.collections.usergroups.name);

        it('responds with all permissions where the states are correctly set', async function() {
            var userGroup = await th.defaults.getUserGroup();
            var token = await th.defaults.login();
            var permissionsFromDatabase = await db.get(co.collections.permissions.name).find({userGroupId: userGroup._id});
            var permissionsFromApi = (await th.get(`/api/${co.apis.permissions}/forUserGroup/${userGroup._id}?token=${token}`).expect(200)).body;
            // Dieser Test geht davon aus, dass alle möglichen Berechtigungen in der Datenbank vorhanden sind
            var keysFromDatabase = permissionsFromDatabase.map((p) => p.key);
            var keysFromApi = permissionsFromApi.map((p) => p.key);
            keysFromDatabase.forEach((key) => {
                assert.ok(keysFromApi.indexOf(key) >= 0, `Permission ${key} not returned by API. Configured in "permissions" attribute of module in module-config?`);
            });
            keysFromApi.forEach((key) => {
                assert.ok(keysFromDatabase.indexOf(key) >= 0, `Permission ${key} not prepared in database`);
            });
        });

        it('responds with all permissions even when some of them are not defined in database', async function() {
            var userGroup = await th.defaults.getUserGroup();
            var token = await th.defaults.login();
            var keyToCheck = co.permissions.OFFICE_DOCUMENT;
            // Berechtigungen aus Datenbank löschen
            await db.remove(co.collections.permissions.name, {key:keyToCheck});
            var permissionsFromApi = (await th.get(`/api/${co.apis.permissions}/forUserGroup/${userGroup._id}?token=${token}`).expect(200)).body;
            var relevantPermission = permissionsFromApi.find((p) => p.key === keyToCheck);
            assert.ok(relevantPermission);
            assert.strictEqual(relevantPermission.canRead, false);
            assert.strictEqual(relevantPermission.canWrite, false);
        });

    });

    describe('POST/', function(){

        it('responds without any content with 400', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                return th.post('/api/permissions?token=' + token).send().expect(400);
            });
        });

        it('responds without giving a permission userGroupId with 400', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                newPermission = {canRead: true, canWrite: false};
                return th.post('/api/permissions?token=' + token).send(newPermission).expect(400);
            });
        });

        it('responds without giving a permission key with 400', function() {
            return db.get('users').findOne({name: '1_0_0'}).then((userFromDatabase) => {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                    newPermission = {userGroupId: userFromDatabase.userGroupId, canRead: true, canWrite: false};
                    return th.post('/api/permissions?token=' + token).send(newPermission).expect(400);
                });
            });
        });

        it('responds with off-the-list permission key with 400', function() {
            return db.get('users').findOne({name: '1_0_0'}).then((userFromDatabase) => {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                    newPermission = {userGroupId: userFromDatabase.userGroupId, canRead: true, canWrite: false, key: 'MADE_UP_KEY'};
                    return th.post('/api/permissions?token=' + token).send(newPermission).expect(400);
                });
            });
        });


        it('responds with non-existing userGroupId with 400', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                var newPermission = {userGroupId: '999999999999999999999999', key: validPermisionKey}; 
                return th.post('/api/permissions?token=' + token).send(newPermission).expect(400);
            });
        });

        it('responds with userGroupId from userGroup of another client with 400', function() {
        //Get an exsiting user to obtain a valid userGroupId for client (2)
            return db.get('users').findOne({name: '0_0_0'}).then ((userFromDatabase) => {
                //Login as representative for  another client (1); i.e. not client (2) whose userGroup is used for the request
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => { 
                    var newPermission = {userGroupId: userFromDatabase.userGroupId, key: validPermisionKey, canRead: true };
                    return th.post(`/api/permissions?token=${token}`).send(newPermission).expect(400);
                });
            });
        });
        
        it('responds without authentication with 403', function() {
            return th.post('/api/permissions')
                .send({ canRead: true })
                .expect(403);
        });

        it('responds without write permission with 403', function() {
            return db.get('usergroups').findOne({ name : '1_0' }).then((usergroupFromDatabase) => {
                // Remove the corresponding permission
                return th.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_USERGROUP').then(() => {
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                        var newPermission = {userGroupId: usergroupFromDatabase._id, canRead: true };
                        return th.post('/api/permissions?token=' + token).send(newPermission).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('usergroups').findOne({name: '1_1'}).then(function(userGroupFromDatabase){
                var newPermission = {key: validPermisionKey, userGroupId: userGroupFromDatabase._id, canWrite: false};
                return th.removeClientModule('1', 'base').then(function(){
                    return th.doLoginAndGetToken('1_0_1', 'test').then(function(token){
                        return th.post(`/api/permissions?token=${token}`).send(newPermission).expect(403);
                    });
                });
            });            
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('usergroups').findOne({name: '1_1'}).then(function(userGroupFromDatabase){
                var newPermission = {key: validPermisionKey, userGroupId: userGroupFromDatabase._id, canWrite: false};
                return th.removeClientModule('1', 'base').then(function(){
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                        return th.post(`/api/permissions?token=${token}`).send(newPermission).expect(403);
                    });
                });
            }); 
        });

        it('responds with correct permission data with inserted new permission containing an _id field', function() {
            // erst mal alle Berechtigungen löschen, die zu testen sind
            var newPermission = {key: validPermisionKey, canWrite: false};
            var userGroupFromDatabase, permissionFromApi;
            return getUserGroup().then(function(userGroup) {
                userGroupFromDatabase = userGroup;
                newPermission.userGroupId = userGroup._id.toString();
                return db.get(co.collections.permissions.name).remove({userGroupId:userGroup._id,key:validPermisionKey});
            }).then(function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post('/api/permissions?token=' + token).send(newPermission).expect(200);
            }).then(function(response) {
                permissionFromApi = response.body;
                return db.get(co.collections.permissions.name).find({key: validPermisionKey, userGroupId: userGroupFromDatabase._id, canWrite: false}, {sort: {date: -1}, limit: 1});
            }).then((permissionsFromDatabase) =>{ // http://stackoverflow.com/a/28753115
                var permissionFromDatabase = permissionsFromDatabase[0];
                var keyCountFromApi = Object.keys(permissionFromApi).length;
                var keys = Object.keys(newPermission);
                var keyCountFromDatabase =  keys.length + 2; // _id and clientId is returned additionally
                assert.ok( permissionFromDatabase, 'New permission was not created');
                assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of new user differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
                assert.strictEqual(newPermission.key, permissionFromApi.key, 'Permission key des not match the desired vlaue');
                assert.strictEqual(permissionFromDatabase._id.toString(), permissionFromApi._id.toString(), 'Permission Ids do not match' ); 
                assert.strictEqual(permissionFromDatabase.userGroupId.toString(), newPermission.userGroupId.toString(), 'UserGroupIds do not match' ); 
                assert.strictEqual(permissionFromDatabase.clientId.toString(), permissionFromApi.clientId.toString(), 'clientIds do not match');
                return Promise.resolve();
            });
        });

        it('responds with arbitrary clientId with inserted new permission containing clientId field corresponding to clientId of logged-in user ', function() {
            // erst mal alle Berechtigungen löschen, die zu testen sind
            var newPermission = {key: validPermisionKey, canWrite: false};
            var userGroupFromDatabase, permissionFromApi, otherClient;
            return getUserGroup().then(function(userGroup) {
                userGroupFromDatabase = userGroup;
                newPermission.userGroupId = userGroup._id.toString();
                return db.get(co.collections.permissions.name).remove({userGroupId:userGroup._id,key:validPermisionKey});
            }).then(function() {
                return db.get(co.collections.clients.name).findOne({name:th.defaults.otherClient});
            }).then(function(client) {
                otherClient = client;
                newPermission.clientId = client._id.toString();
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post('/api/permissions?token=' + token).send(newPermission).expect(200);
            }).then(function(response) {
                permissionFromApi = response.body;
                return db.get(co.collections.permissions.name).find({key: validPermisionKey, userGroupId: userGroupFromDatabase._id, canWrite: false}, {sort: {date: -1}, limit: 1});
            }).then((permissionsFromDatabase) =>{ // http://stackoverflow.com/a/28753115
                var permissionFromDatabase = permissionsFromDatabase[0];
                assert.ok( permissionFromDatabase, 'New permission was not created');
                assert.notStrictEqual(permissionFromDatabase.clientId.toString(), otherClient._id.toString(), 'clientId was  substituted with incorrect one');
                return Promise.resolve();
            });
        });

        it('responds with existing permission when there is already a permission for the given permission key and user group', function() {
            var newPermission = {
                key: co.permissions.OFFICE_ACTIVITY,
                canRead: true,
                canWrite: true
            };
            var existingPermission;
            return getUserGroup().then(function(userGroup) {
                newPermission.userGroupId = userGroup._id.toString();
                return db.get(co.collections.permissions.name).findOne({userGroupId:userGroup._id, key:co.permissions.OFFICE_ACTIVITY});
            }).then(function(permission) {
                existingPermission = permission;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post(`/api/${co.apis.permissions}?token=${token}`).send(newPermission).expect(200);
            }).then(function(response) {
                assert.strictEqual(response.body._id, existingPermission._id.toString());
            });
        });

    });

    describe('PUT/:id', function(){

        it('responds with an invalid id with 400', function(){
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token)=>{
                var newPermission = {canRead: true, canWrite: false};
                return th.put(`/api/permissions/invalidId?token=${token}`).send(newPermission).expect(400);
            });
        });

        it('responds without any content with 400', function(){
            return db.get('users').findOne({name: '1_0_0'}).then((userFromDatabase) =>{
                return db.get(co.collections.permissions.name).findOne({ key : 'PERMISSION_ADMINISTRATION_USER', clientId: userFromDatabase.clientId }).then((permissionFromDatabase) => {
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token)=>{
                        var newPermission = {};
                        return th.put(`/api/permissions/${permissionFromDatabase._id}?token=${token}`).send(newPermission).expect(400);
                    });
                });
            });
        });

        it('responds with off-the-list key with 400', function(){
            return db.get('users').findOne({name: '1_0_0'}).then((userFromDatabase) =>{
                return db.get(co.collections.permissions.name).findOne({ key : 'PERMISSION_ADMINISTRATION_USER', clientId: userFromDatabase.clientId }).then((permissionFromDatabase) => {
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token)=>{
                        var newPermission = {key: 'MADE_UP_KEY', canRead: true};
                        return th.put(`/api/permissions/${permissionFromDatabase._id}?token=${token}`).send(newPermission).expect(400);
                    });
                });
            });
        });

        it('responds without authentication with 403', function() {
            return db.get(co.collections.permissions.name).findOne({key: 'PERMISSION_ADMINISTRATION_USER'}).then((permissionFromDatabase) => {
                var Id = permissionFromDatabase._id.toString();
                var updatedPermission = {permissionId: permissionFromDatabase._id, canRead: true };
                return th.put('/api/permissions/' + Id)
                    .send(updatedPermission)
                    .expect(403);
            });
        });

        it('responds without write permission with 403', function() {
            return db.get(co.collections.permissions.name).findOne({ key: 'PERMISSION_ADMINISTRATION_USER' }).then((permissionFromDatabase) => {
                //Remove the corresponding permission
                return th.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_USERGROUP').then(() => {
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                        var updatedPermission = {permissionId: permissionFromDatabase._id, canRead: true };
                        return th.put(`/api/permissions/${permissionFromDatabase._id}?token=${token}`).send(updatedPermission).expect(403);
                    });
                });
            });
        });

        it('responds with an id of an existing permission which does not belong to the same client as the logged in user with 403', function() {
            //permission.clientId != user.clientId
            return db.get('clients').findOne({name: '0'}).then((clientFormDB) => {
                return db.get(co.collections.permissions.name).findOne({key: 'PERMISSION_ADMINISTRATION_USER', clientId: clientFormDB._id}).then((permissionFromDatabase) => {
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) =>{
                        var permissionId = permissionFromDatabase._id.toString();
                        var updatedPermission = {canRead: 'false'};
                        return th.put(`/api/folders/${permissionId}?token=${token}`).send(updatedPermission).expect(403);
                    });
                });
            });
        });

        it('responds with non-existing id with 403', function(){
            // Here the validateSameClientId comes into the game and returns a 403 because the requested element is
            // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token){
                var updatedPermission = { canRead: true };
                return th.put('/api/permissions/999999999999999999999999?token=' + token).send(updatedPermission).expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get(co.collections.permissions.name).findOne({key: validPermisionKey}).then(function(permissionFromDB){
                return th.removeClientModule('1', 'base').then(function(){
                    return th.doLoginAndGetToken('1_0_1', 'test').then(function(token){
                        var updatedPermission = {key: validPermisionKey, canRead: false};
                        return th.put(`/api/permissions/${permissionFromDB._id}?token=${token}`).send(updatedPermission).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get(co.collections.permissions.name).findOne({key: validPermisionKey}).then(function(permissionFromDB){
                return th.removeClientModule('1', 'base').then(function(){
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                        var updatedPermission = {key: validPermisionKey, canRead: false};
                        return th.put(`/api/permissions/${permissionFromDB._id}?token=${token}`).send(updatedPermission).expect(403);
                    });
                });
            });
        });

        it('responds with the updated permission according to the sent update data', function(done) {
            db.get('usergroups').findOne({name: '1_0'}).then((usergroupFromDatabase) => {
                //find unique Permission as a combination of its key and userGroupId to further use its _id
                db.get(co.collections.permissions.name).findOne({key: 'PERMISSION_ADMINISTRATION_USER', userGroupId: usergroupFromDatabase._id}).then((permissionFromDatabase) => {         
                    th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => { 
                        var updatedPermission = {
                            _id: '888888888888888888888888',
                            key: 'PERMISSION_ADMINISTRATION_USERGROUP',
                            userGroupId: '888888888888888888888888',
                            clientId: '888888888888888888888888',
                            canRead: false,
                            canWrite: false
                        };
                        th
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

        it('responds with update data containing userGroupId field with UNCHANGED userGroupId', function(done) {
            db.get('usergroups').findOne({name: '1_0'}).then((usergroupFromDatabase) => {
                //find unique Permission as a combination of its key and userGroupId to further use its _id
                db.get(co.collections.permissions.name).findOne({key: 'PERMISSION_ADMINISTRATION_USER', userGroupId: usergroupFromDatabase._id}).then((permissionFromDatabase) => {         
                    th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => { 
                        //try to update userGroupId, which should not be possible
                        var updatedPermission = {
                            _id: '888888888888888888888888',
                            key: 'PERMISSION_ADMINISTRATION_USERGROUP',
                            userGroupId: '888888888888888888888888',
                            clientId: '888888888888888888888888',
                            canRead: false,
                            canWrite: false
                        };
                        th
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

        it('responds with update data containing _id field with UNCHANGED _id', function(done) {
            db.get('usergroups').findOne({name: '1_0'}).then((usergroupFromDatabase) => {
                //find unique Permission as a combination of its key and userGroupId to further use its _id
                db.get(co.collections.permissions.name).findOne({key: 'PERMISSION_ADMINISTRATION_USER', userGroupId: usergroupFromDatabase._id}).then((permissionFromDatabase) => {         
                    th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => { 
                        //try to update _id, which should not be possible
                        var updatedPermission = {
                            _id: '888888888888888888888888',
                            key: 'PERMISSION_ADMINISTRATION_USERGROUP',
                            userGroupId: '888888888888888888888888',
                            clientId: '888888888888888888888888',
                            canRead: false,
                            canWrite: false
                        };
                        th
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

        it('responds with update data containing clientId field with UNCHANGED clientId', function(done) {
            db.get('usergroups').findOne({name: '1_0'}).then((usergroupFromDatabase) => {
                //find unique Permission as a combination of its key and userGroupId to further use its _id
                db.get(co.collections.permissions.name).findOne({key: 'PERMISSION_ADMINISTRATION_USER', userGroupId: usergroupFromDatabase._id}).then((permissionFromDatabase) => {         
                    th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => { 
                        //try to update clientId, which should not be possible
                        var updatedPermission = {
                            _id: '888888888888888888888888',
                            key: 'PERMISSION_ADMINISTRATION_USERGROUP',
                            userGroupId: '888888888888888888888888',
                            clientId: '888888888888888888888888',
                            canRead: false,
                            canWrite: false
                        };
                        th
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

    });

    describe('DELETE/:id', function(){

        it('responds with an invalid id with 400', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                return th.del('/api/permissions/invalidId?token=' + token).expect(400);
            });
        });

        it('responds with an id of an existing permission which does not belong to the same client as the logged in user with 403', function() {
            //permission.clientId != user.clientId
            return db.get('clients').findOne({name: '0'}).then((clientFormDB) => {
                return db.get(co.collections.permissions.name).findOne({key: 'PERMISSION_ADMINISTRATION_USER', clientId: clientFormDB._id}).then((permissionFromDatabase) => {
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) =>{
                        var permissionId = permissionFromDatabase._id.toString();
                        return th.del(`/api/folders/${permissionId}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds without authentication with 403', function() {
            // Load a valid permission id so we have a valid request and do not get a 404
            return db.get(co.collections.permissions.name).findOne({key: 'PERMISSION_ADMINISTRATION_USER'}).then((permission) => {
                return th.del('/api/permissions/' + permission._id.toString()).expect(403);
            });
        });

        it('responds without write permission with 403', function() {
            return db.get(co.collections.permissions.name).findOne({key: 'PERMISSION_ADMINISTRATION_USER'}).then((permission) => {
                // Remove the corresponding permission
                return th.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_USERGROUP').then(() => {
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                        return th.del(`/api/permissions/${permission._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with an id that does not exist with 403', function() {
            // Here the validateSameClientId comes into the game and returns a 403 because the requested element is
            // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                return th.del('/api/permissions/999999999999999999999999?token=' + token).expect(403);
            });
        }); 

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get(co.collections.permissions.name).findOne({key: validPermisionKey}).then(function(permissionFromDB){
                return th.removeClientModule('1', 'base').then(function(){
                    return th.doLoginAndGetToken('1_0_1', 'test').then(function(token){
                        return th.del(`/api/permissions/${permissionFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get(co.collections.permissions.name).findOne({key: validPermisionKey}).then(function(permissionFromDB){
                return th.removeClientModule('1', 'base').then(function(){
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                        return th.del(`/api/permissions/${permissionFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with a correct id with 204', function() {
            //find unique Permission as a combination of its key and userGroupId to further use its _id
            return db.get('usergroups').findOne({name: '1_0'}).then((userGroupFromDB) => {
            return db.get(co.collections.permissions.name).findOne({key: 'PERMISSION_ADMINISTRATION_USER', userGroupId: userGroupFromDB._id}).then((permissionFromDatabase) => {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                    return th.del(`/api/permissions/${permissionFromDatabase._id}?token=${token}`).expect(204);
                    });
                });
            });
        });

    });

});