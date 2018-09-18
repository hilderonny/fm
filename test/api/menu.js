/**
 * UNIT Tests for api/menu
 */
var assert = require('assert');
var moduleConfig = require('../../config/module-config.json'); // http://stackoverflow.com/a/14678694
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;
var localConfigHelper = require('../../utils/localConfigHelper');

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
    });

    var portalLogo = localConfigHelper.LocalConfig.retrieveportalLogo();

    it('responds to GET/ without authentication with 403', async() => {
        await th.get('/api/menu').expect(403);
    });

    it('responds to GET/ with portal admin user logged in with all portal menu items', async() => {
        await th.removeReadPermission(Db.PortalDatabaseName, 'portal_usergroup0', co.permissions.ADMINISTRATION_USER);
        await th.removeReadPermission(Db.PortalDatabaseName, 'portal_usergroup0', co.permissions.ADMINISTRATION_USERGROUP);
        await th.removeReadPermission(Db.PortalDatabaseName, 'portal_usergroup0', co.permissions.LICENSESERVER_PORTAL);
        var token = await th.defaults.login("portal_usergroup0_user1");
        var response = (await th.get(`/api/menu?token=${token}`).expect(200)).body;
        assert.strictEqual(response.logourl, portalLogo);
        var apps = response.apps;
        assert.ok(apps.portal);
        assert.ok(apps.portal.views.find(v => v.name === "benutzereinstellungen"));
        assert.ok(apps.portal.views.find(v => v.name === "benutzergruppenverwaltung"));
        assert.ok(apps.portal.views.find(v => v.name === "benutzerverwaltung"));
        assert.ok(apps.portal.views.find(v => v.name === "dynamischeobjekte"));
        assert.ok(apps.portal.views.find(v => v.name === "mandantenverwaltung"));
        assert.ok(apps.portal.views.find(v => v.name === "portaleinstellungen"));
        assert.ok(apps.portal.views.find(v => v.name === "portalverwaltung"));
    });

    it('responds to GET/ with normal portal user logged in with all menu items the user has permissions to', async() => {
        await th.removeReadPermission(Db.PortalDatabaseName, 'portal_usergroup0', co.permissions.ADMINISTRATION_USER);
        await th.removeReadPermission(Db.PortalDatabaseName, 'portal_usergroup0', co.permissions.ADMINISTRATION_USERGROUP);
        await th.removeReadPermission(Db.PortalDatabaseName, 'portal_usergroup0', co.permissions.LICENSESERVER_PORTAL);
        var token = await th.defaults.login("portal_usergroup0_user0");
        var response = (await th.get(`/api/menu?token=${token}`).expect(200)).body;
        console.log(response);
        assert.strictEqual(response.logourl, portalLogo);
        var apps = response.apps;
        assert.ok(apps.portal);
        assert.ok(apps.portal.views.find(v => v.name === "benutzereinstellungen"));
        assert.ok(!apps.portal.views.find(v => v.name === "benutzergruppenverwaltung"));
        assert.ok(!apps.portal.views.find(v => v.name === "benutzerverwaltung"));
        assert.ok(apps.portal.views.find(v => v.name === "dynamischeobjekte"));
        assert.ok(apps.portal.views.find(v => v.name === "mandantenverwaltung"));
        assert.ok(apps.portal.views.find(v => v.name === "portaleinstellungen"));
        assert.ok(!apps.portal.views.find(v => v.name === "portalverwaltung"));
    });

    it('responds to GET/ with client admin user logged in with all menu items available to the users client', async() => {
        await th.removeClientModule('client0', co.modules.areas);
        await th.removeClientModule('client0', co.modules.fmobjects);
        await th.removeClientModule('client0', co.modules.clients);
        await th.removeClientModule('client0', co.modules.businesspartners);
        await th.removeClientModule('client0', co.modules.ronnyseins);
        await th.removeReadPermission("client0", 'client0_usergroup0', co.permissions.ADMINISTRATION_USER);
        await th.removeReadPermission("client0", 'client0_usergroup0', co.permissions.ADMINISTRATION_USERGROUP);
        await th.removeReadPermission("client0", 'client0_usergroup0', co.permissions.OFFICE_NOTE);
        var token = await th.defaults.login("client0_usergroup0_user1");
        var response = (await th.get(`/api/menu?token=${token}`).expect(200)).body;
        var apps = response.apps;
        assert.ok(apps.administration);
        assert.ok(apps.administration.views.find(v => v.name === "benutzergruppenverwaltung"));
        assert.ok(apps.administration.views.find(v => v.name === "benutzerverwaltung"));
        assert.ok(apps.administration.views.find(v => v.name === "dynamischeattribute"));
        assert.ok(apps.administration.views.find(v => v.name === "dynamischeobjekte"));
        assert.ok(!apps.crm);
        assert.ok(apps.dokumente);
        assert.ok(apps.dokumente.views.find(v => v.name === "dokumente"));
        assert.ok(apps.einstellungen);
        assert.ok(apps.einstellungen.views.find(v => v.name === "benutzereinstellungen"));
        assert.ok(!apps.raumbuch);
        assert.ok(apps.stammdaten);
        assert.ok(!apps.stammdaten.views.find(v => v.name === "arrangeobjekte"));
        assert.ok(apps.stammdaten.views.find(v => v.name === "dokumente"));
        assert.ok(apps.stammdaten.views.find(v => v.name === "notizen"));
        assert.ok(apps.stammdaten.views.find(v => v.name === "qrscanner"));
        assert.ok(apps.stammdaten.views.find(v => v.name === "termine"));
    });

    it('responds to GET/ with normal client user logged in with all menu items the user has permissions to and which are available to the client', async() => {
        await th.removeClientModule('client0', co.modules.areas);
        await th.removeClientModule('client0', co.modules.fmobjects);
        await th.removeClientModule('client0', co.modules.businesspartners);
        await th.removeClientModule('client0', co.modules.ronnyseins);
        await th.removeReadPermission("client0", 'client0_usergroup0', co.permissions.ADMINISTRATION_USER);
        await th.removeReadPermission("client0", 'client0_usergroup0', co.permissions.ADMINISTRATION_USERGROUP);
        await th.removeReadPermission("client0", 'client0_usergroup0', co.permissions.OFFICE_NOTE);
        var token = await th.defaults.login("client0_usergroup0_user0");
        var response = (await th.get(`/api/menu?token=${token}`).expect(200)).body;
        var apps = response.apps;
        assert.ok(apps.administration);
        assert.ok(!apps.administration.views.find(v => v.name === "benutzergruppenverwaltung"));
        assert.ok(!apps.administration.views.find(v => v.name === "benutzerverwaltung"));
        assert.ok(apps.administration.views.find(v => v.name === "dynamischeattribute"));
        assert.ok(apps.administration.views.find(v => v.name === "dynamischeobjekte"));
        assert.ok(!apps.crm);
        assert.ok(apps.dokumente);
        assert.ok(apps.dokumente.views.find(v => v.name === "dokumente"));
        assert.ok(apps.einstellungen);
        assert.ok(apps.einstellungen.views.find(v => v.name === "benutzereinstellungen"));
        assert.ok(!apps.raumbuch);
        assert.ok(apps.stammdaten);
        assert.ok(!apps.stammdaten.views.find(v => v.name === "arrangeobjekte"));
        assert.ok(apps.stammdaten.views.find(v => v.name === "dokumente"));
        assert.ok(!apps.stammdaten.views.find(v => v.name === "notizen"));
        assert.ok(apps.stammdaten.views.find(v => v.name === "qrscanner"));
        assert.ok(apps.stammdaten.views.find(v => v.name === "termine"));
    });
            
    it('GET/ contains the logo URL of the client when set', async () => { 
        await Db.deleteDynamicObjects(Db.PortalDatabaseName, co.collections.clients.name, { name: "client0" });
        await Db.insertDynamicObject(Db.PortalDatabaseName, co.collections.clients.name, { name: "client0", label:"client0", logourl: "newlogourl" });
        var token = await th.defaults.login("client0_usergroup0_user0");
        var response = (await th.get(`/api/menu?token=${token}`).expect(200)).body;       
        assert.strictEqual(response.logourl, "newlogourl");
    });

    it('GET/ contains the default logo URL of the client when not set', async () => {
        await Db.deleteDynamicObjects(Db.PortalDatabaseName, co.collections.clients.name, { name: "client0" });
        await Db.insertDynamicObject(Db.PortalDatabaseName, co.collections.clients.name, { name: "client0", label:"client0"});
        var token = await th.defaults.login("client0_usergroup0_user0");
        var response = (await th.get(`/api/menu?token=${token}`).expect(200)).body;
        assert.strictEqual(response.logourl, portalLogo); // the portal logo considered as a default logo
    });

    it('GET/ contains no client name when login as portal admin set', async () => {
        await Db.deleteDynamicObjects(Db.PortalDatabaseName, co.collections.clients.name, { name: "client0" });
        await Db.insertDynamicObject(Db.PortalDatabaseName, co.collections.clients.name, { name: "client0", label:"client0"});
        var token = await th.defaults.login("portal_usergroup0_user0");
        var response = (await th.get(`/api/menu?token=${token}`).expect(200)).body;
        assert.strictEqual(response.clientlabel, "");
    });

    it('GET/ does not return empty apps when user has no permissions for menus contained in apps', async() => {
        await th.removeReadPermission("client0", 'client0_usergroup0', co.permissions.ADMINISTRATION_USER);
        await th.removeReadPermission("client0", 'client0_usergroup0', co.permissions.ADMINISTRATION_USERGROUP);
        await th.removeReadPermission("client0", 'client0_usergroup0', co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES);
        await th.removeReadPermission("client0", 'client0_usergroup0', co.permissions.SETTINGS_CLIENT_RECORDTYPES);
        var token = await th.defaults.login("client0_usergroup0_user0");
        var response = (await th.get(`/api/menu?token=${token}`).expect(200)).body;
        var apps = response.apps;
        assert.ok(!apps.administration);
    });

    it('GET/ returns no apps when the client has no permissions at all', async() => {
        var modules = Object.values(co.modules);
        for (var i = 0; i < modules.length; i++) {
            await th.removeClientModule('client0', modules[i]);
        }
        var token = await th.defaults.login("client0_usergroup0_user0");
        var response = (await th.get(`/api/menu?token=${token}`).expect(200)).body;
        var apps = response.apps;
        assert.strictEqual(Object.keys(apps).length, 0);
    });

});
