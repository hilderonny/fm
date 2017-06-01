/**
 * UNIT Tests for middlewares/auth
 */
var assert = require('assert');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');

describe('MIDDLEWARE auth', function() {

    var server = require('../../app');
    
    beforeEach(() => {
        return testHelpers.cleanDatabase()
            .then(testHelpers.prepareClients)
            .then(testHelpers.prepareClientModules)
            .then(testHelpers.prepareUserGroups)
            .then(testHelpers.prepareUsers)
            .then(testHelpers.preparePermissions)
            .then(testHelpers.prepareActivities);
    });

    it('reponds with 403 when req.user is not set', function() {
        var req = { db: db };
        return require('../../middlewares/auth')()(req, { sendStatus: function(statusCode) {
            assert.equal(statusCode, 403);
        } }, function next() {
            assert.fail('next() was called');
        });
    });

    it('reponds with 403 when req.user._id is not set', function() {
        var req = { user: { }, db: db };
        return require('../../middlewares/auth')()(req, { sendStatus: function(statusCode) {
            assert.equal(statusCode, 403);
        } }, function next() {
            assert.fail('next() was called');
        });
    });

    it('reponds with 403 when req.user._id is invalid', function() {
        var req = { user: { _id: 'invalidId' }, db: db };
        return require('../../middlewares/auth')()(req, { sendStatus: function(statusCode) {
            assert.equal(statusCode, 403);
        } }, function next() {
            assert.fail('next() was called');
        });
    });

    it('reponds with 403 when there is no user with the given req.user._id in the database', function() {
        var req = { user: { _id: '999999999999999999999999' }, db: db };
        return require('../../middlewares/auth')()(req, { sendStatus: function(statusCode) {
            assert.equal(statusCode, 403);
        } }, function next() {
            assert.fail('next() was called');
        });
    });

    it('calls next() when the user was authenticated successfully', function(done) {
        db.get('users').findOne({ name : '1_0_ADMIN0' }).then((userFromDatabase) => {
            var req = { user: { _id: userFromDatabase._id.toString() }, db: db };
            require('../../middlewares/auth')()(req, null, function next() {
                done();
            });
        });
    });

    it('reponds with 205 when the time in the login token is older than the last server start time', function() {
        db.get('users').findOne({ name : '1_0_ADMIN0' }).then((userFromDatabase) => {
            var req = { user: { _id: userFromDatabase._id.toString(), tokenTime: 0 }, db: db };
            return require('../../middlewares/auth')()(req, { sendStatus: function(statusCode) {
                assert.equal(statusCode, 205);
            } }, function next() {
                assert.fail('next() was called');
            });
        });
    });

});
