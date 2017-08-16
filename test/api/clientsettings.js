/**
 * UNIT Tests for api/clientsettings
 */
var assert = require('assert');
var async = require('async');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');

describe('API clientsettings', function() {
    
    // Clear and prepare database with clients, user groups and users
    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareClientSettings)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions);
    });

    describe('GET/', function() {

        th.apiTests.get.defaultNegative(co.apis.clientsettings, co.permissions.SETTINGS_CLIENT);

        it('returns client settings of currently logged in user', async function() {
            var loggedInUser = await th.defaults.getUser();
            var settingsFromDatabase = await db.get(co.collections.clientsettings.name).findOne({clientId: loggedInUser.clientId });
            var token = await th.defaults.login();
            var settingsFromApi = (await th.get(`/api/${co.apis.clientsettings}?token=${token}`).expect(200)).body;
            ['_id', 'clientId', 'logourl'].forEach((key) => {
                assert.strictEqual(settingsFromApi[key].toString(), settingsFromDatabase[key].toString());
            });
        });

        it('returns an empty setting set when client of logged in user has no settings in database', async function() {
            var loggedInUser = await th.defaults.getUser();
            // Eventuell vorhandene Einstellungen löschen
            await db.get(co.collections.clientsettings.name).remove({clientId: loggedInUser.clientId });
            var token = await th.defaults.login();
            var settingsFromApi = (await th.get(`/api/${co.apis.clientsettings}?token=${token}`).expect(200)).body;
            assert.strictEqual(settingsFromApi.logourl, 'css/logo_avorium_komplett.svg');
        });

    });

    describe('POST/', function() {

        function createPostTestClientSettings() {
            return Promise.resolve({
                logourl: 'http://logourl.com'
            });
        }

        th.apiTests.post.defaultNegative(co.apis.clientsettings, co.permissions.SETTINGS_CLIENT, createPostTestClientSettings);

        it('returns the created settings containing an _id and the clientId of the logged in user', async () => {
            var settings = await createPostTestClientSettings();
            var token = await th.defaults.login();
            var apiResult = (await th.post(`/api/${co.apis.clientsettings}?token=${token}`).send(settings).expect(200)).body;
            assert.ok(apiResult._id);
            assert.ok(apiResult.clientId);
            assert.strictEqual(apiResult.logourl, settings.logourl);
        });

    });

    describe('PUT/', function() {

        it('responds with 404', async () => {
            var token = await th.defaults.login();
            await th.put(`/api/${co.apis.clientsettings}?token=${token}`).send({}).expect(404);
        });

    });

    describe('DELETE/', function() {

        it('responds with 404', async () => {
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.clientsettings}?token=${token}`).expect(404);
        });
    
    });

});
