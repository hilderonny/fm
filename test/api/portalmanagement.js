/**
 * UNIT Tests for api/portalmanagement
 */
var assert = require('assert');
var fs = require('fs');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');

describe('API portalmanagement', function() {

    var server = require('../../app');
    
    beforeEach(() => {
        return testHelpers.cleanDatabase()
            .then(testHelpers.prepareClients)
            .then(testHelpers.prepareClientModules)
            .then(testHelpers.prepareUserGroups)
            .then(testHelpers.prepareUsers)
            .then(testHelpers.preparePermissions);
    });

    describe('GET/', function() {

        // Negative tests

        xit('responds without authentication with 403', function() {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        });

        xit('responds without read permission with 403', function() {
        });

        // Positive tests

        xit('responds with portalsettings (licenseserverurl and licensekey) from localconfig', function() {
        });

        xit('responds with portalsettings (licenseserverurl and licensekey set to null) when no localconfig file is there', function() {
        });

    });

    describe('GET/checkforupdate', function() {

        // Negative tests

        xit('responds without authentication with 403', function() {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        });

        xit('responds without read permission with 403', function() {
        });

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

    describe('POST/triggerupdate', function() {

        // Negative tests

        xit('responds without authentication with 403', function() {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        });

        xit('responds without write permission with 403', function() {
        });

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

        // Negative tests

        xit('responds without authentication with 403', function() {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        });

        xit('responds without write permission with 403', function() {
        });

        xit('responds without giving data with 400', function() {
        });

        // Positive tests

        xit('responds with 200 and writes a new localconfig.json file with sent licenseserverutl and licensekey when no localconfig file was there before', function() {
        });

        xit('responds with 200 and updates the licenseserverurl and licensekey properties in the localconfig.json file with the new sent data', function() {
        });

    });

    describe('DELETE/', function() {

        xit('responds with 404', function() {
        });
    
    });

});
