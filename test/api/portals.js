/**
 * UNIT Tests for api/portals
 */

var assert = require('assert');
var superTest = require('supertest');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');

describe('API portals', function(){

    var server = require('../../app');

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
            .then(th.prepareRelations);
    });

    describe('GET/', function() {

        th.apiTests.get.defaultNegative(co.apis.portals, co.permissions.LICENSESERVER_PORTAL);

        // Positive tests

        it('responds with all portals', function(done) {
            db.get('portals').find().then((portalsFromDatabase) =>{
                th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    superTest(server).get(`/api/portals?token=${token}`).expect(200).end(function(err, res){
                        if (err) {
                                done(err);
                                return;
                            }
                            var portalsFromApi = res.body; 
                            assert.strictEqual(portalsFromDatabase.length, portalsFromApi.length, 'Number of sent portals does not match number of expected portals');
                            //TODO test if more specific object attributes also match 

                            done();
                    });
                }).catch(done);
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

        // Positive tests

        xit('returns a list of portals with all details for the given IDs', function() {
        });
    });

    describe('GET/:id', function() {

        th.apiTests.getId.defaultNegative(co.apis.portals, co.permissions.LICENSESERVER_PORTAL, co.collections.portals.name);

        it('responds with retrieved portal', function(done) {
            db.get('portals').findOne({name: 'p1'}).then((portalFromDatabase) =>{
                th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    superTest(server).get(`/api/portals/${portalFromDatabase._id}?token=${token}`).expect(200).end(function(err, res){
                        if (err) {
                                done(err);
                                return;
                            }
                            var portalFromApi = res.body; 
                            assert.strictEqual(portalFromApi.name, 'p1', 'Name attribute missmatch');
                            done();
                    });
                }).catch(done);
            });
        });

    });

    describe('POST/', function() {

        // Negative tests
        
        it('responds without any content with 400', function() {
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return superTest(server).post('/api/portals?token=' + token).send().expect(400);
            });
        });

        it('responds without authentication with 403', function() {
            return superTest(server).post('/api/portals')
                .send({name: 'p_test'})
                .expect(403);
        });

        it('responds without write permission with 403', function() {
            // Remove the corresponding permission
            return th.removeWritePermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(() => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var newPortal = {name: 'p_test'};
                    return superTest(server).post(`/api/portals?token=${token}`).send(newPortal).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'licenseserver').then(function(){
                return th.doLoginAndGetToken('1_0_1', 'test').then(function(token){
                    var newPortal = {
                        name: 'newPortalName',
                        isActive: true
                    };
                    return superTest(server).post(`/api/portals?token0${token}`).send(newPortal).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'licenseserver').then(function(){
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                    var newPortal = {
                        name: 'newPortalName',
                        isActive: true
                    };
                    return superTest(server).post(`/api/portals?token0${token}`).send(newPortal).expect(403);
                });
            });
        });

        // Positive tests

        it('responds with new portal containing _id field', function(done){
            th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) =>{
                superTest(server).post(`/api/portals?token=${token}`).send({name: 'newPortal'}).expect(200).end((err, res) =>{
                    if(err){
                        done(err);
                        return
                    }
                    var portalFromApi = res.body;
                    db.get(`portals`).findOne({name: 'newPortal'}).then((portalFromDataBase) =>{
                        assert.ok(portalFromDataBase, 'Portal was not created!');
                        assert.ok(portalFromDataBase._id, 'No _id field!');
                    });
                    done();
                });
            }).catch(done);
        });

    });

    describe('POST/newkey', function() {

        // Negative tests

        it('responds without write permission with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDataBase){
                //Remove corresponding permission
                return th.removeWritePermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(() => {
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        var id = portalFromDataBase._id;
                        return superTest(server).post(`/api/portals/newkey/${id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDataBase){
                return th.removeClientModule('1', 'licenseserver').then(function(){
                    return th.doLoginAndGetToken('1_1_1', 'test').then(function(token){
                        var portalId = portalFromDataBase._id;
                        return superTest(server).post(`/api/portals/newkey/${portalId}?token=${token}`).send().expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDataBase){
                return th.removeClientModule('1', 'licenseserver').then(function(){
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                        var portalId = portalFromDataBase._id;
                        return superTest(server).post(`/api/portals/newkey/${portalId}?token=${token}`).send().expect(403);
                    });
                });
            });
        });

        it('responds with non-exisitng id with 404', function(){
                return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    return superTest(server).post(`/api/portals/newkey/999999999999999999999999?token=${token}`).send().expect(404);
                });
        });

        // Positive tests

        it('responds with a new license key for the portal with the given id', function(done) {
            db.get('portals').findOne({name: 'p1'}).then((portalFromDatabase) =>{
                th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                    superTest(server).post(`/api/portals/newkey/${portalFromDatabase._id}?token=${token}`).send().expect(200).end((err, res) =>{
                        if(err){
                            done(err);
                            return;
                        }
                        var portalFromApi = res.body;
                        assert.ok(portalFromApi.licenseKey, 'No licenseKey!');//check if originally keyless portal now has a licenseKey
                        done();
                    });
                }).catch(done);
            });
        });

    });

    describe('PUT/:id', function() {

        // Negative tests

        it('responds with an invalid id with 400', function(){
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token)=>{
                var newPortal = {name: 'p_test', isActive: false};
                return superTest(server).put(`/api/portals/invalidId?token=${token}`).send(newPortal).expect(400);
            });
        });

        it('responds without any content with 400', function(){
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return db.get('portals').findOne({name: 'p1'}).then((portalFromDB) => {
                    var newPortal = {};
                    return superTest(server).put(`/api/portals/${portalFromDB._id}?token=${token}`).send(newPortal).expect(400);
                });   
            });
        });

        it('responds with _id only in the sent content with 400', function(){
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return db.get('portals').findOne({name: 'p1'}).then((portalFromDB) => {
                    var newPortal = {_id: '111111111111'};
                    return superTest(server).put(`/api/portals/${portalFromDB._id}?token=${token}`).send(newPortal).expect(400);
                });   
            });
        });

        it('responds without write permission with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDataBase){
                //Remove corresponding permission
                return th.removeWritePermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(() => {
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        var id = portalFromDataBase._id;
                        var updatedPortal = {name: 'newPortalName'};
                        return superTest(server).put(`/api/portals/${id}?token=${token}`).send(updatedPortal).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDataBase){
                return th.removeClientModule('1', 'licenseserver').then(function(){
                    return th.doLoginAndGetToken('1_1_1', 'test').then(function(token){
                        var portalId = portalFromDataBase._id;
                        var updatedPortal = {name: 'newPortalName'};
                        return superTest(server).put(`/api/portals/${portalId}?token=${token}`).send(updatedPortal).expect(403);
                    });
                });
            });       
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDataBase){
                return th.removeClientModule('1', 'licenseserver').then(function(){
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                        var portalId = portalFromDataBase._id;
                        var updatedPortal = {name: 'newPortalName'};
                        return superTest(server).put(`/api/portals/${portalId}?token=${token}`).send(updatedPortal).expect(403);
                    });
                });
            });
        });

        it('responds with non-existing id with 404', function(){
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then(function(token){
                var updatedPermission = { canRead: true };
                return superTest(server).put('/api/portals/999999999999999999999999?token=' + token).send(updatedPermission).expect(404);
            });
        });

        // Positive tests

        it('responds with correctly updated portal', function(done) {
            db.get('portals').findOne({name: 'p2'}).then((portalFromDatabase) =>{
                th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) =>{
                    var portalId = portalFromDatabase._id.toString();
                    var updatedPortal = {name: 'p_new', isActive: 'false'}
                    superTest(server).put(`/api/portals/${portalId}?token=${token}`).send(updatedPortal).expect(200).end((err, res) =>{
                        if(err){
                            done(err);
                            return;
                        }
                        var portalFromApi = res.body;
                        assert.strictEqual(portalFromApi.name, updatedPortal.name, 'Portal name was not updated correctly!');
                        assert.strictEqual(portalFromApi.isActive, updatedPortal.isActive, 'isActive property was not updated correctly!');
                        done();
                    });
                }).catch(done);
            });
        });

        it('responds with a portal containing an _id field which differs from the id parameter with the updated portal and the original _id (_id cannot be changed)', function(done) {
            db.get('portals').findOne({name: 'p2'}).then((portalFromDatabase) =>{
                th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) =>{
                    var portalId = portalFromDatabase._id.toString();
                    var updatedPortal = {name: 'p_new', _id: '999999999999999999999999'}
                    superTest(server).put(`/api/portals/${portalId}?token=${token}`).send(updatedPortal).expect(200).end((err, res) =>{
                        if(err){
                            done(err);
                            return;
                        }
                        var portalFromApi = res.body;
                        assert.notStrictEqual(portalFromApi._id.toString(), updatedPortal._id.toString(), 'isActive property was not updated correctly!');
                        done();
                    });
                }).catch(done);
            });
        });

    });

    describe('DELETE/:id', function() {

        // Negative tests

        it('responds with an invalid id with 400', function() {
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return superTest(server).del('/api/portals/invalidId?token=' + token).expect(400);
            });
        });

        it('responds without write permission with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDataBase){
                //Remove corresponding permission
                return th.removeWritePermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(() => {
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        var id = portalFromDataBase._id;
                        return superTest(server).del(`/api/portals/${id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDataBase){
                return th.removeClientModule('1', 'licenseserver').then(function(){
                    return th.doLoginAndGetToken('1_1_1', 'test').then(function(token){
                        var portalId = portalFromDataBase._id;
                        return superTest(server).del(`/api/portals/${portalId}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('portals').findOne({name: 'p1'}).then(function(portalFromDataBase){
                return th.removeClientModule('1', 'licenseserver').then(function(){
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                        var portalId = portalFromDataBase._id;
                        return superTest(server).del(`/api/portals/${portalId}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with an id that does not exist with 404', function() {
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return superTest(server).del('/api/portals/999999999999999999999999?token=' + token).expect(404);
            });
        }); 

        // Positive tests

        it('responds with a correct id with 204 and deletes all dependent objects (currently only portalmodules)', function(done){
            db.get('portals').findOne({name: 'p2'}).then((portalFromDatabase) =>{
                th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) =>{
                    var portalId = portalFromDatabase._id.toString();
                    superTest(server).del(`/api/portals/${portalId}?token=${token}`).expect(204).end((err, res) =>{
                        if(err){
                            done(err);
                            return;
                        }
                        db.get('portals').findOne({_id: portalId}).then((stillExistingPortal) => {
                            assert.ok(!stillExistingPortal, 'portal has not been deleted from database');
                            db.get('portalmodules').findOne({portalId: portalId}).then((stillExistingPortalModule) => {
                                assert.ok(!stillExistingPortalModule, 'There is at least one belonging portal module still not deleted from database');
                                done();
                            }).catch(done);
                        }).catch(done);
                    });
                }).catch(done);
            });
        });

        xit('All relations, where the element is the source (type1, id1), are also deleted', function() {
        });

        xit('All relations, where the element is the target (type2, id2), are also deleted', function() {
        });

    });

});