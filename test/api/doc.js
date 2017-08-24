/**
 * UNIT Tests for api/doc
 */
var assert = require('assert');
var fs = require('fs');
var moduleConfig = require('../../config/module-config.json'); // http://stackoverflow.com/a/14678694
var th = require('../testhelpers');
var co = require('../../utils/constants');

describe('API doc', function() {

    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions);
    });

    function extractMenuFromConfig() {
        var menuFromConfig = [];
        Object.keys(moduleConfig.modules).forEach((moduleName) => {
            var appModule = moduleConfig.modules[moduleName];
            if (appModule.doc) appModule.doc.forEach((docCard) => {
                menuFromConfig.push(docCard);
            });
            if (appModule.menu) appModule.menu.forEach((menu) => {
                if (menu.items) menu.items.forEach((item) => {
                    if (item.docCard) menuFromConfig.push({
                        docCard: item.docCard,
                        icon: item.icon,
                        title: item.title,
                        index: 0
                    });
                });
            });
        });
        return menuFromConfig;
    }

    function checkEquality(menuFromApi, menuFromConfig) {
        assert.strictEqual(menuFromApi.length, menuFromConfig.length);
        for (var i = 0; i < menuFromApi.length; i++) {
            var menuItemFromApi = menuFromApi[i];
            var menuItemFromConfig = menuFromConfig[i];
            assert.strictEqual(menuItemFromApi.title, menuItemFromConfig.title);
            assert.strictEqual(menuItemFromApi.docCard, menuItemFromConfig.docCard);
            assert.strictEqual(menuItemFromApi.icon, menuItemFromConfig.icon);
            assert.strictEqual(menuItemFromApi.index, menuItemFromConfig.index);
        }
    }

    it('responds to GET/ for portal admin with all documentation menu entries defined in module-config', async function() {
        var menuFromConfig = extractMenuFromConfig();
        var token = await th.doLoginAndGetToken(th.defaults.portalAdminUser, th.defaults.password);
        var menuFromApi = (await th.get(`/api/${co.apis.doc}?token=${token}`).expect(200)).body;
        checkEquality(menuFromApi, menuFromConfig);
    });

    it('responds to GET/ for portal user with all documentation menu entries defined in module-config', async function() {
        var menuFromConfig = extractMenuFromConfig();
        var token = await th.doLoginAndGetToken(th.defaults.portalUser, th.defaults.password);
        var menuFromApi = (await th.get(`/api/${co.apis.doc}?token=${token}`).expect(200)).body;
        checkEquality(menuFromApi, menuFromConfig);
    });

    it('responds to GET/ for client admin with all documentation menu entries defined in module-config', async function() {
        var menuFromConfig = extractMenuFromConfig();
        var token = await th.doLoginAndGetToken(th.defaults.adminUser, th.defaults.password);
        var menuFromApi = (await th.get(`/api/${co.apis.doc}?token=${token}`).expect(200)).body;
        checkEquality(menuFromApi, menuFromConfig);
    });

    it('responds to GET/ for client user with all documentation menu entries defined in module-config', async function() {
        var menuFromConfig = extractMenuFromConfig();
        var token = await th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
        var menuFromApi = (await th.get(`/api/${co.apis.doc}?token=${token}`).expect(200)).body;
        checkEquality(menuFromApi, menuFromConfig);
    });

    it('responds to POST with 404', function() {
        return th.post('/api/doc').expect(404);
    });

    it('responds to PUT with 404', function() {
        return th.put('/api/doc').expect(404);
    });

    it('responds to DELETE with 404', function() {
        return th.del('/api/doc').expect(404);
    });

});
