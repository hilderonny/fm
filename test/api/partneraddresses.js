/**
 * UNIT Tests for api/partneraddresses
 */
var assert = require('assert');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var bcryptjs =  require('bcryptjs');
var co = require('../../utils/constants');

describe.only('API partneraddresses', function() {

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
        th.apiTests.getId.defaultNegative(api, co.permissions.CRM_BUSINESSPARTNERS, co.collections.businesspartners);
        th.apiTests.getId.clientDependentNegative(api, co.collections.businesspartners);
        
        xit('returns all addresses for the given business partner', function() {

        });

    });

    describe('GET/:id', function() {

        th.apiTests.getId.defaultNegative(co.apis.partneraddresses, co.permissions.CRM_BUSINESSPARTNERS, co.collections.partneraddresses);
        th.apiTests.getId.clientDependentNegative(co.apis.partneraddresses, co.collections.partneraddresses);
         
        xit('returns the address with all details for the given id', function() {

        });
       
    });

    describe('POST/', function() {

        function createPostTestAddress() {
            return db.get(co.collections.businesspartners).findOne({name:th.defaults.businessPartner}).then(function(partner) {
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
                
        xit('responds without giving a partnerId with 400', function() {

        });
                
        xit('responds with not existing partnerId with 400', function() {

        });

        xit('responds with correct data with inserted address containing an _id field', function() {

        });

    });

    describe('PUT/:id', function() {

        function createPutTestAddress() {
            return db.get(co.collections.partneraddresses).findOne({addressee:th.defaults.partnerAddress}).then(function(address) {
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

        xit('updates the address and returns the updated entity', function() {

        });

        xit('does not change the partner when a new partnerId is given', function() {

        });
        
    });

    describe('DELETE/:id', function() {

        function getDeleteAddressId() {
            return db.get(co.collections.partneraddresses).findOne({addressee:th.defaults.partnerAddress}).then(function(address) {
                delete address._id;
                address.addressee = 'address to delete';
                return db.get(co.collections.partneraddresses).insert(address);
            }).then(function(insertedAddress) {
                return th.createRelationsToPartnerAddress(co.collections.partneraddresses, insertedAddress);
            }).then(function(insertedUser) {
                return Promise.resolve(insertedUser._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.partneraddresses, co.permissions.CRM_BUSINESSPARTNERS, getDeleteAddressId);
        th.apiTests.delete.clientDependentNegative(co.apis.partneraddresses, getDeleteAddressId);
        th.apiTests.delete.defaultPositive(co.apis.partneraddresses, co.collections.partneraddresses, getDeleteAddressId);
        
    });

});
