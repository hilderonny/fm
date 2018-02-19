/**
 * UNIT Tests for middlewares/extracttoken
 */
var assert = require('assert');
var superTest = require('supertest');
var th = require('../testhelpers');

describe('MIDDLEWARE extracttoken', function() {

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareUserGroups();
        await th.prepareUsers();
    });

    it('does not fill req.user when there is no token set', function() {
        return new Promise(function(resolve, reject) {
            var req = { query: {}, headers: {} };
            require('../../middlewares/extracttoken')(req, null, function next() {
                assert.ok(!req.user, 'A user was set without correct token: ' + req.user);
                resolve();
            });
        });
    });

    it('does not fill req.user when the given token given as query parameter is empty', function() {
        return new Promise(function(resolve, reject) {
            var req = { query: { token: '' }, headers: {} };
            require('../../middlewares/extracttoken')(req, null, function next() {
                assert.ok(!req.user, 'A user was set without correct token: ' + req.user);
                resolve();
            });
        });
    });

    it('does not fill req.user when the given token given as query parameter in not valid', function() {
        return new Promise(function(resolve, reject) {
            var req = { query: { token: 'invalidToken' }, headers: {} };
            require('../../middlewares/extracttoken')(req, null, function next() {
                assert.ok(!req.user, 'A user was set without correct token: ' + req.user);
                resolve();
            });
        });
    });

    it('fills out req.user with at least attribute _id when the token given as query parameter is valid', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
            return new Promise(function(resolve, reject) {
                var req = { query: { token: token }, headers: {} };
                require('../../middlewares/extracttoken')(req, null, function next() {
                    assert.ok(req.user, 'req.user was not set');
                    assert.ok(req.user._id, 'req.user._id was not set');
                    assert.ok(require('../../middlewares/validateId').validateId(req.user._id), 'req.user._id is no valid ID');
                    resolve();
                });
            });
        });
    });

    it('does not fill req.user when the given token given as request header in not valid', function() {
        return new Promise(function(resolve, reject) {
            var req = { query: {}, headers: { 'x-access-token' : '' } };
            require('../../middlewares/extracttoken')(req, null, function next() {
                assert.ok(!req.user, 'A user was set without correct token: ' + req.user);
                resolve();
            });
        });
    });

    it('fills out req.user with at least attribute _id when the token given as request header is valid', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
            return new Promise(function(resolve, reject) {
                var req = { query: {}, headers: { 'x-access-token' : token } };
                require('../../middlewares/extracttoken')(req, null, function next() {
                    assert.ok(req.user, 'req.user was not set');
                    assert.ok(req.user._id, 'req.user._id was not set');
                    assert.ok(require('../../middlewares/validateId').validateId(req.user._id), 'req.user._id is no valid ID');
                    resolve();
                });
            });
        });
    });

});
