/**
 * UNIT Tests for api/triggerUpdate
 */
var assert = require('assert');
var fs = require('fs');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');

describe.only('API triggerUpdate', function() {
    
    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions);
    });

    describe('GET/', function() {

        it('responds with 404', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.get(`/api/${co.apis.triggerUpdate}?token=${token}`).expect(404);
            });
        });

    });

    describe.only('POST/', function() {

        // TODO: Upload-Funktion aus fileuploader.js in utils-Modul verschieben und als promise bauen
        // Dann kann das sowohl direkt als node--Skript im bauprozess als auch per fileuploader.js
        // Script als auch hier zum Testen benutzt werden.

        // Negative tests

        xit('responds with 401 when secret is not "hubbele bubbele"', function() {
        });

        xit('responds with 400 when no file was sent in request', function() {
        });

        xit('responds with 400 when file is not a ZIP file', function() {
        });

        // Positive tests

        xit('responds with 200 and extracts the content of the ZIP file into the app root folder (without existing web.config file)', function() {
            // Create a ZIP file with a folder "updateTest" within it to prevent overwriting real files in the root folder
        });

        xit('responds with 200 and extracts the content of the ZIP file into the app root folder and updates the timestamp of the web.config file when it exists', function() {
            // Create a ZIP file with a folder "updateTest" within it to prevent overwriting real files in the root folder
            // Create a web.config file. This is the special case for installations under iisnode on windows
        });

    });

    describe('PUT/', function() {

        it('responds with 404', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.put(`/api/${co.apis.triggerUpdate}?token=${token}`).send({}).expect(404);
            });
        });

    });

    describe('DELETE/', function() {

        it('responds with 404', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.del(`/api/${co.apis.triggerUpdate}?token=${token}`).expect(404);
            });
        });
    
    });

});
