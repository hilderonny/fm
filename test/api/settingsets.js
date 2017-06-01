/**
 * UNIT Tests for api/settingsets
 */

var assert = require('assert');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');

describe('API settingsets', function(){

    var server = require('../../app');

    function compareSettingSets(settingSetFromApi, expectedSettingSet) {
        assert.strictEqual(settingSetFromApi.length, expectedSettingSet.length, `Number of setting sets differ (${settingSetFromApi.length} from API, ${expectedSettingSet.length} expected)`);
        // The structure must be exactly the same, so simply iterate over it
        expectedSettingSet.forEach(function(expectedLevel, i) {
            var levelFromApi = settingSetFromApi[i];
            assert.strictEqual(levelFromApi.type, expectedLevel.type, `Type of level #${i} differ (${levelFromApi.type} from API, ${expectedLevel.type} expected)`);
            assert.strictEqual(levelFromApi.items.length, expectedLevel.items.length, `Number of items of level #${i} differ (${levelFromApi.items.length} from API, ${expectedLevel.items.length} expected)`);
            expectedLevel.items.forEach(function(expectedItem, j) {
                var itemFromApi = levelFromApi.items[j];
                assert.strictEqual(itemFromApi.mainCard, expectedItem.mainCard, `Main card of item #${i} differ (${itemFromApi.mainCard} from API, ${expectedItem.mainCard} expected)`);
                assert.strictEqual(itemFromApi.icon, expectedItem.icon, `Icon of item #${i} differ (${itemFromApi.icon} from API, ${expectedItem.icon} expected)`);
                assert.strictEqual(itemFromApi.title, expectedItem.title, `Title of item #${i} differ (${itemFromApi.title} from API, ${expectedItem.title} expected)`);
                assert.strictEqual(itemFromApi.permission, expectedItem.permission, `Permission of item #${i} differ (${itemFromApi.permission} from API, ${expectedItem.permission} expected)`);
            });
        });
    };

    // Clear and prepare database with clients, user groups, users... 
    beforeEach(() => {
        return testHelpers.cleanDatabase()
            .then(testHelpers.prepareClients)
            .then(testHelpers.prepareClientModules)
            .then(testHelpers.prepareUserGroups)
            .then(testHelpers.prepareUsers)
            .then(testHelpers.preparePermissions);
    });

    describe('GET/', function() {

        it('responds with 403 without authentication', function() {
            return superTest(server).get('/api/settingsets').expect(403);
        });

        it('responds with 403 when the logged in user\'s (normal user) client has no access to this module', function() {
            return testHelpers.removeClientModule('1', 'base').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return superTest(server).get(`/api/settingsets?token=${token}`).expect(403);
                });
            });
        });

        it('responds with 403 when the logged in user\'s (administrator) client has no access to this module', function() {
            return testHelpers.removeClientModule('1', 'base').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                    return superTest(server).get(`/api/settingsets?token=${token}`).expect(403);
                });
            });
        });

        it('responds with all setting sets of of type portal, client and user when the logged in user is a portal administrator', function(done) {
            testHelpers.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                superTest(server).get(`/api/settingsets?token=${token}`).expect(200).end(function(err, res) {
                    if (err) return done(err);
                    var settingSetsFromApi = res.body;
                    var expectedSettingSets = [
                        { 
                            type: 'SETTINGSET_TYPE_USER', 
                            items: [
                                { mainCard: 'Administration/UserSettingsCard', icon: 'User', title: 'TRK_SETTINGSET_USER_GENERAL', permission: 'PERMISSION_SETTINGS_USER' }
                            ]
                        },
                        {
                            type: 'SETTINGSET_TYPE_PORTAL',
                            items: [
                                { mainCard: 'Administration/PortalSettingsCard', icon: 'Server', title: 'TRK_SETTINGSET_PORTAL_GENERAL', permission: 'PERMISSION_SETTINGS_PORTAL' }
                            ]
                        }
                    ];
                    compareSettingSets(settingSetsFromApi, expectedSettingSets);
                    done();
                });
            });
        });

        it('responds with setting sets of type portal, client and user when logged in user is a portal user', function(done) {
            testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                superTest(server).get(`/api/settingsets?token=${token}`).expect(200).end(function(err, res) {
                    if (err) return done(err);
                    var settingSetsFromApi = res.body;
                    var expectedSettingSets = [
                        { 
                            type: 'SETTINGSET_TYPE_USER', 
                            items: [
                                { mainCard: 'Administration/UserSettingsCard', icon: 'User', title: 'TRK_SETTINGSET_USER_GENERAL', permission: 'PERMISSION_SETTINGS_USER' }
                            ]
                        },
                        {
                            type: 'SETTINGSET_TYPE_PORTAL',
                            items: [
                                { mainCard: 'Administration/PortalSettingsCard', icon: 'Server', title: 'TRK_SETTINGSET_PORTAL_GENERAL', permission: 'PERMISSION_SETTINGS_PORTAL' }
                            ]
                        }
                    ];
                    compareSettingSets(settingSetsFromApi, expectedSettingSets);
                    done();
                });
            });
        });

        it('responds with setting sets of type client and user when logged in user is a client user', function(done) {
            testHelpers.doLoginAndGetToken('0_0_0', 'test').then((token) => {
                superTest(server).get(`/api/settingsets?token=${token}`).expect(200).end(function(err, res) {
                    if (err) return done(err);
                    var settingSetsFromApi = res.body;
                    var expectedSettingSets = [
                        { 
                            type: 'SETTINGSET_TYPE_USER', 
                            items: [
                                { mainCard: 'Administration/UserSettingsCard', icon: 'User', title: 'TRK_SETTINGSET_USER_GENERAL', permission: 'PERMISSION_SETTINGS_USER' }
                            ]
                        }
                    ];
                    compareSettingSets(settingSetsFromApi, expectedSettingSets);
                    done();
                });
            });
        });

        it('responds only with setting sets the logged in user has read permission to', function(done) {
            testHelpers.removeReadPermission('_0_0', 'PERMISSION_SETTINGS_USER').then(() => {
                testHelpers.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    superTest(server).get(`/api/settingsets?token=${token}`).expect(200).end(function(err, res) {
                        if (err) return done(err);
                        var settingSetsFromApi = res.body;
                        var expectedSettingSets = [
                            { 
                                type: 'SETTINGSET_TYPE_PORTAL',
                                items: [
                                    { mainCard: 'Administration/PortalSettingsCard', icon: 'Server', title: 'TRK_SETTINGSET_PORTAL_GENERAL', permission: 'PERMISSION_SETTINGS_PORTAL' }
                                ]
                            }
                        ];
                        compareSettingSets(settingSetsFromApi, expectedSettingSets);
                        done();
                    });
                });
            });
        });

        xit('expands an existing setting set type from one module with further setting sets of another module', function() {
            // Define a setting set in the base module, e.g. in type USERS
            // Define another one in documents module, also of type USERS
            // Now both settings must be available in the result, not only the first or second (check that appending works)
        });

    });

    describe('POST/', function() {
        it('responds with 404', function() {
            return superTest(server).post('/api/settingsets').expect(404);
        });
    });

    describe('PUT/', function() {
        it('responds with 404', function() {
            return superTest(server).put('/api/settingsets').expect(404);
        });
    });

    describe('DELETE/', function() {
        it('responds with 404', function() {
            return superTest(server).del('/api/settingsets').expect(404);
        });
    });

});