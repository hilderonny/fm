/**
 * UNIT Tests for middlewares/validateId
 */
var assert = require('assert');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');

describe('MIDDLEWARE validateId', function() {

    it('reponds with 400 when req.params.id is not set', function() {
        return new Promise(function(resolve, reject) {
            var req = { params: { } };
            require('../../middlewares/validateId')(req, { sendStatus: function(statusCode) {
                assert.equal(statusCode, 400);
                resolve();
            } }, function next() {
                assert.fail('next() was called');
            });
        });
    });

    it('reponds with 400 when req.params.id is empty', function() {
        return new Promise(function(resolve, reject) {
            var req = { params: { id: '' } };
            require('../../middlewares/validateId')(req, { sendStatus: function(statusCode) {
                assert.equal(statusCode, 400);
                resolve();
            } }, function next() {
                assert.fail('next() was called');
            });
        });
    });

    it('reponds with 400 when req.params.id is invalid', function() {
        return new Promise(function(resolve, reject) {
            var req = { params: { id: 'invalidId' } };
            require('../../middlewares/validateId')(req, { sendStatus: function(statusCode) {
                assert.equal(statusCode, 400);
                resolve();
            } }, function next() {
                assert.fail('next() was called');
            });
        });
    });

    it('calls next() when req.params.id is valid', function() {
        return new Promise(function(resolve, reject) {
            var req = { params: { id: '999999999999999999999999' } };
            require('../../middlewares/validateId')(req, null, function next() {
                resolve();
            });
        });
    });

});
