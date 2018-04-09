var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('API datatypes', () => {

    describe('GET/', () => {

        xit('responds without authentication with 403', async () => {
        });

        xit('responds without read permission with 403', async () => {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to the base module, with 403', async () => {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to the base module, with 403', async () => {
        });

        xit('returns a list of all datatypes containg their fields', async () => {
        });

        xit('returns at least all predefined datatypes and their field definitions (from module-config)', async () => {
        });

        xit('also returns all custom datatypes and their field definitions', async () => {
        });

        xit('returns an empty list when there are no datatypes', async () => {
        });

    });

});
