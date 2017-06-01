/**
 * UNIT Tests for middlewares/db
 */
var assert = require('assert');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');

describe('MIDDLEWARE db', function() {

    var server = require('../../app');
    
    beforeEach(() => {
        return testHelpers.cleanDatabase();
    });

    describe('init()', function() {

        xit('does nothing when the environment variable NODE_ENV is set to "test"', function() {
        });

        xit('does nothing when there is no localconfig.json', function() {
        });

        xit('does nothing when recreatePortalAdmin is set to false in localconfig.json', function() {
        });

        xit('initializes the database in production environment when no admin user exists', function() {
            // Set environment variable NODE_ENV to "production"
            // Check whether a new admin user was created and does not have isAdmin flag and clientId = null
            // Check whether a new admin usergroup was created
            // Check whether the new admin user is assigned to the new admin user group
            // Check whether new admin user group has read and write permission PERMISSION_ADMINISTRATION_CLIENT
            // Check whether new admin user group has read and write permission PERMISSION_ADMINISTRATION_SETTING
            // Check whether new admin user group has read and write permission PERMISSION_ADMINISTRATION_USER
            // Check whether new admin user group has read and write permission PERMISSION_ADMINISTRATION_USERGROUP
            // Check whether new admin user group has read and write permission PERMISSION_SETTINGS_PORTAL
            // Check whether new admin user group has read and write permission PERMISSION_SETTINGS_USER
        });

        xit('initializes the database in production environment when an admin user already exists', function() {
            // Check whether an existing admin was deleted
            // Set environment variable NODE_ENV to "production"
            // Check whether a new admin user was created and does not have isAdmin flag and clientId = null
            // Check whether a new admin usergroup was created
            // Check whether the usergroup of the old admin still exists
            // Check whether the new admin user is assigned to the new admin user group
            // Check whether new admin user group has read and write permission PERMISSION_ADMINISTRATION_CLIENT
            // Check whether new admin user group has read and write permission PERMISSION_ADMINISTRATION_SETTING
            // Check whether new admin user group has read and write permission PERMISSION_ADMINISTRATION_USER
            // Check whether new admin user group has read and write permission PERMISSION_ADMINISTRATION_USERGROUP
            // Check whether new admin user group has read and write permission PERMISSION_SETTINGS_PORTAL
            // Check whether new admin user group has read and write permission PERMISSION_SETTINGS_USER
        });
    });

    describe('insert()', function() {

        xit('emits the event "insert" with inserted data', function() {
        });

    });

    describe('update()', function() {

        xit('emits the event "update" with updated data', function() {
        });

    });

    describe('remove()', function() {

        xit('emits the event "remove" with removed data', function() {
        });

    });

});
