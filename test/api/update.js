/**
 * UNIT Tests for api/update
 */
var assert = require('assert');
var fs = require('fs');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');

describe('API update', function() {

    var server = require('../../app');
    
    beforeEach(() => {
        return testHelpers.cleanDatabase()
            .then(testHelpers.prepareClients)
            .then(testHelpers.prepareClientModules)
            .then(testHelpers.prepareUserGroups)
            .then(testHelpers.prepareUsers)
            .then(testHelpers.preparePermissions);
    });

    describe('GET/version?licensekey', function() {

        // Negative tests

        xit('responds with 400 when no licensekey is given', function() {
        });

        xit('responds with 403 when licensekey is invalid', function() {
        });

        xit('responds with 403 when portal for licensekey is inactive', function() {
        });

        // Positive tests

        xit('responds with version defined in package.json', function() {
        });

    });

    describe('GET/download?licensekey', function() {

        // Negative tests

        xit('responds with 400 when no licensekey is given', function() {
        });

        xit('responds with 403 when licensekey is invalid', function() {
        });

        xit('responds with 403 when portal for licensekey is inactive', function() {
        });

        xit('responds with 404 when portal of licensekey has no module assigned', function() {
        });

        // Positive tests

        xit('responds with ZIP file containing files for all modules available for the portal of the licensekey', function() {
        });

    });

    describe('POST/', function() {

        xit('responds with 404', function() {
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
