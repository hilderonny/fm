/**
 * UNIT Tests for api/portalmanagement
 */
var assert = require('assert');
var fs = require('fs');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');

describe('API portalmanagement', function() {
    
    function prepareTests() {
        var userGroup;
        return th.defaults.getUserGroup().then(function(ug) {
            userGroup = ug;
            return db.insert(co.collections.clientmodules, { clientId: userGroup.clientId, module: co.modules.portalbase });
        }).then(function() {
            return db.insert(co.collections.permissions, { key: co.permissions.ADMINISTRATION_SETTINGS, userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        });
    }

    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions)
            .then(prepareTests);
    });

    describe('GET/', function() {

        th.apiTests.get.defaultNegative(co.apis.portalmanagement, co.permissions.ADMINISTRATION_SETTINGS);

        // Positive tests

        xit('responds with portalsettings (licenseserverurl and licensekey only) from localconfig', function() {
        });

        xit('responds with portalsettings (licenseserverurl and licensekey set to null) when no localconfig file is there', function() {
        });

    });

    describe('GET/checkforupdate', function() {

        var api = `${co.apis.portalmanagement}/checkforupdate`;

        th.apiTests.get.defaultNegative(api, co.permissions.ADMINISTRATION_SETTINGS);

        xit('responds with 400 when no localconfig file is there', function() {
        });

        xit('responds with 400 when license server URL is not correct', function() {
        });

        xit('responds with 400 when license key is invalid', function() {
        });

        // Positive tests

        xit('responds with serverVersion from licenseserver and localVersion from package.json', function() {
            // Here the license server should be the same
            // Change the package.json version to 1.0.0 to mock it for requesting it via licenserver API
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

        th.apiTests.post.defaultNegative(api, co.permissions.ADMINISTRATION_SETTINGS, createPostData, true);

        xit('responds with 400 when no localconfig file is there', function() {
        });

        xit('responds with 400 when license server URL is not correct', function() {
        });

        xit('responds with 400 when license key is invalid', function() {
        });

        // Positive tests

        xit('downloads a package for the portal and extracts it into the updateExtractPath given in localconfig.json', function() {
            // Create a portal on the local license server first
            // Set the updateExtractPath to "./extract/"
            // Remove the extracted files at least
        });

        xit('downloads a package for the portal and extracts it into the ./temp/ folder when no updateExtractPath is given', function() {
            // Create a portal on the local license server first
            // Remove the extracted files at least
        });

    });

    describe('PUT/', function() {

        var api = co.apis.portalmanagement;
        var permission = co.permissions.ADMINISTRATION_SETTINGS;

        function createPutSettings() {
            return Promise.resolve({
                licenseserverurl: 'http://localhost',
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

        // Positive tests

        xit('responds with 200 and writes a new localconfig.json file with sent licenseserverutl and licensekey when no localconfig file was there before', function() {
        });

        xit('responds with 200 and updates the licenseserverurl and licensekey properties in the localconfig.json file with the new sent data', function() {
        });

        xit('responds with 200 and does not update the localconfig file when other properties than licenseserverurl and licensekey are sent', function() {
            // Mögliche andere Properties aus localconfig.json.template auslesen
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
