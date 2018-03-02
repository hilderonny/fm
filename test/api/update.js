/**
 * UNIT Tests for api/update
 */
var assert = require('assert');
var fs = require('fs');
var request = require('request');
var unzip2 = require('unzip2');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var pj = JSON.parse(fs.readFileSync('./package.json'));
var lc = JSON.parse(fs.readFileSync('./config/localconfig.json'));
var Db = require("../../utils/db").Db;

describe('API update', () => {
    
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
    });

    describe('GET/version?licenseKey', () => {

        it('responds with 400 when no licenseKey is given', async() => {
            await th.get(`/api/${co.apis.update}/version`).expect(400);
        });

        it('responds with 403 when licenseKey is invalid', async() => {
            await th.get(`/api/${co.apis.update}/version?licenseKey=invalidLicenseKey`).expect(403);
        });

        it('responds with 403 when portal for licenseKey is inactive', async() => {
            await Db.updateDynamicObject(Db.PortalDatabaseName, co.collections.portals.name, "portal_portal0", { isactive: false });
            await th.get(`/api/${co.apis.update}/version?licenseKey=licensekey0`).expect(403);
        });

        it('responds with version defined in package.json', async() => {
            var version = (await th.get(`/api/${co.apis.update}/version?licenseKey=licensekey0`).expect(200)).text;
            assert.strictEqual(version, pj.version);
        });

    });

    describe('GET/download?licensekey', () => {

        it('responds with 400 when no licenseKey is given', async() => {
            await th.get(`/api/${co.apis.update}/download`).expect(400);
        });

        it('responds with 403 when licenseKey is invalid', async() => {
            await th.get(`/api/${co.apis.update}/download?licenseKey=invalidLicenseKey`).expect(403);
        });

        it('responds with 403 when portal for licenseKey is inactive', async() => {
            await Db.updateDynamicObject(Db.PortalDatabaseName, co.collections.portals.name, "portal_portal0", { isactive: false });
            await th.get(`/api/${co.apis.update}/download?licenseKey=licensekey0`).expect(403);
        });

        it('responds with 404 when portal of licensekey has no module assigned', async() => {
            th.cleanTable(co.collections.portalmodules.name, true, false);
            await th.get(`/api/${co.apis.update}/download?licenseKey=licensekey0`).expect(404);
        });

        it('responds with ZIP file containing files for all modules available for the portal of the licensekey', async() => {
            var filesInPackage = [];
            await new Promise(function(resolve, reject) {
                var httpsPort = process.env.HTTPS_PORT || lc.httpsPort || 443;
                var url = `https://localhost:${httpsPort}/api/${co.apis.update}/download?licenseKey=licensekey0`;
                var updateRequest = request(url);
                updateRequest.on('error', function (error) {
                    updateRequest.abort();
                    reject(error);
                });
                updateRequest.on('response', function (response) {
                    if (response.statusCode !== 200) {
                        updateRequest.abort();
                        reject(response.statusCode);
                    }
                });
                updateRequest.pipe(unzip2.Parse())
                .on('error', reject)
                .on('entry', function(entry) {
                    if(entry.type === 'File') {
                        filesInPackage.push(entry.path);
                    }
                    entry.autodrain(); // Speicher bereinigen
                })
                .on('close', resolve);
            });
            th.createFileList([co.modules.base]).forEach(function(fileName) {
                assert.ok(filesInPackage.indexOf(fileName) >= 0, `File ${fileName} not found in update package`);
            });
        });

    });

    describe('POST/heartbeat', () => {
        
        it('responds with 400 when no content is sent', async() => {
            await th.post(`/api/${co.apis.update}/heartbeat`).expect(400);
        });
        
        it('responds with 400 when no license key is given', async() => {
            var content = { version: '0.8.15' };
            await th.post(`/api/${co.apis.update}/heartbeat`).send(content).expect(400);
        });
        
        it('responds with 400 when no version is given', async() => {
            var content = { licenseKey: "licensekey0" };
            await th.post(`/api/${co.apis.update}/heartbeat`).send(content).expect(400);
        });
        
        it('responds with 403 when there is no portal for the given license key', async() => {
            var content = { licenseKey: 'invalidLicenseKey', version: '0.8.15' };
            await th.post(`/api/${co.apis.update}/heartbeat`).send(content).expect(403);
        });
        
        it('returns with 200 and updates the version and lastNotification timestamp in the database', async() => {
            var content = { licenseKey: "licensekey0", version: '0.8.15' };
            var timeBeforeUpdate = Date.now();
            await th.post(`/api/${co.apis.update}/heartbeat`).send(content).expect(200);
            var portalAfter = await Db.getDynamicObject(Db.PortalDatabaseName, co.collections.portals.name, "portal_portal0");
            assert.strictEqual(portalAfter.version, content.version);
            assert.ok(portalAfter.lastnotification >= timeBeforeUpdate);
        });

    });

});
