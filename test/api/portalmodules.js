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
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token){
                return th.get(`/api/portalmodules?portalId=IvalidId&token=${token}`).expect(400);
            });
        });

        it('responds with non-existing query parameter portalId with 400', function(){
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token){
                return th.get(`/api/portalmodules?portalId=999999999999999999999999&token=${token}`).expect(400);
            });
        });

        it('responds without query parameter portalId with 400', function(){
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token){
                return th.get(`/api/portalmodules?token=${token}`).expect(400);
            });
        });

        it('responds without authentication with 403', function() {
                return th.get('/api/portalmodules').expect(403);
        });

        it('responds without read rights with 403', function(){
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
                // Remove the corresponding permission
                return th.removeReadPermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(function(){
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token){
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
            db.get(co.collections.portals.name).findOne({name: 'p1'}).then((portalFromDatabase) => {
                var portalId = portalFromDatabase._id;
                db.get(co.collections.portalmodules.name).find({portalId: portalId}).then((portalModulesFromDatabase) => {
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
                                    th.compareApiAndDatabaseObjects(co.collections.portalmodules.name, keys, portalModuleFromApi, portalModuleFromDatabase);
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

    describe('GET/available', function() {

        it('responds with incorrect query parameter portalId with 400', function(){
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token){
                return th.get(`/api/portalmodules/available?portalId=IvalidId&token=${token}`).expect(400);
            });
        });

        it('responds with non-existing query parameter portalId with 400', function(){
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token){
                return th.get(`/api/portalmodules/available?portalId=999999999999999999999999&token=${token}`).expect(400);
            });
        });

        it('responds without query parameter portalId with 400', function(){
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token){
                return th.get(`/api/portalmodules/available?token=${token}`).expect(400);
            });
        });

        it('responds without authentication with 403', function(){
            return db.get(co.collections.portals.name).findOne({name: 'p2'}).then(function(portalFromDB){
                return th.get(`/api/portalmodules/available?portalId=${portalFromDB._id}`).expect(403);
            });
        });

        it('responds without read rights with 403', function(){
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
                // Remove the corresponding permission
                return th.removeReadPermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(function(){
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token){
                        return th.get(`/api/portalmodules/available?portalId=${portalFromDB._id}&token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
                return th.removeClientModule('1', 'licenseserver').then(function(){
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token){
                        var id = portalFromDB._id;
                        return th.get(`/api/portalmodules/available?portalId=${id}&token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
                return th.removeClientModule('1', 'licenseserver').then(function(){
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                        var id = portalFromDB._id;
                        return th.get(`/api/portalmodules/available?portalId=${id}&token=${token}`).expect(403);
                    });
                });
            })
        });

        it('responds with correct portalId with list of all modules still unassigned to particular portal', function(done) {
            db.get(co.collections.portals.name).findOne({name: 'p1'}).then((portalFromDatabase) => {
                var portalId = portalFromDatabase._id;
                db.get(co.collections.portalmodules.name).find({portalId: portalId}).then((portalModulesFromDatabase) => {
                    th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                        th.get(`/api/portalmodules/available?token=${token}&portalId=${portalId}`).expect(200).end(function(err, res) {
                            if (err) {
                                done(err);
                                return;
                            }
                            var moduleConfig = JSON.parse(fs.readFileSync('./config/module-config.json').toString());
                            var availableModuleKeys = Object.keys(moduleConfig.modules);
                            // Remove the ones already assigned in testhelpers
                            availableModuleKeys.splice(availableModuleKeys.indexOf('base'), 1);
                            availableModuleKeys.splice(availableModuleKeys.indexOf('clients'), 1);
                            availableModuleKeys.splice(availableModuleKeys.indexOf('documents'), 1);
                            availableModuleKeys.splice(availableModuleKeys.indexOf('fmobjects'), 1);
                            availableModuleKeys.splice(availableModuleKeys.indexOf('portalbase'), 1);
                            var portalModulesFromApi = res.body;
                            assert.strictEqual(portalModulesFromApi.length, availableModuleKeys.length, `Number of portal modules differ (${portalModulesFromApi.length} from API, ${availableModuleKeys.length} module names in module_config.json)`);
                            availableModuleKeys.forEach((availablePortalModuleKey) => {
                                var portalModuleFound = false;
                                for (var i = 0; i < portalModulesFromApi.length; i++) {
                                    var portalModuleFromApi = portalModulesFromApi[i];
                                    if (portalModuleFromApi !== availablePortalModuleKey) {
                                        continue;
                                    }
                                    portalModuleFound = true;
                                }
                                assert.ok(portalModuleFound, `Portal module "${availablePortalModuleKey}" was not returned by API`);
                            });
                            done();
                        });
                    }).catch(done);
                });
            });
        });

        it('responds with list of available modules after assigning one. The list must not contain the assigned module', function() {
            var portal, token, moduleToTest = 'activities';
            return th.defaults.getPortal().then(function(p) {
                portal = p;
                // Eventuell vorhandene Zuordnung löschen
                return db.get(co.collections.portalmodules.name).remove({portalId:p._id,module:co.modules.activities});
            }).then(function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(tok) {
                token = tok;
                return th.get(`/api/${co.apis.portalmodules}/available?token=${token}&portalId=${portal._id.toString()}`).expect(200);
            }).then(function(response) {
                assert.ok(response.body.indexOf(moduleToTest) >= 0);
                return db.get(co.collections.portalmodules.name).insert({portalId:portal._id,module:co.modules.activities});
            }).then(function() {
                return th.get(`/api/${co.apis.portalmodules}/available?token=${token}&portalId=${portal._id.toString()}`).expect(200);
            }).then(function(response) {
                assert.ok(response.body.indexOf(moduleToTest) < 0);
            });
        });

	});

    describe('GET/:id', function() {

        it('responds without authentication with 403', function() {
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
                return db.get(co.collections.portalmodules.name).findOne({portalId: portalFromDB._id}).then(function(portalModuleFromDB){
                    var id = portalModuleFromDB._id;
                    return th.get(`/api/portalmodules/${id}`).expect(403);
                });
            });     
        });

        it('responds without read rights with 403', function(){
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
                return db.get(co.collections.portalmodules.name).findOne({portalId: portalFromDB._id}).then(function(portalModuleFromDB){
                    var id = portalModuleFromDB._id;
                    // Remove the corresponding permission
                    return th.removeReadPermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(function(){
                        return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token){
                            return th.get(`/api/portalmodules/${id}?portalId=${portalFromDB._id}&token=${token}`).expect(403);
                        });
                    });
                });
            });       
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get(co.collections.portalmodules.name).findOne({module: 'base'}).then(function(portalModuleFromDB){
                return th.removeClientModule('1', 'licenseserver').then(function(){
                    return th.doLoginAndGetToken('1_0_1', 'test').then(function(token){
                        var id  = portalModuleFromDB._id;
                        return th.get(`/api/portalmodules/${id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get(co.collections.portalmodules.name).findOne({module: 'base'}).then(function(portalModuleFromDB){
                return th.removeClientModule('1', 'licenseserver').then(function(){
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                        var id  = portalModuleFromDB._id;
                        return th.get(`/api/portalmodules/${id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with valid but non-existing id with 404', function(){
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                return th.get(`/api/portalmodules/999999999999999999999999?token=${token}`).expect(404);
            });
        });

        it('responds with existing id with all details of the portal module assigment', function(done){
            db.get(co.collections.portals.name).findOne({name: 'p2'}).then(function(portalFromDB){
                db.get(co.collections.portalmodules.name).findOne({portalId: portalFromDB._id}).then(function(portalModuleFromDB){
                    th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                        var id = portalModuleFromDB._id;
                        th.get(`/api/portalmodules/${id}?token=${token}`).expect(200).end(function(err,res){
                            if(err){
                                done(err);
                                return;
                            }
                            var portalModuleFromApi = res.body;
                            //TODO rewrite to more elegant form (like in clientmodules)
                            assert.strictEqual(portalModuleFromDB.module.toString(), portalModuleFromApi.module, 'module field of retrieved portal module differes!');
                            assert.strictEqual(portalModuleFromDB.portalId.toString(), portalModuleFromApi.portalId, 'portalId field of retrieved portal module differes!');
                            assert.strictEqual(id.toString(), portalModuleFromApi._id, '_id field of retrieved portal module differes!');
                            done();
                        });
                    }).catch(done);
                });
            });
        });

    });

    describe('POST/', function() {

        it('responds without assigning any portalmodule data with 400', function(){
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
                return th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    return th.post(`/api/portalmodules?token=${token}`).send().expect(400);
                });
            });

        });

        it('responds without assigning particular module data with 400', function(){
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
                return th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    var newModule = {
                        portalId: portalFromDB._id
                    };
                    return th.post(`/api/portalmodules?token=${token}`).send(newModule).expect(400);
                });
            });
        });

        it('responds without assigning portalId data with 400', function(){
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
                return th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    var newModule = {
                        module: 'activities'
                    };
                    return th.post(`/api/portalmodules?token=${token}`).send(newModule).expect(400);
                });
            });
        });

        it('responds with assigning non-existing portalId with 400', function(){
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
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
            return db.get(co.collections.portals.name).findOne({name: 'p2'}).then(function(portalFromDB){
                return th.removeWritePermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(function(){
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token){
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
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
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
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
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
            db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
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
            db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
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
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
                return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                    var assignmentModule = {portalId: portalFromDB._id, module: 'activities'}
                    return th.post(`/api/portalmodules?token=${token}`).send(assignmentModule).expect(200).then(function(){
                        return th.post(`/api/portalmodules?token=${token}`).send(assignmentModule).expect(409);
                    });
                });
            });
        });

    });

    describe('PUT/:id', function() {

        it('responds with an invalid id with 400', function() {
            return db.get(co.collections.portalmodules.name).findOne({ module: 'base' }).then((portalModuleFromDatabase) => {
                return th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    return th.put(`/api/portalmodules/invalid?token=${token}`).send(portalModuleFromDatabase).expect(400);
                });
            });
        });

        it('responds without giving data with 400', function() {
            return db.get(co.collections.portalmodules.name).findOne({ module: 'documents' }).then((portalModuleFromDatabase) => {
                return th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    return th.put(`/api/portalmodules/${portalModuleFromDatabase._id}?token=${token}`).send().expect(400);
                });
            });
        });

        it('responds without meaningful data assigment with 400', function() {
            //attempts to update only the _id of portalmodule should be recognised as problematic
            return db.get(co.collections.portalmodules.name).findOne({ module: 'base' }).then((portalModuleFromDatabase) => {
                return th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    var id = portalModuleFromDatabase._id;
                    var updatedModule = {_id: '999999999999999999999999'}
                    return th.put(`/api/portalmodules/${id}?token=${token}`).send(updatedModule).expect(400);
                });
            });
        });

        it('responds with valid data but without write permission with 403', function(){
            return db.get(co.collections.portalmodules.name).findOne({ module: 'base' }).then((portalModuleFromDatabase) => {
                return th.removeWritePermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(function(){
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                        var id = portalModuleFromDatabase._id;
                        var updatedModule = {module: 'activities'}
                        return th.put(`/api/portalmodules/${id}?token=${token}`).send(updatedModule).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
                return db.get(co.collections.portalmodules.name).findOne({portalId: portalFromDB._id, module: 'documents'}).then(function(portalModuleFromDB){
                    return th.removeClientModule('1', 'licenseserver').then(function(){
                        return th.doLoginAndGetToken('1_1_1', 'test').then(function(token){
                            var updatedModule = {module: 'activities'}
                            var id = portalModuleFromDB._id;
                            return th.put(`/api/portalmodules/${id}?token=${token}`).send(updatedModule).expect(403);
                        });
                    });
                });
            });  
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
                return db.get(co.collections.portalmodules.name).findOne({portalId: portalFromDB._id, module: 'documents'}).then(function(portalModuleFromDB){
                    return th.removeClientModule('1', 'licenseserver').then(function(){
                        return th.doLoginAndGetToken('1_1_1', 'test').then(function(token){
                            var updatedModule = {module: 'activities'}
                            var id = portalModuleFromDB._id;
                            return th.put(`/api/portalmodules/${id}?token=${token}`).send(updatedModule).expect(403);
                        });
                    });
                });
            });  
        });

        it('responds with valid but non-existing id with 404', function(){
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                return th.put(`/api/portalmodules/999999999999999999999999?token=${token}`).send({module: 'clients'}).expect(404);
            });
        });

        it('responds with correct portalmodule data with correctly updated module', function(done){
            db.get(co.collections.portals.name).findOne({name: 'p2'}).then(function(portalFromDB){
                db.get(co.collections.portalmodules.name).findOne({portalId: portalFromDB._id, module: 'documents'}).then(function(portalModuleFromDB){
                    th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                        var id = portalModuleFromDB._id;
                        var updatedModule = {module: 'activities'}
                        th.put(`/api/portalmodules/${id}?token=${token}`).send(updatedModule).expect(200).end(function(err,res){
                            if(err){
                                done(err);
                                return;
                            }
                            var portalModuleFromApi = res.body;
                            var numKeysExpected = 3; //_id, module, portalId 
                            assert.strictEqual(Object.keys(portalModuleFromApi).length, numKeysExpected, 'returned portal module object contains unexpected number of fields')
                            assert.strictEqual(portalModuleFromApi.module, updatedModule.module, 'module field of ubdated portal nodule is incorrect');
                            done();
                        })
                    }).catch(done);
                });
            });
        });

        it('responds with portalmodule data containing _id with correctly updated module keeping original _id unchanged', function(done){
            db.get(co.collections.portals.name).findOne({name: 'p2'}).then(function(portalFromDB){
                db.get(co.collections.portalmodules.name).findOne({portalId: portalFromDB._id, module: 'documents'}).then(function(portalModuleFromDB){
                    th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                        var id = portalModuleFromDB._id;
                        var updatedModule = {module: 'activities',
                                            _id:'999999999999999999999999'} //send id of valid format but higly unlikely to be recreated by automated generation
                        th.put(`/api/portalmodules/${id}?token=${token}`).send(updatedModule).expect(200).end(function(err,res){
                            if(err){
                                done(err);
                                return;
                            }
                            var portalModuleFromApi = res.body;
                            assert.strictEqual(portalModuleFromApi.module, updatedModule.module, 'module field of ubdated portal nodule is incorrect');
                            assert.strictEqual(id.toString(), portalModuleFromApi._id, 'original _id was substituted')
                            done();
                        })
                    }).catch(done);
                });
            });
        });

        it('responds with portalmodule data containing portalId with correctly updated module keeping original portalId unchanged', function(done){
            db.get(co.collections.portals.name).findOne({name: 'p2'}).then(function(portalFromDB){
                db.get(co.collections.portalmodules.name).findOne({portalId: portalFromDB._id, module: 'documents'}).then(function(portalModuleFromDB){
                    th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                        var id = portalModuleFromDB._id;
                        var updatedModule = {module: 'activities',
                                            portalId:'999999999999999999999999'} //send id of valid format but higly unlikely to be recreated by automated generation
                        th.put(`/api/portalmodules/${id}?token=${token}`).send(updatedModule).expect(200).end(function(err,res){
                            if(err){
                                done(err);
                                return;
                            }
                            var portalModuleFromApi = res.body;
                            var portalId  = portalModuleFromDB.portalId.toString();
                            assert.strictEqual(portalModuleFromApi.module, updatedModule.module, 'module field of ubdated portal nodule is incorrect');
                            assert.strictEqual(portalId, portalModuleFromApi.portalId, `original _id was substituted:${portalModuleFromApi.portalId} from Api and ${portalId} from database`);
                            done();
                        })
                    }).catch(done);
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
            return db.get(co.collections.portals.name).findOne({name: 'p2'}).then(function(portalFromDB){
                return th.removeWritePermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(function(){
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token){
                        var id = portalFromDB._id;
                        return th.del(`/api/portalmodules/${id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
                return db.get(co.collections.portalmodules.name).findOne({portalId: portalFromDB._id}).then(function(portalModuleFromDB){
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
            return db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
                return db.get(co.collections.portalmodules.name).findOne({portalId: portalFromDB._id}).then(function(portalModuleFromDB){
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
            db.get(co.collections.portals.name).findOne({name: 'p1'}).then(function(portalFromDB){
                db.get(co.collections.portalmodules.name).findOne({module: 'documents', portalId: portalFromDB._id}).then(function(portalModuleFromDB){
                    th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                        var id = portalModuleFromDB._id;
                        th.del(`/api/portalmodules/${id}?token=${token}`).expect(204).end(function(err,res){
                            if(err){
                                done(err);
                                return;
                            }
                            db.get(co.collections.portalmodules.name).findOne({_id: id}).then((stillExistingPortalModule) => {
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