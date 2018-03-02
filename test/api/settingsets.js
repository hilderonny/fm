/**
 * UNIT Tests for api/settingsets
 */
var assert = require('assert');
var th = require('../testHelpers');
var co = require('../../utils/constants');
var moduleConfig = require('../../config/module-config.json');

describe('API settingsets', () => {

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
    });

    afterEach(async() => {
        // Ggf. angelegte Testmodule wieder löschen
        delete moduleConfig.modules.testModul1;
        delete moduleConfig.modules.testModul2;
    });

    describe.only('GET/', () => {

        th.apiTests.get.defaultNegative(co.apis.settingsets, undefined);

        it('responds with all setting sets of of type portal, client and user when the logged in user is a portal administrator', async() => {
            var token = await th.defaults.login("portal_usergroup0_user1");
            var settings = (await th.get(`/api/settingsets?token=${token}`).expect(200)).body;
            assert.strictEqual(settings.length, 3);
            assert.strictEqual(settings[0].type, co.settingSetTypes.USER);
            assert.ok(settings[0].items);
            assert.strictEqual(settings[0].items.length, 1);
            assert.strictEqual(settings[0].items[0].mainCard, "Administration/UserSettingsCard");
            assert.strictEqual(settings[0].items[0].icon, "User");
            assert.strictEqual(settings[0].items[0].title, "TRK_SETTINGSET_USER_GENERAL");
            assert.strictEqual(settings[0].items[0].permission, co.permissions.SETTINGS_USER);

            assert.strictEqual(settings[1].type, co.settingSetTypes.CLIENT);
            assert.ok(settings[1].items);
            assert.strictEqual(settings[1].items.length, 2);
            assert.strictEqual(settings[1].items[0].mainCard, "Administration/ClientSettingsCard");
            assert.strictEqual(settings[1].items[0].icon, "Briefcase");
            assert.strictEqual(settings[1].items[0].title, "TRK_SETTINGSET_CLIENT");
            assert.strictEqual(settings[1].items[0].permission, co.permissions.SETTINGS_CLIENT);
            assert.strictEqual(settings[1].items[1].mainCard, "Administration/DynamicAttributesEntityListCard");
            assert.strictEqual(settings[1].items[1].icon, "View Details");
            assert.strictEqual(settings[1].items[1].title, "TRK_SETTINGSET_DYNAMICATTRIBUTES");
            assert.strictEqual(settings[1].items[1].permission, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES);

            assert.strictEqual(settings[2].type, co.settingSetTypes.PORTAL);
            assert.ok(settings[2].items);
            assert.strictEqual(settings[2].items.length, 1);
            assert.strictEqual(settings[2].items[0].mainCard, "Administration/PortalSettingsCard");
            assert.strictEqual(settings[2].items[0].icon, "Server");
            assert.strictEqual(settings[2].items[0].title, "TRK_SETTINGSET_PORTAL_GENERAL");
            assert.strictEqual(settings[2].items[0].permission, co.permissions.SETTINGS_PORTAL);
        });

        it('responds with setting sets of type portal, client and user when logged in user is a portal user', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var settings = (await th.get(`/api/settingsets?token=${token}`).expect(200)).body;
            assert.strictEqual(settings.length, 3);
            assert.strictEqual(settings[0].type, co.settingSetTypes.USER);
            assert.ok(settings[0].items);
            assert.strictEqual(settings[0].items.length, 1);
            assert.strictEqual(settings[0].items[0].mainCard, "Administration/UserSettingsCard");
            assert.strictEqual(settings[0].items[0].icon, "User");
            assert.strictEqual(settings[0].items[0].title, "TRK_SETTINGSET_USER_GENERAL");
            assert.strictEqual(settings[0].items[0].permission, co.permissions.SETTINGS_USER);

            assert.strictEqual(settings[1].type, co.settingSetTypes.CLIENT);
            assert.ok(settings[1].items);
            assert.strictEqual(settings[1].items.length, 2);
            assert.strictEqual(settings[1].items[0].mainCard, "Administration/ClientSettingsCard");
            assert.strictEqual(settings[1].items[0].icon, "Briefcase");
            assert.strictEqual(settings[1].items[0].title, "TRK_SETTINGSET_CLIENT");
            assert.strictEqual(settings[1].items[0].permission, co.permissions.SETTINGS_CLIENT);
            assert.strictEqual(settings[1].items[1].mainCard, "Administration/DynamicAttributesEntityListCard");
            assert.strictEqual(settings[1].items[1].icon, "View Details");
            assert.strictEqual(settings[1].items[1].title, "TRK_SETTINGSET_DYNAMICATTRIBUTES");
            assert.strictEqual(settings[1].items[1].permission, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES);

            assert.strictEqual(settings[2].type, co.settingSetTypes.PORTAL);
            assert.ok(settings[2].items);
            assert.strictEqual(settings[2].items.length, 1);
            assert.strictEqual(settings[2].items[0].mainCard, "Administration/PortalSettingsCard");
            assert.strictEqual(settings[2].items[0].icon, "Server");
            assert.strictEqual(settings[2].items[0].title, "TRK_SETTINGSET_PORTAL_GENERAL");
            assert.strictEqual(settings[2].items[0].permission, co.permissions.SETTINGS_PORTAL);
        });

        it('responds with setting sets of type client and user when logged in user is a client user', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var settings = (await th.get(`/api/settingsets?token=${token}`).expect(200)).body;
            assert.strictEqual(settings.length, 2);
            assert.strictEqual(settings[0].type, co.settingSetTypes.USER);
            assert.ok(settings[0].items);
            assert.strictEqual(settings[0].items.length, 1);
            assert.strictEqual(settings[0].items[0].mainCard, "Administration/UserSettingsCard");
            assert.strictEqual(settings[0].items[0].icon, "User");
            assert.strictEqual(settings[0].items[0].title, "TRK_SETTINGSET_USER_GENERAL");
            assert.strictEqual(settings[0].items[0].permission, co.permissions.SETTINGS_USER);

            assert.strictEqual(settings[1].type, co.settingSetTypes.CLIENT);
            assert.ok(settings[1].items);
            assert.strictEqual(settings[1].items.length, 2);
            assert.strictEqual(settings[1].items[0].mainCard, "Administration/ClientSettingsCard");
            assert.strictEqual(settings[1].items[0].icon, "Briefcase");
            assert.strictEqual(settings[1].items[0].title, "TRK_SETTINGSET_CLIENT");
            assert.strictEqual(settings[1].items[0].permission, co.permissions.SETTINGS_CLIENT);
            assert.strictEqual(settings[1].items[1].mainCard, "Administration/DynamicAttributesEntityListCard");
            assert.strictEqual(settings[1].items[1].icon, "View Details");
            assert.strictEqual(settings[1].items[1].title, "TRK_SETTINGSET_DYNAMICATTRIBUTES");
            assert.strictEqual(settings[1].items[1].permission, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES);
        });

        it('responds only with setting sets the logged in user has read permission to', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.SETTINGS_USER);
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES);
            var token = await th.defaults.login("client0_usergroup0_user0");
            var settings = (await th.get(`/api/settingsets?token=${token}`).expect(200)).body;
            assert.strictEqual(settings.length, 1);
            assert.strictEqual(settings[0].type, co.settingSetTypes.CLIENT);
            assert.ok(settings[0].items);
            assert.strictEqual(settings[0].items.length, 1);
            assert.strictEqual(settings[0].items[0].mainCard, "Administration/ClientSettingsCard");
            assert.strictEqual(settings[0].items[0].icon, "Briefcase");
            assert.strictEqual(settings[0].items[0].title, "TRK_SETTINGSET_CLIENT");
            assert.strictEqual(settings[0].items[0].permission, co.permissions.SETTINGS_CLIENT);
        });

        it('expands an existing setting set type from one module with further setting sets of another module', async() => {
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
            var token = await th.defaults.login("client0_usergroup0_user0");
            var settings = (await th.get(`/api/settingsets?token=${token}`).expect(200)).body;
            assert.strictEqual(settings.length, 3);
            assert.strictEqual(settings[0].type, co.settingSetTypes.USER);
            assert.strictEqual(settings[1].type, co.settingSetTypes.CLIENT);
            assert.strictEqual(settings[2].type, "TEST_SETTING_SET");

            assert.ok(settings[2].items);
            assert.strictEqual(settings[2].items.length, 2);
            assert.strictEqual(settings[2].items[0].mainCard, "TestCard1");
            assert.strictEqual(settings[2].items[0].icon, "TestIcon1");
            assert.strictEqual(settings[2].items[0].title, "TestTitle1");
            assert.strictEqual(settings[2].items[0].permission, co.permissions.SETTINGS_USER);
            assert.strictEqual(settings[2].items[1].mainCard, "TestCard2");
            assert.strictEqual(settings[2].items[1].icon, "TestIcon2");
            assert.strictEqual(settings[2].items[1].title, "TestTitle2");
            assert.strictEqual(settings[2].items[1].permission, co.permissions.SETTINGS_USER);

            // Define a setting set in the base module, e.g. in type USERS
            // Define another one in documents module, also of type USERS
            // Now both settings must be available in the result, not only the first or second (check that appending works)
        });

    });

});