/**
 * UNIT Tests for api/menu
 */
var assert = require('assert');
var moduleConfig = require('../../config/module-config.json'); // http://stackoverflow.com/a/14678694
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('API menu', () => {

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

    it('responds to GET/ without authentication with 403', async() => {
        await th.get('/api/menu').expect(403);
    });

    it('responds to GET/ with portal admin user logged in with all portal menu items', async() => {
        await th.removeReadPermission(Db.PortalDatabaseName, 'portal_usergroup0', co.permissions.ADMINISTRATION_USER);
        await th.removeReadPermission(Db.PortalDatabaseName, 'portal_usergroup0', co.permissions.ADMINISTRATION_USERGROUP);
        await th.removeReadPermission(Db.PortalDatabaseName, 'portal_usergroup0', co.permissions.LICENSESERVER_PORTAL);
        var token = await th.defaults.login("portal_usergroup0_user1");
        var response = (await th.get(`/api/menu?token=${token}`).expect(200)).body;
        var menu = response.menu;
        assert.strictEqual(response.logourl, "css/logo_avorium_komplett.svg");
        assert.strictEqual(menu.length, 3);
        assert.strictEqual(menu[0].title, "TRK_MENU_ADMINISTRATION");
        assert.ok(menu[0].items);
        assert.strictEqual(menu[0].items.length, 3);
        assert.strictEqual(menu[0].items[0].title, "TRK_MENU_ADMINISTRATION_SETTINGS");
        assert.strictEqual(menu[0].items[0].icon, "Settings");
        assert.strictEqual(menu[0].items[0].mainCard, "Administration/SettingSetListCard");
        assert.strictEqual(menu[0].items[1].title, "TRK_MENU_ADMINISTRATION_USERS");
        assert.strictEqual(menu[0].items[1].icon, "User");
        assert.strictEqual(menu[0].items[1].mainCard, "Administration/UserlistCard");
        assert.strictEqual(menu[0].items[2].title, "TRK_MENU_ADMINISTRATION_USERGROUPS");
        assert.strictEqual(menu[0].items[2].icon, "User Group Man Man");
        assert.strictEqual(menu[0].items[2].mainCard, "Administration/UsergrouplistCard");
        assert.strictEqual(menu[1].title, "TRK_MENU_PORTAL");
        assert.ok(menu[1].items);
        assert.strictEqual(menu[1].items.length, 1);
        assert.strictEqual(menu[1].items[0].title, "TRK_MENU_PORTAL_CLIENTS");
        assert.strictEqual(menu[1].items[0].icon, "Briefcase");
        assert.strictEqual(menu[1].items[0].mainCard, "Administration/ClientListCard");
        assert.strictEqual(menu[2].title, "TRK_MENU_LICENSESERVER");
        assert.ok(menu[2].items);
        assert.strictEqual(menu[2].items.length, 1);
        assert.strictEqual(menu[2].items[0].title, "TRK_MENU_LICENSESERVER_PORTALS");
        assert.strictEqual(menu[2].items[0].icon, "Server");
        assert.strictEqual(menu[2].items[0].mainCard, "LicenseServer/PortalListCard");
    });

    it('responds to GET/ with normal portal user logged in with all menu items the user has permissions to', async() => {
        await th.removeReadPermission(Db.PortalDatabaseName, 'portal_usergroup0', co.permissions.ADMINISTRATION_USER);
        await th.removeReadPermission(Db.PortalDatabaseName, 'portal_usergroup0', co.permissions.ADMINISTRATION_USERGROUP);
        await th.removeReadPermission(Db.PortalDatabaseName, 'portal_usergroup0', co.permissions.LICENSESERVER_PORTAL);
        var token = await th.defaults.login("portal_usergroup0_user0");
        var response = (await th.get(`/api/menu?token=${token}`).expect(200)).body;
        var menu = response.menu;
        assert.strictEqual(response.logourl, "css/logo_avorium_komplett.svg");
        assert.strictEqual(menu.length, 2);
        assert.strictEqual(menu[0].title, "TRK_MENU_ADMINISTRATION");
        assert.ok(menu[0].items);
        assert.strictEqual(menu[0].items.length, 1);
        assert.strictEqual(menu[0].items[0].title, "TRK_MENU_ADMINISTRATION_SETTINGS");
        assert.strictEqual(menu[0].items[0].icon, "Settings");
        assert.strictEqual(menu[0].items[0].mainCard, "Administration/SettingSetListCard");
        assert.strictEqual(menu[1].title, "TRK_MENU_PORTAL");
        assert.ok(menu[1].items);
        assert.strictEqual(menu[1].items.length, 1);
        assert.strictEqual(menu[1].items[0].title, "TRK_MENU_PORTAL_CLIENTS");
        assert.strictEqual(menu[1].items[0].icon, "Briefcase");
        assert.strictEqual(menu[1].items[0].mainCard, "Administration/ClientListCard");
    });

    it('responds to GET/ with client admin user logged in with all menu items available to the users client', async() => {
        await Db.deleteDynamicObjects(Db.PortalDatabaseName, co.collections.clientsettings.name, { clientname: "client0" });
        await Db.insertDynamicObject(Db.PortalDatabaseName, co.collections.clientsettings.name, { name: "client0setting", clientname: "client0", logourl: "newlogourl" });
        await th.removeClientModule('client0', co.modules.areas);
        await th.removeClientModule('client0', co.modules.fmobjects);
        await th.removeClientModule('client0', co.modules.clients);
        await th.removeClientModule('client0', co.modules.businesspartners);
        await th.removeClientModule('client0', co.modules.ronnyseins);
        await th.removeClientModule('client0', co.modules.licenseserver);
        await th.removeReadPermission("client0", 'client0_usergroup0', co.permissions.ADMINISTRATION_USER);
        await th.removeReadPermission("client0", 'client0_usergroup0', co.permissions.ADMINISTRATION_USERGROUP);
        await th.removeReadPermission("client0", 'client0_usergroup0', co.permissions.OFFICE_NOTE);
        var token = await th.defaults.login("client0_usergroup0_user1");
        var response = (await th.get(`/api/menu?token=${token}`).expect(200)).body;
        var menu = response.menu;
        assert.strictEqual(response.logourl, "newlogourl");
        assert.strictEqual(menu.length, 2);
        assert.strictEqual(menu[0].title, "TRK_MENU_OFFICE");
        assert.ok(menu[0].items);
        assert.strictEqual(menu[0].items.length, 3);
        assert.strictEqual(menu[0].items[0].title, "TRK_MENU_OFFICE_ACTIVITIES");
        assert.strictEqual(menu[0].items[0].icon, "Planner");
        assert.strictEqual(menu[0].items[0].mainCard, "Office/CalendarCard");
        assert.strictEqual(menu[0].items[1].title, "TRK_MENU_OFFICE_DOCUMENTS");
        assert.strictEqual(menu[0].items[1].icon, "Document");
        assert.strictEqual(menu[0].items[1].mainCard, "Office/DocumentListCard");
        assert.strictEqual(menu[0].items[2].title, "TRK_MENU_OFFICE_NOTES");
        assert.strictEqual(menu[0].items[2].icon, "Notes");
        assert.strictEqual(menu[0].items[2].mainCard, "Office/NoteListCard");
        assert.strictEqual(menu[1].title, "TRK_MENU_ADMINISTRATION");
        assert.ok(menu[1].items);
        assert.strictEqual(menu[1].items.length, 3);
        assert.strictEqual(menu[1].items[0].title, "TRK_MENU_ADMINISTRATION_SETTINGS");
        assert.strictEqual(menu[1].items[0].icon, "Settings");
        assert.strictEqual(menu[1].items[0].mainCard, "Administration/SettingSetListCard");
        assert.strictEqual(menu[1].items[1].title, "TRK_MENU_ADMINISTRATION_USERS");
        assert.strictEqual(menu[1].items[1].icon, "User");
        assert.strictEqual(menu[1].items[1].mainCard, "Administration/UserlistCard");
        assert.strictEqual(menu[1].items[2].title, "TRK_MENU_ADMINISTRATION_USERGROUPS");
        assert.strictEqual(menu[1].items[2].icon, "User Group Man Man");
        assert.strictEqual(menu[1].items[2].mainCard, "Administration/UsergrouplistCard");
    });

    it('responds to GET/ with normal client user logged in with all menu items the user has permissions to and which are available to the client', async() => {
        await Db.deleteDynamicObjects(Db.PortalDatabaseName, co.collections.clientsettings.name, { clientname: "client0" });
        await Db.insertDynamicObject(Db.PortalDatabaseName, co.collections.clientsettings.name, { name: "client0setting", clientname: "client0", logourl: "newlogourl" });
        await th.removeClientModule('client0', co.modules.areas);
        await th.removeClientModule('client0', co.modules.fmobjects);
        await th.removeClientModule('client0', co.modules.clients);
        await th.removeClientModule('client0', co.modules.businesspartners);
        await th.removeClientModule('client0', co.modules.ronnyseins);
        await th.removeClientModule('client0', co.modules.licenseserver);
        await th.removeReadPermission("client0", 'client0_usergroup0', co.permissions.ADMINISTRATION_USER);
        await th.removeReadPermission("client0", 'client0_usergroup0', co.permissions.ADMINISTRATION_USERGROUP);
        await th.removeReadPermission("client0", 'client0_usergroup0', co.permissions.OFFICE_NOTE);
        var token = await th.defaults.login("client0_usergroup0_user0");
        var response = (await th.get(`/api/menu?token=${token}`).expect(200)).body;
        var menu = response.menu;
        assert.strictEqual(response.logourl, "newlogourl");
        assert.strictEqual(menu.length, 2);
        assert.strictEqual(menu[0].title, "TRK_MENU_OFFICE");
        assert.ok(menu[0].items);
        assert.strictEqual(menu[0].items.length, 2);
        assert.strictEqual(menu[0].items[0].title, "TRK_MENU_OFFICE_ACTIVITIES");
        assert.strictEqual(menu[0].items[0].icon, "Planner");
        assert.strictEqual(menu[0].items[0].mainCard, "Office/CalendarCard");
        assert.strictEqual(menu[0].items[1].title, "TRK_MENU_OFFICE_DOCUMENTS");
        assert.strictEqual(menu[0].items[1].icon, "Document");
        assert.strictEqual(menu[0].items[1].mainCard, "Office/DocumentListCard");
        assert.strictEqual(menu[1].title, "TRK_MENU_ADMINISTRATION");
        assert.ok(menu[1].items);
        assert.strictEqual(menu[1].items.length, 1);
        assert.strictEqual(menu[1].items[0].title, "TRK_MENU_ADMINISTRATION_SETTINGS");
        assert.strictEqual(menu[1].items[0].icon, "Settings");
        assert.strictEqual(menu[1].items[0].mainCard, "Administration/SettingSetListCard");
    });
            
    it('GET/ contains the logo URL of the client when set', async () => {
        await Db.deleteDynamicObjects(Db.PortalDatabaseName, co.collections.clientsettings.name, { clientname: "client0" });
        await Db.insertDynamicObject(Db.PortalDatabaseName, co.collections.clientsettings.name, { name: "client0setting", clientname: "client0", logourl: "newlogourl" });
        var token = await th.defaults.login("client0_usergroup0_user0");
        var response = (await th.get(`/api/menu?token=${token}`).expect(200)).body;
        assert.strictEqual(response.logourl, "newlogourl");
    });

    it('GET/ contains the default logo URL of the client when not set', async () => {
        await Db.deleteDynamicObjects(Db.PortalDatabaseName, co.collections.clientsettings.name, { clientname: "client0" });
        var token = await th.defaults.login("client0_usergroup0_user0");
        var response = (await th.get(`/api/menu?token=${token}`).expect(200)).body;
        assert.strictEqual(response.logourl, "css/logo_avorium_komplett.svg");
    });

});
