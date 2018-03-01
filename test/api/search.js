/**
 * UNIT Tests for api/search
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('API search', () => {

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
        await th.prepareFmObjects();
        await th.prepareMarkers();
        await th.preparePartnerAddresses();
        await th.prepareCommunications();
        await th.preparePortals();
        await th.preparePortalModules();
        await th.prepareRelations();
    });

    describe('GET/', () => {

        it('responds without authentication with 403', async() => {
            await th.get(`/api/${co.apis.search}?term=ient`).expect(403);
        });

        it('responds with emtpy list when parameter term is not given', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var results = (await th.get(`/api/${co.apis.search}?token=${token}`).expect(200)).body;
            assert.strictEqual(results.length, 0);
        });

        it('responds with emtpy list when parameter term is empty', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var results = (await th.get(`/api/${co.apis.search}?token=${token}&term=`).expect(200)).body;
            assert.strictEqual(results.length, 0);
        });

        it('responds with emtpy list when parameter term is not found in any name of any entity', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var results = (await th.get(`/api/${co.apis.search}?token=${token}&term=notExistingSearchTerm`).expect(200)).body;
            assert.strictEqual(results.length, 0);
        });

        it('responds with list containing entities from different collections where the name equals the term parameter', async() => {
            var searchterm = 'ient';
            var token = await th.defaults.login("client0_usergroup0_user0");
            var results = (await th.get(`/api/${co.apis.search}?token=${token}&term=${searchterm}`).expect(200)).body;
            assert.notEqual(results.length, 0);
            for (var i = 0; i < results.length; i++) {
                var result = results[i];
                assert.ok(result._id);
                assert.ok(result.collection);
                assert.ok(result.name);
                assert.ok(result.name.indexOf(searchterm) >= 0);
                var collection = co.collections[result.collection];
                assert.ok(collection);
                assert.strictEqual(!result.icon ? null : result.icon, !collection.icon ? null : collection.icon); // Vergleich null === undefined
                var entityFromDatabase = await Db.getDynamicObject("client0", result.collection, result._id);
                assert.ok(entityFromDatabase);
            };
        });

        it('returns results from portal only datatypes when logged in user is a portal user', async() => {
            var searchterm = 'ient';
            var token = await th.defaults.login("portal_usergroup0_user0");
            var results = (await th.get(`/api/${co.apis.search}?token=${token}&term=${searchterm}`).expect(200)).body;
            assert.notEqual(results.length, 0);
            assert.ok(results.find((r) => r.collection === co.collections.clients.name)); // collection only available to portals
        });
                                                            
    });

});
