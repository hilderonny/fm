/**
 * UNIT Tests for api/triggerUpdate
 */
var assert = require('assert');
var fs = require('fs');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');
var async = require('async');

describe('API triggerUpdate', function() {

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

        xit('responds with 404', function() {
        });

    });

    describe('POST/', function() {

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

        xit('responds with 404', function() {
        });

    });

    describe('DELETE/', function() {

        xit('responds with 404', function() {
        });
    
    });

});
