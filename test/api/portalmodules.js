/**
 * UNIT Tests for api/portalmodules
 */

var assert = require('assert');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');
var fs = require('fs');

describe('API portalmodules', function(){

    var server = require('../../app');

    // Clear and prepare database with clients, user groups, users... 
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
            .then(testHelpers.preparePortals)
            .then(testHelpers.preparePortalModules);
    });

    describe('GET/', function() {

        it('responds with incorrect query parameter portalId with 400', function(){
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return superTest(server).get(`/api/portalmodules?portalId=IvalidId&token=${token}`).expect(400);
            });
        });

        it('responds with non-existing query parameter portalId with 400', function(){
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return superTest(server).get(`/api/portalmodules?portalId=999999999999999999999999&token=${token}`).expect(400);
            });
        });

        it('responds without query parameter portalId with 400', function(){
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return superTest(server).get(`/api/portalmodules?token=${token}`).expect(400);
            });
        });

        it('responds without authentication with 403', function() {
                return superTest(server).get('/api/portalmodules').expect(403);
        });

        it('responds without read rights with 403', function(){
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                // Remove the corresponding permission
                return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return superTest(server).get(`/api/portalmodules?portalId=${portalFromDB._id}&token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return testHelpers.removeClientModule('1', 'licenseserver').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_1', 'test').then(function(token){
                    return superTest(server).get(`/api/portalmodules?token=${token}`).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return testHelpers.removeClientModule('1', 'licenseserver').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                    return superTest(server).get(`/api/portalmodules?token=${token}`).expect(403);
                });
            });
        });

        it('responds with correct portalId with list of all portal module assignments for the portal with all details', function(done) {
            db.get('portals').findOne({name: 'p1'}).then((portalFromDatabase) => {
                var portalId = portalFromDatabase._id;
                db.get('portalmodules').find({portalId: portalId}).then((portalModulesFromDatabase) => {
                    testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                        superTest(server).get(`/api/portalmodules?token=${token}&portalId=${portalId}`).expect(200).end(function(err, res) {
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
                                    testHelpers.compareApiAndDatabaseObjects('portal module', keys, portalModuleFromApi, portalModuleFromDatabase);
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
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return superTest(server).get(`/api/portalmodules/available?portalId=IvalidId&token=${token}`).expect(400);
            });
        });

        it('responds with non-existing query parameter portalId with 400', function(){
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return superTest(server).get(`/api/portalmodules/available?portalId=999999999999999999999999&token=${token}`).expect(400);
            });
        });

        it('responds without query parameter portalId with 400', function(){
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return superTest(server).get(`/api/portalmodules/available?token=${token}`).expect(400);
            });
        });

        it('responds without authentication with 403', function(){
            return db.get('portals').findOne({name: 'p2'}).then(function(portalFromDB){
                return superTest(server).get(`/api/portalmodules/available?portalId=${portalFromDB._id}`).expect(403);
            });
        });

        it('responds without read rights with 403', function(){
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                // Remove the corresponding permission
                return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return superTest(server).get(`/api/portalmodules/available?portalId=${portalFromDB._id}&token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return testHelpers.removeClientModule('1', 'licenseserver').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        var id = portalFromDB._id;
                        return superTest(server).get(`/api/portalmodules/available?portalId=${id}&token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return testHelpers.removeClientModule('1', 'licenseserver').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                        var id = portalFromDB._id;
                        return superTest(server).get(`/api/portalmodules/available?portalId=${id}&token=${token}`).expect(403);
                    });
                });
            })
        });

        it('responds with correct portalId with list of all modules still unassigned to particular portal', function(done) {
            db.get('portals').findOne({name: 'p1'}).then((portalFromDatabase) => {
                var portalId = portalFromDatabase._id;
                db.get('portalmodules').find({portalId: portalId}).then((portalModulesFromDatabase) => {
                    testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                        superTest(server).get(`/api/portalmodules/available?token=${token}&portalId=${portalId}`).expect(200).end(function(err, res) {
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

        it('responds with list of available modules after assigning one. The list must not contain the assigned module', function(done) {
            // Check the list of available modules, it must contain the activities module
            // Assign the activities module (have a look into testhelpers for which module you can use. activities is a good start)
            // Retreive the list of available modules, it must not contain the activities now
            db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                var portalId = portalFromDB._id;
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    superTest(server).get(`/api/portalmodules/available?token=${token}&portalId=${portalId}`).expect(200).then(function(availableBeforeAssignment){
                        var assignmentModule = {portalId: portalId, module: 'activities'};
                        superTest(server).post(`/api/portalmodules?token=${token}`).send(assignmentModule).expect(200).then(function(){
                            superTest(server).get(`/api/portalmodules/available?token=${token}&portalId=${portalId}`).expect(200).end(function(err, res){
                                var initialModuleList = availableBeforeAssignment.body;
                                var modifiedModuleList = res.body;
                                if(err){
                                    done(err);
                                    return;
                                };
                                assert.strictEqual(initialModuleList.length -1, modifiedModuleList.length, 'Incorrect nubmer of abailable modules');
                                done();
                            });
                        });
                    });
                });
            });
        });

	});

    describe('GET/:id', function() {

        it('responds without authentication with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return db.get('portalmodules').findOne({portalId: portalFromDB._id}).then(function(portalModuleFromDB){
                    var id = portalModuleFromDB._id;
                    return superTest(server).get(`/api/portalmodules/${id}`).expect(403);
                });
            });     
        });

        it('responds without read rights with 403', function(){
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return db.get('portalmodules').findOne({portalId: portalFromDB._id}).then(function(portalModuleFromDB){
                    var id = portalModuleFromDB._id;
                    // Remove the corresponding permission
                    return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(function(){
                        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                            return superTest(server).get(`/api/portalmodules/${id}?portalId=${portalFromDB._id}&token=${token}`).expect(403);
                        });
                    });
                });
            });       
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('portalmodules').findOne({module: 'base'}).then(function(portalModuleFromDB){
                return testHelpers.removeClientModule('1', 'licenseserver').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_1', 'test').then(function(token){
                        var id  = portalModuleFromDB._id;
                        return superTest(server).get(`/api/portalmodules/${id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('portalmodules').findOne({module: 'base'}).then(function(portalModuleFromDB){
                return testHelpers.removeClientModule('1', 'licenseserver').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                        var id  = portalModuleFromDB._id;
                        return superTest(server).get(`/api/portalmodules/${id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with valid but non-existing id with 404', function(){
            return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                return superTest(server).get(`/api/portalmodules/999999999999999999999999?token=${token}`).expect(404);
            });
        });

        it('responds with existing id with all details of the portal module assigment', function(done){
            db.get('portals').findOne({name: 'p2'}).then(function(portalFromDB){
                db.get('portalmodules').findOne({portalId: portalFromDB._id}).then(function(portalModuleFromDB){
                    testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                        var id = portalModuleFromDB._id;
                        superTest(server).get(`/api/portalmodules/${id}?token=${token}`).expect(200).end(function(err,res){
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
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    return superTest(server).post(`/api/portalmodules?token=${token}`).send().expect(400);
                });
            });

        });

        it('responds without assigning particular module data with 400', function(){
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    var newModule = {
                        portalId: portalFromDB._id
                    };
                    return superTest(server).post(`/api/portalmodules?token=${token}`).send(newModule).expect(400);
                });
            });
        });

        it('responds without assigning portalId data with 400', function(){
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    var newModule = {
                        module: 'activities'
                    };
                    return superTest(server).post(`/api/portalmodules?token=${token}`).send(newModule).expect(400);
                });
            });
        });

        it('responds with assigning non-existing portalId with 400', function(){
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    var newModule = {
                        module: 'activities',
                        portalId: '999999999999999999999999'
                    };
                    return superTest(server).post(`/api/portalmodules?token=${token}`).send(newModule).expect(400);
                });
            });
        });

        it('responds with valid data but without write permission with 403', function(){
            return db.get('portals').findOne({name: 'p2'}).then(function(portalFromDB){
                return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        //both module and portalId have to be provided
                        var newModule = {
                            module: 'activities',
                            portalId: portalFromDB._id
                        }
                        return superTest(server).post(`/api/portalmodules?token=${token}`).send(newModule).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return testHelpers.removeClientModule('1', 'licenseserver').then(function(){
                    return testHelpers.doLoginAndGetToken('1_1_1', 'test').then(function(token){
                        var newModule = {portalId: portalFromDB._id,
                                        module: 'activities'}
                        return superTest(server).post(`/api/portalmodules?token=${token}`).send(newModule).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return testHelpers.removeClientModule('1', 'licenseserver').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                        var newModule = {portalId: portalFromDB._id,
                                        module: 'activities'}
                        return superTest(server).post(`/api/portalmodules?token=${token}`).send(newModule).expect(403);
                    });
                });
            });
        });

        it('responds with correct portalmodule data with inserted portalmodule containing auto-generated _id field', function(done){
            db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                    var newModule = {portalId: portalFromDB._id,
                                    module: 'activities'}
                    superTest(server).post(`/api/portalmodules?token=${token}`).send(newModule).expect(200).end(function(err, res){
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
                testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                    var newModule = {portalId: portalFromDB._id,
                                    module: 'activities',
                                    _id: '999999999999999999999999'} //send id of valid format but higly unlikely to be recreated by automated generation
                    superTest(server).post(`/api/portalmodules?token=${token}`).send(newModule).expect(200).end(function(err, res){
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
                return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                    var assignmentModule = {portalId: portalFromDB._id, module: 'activities'}
                    return superTest(server).post(`/api/portalmodules?token=${token}`).send(assignmentModule).expect(200).then(function(){
                        return superTest(server).post(`/api/portalmodules?token=${token}`).send(assignmentModule).expect(409);
                    });
                });
            });
        });

    });

    describe('PUT/:id', function() {

        it('responds with an invalid id with 400', function() {
            return db.get('portalmodules').findOne({ module: 'base' }).then((portalModuleFromDatabase) => {
                return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    return superTest(server).put(`/api/portalmodules/invalid?token=${token}`).send(portalModuleFromDatabase).expect(400);
                });
            });
        });

        it('responds without giving data with 400', function() {
            return db.get('portalmodules').findOne({ module: 'documents' }).then((portalModuleFromDatabase) => {
                return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    return superTest(server).put(`/api/portalmodules/${portalModuleFromDatabase._id}?token=${token}`).send().expect(400);
                });
            });
        });

        it('responds without meaningful data assigment with 400', function() {
            //attempts to update only the _id of portalmodule should be recognised as problematic
            return db.get('portalmodules').findOne({ module: 'base' }).then((portalModuleFromDatabase) => {
                return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token) {
                    var id = portalModuleFromDatabase._id;
                    var updatedModule = {_id: '999999999999999999999999'}
                    return superTest(server).put(`/api/portalmodules/${id}?token=${token}`).send(updatedModule).expect(400);
                });
            });
        });

        it('responds with valid data but without write permission with 403', function(){
            return db.get('portalmodules').findOne({ module: 'base' }).then((portalModuleFromDatabase) => {
                return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                        var id = portalModuleFromDatabase._id;
                        var updatedModule = {module: 'activities'}
                        return superTest(server).put(`/api/portalmodules/${id}?token=${token}`).send(updatedModule).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return db.get('portalmodules').findOne({portalId: portalFromDB._id, module: 'documents'}).then(function(portalModuleFromDB){
                    return testHelpers.removeClientModule('1', 'licenseserver').then(function(){
                        return testHelpers.doLoginAndGetToken('1_1_1', 'test').then(function(token){
                            var updatedModule = {module: 'activities'}
                            var id = portalModuleFromDB._id;
                            return superTest(server).put(`/api/portalmodules/${id}?token=${token}`).send(updatedModule).expect(403);
                        });
                    });
                });
            });  
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return db.get('portalmodules').findOne({portalId: portalFromDB._id, module: 'documents'}).then(function(portalModuleFromDB){
                    return testHelpers.removeClientModule('1', 'licenseserver').then(function(){
                        return testHelpers.doLoginAndGetToken('1_1_1', 'test').then(function(token){
                            var updatedModule = {module: 'activities'}
                            var id = portalModuleFromDB._id;
                            return superTest(server).put(`/api/portalmodules/${id}?token=${token}`).send(updatedModule).expect(403);
                        });
                    });
                });
            });  
        });

        it('responds with valid but non-existing id with 404', function(){
            return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                return superTest(server).put(`/api/portalmodules/999999999999999999999999?token=${token}`).send({module: 'clients'}).expect(404);
            });
        });

        it('responds with correct portalmodule data with correctly updated module', function(done){
            db.get('portals').findOne({name: 'p2'}).then(function(portalFromDB){
                db.get('portalmodules').findOne({portalId: portalFromDB._id, module: 'documents'}).then(function(portalModuleFromDB){
                    testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                        var id = portalModuleFromDB._id;
                        var updatedModule = {module: 'activities'}
                        superTest(server).put(`/api/portalmodules/${id}?token=${token}`).send(updatedModule).expect(200).end(function(err,res){
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
            db.get('portals').findOne({name: 'p2'}).then(function(portalFromDB){
                db.get('portalmodules').findOne({portalId: portalFromDB._id, module: 'documents'}).then(function(portalModuleFromDB){
                    testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                        var id = portalModuleFromDB._id;
                        var updatedModule = {module: 'activities',
                                            _id:'999999999999999999999999'} //send id of valid format but higly unlikely to be recreated by automated generation
                        superTest(server).put(`/api/portalmodules/${id}?token=${token}`).send(updatedModule).expect(200).end(function(err,res){
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
            db.get('portals').findOne({name: 'p2'}).then(function(portalFromDB){
                db.get('portalmodules').findOne({portalId: portalFromDB._id, module: 'documents'}).then(function(portalModuleFromDB){
                    testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                        var id = portalModuleFromDB._id;
                        var updatedModule = {module: 'activities',
                                            portalId:'999999999999999999999999'} //send id of valid format but higly unlikely to be recreated by automated generation
                        superTest(server).put(`/api/portalmodules/${id}?token=${token}`).send(updatedModule).expect(200).end(function(err,res){
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
            return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                return superTest(server).del(`/api/portalmodules/IvalidId?token=${token}`);
            });
        });

        it('responds with valid data but without write permission with 403', function(){
            return db.get('portals').findOne({name: 'p2'}).then(function(portalFromDB){
                return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        var id = portalFromDB._id;
                        return superTest(server).del(`/api/portalmodules/${id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return db.get('portalmodules').findOne({portalId: portalFromDB._id}).then(function(portalModuleFromDB){
                    return testHelpers.removeClientModule('1', 'licenseserver').then(function(){
                        return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                            var id = portalModuleFromDB._id;
                            return superTest(server).del(`/api/portalmodules/${id}?token=${token}`).expect(403);
                        });
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                return db.get('portalmodules').findOne({portalId: portalFromDB._id}).then(function(portalModuleFromDB){
                    return testHelpers.removeClientModule('1', 'licenseserver').then(function(){
                        return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                            var id = portalModuleFromDB._id;
                            return superTest(server).del(`/api/portalmodules/${id}?token=${token}`).expect(403);
                        });
                    });
                });
            });
        });

        it('responds with valid but non-existing id with 404', function(){
            return testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                return superTest(server).del(`/api/portalmodules/999999999999999999999999?token=${token}`).expect(404);
            });
        });

        it('responds with correct existing id with 204', function(done){
            db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                db.get('portalmodules').findOne({module: 'documents', portalId: portalFromDB._id}).then(function(portalModuleFromDB){
                    testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                        var id = portalModuleFromDB._id;
                        superTest(server).del(`/api/portalmodules/${id}?token=${token}`).expect(204).end(function(err,res){
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
