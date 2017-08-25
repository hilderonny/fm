/**
 * UNIT Tests for api/update
 */
var assert = require('assert');
var fs = require('fs');
var request = require('request');
var unzip = require('unzip');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');
var pj = JSON.parse(fs.readFileSync('./package.json'));
var lc = JSON.parse(fs.readFileSync('./config/localconfig.json'));

describe('API update', function() {

    function preparePortal() {
        return db.insert(co.collections.portals.name, { name: 'Updatetestportal', isActive: true, licenseKey: 'TestKey' }).then(function(portal) {
            return db.insert(co.collections.portalmodules.name, {portalId: portal._id, module: co.modules.base});
        });
    }
    
    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions)
            .then(th.preparePortals)
            .then(preparePortal);
    });

    describe('GET/version?licenseKey', function() {

        it('responds with 400 when no licenseKey is given', function() {
            return th.get(`/api/${co.apis.update}/version`).expect(400);
        });

        it('responds with 403 when licenseKey is invalid', function() {
            return th.get(`/api/${co.apis.update}/version?licenseKey=invalidLicenseKey`).expect(403);
        });

        it('responds with 403 when portal for licenseKey is inactive', function() {
            return db.update(co.collections.portals.name, {name: 'Updatetestportal'}, {isActive:false}).then(function(portal) {
                return th.get(`/api/${co.apis.update}/version?licenseKey=${portal.licenseKey}`).expect(403);
            });
        });

        it('responds with version defined in package.json', function() {
            return db.get(co.collections.portals.name).findOne({name: 'Updatetestportal'}).then(function(portal) {
                return th.get(`/api/${co.apis.update}/version?licenseKey=${portal.licenseKey}`).expect(200);
            }).then(function(response) {
                assert.strictEqual(response.text, pj.version);
            });
        });

    });

    describe('GET/download?licensekey', function() {

        it('responds with 400 when no licenseKey is given', function() {
            return th.get(`/api/${co.apis.update}/download`).expect(400);
        });

        it('responds with 403 when licenseKey is invalid', function() {
            return th.get(`/api/${co.apis.update}/download?licenseKey=invalidLicenseKey`).expect(403);
        });

        it('responds with 403 when portal for licenseKey is inactive', function() {
            return db.update(co.collections.portals.name, {name: 'Updatetestportal'}, {isActive:false}).then(function(portal) {
                return th.get(`/api/${co.apis.update}/download?licenseKey=${portal.licenseKey}`).expect(403);
            });
        });

        it('responds with 404 when portal of licensekey has no module assigned', function() {
            var portal;
            return db.get(co.collections.portals.name).findOne({name: 'Updatetestportal'}).then(function(p) {
                portal = p;
                return db.remove(co.collections.portalmodules.name, {portalId:portal._id});
            }).then(function() {
                return th.get(`/api/${co.apis.update}/download?licenseKey=${portal.licenseKey}`).expect(404);
            });
        });

        it('responds with ZIP file containing files for all modules available for the portal of the licensekey', function() {
            var filesInPackage = [];
            return db.get(co.collections.portals.name).findOne({name: 'Updatetestportal'}).then(function(portal) {
                return new Promise(function(resolve, reject) {
                    var httpsPort = process.env.HTTPS_PORT || lc.httpsPort || 443;
                    var url = `https://localhost:${httpsPort}/api/${co.apis.update}/download?licenseKey=${portal.licenseKey}`;
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
                    updateRequest.pipe(unzip.Parse())
                    .on('error', reject)
                    .on('entry', function(entry) {
                        if(entry.type === 'File') {
                            filesInPackage.push(entry.path);
                        }
                        entry.autodrain(); // Speicher bereinigen
                    })
                    .on('close', resolve);
                });
            }).then(function() {
                th.createFileList([co.modules.base]).forEach(function(fileName) {
                    assert.ok(filesInPackage.indexOf(fileName) >= 0, `File ${fileName} not found in update package`);
                });
                return Promise.resolve();
            });
        });

    });

    describe('POST/', function() {
        
        it('responds with 404', function() {
            return th.post(`/api/${co.apis.update}`).send({}).expect(404);
        });

    });

    describe('POST/heartbeat', function() {
        
        it('responds with 400 when no content is sent', async function() {
            await th.post(`/api/${co.apis.update}/heartbeat`).expect(400);
        });
        
        it('responds with 400 when no license key is given', async function() {
            var content = {
                version: '0.8.15'
            };
            await th.post(`/api/${co.apis.update}/heartbeat`).send(content).expect(400);
        });
        
        it('responds with 400 when no version is given', async function() {
            var portal = await th.defaults.getPortal();
            var content = {
                licenseKey: portal.licenseKey
            };
            await th.post(`/api/${co.apis.update}/heartbeat`).send(content).expect(400);
        });
        
        it('responds with 403 when there is no portal for the given license key', async function() {
            var content = {
                licenseKey: 'invalidLicenseKey',
                version: '0.8.15'
            };
            await th.post(`/api/${co.apis.update}/heartbeat`).send(content).expect(403);
        });
        
        it('returns with 200 and updates the version and lastNotification timestamp in the database', async function() {
            var portalBefore = await th.defaults.getPortal();
            var content = {
                licenseKey: portalBefore.licenseKey,
                version: '0.8.15'
            };
            var timeBeforeUpdate = Date.now();
            await th.post(`/api/${co.apis.update}/heartbeat`).send(content).expect(200);
            var portalAfter = await th.defaults.getPortal();
            assert.strictEqual(portalAfter.version, content.version);
            assert.ok(portalAfter.lastNotification >= timeBeforeUpdate);
        });

    });
        
    describe('PUT/', function() {

        it('responds with 404', function() {
            return th.put(`/api/${co.apis.update}`).send({}).expect(404);
        });

    });

    describe('DELETE/', function() {

        it('responds with 404', function() {
            return th.del(`/api/${co.apis.update}`).expect(404);
        });
    
    });

});
