/**
 * UNIT Tests for api/doc
 */
var assert = require('assert');
var fs = require('fs');
var moduleConfig = require('../../config/module-config.json'); // http://stackoverflow.com/a/14678694
var th = require('../testhelpers');
var co = require('../../utils/constants');

describe('API doc', function() {

    xit('responds to GET/ with all documentation menu entries defined in module-config', function() {
    });

    it('responds to POST with 404', function() {
        return th.post('/api/doc').expect(404);
    });

    it('responds to PUT with 404', function() {
        return th.put('/api/doc').expect(404);
    });

    it('responds to DELETE with 404', function() {
        return th.del('/api/doc').expect(404);
    });

});
