/**
 * UNIT Tests for api/settingsets
 */

var assert = require('assert');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');

describe('API settingsets', function(){

    var server = require('../../app');

    // Clear and prepare database with clients, user groups, users... 
    beforeEach(() => {
        return testHelpers.cleanDatabase()
            .then(testHelpers.prepareClients)
            .then(testHelpers.prepareClientModules)
            .then(testHelpers.prepareUserGroups)
            .then(testHelpers.prepareUsers)
            .then(testHelpers.preparePermissions)
            .then(testHelpers.prepareSettingSets);
    });

    xit('responds to GET/ with all setting sets of of type portal, client and user when the logged in user is an administrator', function() {
    });

    xit('responds to GET/ with setting sets of type portal, client and user when logged in user is a portal user', function() {
    });

    xit('responds to GET/ with setting sets of type client and user when logged in user is a client user', function() {
    });

    xit('responds to GET/ only with setting sets the logged in user has read permission to', function() {
    });

    xit('responds to GET/ NOT with portal level settings when logged in user is a CLIENT user (with clientId) even when the user has permission to portal settings', function() {
    });

});