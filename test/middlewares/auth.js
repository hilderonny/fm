/**
 * UNIT Tests for middlewares/auth
 */
var assert = require('assert');
var superTest = require('supertest');
var th = require('../testhelpers');
var db = require('../../middlewares/db');

describe('MIDDLEWARE auth', function() {

    var server = require('../../app');
    
    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareActivities();
    });

    it('reponds with 403 when req.user is not set', function() {
        return new Promise(function(resolve, reject) {
            var req = { db: db };
            require('../../middlewares/auth')()(req, { sendStatus: function(statusCode) {
                assert.equal(statusCode, 403);
                resolve();
            } }, function next() {
                assert.fail('next() was called');
            });
        });
    });

    it('reponds with 403 when req.user._id is not set', function() {
        return new Promise(function(resolve, reject) {
            var req = { user: { }, db: db };
            require('../../middlewares/auth')()(req, { sendStatus: function(statusCode) {
                assert.equal(statusCode, 403);
                resolve();
            } }, function next() {
                assert.fail('next() was called');
            });
        });
    });

    it('reponds with 403 when req.user._id is invalid', function() {
        return new Promise(function(resolve, reject) {
            var req = { user: { _id: 'invalidId' }, db: db };
            require('../../middlewares/auth')()(req, { sendStatus: function(statusCode) {
                assert.equal(statusCode, 403);
                resolve();
            } }, function next() {
                assert.fail('next() was called');
            });
        });
    });

    it('reponds with 403 when there is no user with the given req.user._id in the database', function() {
        return new Promise(function(resolve, reject) {
            var req = { user: { _id: '999999999999999999999999' }, db: db };
            require('../../middlewares/auth')()(req, { sendStatus: function(statusCode) {
                assert.equal(statusCode, 403);
                resolve();
            } }, function next() {
                assert.fail('next() was called');
            });
        });
    });

    it('calls next() when the user was authenticated successfully', function() {
        return db.get('users').findOne({ name : '1_0_ADMIN0' }).then((userFromDatabase) => {
            return new Promise(function(resolve, reject) {
                var req = { user: { _id: userFromDatabase._id.toString() }, db: db };
                require('../../middlewares/auth')()(req, null, function next() {
                    resolve();
                });
            });
        });
    });

    it('reponds with 205 when the time in the login token is older than the last server start time', function() {
        return db.get('users').findOne({ name : '1_0_ADMIN0' }).then((userFromDatabase) => {
            return new Promise(function(resolve, reject) {
                var req = { user: { _id: userFromDatabase._id.toString(), tokenTime: 0 }, db: db };
                return require('../../middlewares/auth')()(req, { sendStatus: function(statusCode) {
                    assert.equal(statusCode, 205);
                    resolve();
                } }, function next() {
                    assert.fail('next() was called');
                });
            });
        });
    });

});
