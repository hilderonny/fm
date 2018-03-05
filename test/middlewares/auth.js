/**
 * UNIT Tests for middlewares/auth
 */
var assert = require('assert');
var th = require('../testhelpers');

describe('MIDDLEWARE auth', () => {
    
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

    it('reponds with 403 when req.user is not set', () => {
        return new Promise(function(resolve, reject) {
            var req = { };
            require('../../middlewares/auth')()(req, { sendStatus: function(statusCode) {
                assert.equal(statusCode, 403);
                resolve();
            } }, function next() {
                assert.fail('next() was called');
            });
        });
    });

    it('reponds with 403 when req.user._id is not set', () => {
        return new Promise(function(resolve, reject) {
            var req = { user: { } };
            require('../../middlewares/auth')()(req, { sendStatus: function(statusCode) {
                assert.equal(statusCode, 403);
                resolve();
            } }, function next() {
                assert.fail('next() was called');
            });
        });
    });

    it('reponds with 403 when req.user.name is invalid', () => {
        return new Promise(function(resolve, reject) {
            var req = { user: { name: 'invalidId' } };
            require('../../middlewares/auth')()(req, { sendStatus: function(statusCode) {
                assert.equal(statusCode, 403);
                resolve();
            } }, function next() {
                assert.fail('next() was called');
            });
        });
    });

    it('calls next() when the user was authenticated successfully', () => {
        return new Promise(function(resolve, reject) {
            var req = { user: { name: "client0_usergroup0_user0" } };
            require('../../middlewares/auth')()(req, null, function next() {
                resolve();
            });
        });
    });

    it('reponds with 205 when the time in the login token is older than the last server start time', () => {
        return new Promise(function(resolve, reject) {
            var req = { user: { name: "client0_usergroup0_user0", tokenTime: 0 } };
            return require('../../middlewares/auth')()(req, { sendStatus: function(statusCode) {
                assert.equal(statusCode, 205);
                resolve();
            } }, function next() {
                assert.fail('next() was called');
            });
        });
    });

});
