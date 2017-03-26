/**
 * UNIT Tests for api/portals
 */

var assert = require('assert');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');

describe('API portals', function(){

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
            .then(testHelpers.preparePortals);
    });

///////////////////////////////////////// 400 ///////////////////////////////////////////////////////  
    it('responds to GET/id with invalid id with 400', function() {
        return testHelpers.doAdminLoginAndGetToken().then((token) => {
            return superTest(server).get('/api/portals/invalidId?token=' + token).expect(400);
        });
    });
    
    it('responds to POST/ without any content with 400', function() {
        return testHelpers.doAdminLoginAndGetToken().then((token) => {
            return superTest(server).post('/api/portals?token=' + token).send().expect(400);
        });
    });

    it('responds to PUT/id with an invalid id with 400', function(){
        return testHelpers.doAdminLoginAndGetToken().then((token)=>{
            var newPortal = {name: 'p_test', isActive: false};
            return superTest(server).put(`/api/portals/invalidId?token=${token}`).send(newPortal).expect(400);
        });
    });

    it('responds to PUT/id without any content with 400', function(){
        return testHelpers.doAdminLoginAndGetToken().then((token) => {
             return db.get('portals').findOne({name: 'p1'}).then((portalFromDB) => {
                var newPortal = {};
                return superTest(server).put(`/api/portals/${portalFromDB._id}?token=${token}`).send(newPortal).expect(400);
             });   
        });
    });

     it('responds to PUT/id with _id only in the sent content with 400', function(){
        return testHelpers.doAdminLoginAndGetToken().then((token) => {
             return db.get('portals').findOne({name: 'p1'}).then((portalFromDB) => {
                var newPortal = {_id: '111111111111'};
                return superTest(server).put(`/api/portals/${portalFromDB._id}?token=${token}`).send(newPortal).expect(400);
             });   
        });
    });

   it('responds to DELETE/id with an invalid id with 400', function() {
        return testHelpers.doAdminLoginAndGetToken().then((token) => {
            return superTest(server).del('/api/portals/invalidId?token=' + token).expect(400);
        });
    });

///////////////////////////////////////// 403 ///////////////////////////////////////////////////////
    it('responds to GET/ without authentication with 403', function() {
            return superTest(server).get('/api/portals').expect(403);
    });

    it('responds to GET/id without authentication with 403', function() {
        // Load a valid id so we have a valid request and do not get a 404
        return db.get('portals').findOne({name: 'p1'}).then((portalFromDB) => {
            return superTest(server).get(`/api/portals/${portalFromDB._id.toString()}`).expect(403);
        });
    });

    it('responds to GET/ without read permission with 403', function() {
        // Remove the corresponding permission
        return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(() => {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return superTest(server).get('/api/portals?token=' + token).expect(403);
            });
        });
    });


    it('responds to GET/id without read permission with 403', function() {
        return db.get('portals').findOne({ name : 'p1' }).then((portalFromDatabase) => {
            // Remove the corresponding permission
            return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(() => {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return superTest(server).get(`/api/portals/${portalFromDatabase._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to POST/ without authentication with 403', function() {
        return superTest(server).post('/api/portals')
            .send({name: 'p_test'})
            .expect(403);
    });

    it('responds to POST/ without write permission with 403', function() {
        // Remove the corresponding permission
        return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_LICENSESERVER_PORTAL').then(() => {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                var newPortal = {name: 'p_test'};
                return superTest(server).post(`/api/portals?token=${token}`).send(newPortal).expect(403);
            });
        });
    });

    xit('responds to POST/newkey without write permission with 403', function() {
    });

    xit('responds to PUT/id without write permission with 403', function() {
    });

    xit('responds to DELETE/id without write permission with 403', function() {
    });

    it('responds to GET/ when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'licenseserver').then(function(){
            return testHelpers.doLoginAndGetToken('1_1_1', 'test').then(function(token){
                return superTest(server).get(`/api/portals?token=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/ when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'licenseserver').then(function(){
            return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ // Has isAdmin flag
                return superTest(server).get(`/api/portals?token=${token}`).expect(403);
            });
        });
    });

    xit('responds to GET/id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to GET/id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to POST/ when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to POST/ when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to POST/newkey when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to POST/newkey when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to PUT/id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to PUT/id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to DELETE/id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to DELETE/id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

///////////////////////////////////////// 404 ///////////////////////////////////////////////////////
    it('responds to GET/id with not existing id with 404', function() {
        return testHelpers.doAdminLoginAndGetToken().then((token) => {
            return superTest(server).get('/api/portals/999999999999999999999999?token=' + token).expect(404);
        });
    });

    it('responds to PUT/id with non-existing id with 404', function(){
        return testHelpers.doAdminLoginAndGetToken().then(function(token){
            var updatedPermission = { canRead: true };
            return superTest(server).put('/api/portals/999999999999999999999999?token=' + token).send(updatedPermission).expect(404);
        });
    });

    it('responds to POST/newkey/id with non-exisitng id with 404', function(){
            return testHelpers.doAdminLoginAndGetToken().then((token) => {
                return superTest(server).post(`/api/portals/newkey/999999999999999999999999?token=${token}`).send().expect(404);
            });
    });

    it('responds to DELETE/id with an id that does not exist with 404', function() {
        return testHelpers.doAdminLoginAndGetToken().then((token) => {
            return superTest(server).del('/api/portals/999999999999999999999999?token=' + token).expect(404);
        });
    }); 

///////////////////////////////////////// GET ///////////////////////////////////////////////////////

    it('responds to GET/ with all portals', function(done) {
        db.get('portals').find().then((portalsFromDatabase) =>{
            testHelpers.doAdminLoginAndGetToken().then((token) => {
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

    it('responds to GET/id with retrieved portal', function(done) {
        db.get('portals').findOne({name: 'p1'}).then((portalFromDatabase) =>{
            testHelpers.doAdminLoginAndGetToken().then((token) => {
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

    //TODO test if only specific fields are retrieved (for both GET/ and GET/id)

///////////////////////////////////////// POST //////////////////////////////////////////////////////
    it('responds to POST/newkey/id with a new license key for the portal with the given id', function(done) {
        db.get('portals').findOne({name: 'p1'}).then((portalFromDatabase) =>{
            testHelpers.doAdminLoginAndGetToken().then((token) => {
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

    it('responds to POST/ with new portal containing _id field', function(done){
        testHelpers.doAdminLoginAndGetToken().then((token) =>{
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

///////////////////////////////////////// PUT ///////////////////////////////////////////////////////
    it('responds to PUT/id with correctly updated portal', function(done) {
        db.get('portals').findOne({name: 'p2'}).then((portalFromDatabase) =>{
            testHelpers.doAdminLoginAndGetToken().then((token) =>{
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

    it('responds to PUT/id with a portal containing an _id field which differs from the id parameter with the updated portal and the original _id (_id cannot be changed)', function(done) {
        db.get('portals').findOne({name: 'p2'}).then((portalFromDatabase) =>{
            testHelpers.doAdminLoginAndGetToken().then((token) =>{
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

///////////////////////////////////////// DELETE ////////////////////////////////////////////////////
    it('responds to DELETE/id with a correct id with 204 and deletes all dependent objects (currently only portalmodules)', function(done){
        db.get('portals').findOne({name: 'p2'}).then((portalFromDatabase) =>{
            testHelpers.doAdminLoginAndGetToken().then((token) =>{
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
});