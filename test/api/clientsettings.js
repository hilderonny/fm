/**
 * UNIT Tests for api/clientsettings
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('API clientsettings', () => {
    
    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareClientSettings();
    });

    describe('GET/', () => {

        th.apiTests.get.defaultNegative(co.apis.clientsettings, co.permissions.SETTINGS_CLIENT);

        it('returns client settings of currently logged in user', async () => {
            var settingsFromDatabase = await Db.getDynamicObject(Db.PortalDatabaseName, "clientsettings", { clientname: "client0" });
            var token = await th.defaults.login("client0_usergroup0_user0");
            var settingsFromApi = (await th.get(`/api/${co.apis.clientsettings}?token=${token}`).expect(200)).body;
            assert.strictEqual(settingsFromApi._id, settingsFromDatabase.name);
            assert.strictEqual(settingsFromApi.clientId, "client0");
            assert.strictEqual(settingsFromApi.logourl, settingsFromDatabase.logourl);
        });

        it('returns an empty setting set when client of logged in user has no settings in database', async () => {
            await Db.deleteDynamicObjects(Db.PortalDatabaseName, "clientsettings", { clientname: "client0" });
            var token = await th.defaults.login("client0_usergroup0_user0");
            var settingsFromApi = (await th.get(`/api/${co.apis.clientsettings}?token=${token}`).expect(200)).body;
            assert.strictEqual(settingsFromApi._id, null);
            assert.strictEqual(settingsFromApi.clientId, "client0");
            assert.strictEqual(settingsFromApi.logourl, "css/logo_avorium_komplett.svg");
        });

    });

    describe('POST/', () => {

        async function createPostTestClientSettings() {
            return { logourl: 'http://logourl.com' };
        }

        th.apiTests.post.defaultNegative(co.apis.clientsettings, co.permissions.SETTINGS_CLIENT, createPostTestClientSettings);

        it('returns the created settings containing an _id and the clientId of the logged in user', async() => {
            var settings = await createPostTestClientSettings();
            var token = await th.defaults.login("client0_usergroup0_user0");
            var apiResult = (await th.post(`/api/${co.apis.clientsettings}?token=${token}`).send(settings).expect(200)).body;
            assert.ok(apiResult._id);
            assert.strictEqual(apiResult.clientId, "client0");
            assert.strictEqual(apiResult.logourl, settings.logourl);
            var settingsFromDatabase = await Db.getDynamicObject(Db.PortalDatabaseName, "clientsettings", { clientname: "client0" });
            assert.strictEqual(settingsFromDatabase.logourl, settings.logourl);
        });

    });

});
