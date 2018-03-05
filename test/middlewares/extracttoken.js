/**
 * UNIT Tests for middlewares/extracttoken
 */
var assert = require('assert');
var th = require('../testhelpers');

describe('MIDDLEWARE extracttoken', () => {

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareUserGroups();
        await th.prepareUsers();
    });

    it('does not fill req.user when there is no token set', () => {
        return new Promise(function(resolve, reject) {
            var req = { query: {}, headers: {} };
            require('../../middlewares/extracttoken')(req, null, function next() {
                assert.ok(!req.user, 'A user was set without correct token: ' + req.user);
                resolve();
            });
        });
    });

    it('does not fill req.user when the given token given as query parameter is empty', () => {
        return new Promise(function(resolve, reject) {
            var req = { query: { token: '' }, headers: {} };
            require('../../middlewares/extracttoken')(req, null, function next() {
                assert.ok(!req.user, 'A user was set without correct token: ' + req.user);
                resolve();
            });
        });
    });

    it('does not fill req.user when the given token given as query parameter in not valid', () => {
        return new Promise(function(resolve, reject) {
            var req = { query: { token: 'invalidToken' }, headers: {} };
            require('../../middlewares/extracttoken')(req, null, function next() {
                assert.ok(!req.user, 'A user was set without correct token: ' + req.user);
                resolve();
            });
        });
    });

    it('fills out req.user with at least attribute _id when the token given as query parameter is valid', () => {
        return th.defaults.login("client0_usergroup0_user0").then((token) => {
            return new Promise(function(resolve, reject) {
                var req = { query: { token: token }, headers: {} };
                require('../../middlewares/extracttoken')(req, null, function next() {
                    assert.ok(req.user, 'req.user was not set');
                    assert.ok(req.user.name, 'req.user.name was not set');
                    resolve();
                });
            });
        });
    });

    it('does not fill req.user when the given token given as request header in not valid', () => {
        return new Promise(function(resolve, reject) {
            var req = { query: {}, headers: { 'x-access-token' : '' } };
            require('../../middlewares/extracttoken')(req, null, function next() {
                assert.ok(!req.user, 'A user was set without correct token: ' + req.user);
                resolve();
            });
        });
    });

    it('fills out req.user with at least attribute _id when the token given as request header is valid', () => {
        return th.defaults.login("client0_usergroup0_user0").then((token) => {
            return new Promise(function(resolve, reject) {
                var req = { query: {}, headers: { 'x-access-token' : token } };
                require('../../middlewares/extracttoken')(req, null, function next() {
                    assert.ok(req.user, 'req.user was not set');
                    assert.ok(req.user.name, 'req.user.name was not set');
                    resolve();
                });
            });
        });
    });

});
