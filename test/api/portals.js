/**
 * UNIT Tests for api/portals
 */

var assert = require('assert');
var superTest = require('supertest');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');

describe('API portals', function(){

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

        it('responds with all portals', function() {
            var portalsFromDatabase;
            return db.get('portals').find().then(function(portals) {
                portalsFromDatabase = portals;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.portals}?token=${token}`).expect(200);
            }).then(function(response) {
                var portalsFromApi = response.body; 
                assert.strictEqual(portalsFromDatabase.length, portalsFromApi.length, 'Number of sent portals does not match number of expected portals');
                //TODO test if more specific object attributes also match 
                return Promise.resolve();
            });
        });

    });

    describe('GET/forIds', function() {

        function createTestPortals() {
            var testObjects = ['testPortal1', 'testPortal2', 'testPortal3'].map(function(name) {
                return {
                    name: name
                }
            });
            return Promise.resolve(testObjects);
        }

        th.apiTests.getForIds.defaultNegative(co.apis.portals, co.permissions.LICENSESERVER_PORTAL, co.collections.portals, createTestPortals);
        th.apiTests.getForIds.defaultPositive(co.apis.portals, co.collections.portals, createTestPortals);

    });

    describe('GET/:id', function() {

        th.apiTests.getId.defaultNegative(co.apis.portals, co.permissions.LICENSESERVER_PORTAL, co.collections.portals);
        th.apiTests.getId.clientDependentNegative(co.apis.portals, co.collections.portals);

        it('responds with retrieved portal', function() {
            var portalFromDatabase;
            return db.get('portals').findOne({name: th.defaults.portal}).then(function(portal) {
                portalFromDatabase = portal;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.portals}/${portalFromDatabase._id}?token=${token}`).expect(200);
            }).then(function(response) {
                var portalFromApi = response.body; 
                assert.strictEqual(portalFromApi.name, portalFromDatabase.name);
                return Promise.resolve();
            });
        });

    });

    describe('POST/', function() {

        function createPostTestPortal() {
            var testObject = {
                name: 'newPortal',
            };
            return Promise.resolve(testObject);
        }

        th.apiTests.post.defaultNegative(co.apis.portals, co.permissions.LICENSESERVER_PORTAL, createPostTestPortal);
        th.apiTests.post.defaultPositive(co.apis.portals, co.collections.portals, createPostTestPortal);

    });

    describe('POST/newkey', function() {

        function createTestObject() {
            return db.get(co.collections.portals).insert({name:'testPortal'});
        }

        var testPortal = { name: 'testPortal' };

        it('responds without authentication with 403', function() {
            return createTestObject().then(function(testObject) {
                return th.post(`/api/${co.apis.portals}/newkey/${testObject._id.toString()}`).send().expect(403);
            });
        });
        it('responds without write permission with 403', function() {
            var loginToken;
            return th.removeWritePermission(th.defaults.user, co.permissions.LICENSESERVER_PORTAL).then(function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                loginToken = token;
                return createTestObject();
            }).then(function(testObject) {
                return th.post(`/api/${co.apis.portals}/newkey/${testObject._id.toString()}?token=${loginToken}`).send().expect(403);
            });
        });

        function checkForUser(user) {
            return function() {
                var loginToken;
                var moduleName = th.getModuleForApi(co.apis.portals);
                return th.removeClientModule(th.defaults.client, moduleName).then(function() {
                    return th.doLoginAndGetToken(user, th.defaults.password);
                }).then(function(token) {
                    loginToken = token;
                    return createTestObject();
                }).then(function(testObject) {
                    return th.post(`/api/${co.apis.portals}/newkey/${testObject._id.toString()}?token=${loginToken}`).send().expect(403);
                });
            }
        }

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser(th.defaults.user));

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser(th.defaults.adminUser));

        it('responds with non-exisitng id with 404', function(){
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                return th.post(`/api/${co.apis.portals}/newkey/999999999999999999999999?token=${token}`).send().expect(404);
            });
        });

        it('responds with a new license key for the portal with the given id', function() {
            var portalFromDatabase;
            return createTestObject().then(function(portal) {
                portalFromDatabase = portal;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post(`/api/${co.apis.portals}/newkey/${portalFromDatabase._id.toString()}?token=${token}`).send().expect(200);
            }).then(function(response) {
                var portalFromApi = response.body;
                assert.ok(portalFromApi.licenseKey);
                assert.notEqual(portalFromApi.licenseKey, portalFromDatabase.licenseKey);
                return Promise.resolve();
            });
        });

    });

    describe('PUT/:id', function() {

        function createPutTestPortal() {
            return db.get(co.collections.clients).findOne({name:th.defaults.client}).then(function(client) {
                return db.get(co.collections.portals).insert({name:'newPortal', clientId:client._id});
            }).then(function(portal) {
                return Promise.resolve(portal);
            });
        }

        th.apiTests.put.defaultNegative(co.apis.portals, co.permissions.LICENSESERVER_PORTAL, createPutTestPortal);
        th.apiTests.put.clientDependentNegative(co.apis.portals, createPutTestPortal);

        it('responds with correctly updated portal', function() {
            var portalFromDatabase;
            var updatedPortal = {name: 'updatedPortalName', isActive: false };
            return createPutTestPortal().then(function(portal) {
                portalFromDatabase = portal;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.put(`/api/${co.apis.portals}/${portalFromDatabase._id.toString()}?token=${token}`).send(updatedPortal).expect(200);
            }).then(function(response) {
                var portalFromApi = response.body;
                assert.strictEqual(portalFromApi.name, updatedPortal.name);
                assert.strictEqual(portalFromApi.isActive, updatedPortal.isActive);
                return Promise.resolve();
            });
        });

        it('responds with a portal containing an _id field which differs from the id parameter with the updated portal and the original _id (_id cannot be changed)', function() {
            var portalFromDatabase;
            var updatedPortal = {name: 'updatedPortalName', isActive: false };
            return createPutTestPortal().then(function(portal) {
                portalFromDatabase = portal;
                return createPutTestPortal();
            }).then(function(portal) {
                updatedPortal._id = portal._id.toString();
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.put(`/api/${co.apis.portals}/${portalFromDatabase._id.toString()}?token=${token}`).send(updatedPortal).expect(200);
            }).then(function(response) {
                var portalFromApi = response.body;
                assert.notEqual(portalFromApi._id.toString(), updatedPortal._id.toString());
                return Promise.resolve();
            });
        });

    });

    describe('DELETE/:id', function() {

        function getDeletePortalId() {
            return db.get(co.collections.clients).findOne({name:th.defaults.client}).then(function(client) {
                return db.get(co.collections.portals).insert({name:'newPortal', clientId:client._id});
            }).then(function(portal) {
                return Promise.resolve(portal._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.portals, co.permissions.LICENSESERVER_PORTAL, getDeletePortalId);
        th.apiTests.delete.clientDependentNegative(co.apis.portals, getDeletePortalId);
        th.apiTests.delete.defaultPositive(co.apis.portals, co.collections.portals, getDeletePortalId);

        it('responds with a correct id with 204 and deletes all dependent objects (currently only portalmodules)', function(){
            var portalId;
            return getDeletePortalId().then(function(id) {
                portalId = id;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.del(`/api/portals/${portalId.toString()}?token=${token}`).expect(204);
            }).then(function(response) {
                return db.get(co.collections.portals).findOne({_id: portalId});
            }).then(function(stillExistingPortal) {
                assert.ok(!stillExistingPortal);
                return db.get(co.collections.portalmodules).findOne({portalId: portalId});
            }).then(function(stillExistingPortalModule) {
                assert.ok(!stillExistingPortalModule);
                return Promise.resolve();
            });
        });

    });

});