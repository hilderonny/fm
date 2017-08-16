/**
 * UNIT Tests for api/settingsets
 */

var assert = require('assert');
var th = require('../testHelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');
var moduleConfig = require('../../config/module-config.json');

describe('API settingsets', function(){

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
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions);
    });

    afterEach(function() {
        // Ggf. angelegte Testmodule wieder löschen
        delete moduleConfig.modules.testModul1;
        delete moduleConfig.modules.testModul2;
        return Promise.resolve();
    });

    describe('GET/', function() {

        it('responds with 403 without authentication', function() {
            return th.get('/api/settingsets').expect(403);
        });

        it('responds with 403 when the logged in user\'s (normal user) client has no access to this module', function() {
            return th.removeClientModule('1', 'base').then(function() {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return th.get(`/api/settingsets?token=${token}`).expect(403);
                });
            });
        });

        it('responds with 403 when the logged in user\'s (administrator) client has no access to this module', function() {
            return th.removeClientModule('1', 'base').then(function() {
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                    return th.get(`/api/settingsets?token=${token}`).expect(403);
                });
            });
        });

        it('responds with all setting sets of of type portal, client and user when the logged in user is a portal administrator', function(done) {
            th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                th.get(`/api/settingsets?token=${token}`).expect(200).end(function(err, res) {
                    if (err) return done(err);
                    var settingSetsFromApi = res.body;
                    var expectedSettingSets = [
                        { 
                            type: co.settingSetTypes.USER, 
                            items: [
                                { mainCard: 'Administration/UserSettingsCard', icon: 'User', title: 'TRK_SETTINGSET_USER_GENERAL', permission: co.permissions.SETTINGS_USER }
                            ]
                        },
                        { 
                            type: co.settingSetTypes.CLIENT, 
                            items: [
                                { mainCard: "Administration/ClientSettingsCard", title: "TRK_SETTINGSET_CLIENT", icon: "Briefcase", permission: co.permissions.SETTINGS_CLIENT},
                                { mainCard: 'Administration/DynamicAttributesEntityListCard', icon: 'View Details', title: 'TRK_SETTINGSET_DYNAMICATTRIBUTES', permission: co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES }
                            ]
                        },
                        {
                            type: co.settingSetTypes.PORTAL,
                            items: [
                                { mainCard: 'Administration/PortalSettingsCard', icon: 'Server', title: 'TRK_SETTINGSET_PORTAL_GENERAL', permission: co.permissions.SETTINGS_PORTAL }
                            ]
                        }
                    ];
                    compareSettingSets(settingSetsFromApi, expectedSettingSets);
                    done();
                });
            });
        });

        it('responds with setting sets of type portal, client and user when logged in user is a portal user', function(done) {
            th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                th.get(`/api/settingsets?token=${token}`).expect(200).end(function(err, res) {
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
                            type: co.settingSetTypes.CLIENT, 
                            items: [
                                { mainCard: "Administration/ClientSettingsCard", title: "TRK_SETTINGSET_CLIENT", icon: "Briefcase", permission: co.permissions.SETTINGS_CLIENT},
                                { mainCard: 'Administration/DynamicAttributesEntityListCard', icon: 'View Details', title: 'TRK_SETTINGSET_DYNAMICATTRIBUTES', permission: co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES }
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
            th.doLoginAndGetToken('0_0_0', 'test').then((token) => {
                th.get(`/api/settingsets?token=${token}`).expect(200).end(function(err, res) {
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
                            type: co.settingSetTypes.CLIENT, 
                            items: [
                                { mainCard: "Administration/ClientSettingsCard", title: "TRK_SETTINGSET_CLIENT", icon: "Briefcase", permission: co.permissions.SETTINGS_CLIENT},
                                { mainCard: 'Administration/DynamicAttributesEntityListCard', icon: 'View Details', title: 'TRK_SETTINGSET_DYNAMICATTRIBUTES', permission: co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES }
                            ]
                        }
                    ];
                    compareSettingSets(settingSetsFromApi, expectedSettingSets);
                    done();
                });
            });
        });

        it('responds only with setting sets the logged in user has read permission to', function(done) {
            th.removeReadPermission('_0_0', 'PERMISSION_SETTINGS_USER').then(() => {
                th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    th.get(`/api/settingsets?token=${token}`).expect(200).end(function(err, res) {
                        if (err) return done(err);
                        var settingSetsFromApi = res.body;
                        var expectedSettingSets = [
                            { 
                                type: co.settingSetTypes.CLIENT, 
                                items: [
                                    { mainCard: "Administration/ClientSettingsCard", title: "TRK_SETTINGSET_CLIENT", icon: "Briefcase", permission: co.permissions.SETTINGS_CLIENT},
                                    { mainCard: 'Administration/DynamicAttributesEntityListCard', icon: 'View Details', title: 'TRK_SETTINGSET_DYNAMICATTRIBUTES', permission: co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES }
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
        });

        it('expands an existing setting set type from one module with further setting sets of another module', function() {
            // Testmodule vorbereiten
            moduleConfig.modules.testModul1 = {
                settingsets : [
                    { mainCard: 'TestCard1', title: 'TestTitle1', type: 'TEST_SETTING_SET', icon: 'TestIcon1', permission: 'PERMISSION_SETTINGS_USER' }
                ]
            };
            moduleConfig.modules.testModul2 = {
                settingsets : [
                    { mainCard: 'TestCard2', title: 'TestTitle2', type: 'TEST_SETTING_SET', icon: 'TestIcon2', permission: 'PERMISSION_SETTINGS_USER' }
                ]
            };
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.get(`/api/${co.apis.settingsets}?token=${token}`).expect(200);
            }).then(function(response) {
                var settingSetsFromApi = response.body;
                var relevantSettingSets = settingSetsFromApi.filter((s) => s.type === 'TEST_SETTING_SET');
                compareSettingSets(relevantSettingSets, [{
                    type: 'TEST_SETTING_SET',
                    items: [moduleConfig.modules.testModul1.settingsets[0], moduleConfig.modules.testModul2.settingsets[0]]
                }]);
            });
            // Define a setting set in the base module, e.g. in type USERS
            // Define another one in documents module, also of type USERS
            // Now both settings must be available in the result, not only the first or second (check that appending works)
        });

    });

    describe('POST/', function() {
        it('responds with 404', function() {
            return th.post('/api/settingsets').expect(404);
        });
    });

    describe('PUT/', function() {
        it('responds with 404', function() {
            return th.put('/api/settingsets').expect(404);
        });
    });

    describe('DELETE/', function() {
        it('responds with 404', function() {
            return th.del('/api/settingsets').expect(404);
        });
    });

});