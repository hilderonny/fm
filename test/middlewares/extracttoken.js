/**
 * UNIT Tests for middlewares/extracttoken
 */
var assert = require('assert');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');

describe('MIDDLEWARE extracttoken', function() {

    beforeEach(() => {
        return testHelpers.cleanDatabase()
            .then(testHelpers.prepareClients)
            .then(testHelpers.prepareUserGroups)
            .then(testHelpers.prepareUsers);
    });

    it('does not fill req.user when there is no token set', function() {
        var req = { query: {}, headers: {} };
        return require('../../middlewares/extracttoken')(req, null, function next() {
            assert.ok(!req.user, 'A user was set without correct token: ' + req.user);
        });
    });

    it('does not fill req.user when the given token given as query parameter is empty', function() {
        var req = { query: { token: '' }, headers: {} };
        return require('../../middlewares/extracttoken')(req, null, function next() {
            assert.ok(!req.user, 'A user was set without correct token: ' + req.user);
        });
    });

    it('does not fill req.user when the given token given as query parameter in not valid', function() {
        var req = { query: { token: 'invalidToken' }, headers: {} };
        return require('../../middlewares/extracttoken')(req, null, function next() {
            assert.ok(!req.user, 'A user was set without correct token: ' + req.user);
        });
    });

    it('fills out req.user with at least attribute _id when the token given as query parameter is valid', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
            var req = { query: { token: token }, headers: {} };
            return require('../../middlewares/extracttoken')(req, null, function next() {
                assert.ok(req.user, 'req.user was not set');
                assert.ok(req.user._id, 'req.user._id was not set');
                assert.ok(require('../../middlewares/validateId').validateId(req.user._id), 'req.user._id is no valid ID');
            });
        });
    });

    it('does not fill req.user when the given token given as request header in not valid', function() {
        var req = { query: {}, headers: { 'x-access-token' : '' } };
        return require('../../middlewares/extracttoken')(req, null, function next() {
            assert.ok(!req.user, 'A user was set without correct token: ' + req.user);
        });
    });

    it('fills out req.user with at least attribute _id when the token given as request header is valid', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
            var req = { query: {}, headers: { 'x-access-token' : token } };
            return require('../../middlewares/extracttoken')(req, null, function next() {
                assert.ok(req.user, 'req.user was not set');
                assert.ok(req.user._id, 'req.user._id was not set');
                assert.ok(require('../../middlewares/validateId').validateId(req.user._id), 'req.user._id is no valid ID');
            });
        });
    });

});
