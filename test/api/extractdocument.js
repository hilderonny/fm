/**
 * UNIT Tests for api/extractdocument
 */
var assert = require('assert');
var fs = require('fs');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');
var async = require('async');

describe('API extractdocument', function() {

    var server = require('../../app');
    
    beforeEach(() => {
        return testHelpers.cleanDatabase()
            .then(testHelpers.prepareClients)
            .then(testHelpers.prepareClientModules)
            .then(testHelpers.prepareUserGroups)
            .then(testHelpers.prepareUsers)
            .then(testHelpers.preparePermissions)
            .then(testHelpers.prepareActivities)
            .then(testHelpers.prepareFmObjects)
            .then(testHelpers.prepareFolders)
            .then(testHelpers.prepareDocuments)
            .then(testHelpers.prepareDocumentFiles);
    });

    describe('GET/', function() {

        xit('responds with 404', function() {
        });

    });

    describe('GET/:id', function() {

        // Negative tests

        xit('responds without authentication with 403', function() {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        });

        xit('responds without write permission with 403', function() {
        });

        xit('responds with invalid id with 400', function() {
        });

        xit('responds with 400 when document is not an extractable file', function() {
        });

        xit('responds with 400 when ZIP file is corrupted', function() {
        });

        xit('responds with not existing id with 404', function() {
        });

        xit('responds with 403 when the document with the given _id does not belong to the client of the user', function() {
        });

        // Positive tests

        xit('extracts the ZIP file and creates a folder structure in the folder of the document and documents for all contained files', function() {
        });

        xit('creates no folders or documents when the ZIP file is empty', function() {
        });

        xit('creates folder structures in folder of document even if folders with the same name exist (creates duplicates)', function() {
            // Create a subfolder "subfolder1"
            // Prepare a ZIP containing "subfolder1" as folder
            // Extract the ZIP file
            // The current folder must now contain two folders named "subfolder1" and the newly created folder must contain the files from the ZIP file
        });

        xit('creates documents for files even if documents with the same name exist (creates duplicates)', function() {
            // Upload a document "doc1.txt"
            // Prepare a ZIP containing "doc1.txt" as file
            // Extract the ZIP file
            // The current folder must now contain two documents named "doc1.txt"
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
