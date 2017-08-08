/**
 * UNIT Tests for api/businesspartners
 */
var assert = require('assert');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var bcryptjs =  require('bcryptjs');
var co = require('../../utils/constants');

describe('API businesspartners', function() {

    // Clear and prepare database with clients, user groups and users
    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions)
            .then(th.prepareBusinessPartners)
            .then(th.preparePartnerAddresses)
            .then(th.prepareRelations);
    });

    describe('GET/', function() {

        th.apiTests.get.defaultNegative(co.apis.businesspartners, co.permissions.CRM_BUSINESSPARTNERS);

        it('responds with list of all business partners of the client of the logged in user containing all details', function() {
            var businessPartners;
            // We use client 1
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                return th.get(`/api/${co.apis.businesspartners}?token=${token}`).expect(200);
            }).then(function(response){
                businessPartners = response.body;
                assert.strictEqual(businessPartners.length, 2);
                return db.get(co.collections.users).findOne({name: th.defaults.user});
            }).then((currentUser) => {
                var currentUserClientId = currentUser.clientId.toString();
                businessPartners.forEach((businessPartner) => {
                    ['name', 'clientId', 'industry', 'rolle', 'isJuristic'].forEach((propertyName) => {
                        assert.ok(typeof(businessPartner[propertyName]) !== 'undefined');
                    });
                    // Check clientId for correctness
                    assert.strictEqual(businessPartner.clientId, currentUserClientId);
                });
                return Promise.resolve();
            });
        });

    });

    describe('GET/forIds', function() {

        function createTestBusinessPartners() {
            return db.get(co.collections.clients).findOne({name:th.defaults.client}).then(function(client) {
                var clientId = client._id;
                var testObjects = ['testBusinessPartner1', 'testBusinessPartner2', 'testBusinessPartner3'].map(function(name) {
                    return {
                        name: name,
                        industry: 'Geschäftsbereich',
                        isJuristic: true,
                        rolle: 'Lieferent',
                        clientId: clientId
                    }
                });
                return Promise.resolve(testObjects);
            });
        }

        th.apiTests.getForIds.defaultNegative(co.apis.businesspartners, co.permissions.CRM_BUSINESSPARTNERS, co.collections.businesspartners, createTestBusinessPartners);
        th.apiTests.getForIds.clientDependentNegative(co.apis.businesspartners, co.collections.businesspartners, createTestBusinessPartners);

        it('returns a list of business partners with all details for the given IDs', function() {
            var testBusinessPartnerIds, insertedBusinessPartners;
            return createTestBusinessPartners().then(function(objects) {
                return th.bulkInsert(co.collections.businesspartners, objects);
            }).then(function(objects) {
                insertedBusinessPartners = objects;
                testBusinessPartnerIds = objects.map((to) => to._id.toString());
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.businesspartners}/forIds?ids=${testBusinessPartnerIds.join(',')}&token=${token}`).expect(200);
            }).then(function(response) {
                var businessPartners = response.body;
                var idCount = insertedBusinessPartners.length;
                assert.equal(businessPartners.length, idCount);
                for (var i = 0; i < idCount; i++) {
                    assert.strictEqual(businessPartners[i]._id, insertedBusinessPartners[i]._id.toString());
                    assert.strictEqual(businessPartners[i].name, insertedBusinessPartners[i].name);
                    assert.strictEqual(businessPartners[i].industry, insertedBusinessPartners[i].industry);
                    assert.strictEqual(businessPartners[i].rolle, insertedBusinessPartners[i].rolle);
                    assert.strictEqual(businessPartners[i].isJuristic, insertedBusinessPartners[i].isJuristic);
                    assert.strictEqual(businessPartners[i].clientId, insertedBusinessPartners[i].clientId.toString());
                }
                return Promise.resolve();
            });
        });
    });

    describe('GET/:id', function() {

        th.apiTests.getId.defaultNegative(co.apis.businesspartners, co.permissions.CRM_BUSINESSPARTNERS, co.collections.businesspartners);
        th.apiTests.getId.clientDependentNegative(co.apis.businesspartners, co.collections.businesspartners);

        it('responds with existing id with all details of the business partner', function() {
            var businessPartnerFromDatabase;
            return db.get(co.collections.businesspartners).findOne({name: '1_0'}).then(function(businessPartner) {
                businessPartnerFromDatabase = businessPartner;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.businesspartners}/${businessPartnerFromDatabase._id}?token=${token}`).expect(200);
            }).then(function(response) {
                var businessPartnerFromRequest = response.body;
                assert.strictEqual(businessPartnerFromRequest.name, businessPartnerFromDatabase.name);
                assert.strictEqual(businessPartnerFromRequest.industry, businessPartnerFromDatabase.industry);
                assert.strictEqual(businessPartnerFromRequest.rolle, businessPartnerFromDatabase.rolle);
                assert.strictEqual(businessPartnerFromRequest.isJuristic, businessPartnerFromDatabase.isJuristic);
                assert.strictEqual(businessPartnerFromRequest.clientId, businessPartnerFromDatabase.clientId.toString());
                return Promise.resolve();
            });
        });
        
    });

    describe('POST/', function() {

        function createPostTestBusinessPartner() {
            var testObject = {
                name: 'newBusinessPartner',
                industry: 'Geschäftsbereich',
                isJuristic: true,
                rolle: 'Lieferent'
            };
            return Promise.resolve(testObject);
        }

        th.apiTests.post.defaultNegative(co.apis.businesspartners, co.permissions.CRM_BUSINESSPARTNERS, createPostTestBusinessPartner);
        
        it('responds with correct data with inserted business partner containing an _id field', function() {
            var newBusinessPartner, loginToken;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                loginToken = token;
                return createPostTestBusinessPartner();
            }).then(function(businessPartner) {
                newBusinessPartner = businessPartner;
                return th.post(`/api/${co.apis.businesspartners}?token=${loginToken}`).send(newBusinessPartner).expect(200);
            }).then(function(response) {
                var businessPartnerFromApi = response.body;
                var keyCountFromApi = Object.keys(businessPartnerFromApi).length - 2; // _id and clientId is returned additionally
                var keys = Object.keys(newBusinessPartner);
                var keyCountFromDatabase = keys.length; 
                assert.strictEqual(keyCountFromApi, keyCountFromDatabase);
                assert.strictEqual(newBusinessPartner.name, businessPartnerFromApi.name);
                assert.strictEqual(newBusinessPartner.industry, businessPartnerFromApi.industry);
                assert.strictEqual(newBusinessPartner.rolle, businessPartnerFromApi.rolle);
                assert.strictEqual(newBusinessPartner.isJuristic, businessPartnerFromApi.isJuristic);
                return Promise.resolve();
            });
        });

    });

    describe('PUT/:id', function() {

        function createPutTestBusinessPartner() {
            return db.get(co.collections.businesspartners).findOne({name:th.defaults.businessPartner}).then(function(businessPartner) {
                var testObject = {
                    _id: businessPartner._id.toString(),
                    name: 'newBusinessPartner',
                    industry: 'newIndustry',
                    isJuristic: true,
                    rolle: 'newRole'
                };
                return Promise.resolve(testObject);
            });
        }

        th.apiTests.put.defaultNegative(co.apis.businesspartners, co.permissions.CRM_BUSINESSPARTNERS, createPutTestBusinessPartner);
        th.apiTests.put.clientDependentNegative(co.apis.businesspartners, createPutTestBusinessPartner);

        it('responds with a correct business partner with the updated business partner and its new properties', function() {
            var updatedBusinessPartner = {
                name: 'newBusinessPartnerName',
                industry: 'newBusinessPartnerIndustry',
                isJuristic: false,
                rolle: 'newBusinessPartnerRole'
            };
            var businessPartnerFromDatabase;
            return db.get(co.collections.businesspartners).findOne({name: th.defaults.businessPartner}).then(function(user) {
                businessPartner = user;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.put(`/api/${co.apis.businesspartners}/${businessPartner._id.toString()}?token=${token}`).send(updatedBusinessPartner).expect(200);
            }).then(function(response) {
                var businessPartnerFromApi = response.body;
                assert.strictEqual(updatedBusinessPartner.name, businessPartnerFromApi.name);
                assert.strictEqual(updatedBusinessPartner.industry, businessPartnerFromApi.industry);
                assert.strictEqual(updatedBusinessPartner.rolle, businessPartnerFromApi.rolle);
                assert.strictEqual(updatedBusinessPartner.isJuristic, businessPartnerFromApi.isJuristic);
                return Promise.resolve();
            });
        });
        
    });

    describe('DELETE/:id', function() {

        function getDeleteBusinessPartnerId() {
            return db.get(co.collections.businesspartners).findOne({name:th.defaults.businessPartner}).then(function(businessPartner) {
                delete businessPartner._id;
                businessPartner.name = 'newBusinessPartnerToDelete';
                return db.get(co.collections.businesspartners).insert(businessPartner);
            }).then(function(insertedBusinessPartner) {
                return th.createRelationsToBusinessPartner(co.collections.businesspartners, insertedBusinessPartner);
            }).then(function(insertedBusinessPartner) {
                return Promise.resolve(insertedBusinessPartner._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.businesspartners, co.permissions.CRM_BUSINESSPARTNERS, getDeleteBusinessPartnerId);
        th.apiTests.delete.clientDependentNegative(co.apis.businesspartners, getDeleteBusinessPartnerId);
        th.apiTests.delete.defaultPositive(co.apis.businesspartners, co.collections.businesspartners, getDeleteBusinessPartnerId);

        it('also deletes all addresses of the business partner', function() {
            var businessPartnerId;
            return db.get(co.collections.businesspartners).findOne({name:th.defaults.businessPartner}).then(function(bp) {
                businessPartnerId = bp._id;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then((token) => {
                return th.del(`/api/${co.apis.businesspartners}/${businessPartnerId.toString()}?token=${token}`).expect(204);
            }).then(() => {
                return db.get(co.collections.partneraddresses).find({partnerId:businessPartnerId});
            }).then((addresses) => {
                assert.equal(addresses.length, 0);
                return Promise.resolve();
            });
        });
        
    });

});
