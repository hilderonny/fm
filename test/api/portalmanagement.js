/**
 * UNIT Tests for api/portalmanagement
 */
var assert = require('assert');
var fs = require('fs');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');
var mc = require('../../config/module-config.json');
var rimraf = require('rimraf');

describe('API portalmanagement', function() {
    
    function prepareTests() {
        var userGroup;
        return th.defaults.getUserGroup().then(function(ug) {
            userGroup = ug;
            return db.insert(co.collections.clientmodules.name, { clientId: userGroup.clientId, module: co.modules.portalbase });
        }).then(function() {
            return db.insert(co.collections.permissions.name, { key: co.permissions.ADMINISTRATION_SETTINGS, userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        });
    }

    var localConfigBackup, packageJsonBackup, lc, pj, httpsPort, httpPort, extractPath = './extractTemp/';

    function prepareConfigs() {
        return new Promise(function(resolve, reject) {
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
            resolve();
        });
    }

    function saveConfigs() {
        fs.writeFileSync('./config/localconfig.json', JSON.stringify(lc, null, 4));
        fs.writeFileSync('./package.json', JSON.stringify(pj, null, 4));
    }

    function cleanupConfigs() {
        return new Promise(function(resolve, reject) {
            fs.writeFileSync('./config/localconfig.json', localConfigBackup);
            fs.writeFileSync('./package.json', packageJsonBackup);
            rimraf.sync('./temp/');
            rimraf.sync(extractPath);
            resolve();
        });
    }

    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions)
            .then(prepareTests)
            .then(prepareConfigs);
    });

    afterEach(() => {
        return cleanupConfigs();
    });

    describe('GET/', function() {

        th.apiTests.get.defaultNegative(co.apis.portalmanagement, co.permissions.ADMINISTRATION_SETTINGS);

        it('responds with portalsettings (licenseserverurl and licensekey only) from localconfig', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.get(`/api/${co.apis.portalmanagement}?token=${token}`).expect(200);
            }).then(function(response) {
                var result = response.body;
                assert.strictEqual(Object.keys(result).length, 2);
                assert.ok(result.licensekey);
                assert.strictEqual(result.licensekey, lc.licensekey);
                assert.ok(result.licenseserverurl);
                assert.strictEqual(result.licenseserverurl, lc.licenseserverurl);
            });
        });

    });

    describe('GET/checkforupdate', function() {

        var api = `${co.apis.portalmanagement}/checkforupdate`;

        th.apiTests.get.defaultNegative(api, co.permissions.ADMINISTRATION_SETTINGS);

        it('responds with 400 when license server URL is not correct', function() {
            lc.licensekey = 'Testkey';
            lc.licenseserverurl = 'https://invalidurl.avorium.de';
            saveConfigs();
            return db.insert(co.collections.portals.name, {name:'Testportal', isActive: true, licenseKey: lc.licensekey}).then(function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.portalmanagement}/checkforupdate?token=${token}`).expect(400);
            });
        });

        it('responds with 400 when license key is invalid', function() {
            lc.licensekey = 'InvalidKey';
            saveConfigs();
            return db.insert(co.collections.portals.name, {name:'Testportal', isActive: true, licenseKey: 'ValidKey'}).then(function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.portalmanagement}/checkforupdate?token=${token}`).expect(400);
            });
        });

        it('responds with serverVersion from licenseserver and localVersion from package.json', function() {
            // Lizenzschlüssel vorbereiten und Portal dafür erstellen
            lc.licensekey = 'Testkey';
            pj.version = 'Testversion';
            saveConfigs();
            return db.insert(co.collections.portals.name, {name:'Testportal', isActive: true, licenseKey: lc.licensekey}).then(function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.portalmanagement}/checkforupdate?token=${token}`).expect(200);
            }).then(function(response) {
                var result = response.body;
                assert.strictEqual(Object.keys(result).length, 2);
                assert.ok(result.localVersion);
                assert.strictEqual(result.localVersion, pj.version);
                assert.ok(result.serverVersion);
                assert.strictEqual(result.serverVersion, pj.version);
            });
        });

    });

    describe('POST/', function() {

        it('responds with 404', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.post(`/api/${co.apis.extractdocument}?token=${token}`).send({}).expect(404);
            });
        });
    
    });

    describe('POST/triggerupdate', function() {

        var api = `${co.apis.portalmanagement}/triggerupdate`;

        function createPostData() {
            return Promise.resolve({});
        }

        function checkExtractedFiles(path, moduleNames) {
            th.createFileList(moduleNames).forEach(function(fileName) {
                var fullPath = path + fileName;
                assert.ok(fs.existsSync(fullPath), `File ${fullPath} does not exist`);
            });
            return Promise.resolve();
        }

        th.apiTests.post.defaultNegative(api, co.permissions.ADMINISTRATION_SETTINGS, createPostData, true);

        it('responds with 400 when license server URL is not correct', function() {
            lc.licensekey = 'Testkey';
            lc.licenseserverurl = 'https://invalidurl.avorium.de';
            lc.updateExtractPath = extractPath; // Tests dürfen die Originaldateien nicht überschreiben
            saveConfigs();
            return db.insert(co.collections.portals.name, {name:'Testportal', isActive: true, licenseKey: lc.licensekey}).then(function(insertedPortal) {
                return db.insert(co.collections.portalmodules.name, {portalId: insertedPortal._id, module: co.modules.base});
            }).then(function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post(`/api/${co.apis.portalmanagement}/triggerupdate?token=${token}`).send().expect(400);
            });
        });

        it('responds with 400 when license key is invalid', function() {
            lc.licensekey = 'InvalidKey';
            lc.updateExtractPath = extractPath; // Tests dürfen die Originaldateien nicht überschreiben
            saveConfigs();
            return db.insert(co.collections.portals.name, {name:'Testportal', isActive: true, licenseKey: 'ValidKey'}).then(function(insertedPortal) {
                return db.insert(co.collections.portalmodules.name, {portalId: insertedPortal._id, module: co.modules.base});
            }).then(function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post(`/api/${co.apis.portalmanagement}/triggerupdate?token=${token}`).send().expect(400);
            });
        });

        it('responds with 400 when portal has no module configured', function() {
            lc.licensekey = 'Testkey';
            lc.updateExtractPath = extractPath; // Tests dürfen die Originaldateien nicht überschreiben
            saveConfigs();
            return db.insert(co.collections.portals.name, {name:'Testportal', isActive: true, licenseKey: lc.licensekey}).then(function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post(`/api/${co.apis.portalmanagement}/triggerupdate?token=${token}`).send().expect(400);
            });
        });

        it('downloads a package for the portal and extracts it into the updateExtractPath given in localconfig.json', function() {
            lc.licensekey = 'Testkey';
            lc.updateExtractPath = extractPath; // Tests dürfen die Originaldateien nicht überschreiben
            saveConfigs();
            return db.insert(co.collections.portals.name, {name:'Testportal', isActive: true, licenseKey: lc.licensekey}).then(function(insertedPortal) {
                return db.insert(co.collections.portalmodules.name, {portalId: insertedPortal._id, module: co.modules.base});
            }).then(function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post(`/api/${co.apis.portalmanagement}/triggerupdate?token=${token}`).send().expect(200);
            }).then(function() {
                return checkExtractedFiles(lc.updateExtractPath, [co.modules.base]);
            });
        });

        it('downloads a package for the portal and extracts it into the ./temp/ folder when no updateExtractPath is given', function() {
            lc.licensekey = 'Testkey';
            delete lc.updateExtractPath;
            saveConfigs();
            return db.insert(co.collections.portals.name, {name:'Testportal', isActive: true, licenseKey: lc.licensekey}).then(function(insertedPortal) {
                return db.insert(co.collections.portalmodules.name, {portalId: insertedPortal._id, module: co.modules.base});
            }).then(function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post(`/api/${co.apis.portalmanagement}/triggerupdate?token=${token}`).send().expect(200);
            }).then(function() {
                return checkExtractedFiles('./temp/', [co.modules.base]);
            });
        });

    });

    describe('PUT/', function() {

        var api = co.apis.portalmanagement;
        var permission = co.permissions.ADMINISTRATION_SETTINGS;

        function createPutSettings() {
            return Promise.resolve({
                licenseserverurl: 'http://testhost.avorium.de',
                licensekey: 'testlicensekey'
            });
        }

        it('responds without authentication with 403', function() {
            return createPutSettings().then(function(putSettings) {
                return th.put(`/api/${api}`).send(putSettings).expect(403);
            });
        });
        it('responds without write permission with 403', function() {
            var loginToken;
            return th.removeWritePermission(th.defaults.user, permission).then(function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                loginToken = token;
                return createPutSettings();
            }).then(function(putSettings) {
                return th.put(`/api/${api}?token=${loginToken}`).send(putSettings).expect(403);
            });
        });
        function checkForUser(user) {
            return function() {
                var loginToken;
                return th.removeClientModule(th.defaults.client, co.modules.portalbase).then(function() {
                    return th.doLoginAndGetToken(user, th.defaults.password);
                }).then(function(token) {
                    loginToken = token;
                    return createPutSettings();
                }).then(function(putSettings) {
                    return th.put(`/api/${api}?token=${loginToken}`).send(putSettings).expect(403);
                });
            }
        }
        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser(th.defaults.user));
        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser(th.defaults.adminUser));
        it('responds with 400 when not sending an object to insert', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.put(`/api/${api}?token=${token}`).expect(400);
            });
        });

        it('responds with 200 and updates the licenseserverurl and licensekey properties in the localconfig.json file with the new sent data', function() {
            var loginToken, settings;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                loginToken = token;
                return createPutSettings();
            }).then(function(putSettings) {
                settings = putSettings;
                return th.put(`/api/${api}?token=${loginToken}`).send(settings).expect(200);
            }).then(function() {
                var updatedLocalConfig = JSON.parse(fs.readFileSync('./config/localconfig.json'));
                assert.ok(updatedLocalConfig.licenseserverurl);
                assert.strictEqual(updatedLocalConfig.licenseserverurl, settings.licenseserverurl);
                assert.ok(updatedLocalConfig.licensekey);
                assert.strictEqual(updatedLocalConfig.licensekey, settings.licensekey);
            });
        });

        it('responds with 200 and does not update the localconfig file when other properties than licenseserverurl and licensekey are sent', function() {
            var loginToken, settings;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                loginToken = token;
                settings = {
                    documentspath: 'newdocpath/',
                    tokensecret: 'newtokensecret',
                    newproperty: 'newproperty'
                };
                return th.put(`/api/${api}?token=${loginToken}`).send(settings).expect(200);
            }).then(function() {
                var updatedLocalConfig = JSON.parse(fs.readFileSync('./config/localconfig.json'));
                assert.strictEqual(updatedLocalConfig.documentspath, lc.documentspath);
                assert.notStrictEqual(updatedLocalConfig.documentspath, settings.documentspath);
                assert.strictEqual(updatedLocalConfig.tokensecret, lc.tokensecret);
                assert.notStrictEqual(updatedLocalConfig.tokensecret, settings.tokensecret);
                assert.ok(!updatedLocalConfig.newproperty);
            });
        });

    });

    describe('DELETE/', function() {

        it('responds with 404', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.del(`/api/${co.apis.extractdocument}?token=${token}`).expect(404);
            });
        });
    
    });

});
