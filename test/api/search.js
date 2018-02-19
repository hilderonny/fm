/**
 * UNIT Tests for api/search
 */
var assert = require('assert');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');
var monk = require('monk');

describe('API search', function() {

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareFolders();
        await th.prepareDocuments();
        await th.prepareActivities();
        await th.prepareBusinessPartners();
        await th.preparePersons();
        await th.prepareClientSettings();
        await th.prepareDocumentFiles();
        await th.prepareDynamicAttributes();
        await th.prepareFmObjects();
        await th.prepareMarkers();
        await th.preparePartnerAddresses();
        await th.preparePersonCommunications();
        await th.preparePortals();
        await th.preparePortalModules();
        await th.prepareRelations();
    });

    describe('GET/', function() {

        it('responds with 403 when user is not authenticated', async function() {
            return th.get(`/api/${co.apis.search}?term=a`).expect(403);
        });

        it('responds with emtpy list when parameter term is not given', async function() {
            var token = await th.defaults.login();
            var results = (await th.get(`/api/${co.apis.search}?token=${token}`).expect(200)).body;
            assert.strictEqual(results.length, 0);
        });

        it('responds with emtpy list when parameter term is empty', async function() {
            var token = await th.defaults.login();
            var results = (await th.get(`/api/${co.apis.search}?token=${token}&term=`).expect(200)).body;
            assert.strictEqual(results.length, 0);
        });

        it('responds with emtpy list when parameter term is not found in any name of any entity', async function() {
            var token = await th.defaults.login();
            var results = (await th.get(`/api/${co.apis.search}?token=${token}&term=notExistingSearchTerm`).expect(200)).body;
            assert.strictEqual(results.length, 0);
        });

        it('responds with list containing entities from different collections where the name equals the term parameter', async function() {
            var token = await th.defaults.login();
            var results = (await th.get(`/api/${co.apis.search}?token=${token}&term=1_0_0`).expect(200)).body;
            assert.notEqual(results.length, 0);
            for (var i = 0; i < results.length; i++) {
                var result = results[i];
                assert.ok(result._id);
                assert.ok(result.collection);
                assert.ok(result.name);
                var collection = co.collections[result.collection];
                assert.ok(collection);
                assert.strictEqual(!result.icon ? null : result.icon, !collection.icon ? null : collection.icon); // Vergleich null === undefined
                var entityFromDatabase = await db.get(collection.name).findOne(result._id);
                assert.ok(entityFromDatabase);
                assert.strictEqual(result.name, entityFromDatabase.name);
            };
        });

        it('responds with list containing entities only from the client of the logged in user', async function() {
            var token = await th.defaults.login();
            var client = await th.defaults.getClient();
            var results = (await th.get(`/api/${co.apis.search}?token=${token}&term=_`).expect(200)).body;
            assert.notEqual(results.length, 0);
            for (var i = 0; i < results.length; i++) {
                var result = results[i];
                assert.ok(result._id);
                assert.ok(result.collection);
                var collection = co.collections[result.collection];
                assert.ok(collection);
                var entityFromDatabase = await db.get(collection.name).findOne(result._id);
                assert.ok(entityFromDatabase);
                assert.strictEqual(client._id.toString(), entityFromDatabase.clientId.toString());
            };
        });
                                                            
    });

});
