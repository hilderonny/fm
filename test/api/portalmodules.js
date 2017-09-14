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

    describe('GET/forPortal/:id', function() {

        var api = `${co.apis.portalmodules}/forPortal`;

        th.apiTests.getId.defaultNegative(api, co.permissions.LICENSESERVER_PORTAL, co.collections.portals.name);
        th.apiTests.getId.clientDependentNegative(api, co.collections.portals.name);

        it('responds with all portal modules where the states are correctly set', async function() {
            var portal = await th.defaults.getPortal();
            var token = await th.defaults.login();
            var portalModulesFromDatabase = await db.get(co.collections.portalmodules.name).find({portalId: portal._id});
            var portalModulesFromApi = (await th.get(`/api/${co.apis.portalmodules}/forPortal/${portal._id}?token=${token}`).expect(200)).body;
            var keysFromDatabase = portalModulesFromDatabase.map((p) => p.key);
            var keysFromApi = portalModulesFromApi.map((p) => p.key);
            keysFromDatabase.forEach((key) => {
                assert.ok(keysFromApi.indexOf(key) >= 0, `Portal module ${key} not returned by API.`);
            });
            keysFromApi.forEach((key) => {
                assert.ok(keysFromDatabase.indexOf(key) >= 0, `Portal module ${key} not prepared in database`);
            });
        });

        it('responds with all portal modules even when some of them are not defined in database', async function() {
            var portal = await th.defaults.getPortal();
            var token = await th.defaults.login();
            var moduleToCheck = co.modules.documents;
            // Zugriff aus Datenbank löschen
            await db.remove(co.collections.portalmodules.name, {module:moduleToCheck});
            var portalModulesFromApi = (await th.get(`/api/${co.apis.portalmodules}/forPortal/${portal._id}?token=${token}`).expect(200)).body;
            var relevantPortalModule = portalModulesFromApi.find((p) => p.module === moduleToCheck);
            assert.ok(relevantPortalModule);
            assert.strictEqual(relevantPortalModule.active, false);
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
            db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
                th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                    var newModule = {portalId: portalFromDB._id,
                                    module: 'activities'}
                    th.post(`/api/portalmodules?token=${token}`).send(newModule).expect(200).end(function(err, res){
                        if(err){
                            done(err);
                            return;
                        }
                        var portalModuleFromApi = res.body; 
                        numKeysInitially = Object.keys(newModule).length;
                        numKeysExpected  = Object.keys(portalModuleFromApi).length - 2;  //_id and cliendId fields returned in addition to all other fields of sent newModule
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
                th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
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

        it('responds with portalmodule data containg _id with inserted portalmodule containing auto-generated _id field', function(done){
            //user defined _id should not be possible

            //clientId of p2 -> null
            db.get('portals').findOne({name: 'p2'}).then(function(portalFromDB){
                th.doLoginAndGetToken(th.defaults.portalUser, th.defaults.password).then(function(token){
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
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
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
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDB){
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

        it('responds with valid but non-existing id with 403', function(){
            return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                return th.del(`/api/portalmodules/999999999999999999999999?token=${token}`).expect(403);
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