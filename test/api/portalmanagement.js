/**
 * UNIT Tests for api/portalmanagement
 */
var assert = require('assert');
var fs = require('fs');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var mc = require('../../config/module-config.json');
var rimraf = require('rimraf');
var Db = require("../../utils/db").Db;

describe('API portalmanagement', () => {

    var localConfigBackup, packageJsonBackup, lc, pj, httpsPort, httpPort, extractPath = './extractTemp/';

    async function prepareConfigs() {
        localConfigBackup = fs.readFileSync('./config/localconfig.json');
        packageJsonBackup = fs.readFileSync('./package.json');
        lc = JSON.parse(localConfigBackup);
        pj = JSON.parse(packageJsonBackup);
        httpsPort = process.env.HTTPS_PORT || lc.httpsPort || 443;
        httpPort = process.env.PORT || lc.httpPort || 80;
        lc.licenseserverurl = 'https://localhost:' + httpsPort; // Bei tests müssen die URLs umgeschrieben werden
        saveConfigs();
        rimraf.sync('./temp/');
        rimraf.sync(extractPath);
    }

    function saveConfigs() {
        fs.writeFileSync('./config/localconfig.json', JSON.stringify(lc, null, 4));
        fs.writeFileSync('./package.json', JSON.stringify(pj, null, 4));
    }

    async function cleanupConfigs() {
        fs.writeFileSync('./config/localconfig.json', localConfigBackup);
        fs.writeFileSync('./package.json', packageJsonBackup);
        rimraf.sync('./temp/');
        rimraf.sync(extractPath);
    }

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.preparePortals();
        await th.preparePortalModules();
        await prepareConfigs();
    });

    afterEach(async() => {
        await cleanupConfigs();
    });

    describe('GET/', () => {

        th.apiTests.get.defaultNegative(co.apis.portalmanagement, co.permissions.ADMINISTRATION_SETTINGS, "portal", "portal_usergroup0", "portal_usergroup0_user0");

        it('responds with portalsettings (autoUpdateMode, [updateTimerInterval], licenseserverurl and licensekey only) from localconfig', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var result = (await th.get(`/api/${co.apis.portalmanagement}?token=${token}`).expect(200)).body;
            if(result.updateTimerInterval){
                assert.strictEqual(Object.keys(result).length, 6); //updateTimerInterval is also expected when autoUpdateMode == True
                assert.strictEqual(result.updateTimerInterval, lc.updateTimerInterval);
            }else{
                assert.strictEqual(Object.keys(result).length, 5);
            }
            assert.strictEqual(result.autoUpdateMode, lc.autoUpdateMode);
            assert.ok(result.licensekey);
            assert.strictEqual(result.licensekey, lc.licensekey);
            assert.ok(result.licenseserverurl);
            assert.strictEqual(result.licenseserverurl, lc.licenseserverurl);
        });

    });

    describe('GET/checkforupdate', () => {

        var api = `${co.apis.portalmanagement}/checkforupdate`;

        th.apiTests.get.defaultNegative(api, co.permissions.ADMINISTRATION_SETTINGS, "portal", "portal_usergroup0", "portal_usergroup0_user0");

        it('responds with 400 when license server URL is not correct', async() => {
            lc.licensekey = 'licensekey0';
            lc.licenseserverurl = 'https://invalidurl.avorium.de';
            saveConfigs();
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.get(`/api/${co.apis.portalmanagement}/checkforupdate?token=${token}`).expect(400);
        });

        it('responds with 400 when license key is invalid', async() => {
            lc.licensekey = 'InvalidKey';
            saveConfigs();
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.get(`/api/${co.apis.portalmanagement}/checkforupdate?token=${token}`).expect(400);
        });

        it('responds with serverVersion from licenseserver and localVersion from package.json', async() => {
            // Lizenzschlüssel vorbereiten und Portal dafür erstellen
            lc.licensekey = 'licensekey0';
            pj.version = 'Testversion';
            saveConfigs();
            var token = await th.defaults.login("portal_usergroup0_user0");
            var result = (await th.get(`/api/${co.apis.portalmanagement}/checkforupdate?token=${token}`).expect(200)).body;
            assert.strictEqual(Object.keys(result).length, 2);
            assert.ok(result.localVersion);
            assert.strictEqual(result.localVersion, pj.version);
            assert.ok(result.serverVersion);
            assert.strictEqual(result.serverVersion, pj.version);
        });

    });

    describe('POST/triggerupdate', () => {

        var api = `${co.apis.portalmanagement}/triggerupdate`;

        function checkExtractedFiles(path, moduleNames) {
            th.createFileList(moduleNames).forEach(function(fileName) {
                var fullPath = path + fileName;
                assert.ok(fs.existsSync(fullPath), `File ${fullPath} does not exist`);
            });
        }

        th.apiTests.post.defaultNegative(api, co.permissions.ADMINISTRATION_SETTINGS, () => { return {} }, true, "portal", "portal_usergroup0", "portal_usergroup0_user0");

        it('responds with 400 when license server URL is not correct', async() => {
            lc.licensekey = 'licensekey0';
            lc.licenseserverurl = 'https://invalidurl.avorium.de';
            lc.updateExtractPath = extractPath; // Tests dürfen die Originaldateien nicht überschreiben
            saveConfigs();
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/${co.apis.portalmanagement}/triggerupdate?token=${token}`).send().expect(400);
        });

        it('responds with 400 when license key is invalid', async() => {
            lc.licensekey = 'invalidkey';
            lc.updateExtractPath = extractPath; // Tests dürfen die Originaldateien nicht überschreiben
            saveConfigs();
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/${co.apis.portalmanagement}/triggerupdate?token=${token}`).send().expect(400);
        });

        it('responds with 400 when portal has no module configured', async() => {
            await th.cleanTable("portalmodules", true, false);
            lc.licensekey = 'licensekey0';
            lc.updateExtractPath = extractPath; // Tests dürfen die Originaldateien nicht überschreiben
            saveConfigs();
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/${co.apis.portalmanagement}/triggerupdate?token=${token}`).send().expect(400);
        });

        it('downloads a package for the portal and extracts it into the updateExtractPath given in localconfig.json', async() => {
            lc.licensekey = 'licensekey0';
            lc.updateExtractPath = extractPath; // Tests dürfen die Originaldateien nicht überschreiben
            saveConfigs();
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/${co.apis.portalmanagement}/triggerupdate?token=${token}`).send().expect(200);
            checkExtractedFiles(lc.updateExtractPath, [co.modules.base]);
        });

        it('downloads a package for the portal and extracts it into the ./temp/ folder when no updateExtractPath is given', async() => {
            lc.licensekey = 'licensekey0';
            delete lc.updateExtractPath;
            saveConfigs();
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/${co.apis.portalmanagement}/triggerupdate?token=${token}`).send().expect(200);
            checkExtractedFiles('./temp/', [co.modules.base]);
        });

    });

    describe('PUT/', () => {

        var api = co.apis.portalmanagement;
        var permission = co.permissions.ADMINISTRATION_SETTINGS;

        async function createPutSettings() {
            return {
                licenseserverurl: 'http://testhost.avorium.de',
                licensekey: 'testlicensekey'
            };
        }

        th.apiTests.put.defaultNegative(api, permission, createPutSettings, "portal", "portal_usergroup0", "portal_usergroup0_user0", undefined, true);

        it('responds with 200 and updates the licenseserverurl and licensekey properties in the localconfig.json file with the new sent data', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var settings = await createPutSettings();
            await th.put(`/api/${api}?token=${token}`).send(settings).expect(200);
            var updatedLocalConfig = JSON.parse(fs.readFileSync('./config/localconfig.json'));
            assert.ok(updatedLocalConfig.licenseserverurl);
            assert.strictEqual(updatedLocalConfig.licenseserverurl, settings.licenseserverurl);
            assert.ok(updatedLocalConfig.licensekey);
            assert.strictEqual(updatedLocalConfig.licensekey, settings.licensekey);
        });

        it('responds with 200 and does not update the localconfig file when other properties than licenseserverurl and licensekey, or autoUpdateMode are sent', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var settings = {
                documentspath: 'newdocpath/',
                tokensecret: 'newtokensecret',
                newproperty: 'newproperty'
            };
            await th.put(`/api/${api}?token=${token}`).send(settings).expect(200);
            var updatedLocalConfig = JSON.parse(fs.readFileSync('./config/localconfig.json'));
            assert.strictEqual(updatedLocalConfig.documentspath, lc.documentspath);
            assert.notStrictEqual(updatedLocalConfig.documentspath, settings.documentspath);
            assert.strictEqual(updatedLocalConfig.tokensecret, lc.tokensecret);
            assert.notStrictEqual(updatedLocalConfig.tokensecret, settings.tokensecret);
            assert.ok(!updatedLocalConfig.newproperty);
        });

        it('responds with 200 but does not update the localconfig file when invalid (e.g. null) value for autoUpdateMode is sent', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var settings = { autoUpdateMode: null };
            await th.put(`/api/${api}?token=${token}`).send(settings).expect(200);
            var updatedLocalConfig = JSON.parse(fs.readFileSync('./config/localconfig.json'));
            assert.strictEqual(updatedLocalConfig.autoUpdateMode, lc.autoUpdateMode);
        });

        it('responds with 200 and updates the autoUpdateMode property in the localconfig.json file with the new sent data', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            lc.autoUpdateMode = true;
            saveConfigs();
            var settings = { autoUpdateMode: false };
            await th.put(`/api/${api}?token=${token}`).send(settings).expect(200);
            var updatedLocalConfig = JSON.parse(fs.readFileSync('./config/localconfig.json'));
            assert.strictEqual(updatedLocalConfig.autoUpdateMode, settings.autoUpdateMode);
        });

    });

});