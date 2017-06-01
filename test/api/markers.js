/**
 * UNIT Tests for api/markers
 */
var assert = require('assert');
var fs = require('fs');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');
var async = require('async');

describe('API markers', function() {

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

        // Positive tests

        xit('returns a list of all markers of the client of the user', function() {
        });

    });

    describe('POST/', function() {

        // Negative tests

        xit('responds with 400 when marker has no attributes', function() {
        });

        xit('responds with 400 when attribute "lat" is not set', function() {
        });

        xit('responds with 400 when attribute "lng" is not set', function() {
        });

        // Positive tests

        xit('creates a marker and returns it including the _id', function() {
        });

    });

    describe('PUT/', function() {

        xit('responds with 404', function() {
        });

    });

    describe('DELETE/:id', function() {

        // Negative tests

        xit('responds with an invalid id with 400', function() {
        });

        xit('responds with 404 when there is no marker for the given _id', function() {
        });

        xit('responds with 403 when the marker does not belong to the client of the user', function() {
        });

        // Positive tests

        xit('responds with 204', function() {
        });
    
    });

});
