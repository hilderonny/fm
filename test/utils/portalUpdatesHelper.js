/**
 * UNIT Tests for utils/portalUpdatesHelper
 */
var assert = require('assert');
var fs = require('fs');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');
var rimraf = require('rimraf');
var portalUpdatesHelper = require('../../utils/portalUpdatesHelper');

describe('UTILS portalUpdatesHelper', function() {
        
    async function prepareTests() {
        // Lizenzschlüssel vorbereiten und Portal dafür erstellen
        lc.licensekey = 'Testkey';
        saveConfigs();
        var insertedPortal = await db.insert(co.collections.portals.name, {name:'Testportal', isActive: true, licenseKey: lc.licensekey});
        return db.insert(co.collections.portalmodules.name, {portalId: insertedPortal._id, module: co.modules.base});
    }

    var localConfigBackup, lc, httpsPort, httpPort, extractPath = './extractTemp/';

    function prepareConfigs() {
        return new Promise(function(resolve, reject) {
            localConfigBackup = fs.readFileSync('./config/localconfig.json');
            lc = JSON.parse(localConfigBackup);
            httpsPort = process.env.HTTPS_PORT || lc.httpsPort || 443;
            httpPort = process.env.PORT || lc.httpPort || 80;
            lc.licenseserverurl = 'https://localhost:' + httpsPort; // Bei tests müssen die URLs umgeschrieben werden
            saveConfigs();
            rimraf.sync('./temp/');
            rimraf.sync(extractPath);
            resolve();
        });
    }

    function saveConfigs() {
        fs.writeFileSync('./config/localconfig.json', JSON.stringify(lc, null, 4));
    }

    function cleanupConfigs() {
        return new Promise(function(resolve, reject) {
            fs.writeFileSync('./config/localconfig.json', localConfigBackup);
            rimraf.sync('./temp/');
            rimraf.sync(extractPath);
            resolve();
        });
    }

    beforeEach(() => {
        return th.cleanDatabase()
            .then(prepareConfigs)
            .then(prepareTests);
    });

    afterEach(() => {
        return cleanupConfigs();
    });
    
    function checkExtractedFiles(path, moduleNames) {
        th.createFileList(moduleNames).forEach(function(fileName) {
            var fullPath = path + fileName;
            assert.ok(fs.existsSync(fullPath), `File ${fullPath} does not exist`);
        });
        return Promise.resolve();
    }

    function checkNoExtractedFiles(path, moduleNames) {
        th.createFileList(moduleNames).forEach(function(fileName) {
            var fullPath = path + fileName;
            assert.ok(!fs.existsSync(fullPath), `File ${fullPath} exists`);
        });
        return Promise.resolve();
    }



    it('Does not perform an update when licenseserver URL is wrong', async function(){
        lc.updateExtractPath = './temp/';
        lc.licenseserverurl = 'https://invalidurl.avorium.de';
        saveConfigs();
        try {
            await portalUpdatesHelper.triggerUpdate(true);
            assert.fail('Exception was expected');
        } catch (error) {
            assert.strictEqual(error.code, 'ENOTFOUND');
        }
        return checkNoExtractedFiles('./temp/', [co.modules.base]);
    });

    it('Does not perform an update when license key is wrong', async function(){
        lc.updateExtractPath = './temp/';
        lc.licensekey = 'invalidlicensekey';
        saveConfigs();
        try {
            await portalUpdatesHelper.triggerUpdate(true);
            assert.fail('Exception was expected');
        } catch (error) {
            assert.strictEqual(error.statusCode, 403);
        }
        return checkNoExtractedFiles('./temp/', [co.modules.base]);
    });

    it('Downloads update to ./temp/ when no updateExtractPath was given', async function(){
        delete lc.updateExtractPath;
        saveConfigs();
        var updateWasDone = await portalUpdatesHelper.triggerUpdate(true);
        assert.ok(updateWasDone);
        return checkExtractedFiles('./temp/', [co.modules.base]);
    });

});
    