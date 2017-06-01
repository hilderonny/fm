/**
 * UNIT Tests for api/relations
 */
var assert = require('assert');
var fs = require('fs');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');
var async = require('async');

describe('API relations', function() {

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

        xit('responds without authentication with 403', function() {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        });

        xit('responds without write permission with 403', function() {
        });

        xit('responds with 400 when the relation has no attribute "type1"', function() {
        });

        xit('responds with 400 when the relation has no attribute "type2"', function() {
        });

        xit('responds with 400 when the relation has no attribute "id1"', function() {
        });

        xit('responds with 400 when the relation has no attribute "id2"', function() {
        });

        xit('responds with 400 when id1 is invalid', function() {
        });

        xit('responds with 400 when id2 is invalid', function() {
        });

        xit('responds with 404 when there is no type1 entity for the given id1', function() {
        });

        xit('responds with 404 when there is no type2 entity for the given id2', function() {
        });

        xit('responds with 403 when the type1 entity for the given id1 does not belong to the client of the user', function() {
        });

        xit('responds with 403 when the type2 entity for the given id2 does not belong to the client of the user', function() {
        });

        // Positive tests

        xit('responds with 200 and creates a relation between two entities of different types', function() {
        });

        xit('responds with 200 and creates a relation between two entities of same types', function() {
        });

        xit('responds with 200 and creates a relation between the same entities (id1=id2 and type1=type2)', function() {
        });

        xit('responds with 200 but does not create a relation between two entities where a relation already exists', function() {
        });

    });

    describe('PUT/', function() {

        xit('responds with 404', function() {
        });

    });

    describe('DELETE/', function() {

        // Negative tests

        xit('responds with 400 when the relation has no attribute "type1"', function() {
        });

        xit('responds with 400 when the relation has no attribute "type2"', function() {
        });

        xit('responds with 400 when the relation has no attribute "id1"', function() {
        });

        xit('responds with 400 when the relation has no attribute "id2"', function() {
        });

        xit('responds with 400 when id1 is invalid', function() {
        });

        xit('responds with 400 when id2 is invalid', function() {
        });

        xit('responds with 404 when there is no type1 entity for the given id1', function() {
        });

        xit('responds with 404 when there is no type2 entity for the given id2', function() {
        });

        xit('responds with 403 when the type1 entity for the given id1 does not belong to the client of the user', function() {
        });

        xit('responds with 403 when the type2 entity for the given id2 does not belong to the client of the user', function() {
        });

        xit('responds with 404 when there is no relation between the given entities', function() {
        });

        // Positive tests

        xit('responds with 204 after successfully deleting the relation', function() {
        });
    
    });

});
