/**
 * UNIT Tests for api/partneraddresses
 */
var assert = require('assert');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var bcryptjs =  require('bcryptjs');
var co = require('../../utils/constants');

describe('API partneraddresses', function() {

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

    describe('GET/forBusinessPartner/:id', function() {

        var api = co.apis.partneraddresses + '/forBusinessPartner';
        th.apiTests.getId.defaultNegative(api, co.permissions.CRM_BUSINESSPARTNERS, co.collections.businesspartners.name);
        th.apiTests.getId.clientDependentNegative(api, co.collections.businesspartners.name);
        
        it('returns all addresses for the given business partner', function() {
            var businessPartnerFromDatabase, addressesFromDatabase;
            return db.get(co.collections.businesspartners.name).findOne({name: th.defaults.businessPartner}).then(function(bp) {
                businessPartnerFromDatabase = bp;
                return db.get(co.collections.partneraddresses.name).find({partnerId: bp._id});
            }).then((addresses) => {
                addressesFromDatabase = addresses;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.partneraddresses}/forBusinessPartner/${businessPartnerFromDatabase._id}?token=${token}`).expect(200);
            }).then(function(response) {
                var addressesFromRequest = response.body;
                assert.strictEqual(addressesFromRequest.length, addressesFromDatabase.length);
                for (var i = 0; i < addressesFromDatabase.length; i++) {
                    assert.strictEqual(addressesFromRequest[i]._id, addressesFromDatabase[i]._id.toString());
                    assert.strictEqual(addressesFromRequest[i].addressee, addressesFromDatabase[i].addressee);
                    assert.strictEqual(addressesFromRequest[i].street, addressesFromDatabase[i].street);
                    assert.strictEqual(addressesFromRequest[i].postcode, addressesFromDatabase[i].postcode);
                    assert.strictEqual(addressesFromRequest[i].city, addressesFromDatabase[i].city);
                    assert.strictEqual(addressesFromRequest[i].type, addressesFromDatabase[i].type);
                }
                return Promise.resolve();
            });
            
        });

    });

    describe('GET/:id', function() {

        th.apiTests.getId.defaultNegative(co.apis.partneraddresses, co.permissions.CRM_BUSINESSPARTNERS, co.collections.partneraddresses.name);
        th.apiTests.getId.clientDependentNegative(co.apis.partneraddresses, co.collections.partneraddresses.name);
         
        it('returns the address with all details for the given id', function() {
            var addressFromDatabase;
            return db.get(co.collections.partneraddresses.name).findOne({addressee: th.defaults.partnerAddress}).then((address) => {
                addressFromDatabase = address;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.partneraddresses}/${addressFromDatabase._id}?token=${token}`).expect(200);
            }).then(function(response) {
                var addressFromRequest = response.body;
                assert.strictEqual(addressFromRequest._id, addressFromDatabase._id.toString());
                ['addressee', 'street', 'postcode', 'city', 'type'].forEach((k) => {
                    assert.strictEqual(addressFromRequest[k], addressFromDatabase[k]);
                });
                return Promise.resolve();
            });
        });
       
    });

    describe('POST/', function() {

        function createPostTestAddress() {
            return db.get(co.collections.businesspartners.name).findOne({name:th.defaults.businessPartner}).then(function(partner) {
                var testObject = {
                    addressee: 'Addressee',
                    street: 'Street',
                    postcode: '12345',
                    city: 'City',
                    type: 'Primaryaddress',
                    partnerId: partner._id.toString()
                };
                return Promise.resolve(testObject);
            });
        }

        th.apiTests.post.defaultNegative(co.apis.partneraddresses, co.permissions.CRM_BUSINESSPARTNERS, createPostTestAddress);
                
        it('responds without giving a partnerId with 400', function() {
            var addressToSend;
            return createPostTestAddress().then((address) => {
                addressToSend = address;
                delete addressToSend.partnerId;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post(`/api/${co.apis.partneraddresses}?token=${token}`).send(addressToSend).expect(400);
            });
        });
                
        it('responds with not existing partnerId with 400', function() {
            var addressToSend;
            return createPostTestAddress().then((address) => {
                addressToSend = address;
                addressToSend.partnerId = '999999999999999999999999';
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post(`/api/${co.apis.partneraddresses}?token=${token}`).send(addressToSend).expect(400);
            });
        });
        
        it('responds with 400 when the partner of the address does not belong to the same client as the logged in user', async function() {
            var addressToSend = await createPostTestAddress();
            var token = await th.defaults.login(th.defaults.otherUser);
            await th.post(`/api/${co.apis.partneraddresses}?token=${token}`).send(addressToSend).expect(400);
        });

        it('responds with correct data with inserted address containing an _id field', function() {
            var addressToSend;
            return createPostTestAddress().then((address) => {
                addressToSend = address;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post(`/api/${co.apis.partneraddresses}?token=${token}`).send(addressToSend).expect(200);
            }).then((response) => {
                var addressFromApi = response.body;
                assert.ok(addressFromApi._id);
                ['addressee', 'street', 'postcode', 'city', 'type'].forEach((k) => {
                    assert.strictEqual(addressFromApi[k], addressToSend[k]);
                });
            });
        });

    });

    describe('PUT/:id', function() {

        function createPutTestAddress() {
            return db.get(co.collections.partneraddresses.name).findOne({addressee:th.defaults.partnerAddress}).then(function(address) {
                var testObject = {
                    _id: address._id.toString(),
                    addressee: 'New Addressee',
                    street: 'New Street',
                    postcode: 'New 12345',
                    city: 'New City',
                    type: 'Billingaddress',
                    partnerId: address.partnerId.toString()
                };
                return Promise.resolve(testObject);
            });
        }

        th.apiTests.put.defaultNegative(co.apis.partneraddresses, co.permissions.CRM_BUSINESSPARTNERS, createPutTestAddress);
        th.apiTests.put.clientDependentNegative(co.apis.partneraddresses, createPutTestAddress);

        it('updates the address and returns the updated entity', function() {
            var addressToSend;
            return createPutTestAddress().then((address) => {
                addressToSend = address;
                addressToSend.addressee = 'updated addressee';
                addressToSend.street = 'updated street';
                addressToSend.postcode = 'updated postcode';
                addressToSend.city = 'updated city';
                addressToSend.type = 'updated type';
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.put(`/api/${co.apis.partneraddresses}/${addressToSend._id.toString()}?token=${token}`).send(addressToSend).expect(200);
            }).then((response) => {
                var addressFromApi = response.body;
                Object.keys(addressToSend).forEach((k) => {
                    assert.strictEqual(addressFromApi[k], addressToSend[k]);
                });
            });
        });

        it('does not change the partner when a new partnerId is given', function() {
            var addressToSend, newPartnerId;
            return db.get(co.collections.businesspartners.name).findOne({name:'1_1'}).then((partner) => {
                newPartnerId = partner._id.toString();
                return createPutTestAddress();
            }).then((address) => {
                addressToSend = address;
                addressToSend.partnerId = newPartnerId;
                addressToSend.street = 'updated street';
                addressToSend.postcode = 'updated postcode';
                addressToSend.city = 'updated city';
                addressToSend.type = 'updated type';
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.put(`/api/${co.apis.partneraddresses}/${addressToSend._id.toString()}?token=${token}`).send(addressToSend).expect(200);
            }).then((response) => {
                var addressFromApi = response.body;
                assert.notEqual(addressFromApi.partnerId, newPartnerId);
            });
        });
        
    });

    describe('DELETE/:id', function() {

        function getDeleteAddressId() {
            return db.get(co.collections.partneraddresses.name).findOne({addressee:th.defaults.partnerAddress}).then(function(address) {
                delete address._id;
                address.addressee = 'address to delete';
                return db.get(co.collections.partneraddresses.name).insert(address);
            }).then(function(insertedAddress) {
                return Promise.resolve(insertedAddress._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.partneraddresses, co.permissions.CRM_BUSINESSPARTNERS, getDeleteAddressId);
        th.apiTests.delete.clientDependentNegative(co.apis.partneraddresses, getDeleteAddressId);
        th.apiTests.delete.defaultPositive(co.apis.partneraddresses, co.collections.partneraddresses.name, getDeleteAddressId, true);
        
    });

});
