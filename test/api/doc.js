/**
 * UNIT Tests for api/doc
 */
var assert = require('assert');
var fs = require('fs');
var moduleConfig = require('../../config/module-config.json'); // http://stackoverflow.com/a/14678694
var th = require('../testhelpers');
var co = require('../../utils/constants');

describe('API doc', () => {

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

    it('responds to GET/ for portal user with all documentation menu entries defined in module-config', async () => {
        var token = await th.defaults.login("portal_usergroup0_user0");
        var menuFromApi = (await th.get(`/api/${co.apis.doc}?token=${token}`).expect(200)).body;
        assert.ok(menuFromApi.find(m => m.docCard === 'Settings'));
        assert.ok(menuFromApi.find(m => m.docCard === 'UserGroups'));
        assert.ok(menuFromApi.find(m => m.docCard === 'Users'));
        assert.ok(menuFromApi.find(m => m.docCard === 'Clients'));
        assert.ok(menuFromApi.find(m => m.docCard === 'Portals'));
        assert.ok(!menuFromApi.find(m => m.docCard === 'Activities'));
        assert.ok(!menuFromApi.find(m => m.docCard === 'Areas'));
        assert.ok(!menuFromApi.find(m => m.docCard === 'BusinessPartners'));
        assert.ok(!menuFromApi.find(m => m.docCard === 'Persons'));
        assert.ok(!menuFromApi.find(m => m.docCard === 'Documents'));
        assert.ok(!menuFromApi.find(m => m.docCard === 'FmObjects'));
        assert.ok(!menuFromApi.find(m => m.docCard === 'Notes'));
        assert.ok(!menuFromApi.find(m => m.docCard === 'QRScanner'));
        assert.ok(menuFromApi.find(m => m.docCard === 'Terms'));
        assert.ok(menuFromApi.find(m => m.docCard === 'Concepts'));
        assert.ok(menuFromApi.find(m => m.docCard === 'ReleaseNotes'));
    });

    it('responds to GET/ for client user with all documentation menu entries defined in module-config', async () => {
        var token = await th.defaults.login("client0_usergroup0_user0");
        var menuFromApi = (await th.get(`/api/${co.apis.doc}?token=${token}`).expect(200)).body;
        assert.ok(menuFromApi.find(m => m.docCard === 'Settings'));
        assert.ok(menuFromApi.find(m => m.docCard === 'UserGroups'));
        assert.ok(menuFromApi.find(m => m.docCard === 'Users'));
        assert.ok(!menuFromApi.find(m => m.docCard === 'Clients'));
        assert.ok(!menuFromApi.find(m => m.docCard === 'Portals'));
        assert.ok(menuFromApi.find(m => m.docCard === 'Activities'));
        assert.ok(menuFromApi.find(m => m.docCard === 'Areas'));
        assert.ok(menuFromApi.find(m => m.docCard === 'BusinessPartners'));
        assert.ok(menuFromApi.find(m => m.docCard === 'Persons'));
        assert.ok(menuFromApi.find(m => m.docCard === 'Documents'));
        assert.ok(menuFromApi.find(m => m.docCard === 'FmObjects'));
        assert.ok(menuFromApi.find(m => m.docCard === 'Notes'));
        assert.ok(menuFromApi.find(m => m.docCard === 'QRScanner'));
        assert.ok(menuFromApi.find(m => m.docCard === 'Terms'));
        assert.ok(menuFromApi.find(m => m.docCard === 'Concepts'));
        assert.ok(menuFromApi.find(m => m.docCard === 'ReleaseNotes'));
    });

});
