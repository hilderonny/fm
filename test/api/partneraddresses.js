/**
 * UNIT Tests for api/partneraddresses
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('API partneraddresses', function() {

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareBusinessPartners();
        await th.preparePartnerAddresses();
        await th.prepareRelations();
    });

    function comparePartnerAddress(actual, expected) {
        ["_id", "clientId", "addressee", "partnerId", "street", "postcode", "city", "type"].forEach((f) => {
            assert.ok(typeof(actual[f]) !== "undefined");
            assert.strictEqual(actual[f], expected[f]);
        });
    }

    function comparePartnerAddresses(actual, expected) {
        assert.strictEqual(actual.length, expected.length);
        actual.sort((a, b) => { return a._id.localeCompare(b._id); });
        expected.sort((a, b) => { return a._id.localeCompare(b._id); });
        for (var i = 0; i < actual.length; i++) comparePartnerAddress(actual[i], expected[i]);
    }

    function mapPartnerAddresses(elements, clientname) {
        return elements.map((e) => { return { _id: e.name, clientId: clientname, addressee: e.addressee, partnerId: e.businesspartnername, street: e.street, postcode: e.postcode, city: e.city, type: e.partneraddresstypename } });
    }

    describe('GET/forBusinessPartner/:id', function() {

        var api = co.apis.partneraddresses + '/forBusinessPartner';
        th.apiTests.getId.defaultNegative(api, co.permissions.CRM_BUSINESSPARTNERS, co.collections.businesspartners.name);
        th.apiTests.getId.clientDependentNegative(api, co.collections.businesspartners.name);
        
        it('returns all addresses for the given business partner', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementId = "client0_businesspartner0";
            var elementsFromDatabase = mapPartnerAddresses(await Db.getDynamicObjects("client0", "partneraddresses", { businesspartnername: elementId }), "client0");
            var elementsFromApi = (await th.get(`/api/${co.apis.partneraddresses}/forBusinessPartner/${elementId}?token=${token}`).expect(200)).body;
            comparePartnerAddresses(elementsFromApi, elementsFromDatabase);
        });

    });

    describe('GET/:id', function() {

        th.apiTests.getId.defaultNegative(co.apis.partneraddresses, co.permissions.CRM_BUSINESSPARTNERS, co.collections.partneraddresses.name);
        th.apiTests.getId.clientDependentNegative(co.apis.partneraddresses, co.collections.partneraddresses.name);
         
        it('returns the address with all details for the given id', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementId = "client0_partneraddress0";
            var elementFromDatabase = mapPartnerAddresses([await Db.getDynamicObject("client0", "partneraddresses", elementId)], "client0")[0];
            var elementFromApi = (await th.get(`/api/${co.apis.partneraddresses}/${elementId}?token=${token}`).expect(200)).body;
            comparePartnerAddress(elementFromApi, elementFromDatabase);
        });
       
    });

    describe('POST/', function() {

        function createPostTestAddress() {
            return { addressee: "testaddressee", partnerId: "client0_businesspartner0", street: "street0", postcode: "postcode0", city: "city0", type: "Primaryaddress" };
        }

        th.apiTests.post.defaultNegative(co.apis.partneraddresses, co.permissions.CRM_BUSINESSPARTNERS, createPostTestAddress);
        th.apiTests.post.defaultPositive(co.apis.partneraddresses, co.collections.partneraddresses.name, createPostTestAddress, mapPartnerAddresses);
                
        it('responds without giving a partnerId with 400', async() => {
            var addressToSend = createPostTestAddress();
            delete addressToSend.partnerId;
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.partneraddresses}?token=${token}`).send(addressToSend).expect(400);
        });
                
        it('responds with not existing partnerId with 400', async() => {
            var addressToSend = createPostTestAddress();
            addressToSend.partnerId = '999999999999999999999999';
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.partneraddresses}?token=${token}`).send(addressToSend).expect(400);
        });
        
        it('responds with 400 when the partner of the address does not belong to the same client as the logged in user', async() => {
            var addressToSend = createPostTestAddress();
            addressToSend.partnerId = "client1_businesspartner0"; // Other client
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.partneraddresses}?token=${token}`).send(addressToSend).expect(400);
        });

    });

    describe('PUT/:id', function() {

        async function createPutTestAddress(clientname) {
            var testelement = { name: clientname + "_testaddress0", addressee: "testaddressee", businesspartnername: "client0_businesspartner0", street: "street0", postcode: "postcode0", city: "city0", partneraddresstypename: "Primaryaddress" };
            await Db.insertDynamicObject(clientname, "partneraddresses", testelement);
            return mapPartnerAddresses([testelement], clientname)[0];
        }

        th.apiTests.put.defaultNegative(co.apis.partneraddresses, co.permissions.CRM_BUSINESSPARTNERS, createPutTestAddress);
        th.apiTests.put.clientDependentNegative(co.apis.partneraddresses, createPutTestAddress);

        it('updates the address and returns the updated entity', async() => {
            var originalelement = await createPutTestAddress("client0");
            var elementupdate = { addressee: "Ronny" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/${co.apis.partneraddresses}/${originalelement._id}?token=${token}`).send(elementupdate).expect(200);
            var elementFromDatabase = await Db.getDynamicObject("client0", "partneraddresses", originalelement._id);
            assert.strictEqual(elementFromDatabase.addressee, elementupdate.addressee);
        });

        it('does not change the partner when a new partnerId is given', async() => {
            var originalelement = await createPutTestAddress("client0");
            var elementupdate = { addressee: "Ronny", partnerId: "client0_businesspartner1" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/${co.apis.partneraddresses}/${originalelement._id}?token=${token}`).send(elementupdate).expect(200);
            var elementFromDatabase = await Db.getDynamicObject("client0", "partneraddresses", originalelement._id);
            assert.strictEqual(elementFromDatabase.addressee, elementupdate.addressee);
            assert.strictEqual(elementFromDatabase.businesspartnername, originalelement.partnerId);
        });
        
    });

    describe('DELETE/:id', function() {

        async function getDeleteAddressId(clientname) {
            return clientname + "_partneraddress0";
        }

        th.apiTests.delete.defaultNegative(co.apis.partneraddresses, co.permissions.CRM_BUSINESSPARTNERS, getDeleteAddressId);
        th.apiTests.delete.clientDependentNegative(co.apis.partneraddresses, getDeleteAddressId);
        th.apiTests.delete.defaultPositive(co.apis.partneraddresses, co.collections.partneraddresses.name, getDeleteAddressId);
        
    });

});
