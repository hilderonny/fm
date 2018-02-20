/**
 * UNIT Tests for api/businesspartners
 */
var assert = require('assert');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var bcryptjs =  require('bcryptjs');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('API businesspartners', function() {

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

    function compareBusinessPartner(actual, expected) {
        assert.ok(typeof(actual._id) !== "undefined");
        assert.ok(typeof(actual.clientId) !== "undefined");
        assert.ok(typeof(actual.name) !== "undefined");
        assert.ok(typeof(actual.industry) !== "undefined");
        assert.ok(typeof(actual.rolle) !== "undefined");
        assert.ok(typeof(actual.isJuristic) !== "undefined");
        assert.strictEqual(actual._id, expected._id);
        assert.strictEqual(actual.clientId, expected.clientId);
        assert.strictEqual(actual.name, expected.name);
        assert.strictEqual(actual.industry, expected.industry);
        assert.strictEqual(actual.rolle, expected.rolle);
        assert.strictEqual(actual.isJuristic, expected.isJuristic);
    }

    function compareBusinessPartners(actual, expected) {
        assert.strictEqual(actual.length, expected.length);
        actual.sort((a, b) => { return a._id.localeCompare(b._id); });
        expected.sort((a, b) => { return a._id.localeCompare(b._id); });
        for (var i = 0; i < actual.length; i++) compareBusinessPartner(actual[i], expected[i]);
    }

    function mapBusinessPartners(elements, clientname) {
        return elements.map((e) => { return { _id: e.name, clientId: clientname, name: e.label, industry: e.industry, rolle: e.rolle, isJuristic: e.isjuristic } });
    }

    describe('GET/', function() {

        th.apiTests.get.defaultNegative(co.apis.businesspartners, co.permissions.CRM_BUSINESSPARTNERS); 

        it('responds with list of all business partners of the client of the logged in user containing all details', async () => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementsFromDatabase = mapBusinessPartners(await Db.getDynamicObjects("client0", "businesspartners"), "client0");
            var elementsFromRequest = (await th.get(`/api/${co.apis.businesspartners}?token=${token}`).expect(200)).body;
            compareBusinessPartners(elementsFromRequest, elementsFromDatabase);
        });

    });

    describe('GET/forIds', function() {

        async function createTestBusinessPartners(clientname) {
            var testElements = [
                { name: clientname + "_testbusinesspartner0", label: "bp0", industry: "industry0", rolle: "rolle0", isjuristic: false },
                { name: clientname + "_testbusinesspartner1", label: "bp1", industry: "industry1", rolle: "rolle1", isjuristic: true }
            ];
            await Db.insertDynamicObject(clientname, "businesspartners", testElements[0]);
            await Db.insertDynamicObject(clientname, "businesspartners", testElements[1]);
            return mapBusinessPartners(testElements, clientname);
        }  
        
        th.apiTests.getForIds.defaultNegative(co.apis.businesspartners, co.permissions.CRM_BUSINESSPARTNERS, co.collections.businesspartners.name, createTestBusinessPartners);
        th.apiTests.getForIds.clientDependentNegative(co.apis.businesspartners, co.collections.businesspartners.name, createTestBusinessPartners);
        th.apiTests.getForIds.defaultPositive(co.apis.businesspartners, co.collections.businesspartners.name, createTestBusinessPartners);

    });

    describe('GET/:id', function() {

        th.apiTests.getId.defaultNegative(co.apis.businesspartners, co.permissions.CRM_BUSINESSPARTNERS, co.collections.businesspartners.name);
        th.apiTests.getId.clientDependentNegative(co.apis.businesspartners, co.collections.businesspartners.name);

        it('responds with existing id with all details of the business partner', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementId = "client0_businesspartner0";
            var elementFromDatabase = mapBusinessPartners([await Db.getDynamicObject("client0", "businesspartners", elementId)], "client0")[0];
            var elementFromApi = (await th.get(`/api/${co.apis.businesspartners}/${elementId}?token=${token}`).expect(200)).body;
            compareBusinessPartner(elementFromApi, elementFromDatabase);
        });
        
    });

    describe('POST/', function() {

        function createPostTestBusinessPartner() {
            return { name: "bp0", industry: "industry0", rolle: "rolle0", isJuristic: false };
        }

        th.apiTests.post.defaultNegative(co.apis.businesspartners, co.permissions.CRM_BUSINESSPARTNERS, createPostTestBusinessPartner);
        th.apiTests.post.defaultPositive(co.apis.businesspartners, co.collections.businesspartners.name, createPostTestBusinessPartner, mapBusinessPartners);

    });

    describe('PUT/:id', function() {

        async function createPutTestBusinessPartner(clientname) {
            var testelement = { name: clientname + "_testbusinesspartner0", label: "bp0", industry: "industry0", rolle: "rolle0", isjuristic: false };
            await Db.insertDynamicObject(clientname, "businesspartners", testelement);
            return mapBusinessPartners([testelement], clientname)[0];
        }

        th.apiTests.put.defaultNegative(co.apis.businesspartners, co.permissions.CRM_BUSINESSPARTNERS, createPutTestBusinessPartner);
        th.apiTests.put.clientDependentNegative(co.apis.businesspartners, createPutTestBusinessPartner);

        it('responds with a correct businesspartner with the updated businesspartner and its new properties', async() => {
            var originalelement = await createPutTestBusinessPartner("client0");
            var elementupdate = { industry: "newindustry" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/${co.apis.businesspartners}/${originalelement._id}?token=${token}`).send(elementupdate).expect(200);
            var elementFromDatabase = await Db.getDynamicObject("client0", "businesspartners", originalelement._id);
            assert.strictEqual(elementFromDatabase.industry, elementupdate.industry);
        });
         
    });

    describe('DELETE/:id', function() {

        async function getDeleteBusinessPartnerId(clientname) {
            var testelement = { name: clientname + "_testbusinesspartner0", label: "bp0", industry: "industry0", rolle: "rolle0", isjuristic: false };
            await Db.insertDynamicObject(clientname, "businesspartners", testelement);
            return testelement.name;
        }

        th.apiTests.delete.defaultNegative(co.apis.businesspartners, co.permissions.CRM_BUSINESSPARTNERS, getDeleteBusinessPartnerId);
        th.apiTests.delete.clientDependentNegative(co.apis.businesspartners, getDeleteBusinessPartnerId);
        th.apiTests.delete.defaultPositive(co.apis.businesspartners, co.collections.businesspartners.name, getDeleteBusinessPartnerId);

        it('also deletes all addresses of the business partner', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var id = await getDeleteBusinessPartnerId("client0");
            await th.del(`/api/${co.apis.businesspartners}/${id}?token=${token}`).expect(204);
            var addresses = await Db.getDynamicObjects("client0", "partneraddresses", { businesspartnername: id });
            assert.strictEqual(addresses.length, 0);
        });
        
    });

});
