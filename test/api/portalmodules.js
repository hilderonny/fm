/**
 * UNIT Tests for api/portalmodules
 */

var assert = require('assert');
var superTest = require('supertest');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');
var fs = require('fs');

describe('API portalmodules', function(){

    // Clear and prepare database with clients, user groups, users... 
     beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions)
            .then(th.prepareActivities)
            .then(th.prepareFmObjects)
            .then(th.prepareFolders)
            .then(th.prepareDocuments)
            .then(th.preparePortals)
            .then(th.preparePortalModules);
    });

    describe('GET/', function() {

        it('responds with incorrect query parameter portalId with 400', function(){
            return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return th.get(`/api/portalmodules?portalId=IvalidId&token=${token}`).expect(400);
            });
        });

        it('responds with non-existing query parameter portalId with 400', function(){
            return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return th.get(`/api/portalmodules?portalId=999999999999999999999999&token=${token}`).expect(400);
            });
        });

        it('responds without query parameter portalId with 400', function(){
            return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return th.get(`/api/portalmodules?token=${token}`).expect(400);
            });
        });

        it('responds without authentication with 403', function() {
                return th.get('/api/portalmodules').expect(403);
        });

        it('responds without read rights with 403', function(){
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                // Remove the corresponding permission
                return th.removeReadPermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(function(){
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return th.get(`/api/portalmodules?portalId=${portalFromDB._id}&token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'licenseserver').then(function(){
                return th.doLoginAndGetToken('1_0_1', 'test').then(function(token){
                    return th.get(`/api/portalmodules?token=${token}`).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'licenseserver').then(function(){
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                    return th.get(`/api/portalmodules?token=${token}`).expect(403);
                });
            });
        });

        it('responds with correct portalId with list of all portal module assignments for the portal with all details', function(done) {
            db.get('portals').findOne({name: 'p1'}).then((portalFromDatabase) => {
                var portalId = portalFromDatabase._id;
                db.get('portalmodules').find({portalId: portalId}).then((portalModulesFromDatabase) => {
                    th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                        th.get(`/api/portalmodules?token=${token}&portalId=${portalId}`).expect(200).end(function(err, res) {
                            if (err) {
                                done(err);
                                return;
                            }
                            var portalModulesFromApi = res.body;
                            assert.strictEqual(portalModulesFromApi.length, portalModulesFromDatabase.length, `Number of portal modules differ (${portalModulesFromApi.length} from API, ${portalModulesFromDatabase.length} in database)`);
                            portalModulesFromDatabase.forEach((portalModuleFromDatabase) => {
                                var keys = Object.keys(portalModuleFromDatabase); // Include _id every time because it is returned by the API in every case!
                                var portalModuleFound = false;
                                for (var i = 0; i < portalModulesFromApi.length; i++) {
                                    var portalModuleFromApi = portalModulesFromApi[i];
                                    if (portalModuleFromApi._id !== portalModuleFromDatabase._id.toString()) {
                                        continue;
                                    }
                                    portalModuleFound = true;
                                    th.compareApiAndDatabaseObjects('portal module', keys, portalModuleFromApi, portalModuleFromDatabase);
                                }
                                assert.ok(portalModuleFound, `Portal module "${portalModuleFromDatabase.name}" was not returned by API`);
                            });
                            done();
                        });
                    }).catch(done);
                });
            });
        });

    });

    describe('POST/', function() {

        it('responds without assigning any portalmodule data with 400', function(){
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    return th.post(`/api/portalmodules?token=${token}`).send().expect(400);
                });
            });

        });

        it('responds without assigning particular module data with 400', function(){
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    var newModule = {
                        portalId: portalFromDB._id
                    };
                    return th.post(`/api/portalmodules?token=${token}`).send(newModule).expect(400);
                });
            });
        });

        it('responds without assigning portalId data with 400', function(){
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    var newModule = {
                        module: 'activities'
                    };
                    return th.post(`/api/portalmodules?token=${token}`).send(newModule).expect(400);
                });
            });
        });

        it('responds with assigning non-existing portalId with 400', function(){
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    var newModule = {
                        module: 'activities',
                        portalId: '999999999999999999999999'
                    };
                    return th.post(`/api/portalmodules?token=${token}`).send(newModule).expect(400);
                });
            });
        });

        it('responds with valid data but without write permission with 403', function(){
            return db.get('portals').findOne({name: 'p2'}).then(function(portalFromDB){
                return th.removeWritePermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(function(){
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        //both module and portalId have to be provided
                        var newModule = {
                            module: 'activities',
                            portalId: portalFromDB._id
                        }
                        return th.post(`/api/portalmodules?token=${token}`).send(newModule).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return th.removeClientModule('1', 'licenseserver').then(function(){
                    return th.doLoginAndGetToken('1_1_1', 'test').then(function(token){
                        var newModule = {portalId: portalFromDB._id,
                                        module: 'activities'}
                        return th.post(`/api/portalmodules?token=${token}`).send(newModule).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return th.removeClientModule('1', 'licenseserver').then(function(){
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                        var newModule = {portalId: portalFromDB._id,
                                        module: 'activities'}
                        return th.post(`/api/portalmodules?token=${token}`).send(newModule).expect(403);
                    });
                });
            });
        });

        it('responds with correct portalmodule data with inserted portalmodule containing auto-generated _id field', function(done){
            db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                    var newModule = {portalId: portalFromDB._id,
                                    module: 'activities'}
                    th.post(`/api/portalmodules?token=${token}`).send(newModule).expect(200).end(function(err, res){
                        if(err){
                            done(err);
                            return;
                        }
                        var portalModuleFromApi = res.body; 
                        numKeysInitially = Object.keys(newModule).length;
                        numKeysExpected  = Object.keys(portalModuleFromApi).length - 1;  //_id field returned in addition to all other fields of sent newModule
                        assert.ok(portalModuleFromApi['_id'], 'inserted portal module does not contain _id field!');
                        assert.strictEqual(numKeysInitially, numKeysExpected, `inserted portal module has unexpected number of fields: ${numKeysInitially} vs ${numKeysExpected}`);
                        assert.strictEqual(newModule['module'], portalModuleFromApi['module'], 'module field has been changed');
                        assert.strictEqual(newModule.portalId.toString(), portalModuleFromApi['portalId'], `portalId field has been changed: ${newModule.portalId} vs ${portalModuleFromApi['portalId']}`);
                        done();
                    });
                }).catch(done);
            });
        });

        it('responds with portalmodule data containg _id with inserted portalmodule containing auto-generated _id field', function(done){
            //user defined _id should not be possibels
            db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                    var newModule = {portalId: portalFromDB._id,
                                    module: 'activities',
                                    _id: '999999999999999999999999'} //send id of valid format but higly unlikely to be recreated by automated generation
                    th.post(`/api/portalmodules?token=${token}`).send(newModule).expect(200).end(function(err, res){
                        if(err){
                            done(err);
                            return;
                        }
                        var portalModuleFromApi = res.body; 
                        numKeysInitially = Object.keys(newModule).length;
                        numKeysExpected  = Object.keys(portalModuleFromApi).length;  //_id field is always returned from API
                        assert.notStrictEqual(portalModuleFromApi['_id'], newModule._id.toString(), 'user-defined _id field was possible');
                        done();
                    });
                }).catch(done);
            });
        });

        it('responds with 409 when an assignment between a portal and a module already exists', function() {
            // Create an assignment between a portal and a module
            // Try to create another assignment between the same portal and module, must result in an error (409 conflict)
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                    var assignmentModule = {portalId: portalFromDB._id, module: 'activities'}
                    return th.post(`/api/portalmodules?token=${token}`).send(assignmentModule).expect(200).then(function(){
                        return th.post(`/api/portalmodules?token=${token}`).send(assignmentModule).expect(409);
                    });
                });
            });
        });

    });

    describe('DELETE/:id', function() {

        it('responds with incorect id with 400', function(){
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                return th.del(`/api/portalmodules/IvalidId?token=${token}`);
            });
        });

        it('responds with valid data but without write permission with 403', function(){
            return db.get('portals').findOne({name: 'p2'}).then(function(portalFromDB){
                return th.removeWritePermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(function(){
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        var id = portalFromDB._id;
                        return th.del(`/api/portalmodules/${id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return db.get('portalmodules').findOne({portalId: portalFromDB._id}).then(function(portalModuleFromDB){
                    return th.removeClientModule('1', 'licenseserver').then(function(){
                        return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                            var id = portalModuleFromDB._id;
                            return th.del(`/api/portalmodules/${id}?token=${token}`).expect(403);
                        });
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return db.get('portalmodules').findOne({portalId: portalFromDB._id}).then(function(portalModuleFromDB){
                    return th.removeClientModule('1', 'licenseserver').then(function(){
                        return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                            var id = portalModuleFromDB._id;
                            return th.del(`/api/portalmodules/${id}?token=${token}`).expect(403);
                        });
                    });
                });
            });
        });

        it('responds with valid but non-existing id with 404', function(){
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                return th.del(`/api/portalmodules/999999999999999999999999?token=${token}`).expect(404);
            });
        });

        it('responds with correct existing id with 204', function(done){
            db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                db.get('portalmodules').findOne({module: 'documents', portalId: portalFromDB._id}).then(function(portalModuleFromDB){
                    th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                        var id = portalModuleFromDB._id;
                        th.del(`/api/portalmodules/${id}?token=${token}`).expect(204).end(function(err,res){
                            if(err){
                                done(err);
                                return;
                            }
                            db.get('portalmodules').findOne({_id: id}).then((stillExistingPortalModule) => {
                                assert.ok(!stillExistingPortalModule, 'portal module has not been deleted from database');
                                done();
                            });
                        });
                    }).catch(done);
                });
            });
        });

    });
        
});
