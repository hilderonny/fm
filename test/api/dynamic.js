var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('API dynamic', () => {

    describe('DELETE/:recordtypename/:entityname', () => {

        xit('responds without authentication with 403', async () => {
        });

        xit('responds without write permission with 403', async () => {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async () => {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async () => {
        });

        xit('responds with 400 when the recordtypename is invalid', async () => {
        });

        xit('responds with 404 when the entityname is invalid', async () => {
        });

        xit('responds with 404 when the object to delete does not belong to client of the logged in user', async () => {
        });

        xit('deletes the object and return 204', async () => {
        });

        xit('deletes the object even when there are references (e.g. users-usergroups) to the object', async () => {
            // The forbidding of deleting referenced objects is up to the client apps
        });

        xit('does not delete elements which are connected via parent child relations (no recursive child deletion)', async () => {
        });

        xit('all relations, where the element is the source (type1, id1), are also deleted', async () => {
        });

        xit('all relations, where the element is the target (type2, id2), are also deleted', async () => {
        });

        xit('deletes all dynamic attribute values for the entity', async () => {
        });

        xit('recalculates all parent objects recursively when the object to delete itself is a relation', async () => {
        });

        xit('recalculates all parent objects recursively of the object to be deleted', async () => {
        });

        xit('also deletes attached files when the object is a document', async () => {
        });

    });
    
    describe('GET/children/:forlist/:recordtypename/:entityname', () => {

        xit('', async () => {
        });

    });

    describe('GET/hierarchytoelement/:forlist/:recordtypename/:entityname', () => {

        xit('', async () => {
        });

    });

    describe('GET/parentpath/:forlist/:recordtypename/:entityname', () => {

        xit('', async () => {
        });

    });

    describe('GET/rootelements/:forlist', () => {

        xit('', async () => {
        });

    });

    describe('GET/:recordtypename', () => {

        xit('', async () => {
        });

    });

    describe('GET/:recordtypename/:entityname', () => {

        xit('', async () => {
        });

    });

    describe('POST/:recordtypename', () => {

        xit('', async () => {
        });

    });

    describe('POST/:recordtypename/:entityname', () => {

        xit('', async () => {
        });

    });

    describe('GET/', () => {

        xit('', async () => {
        });

    });

    describe('GET/', () => {

        xit('', async () => {
        });

    });

});
