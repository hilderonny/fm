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

        xit('responds without authentication with 403', async () => {
        });

        xit('responds without read permission with 403', async () => {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async () => {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async () => {
        });

        xit('responds with 400 when the recordtypename is invalid', async () => {
        });

        xit('responds with 404 when the entityname is invalid', async () => {
        });

        xit('responds with empty list when there are no children for the given list name', async () => {
        });

        xit('responds with 404 when the object to request does not belong to client of the logged in user', async () => {
        });

        xit('responds with a list of children of a given entity which are contained in the given list', async () => {
            // datatypename, icon, haschildren
        });

        xit('responds with an empty list when the element has no children', async () => {
        });

        xit('does not return children of recordtypes where the user has no access to', async () => {
        });

    });

    describe('GET/hierarchytoelement/:forlist/:recordtypename/:entityname', () => {

        xit('responds without authentication with 403', async () => {
        });

        xit('responds without read permission with 403', async () => {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async () => {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async () => {
        });

        xit('responds with 400 when the recordtypename is invalid', async () => {
        });

        xit('responds with 404 when the entityname is invalid', async () => {
        });

        xit('responds with empty list when the element is a root element without any parents', async () => {
        });

        xit('responds with empty list when there are no parents for the given list name', async () => {
        });

        xit('responds with 404 when the object to request does not belong to client of the logged in user', async () => {
        });

        xit('responds with a list of parents and their children ordered from root (1st) to the element (last)', async () => {
        });

        xit('does not return children of the parents for recordtypes where the user has no access to', async () => {
        });

        xit('does not return parents for recordtypes where the user has no access to', async () => {
        });

    });

    describe('GET/parentpath/:forlist/:recordtypename/:entityname', () => {

        xit('responds without authentication with 403', async () => {
        });

        xit('responds without read permission with 403', async () => {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async () => {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async () => {
        });

        xit('responds with 400 when the recordtypename is invalid', async () => {
        });

        xit('responds with 404 when the entityname is invalid', async () => {
        });

        xit('responds with empty list when the element is a root element without any parents', async () => {
        });

        xit('responds with empty list when there are no parents for the given list name', async () => {
        });

        xit('responds with 404 when the object to request does not belong to client of the logged in user', async () => {
        });

        xit('responds with a list of parents ordered from root (1st) to the element (last)', async () => {
        });

        xit('does not return parents for recordtypes where the user has no access to', async () => {
        });

    });

    describe('GET/rootelements/:forlist', () => {

        xit('responds without authentication with 403', async () => {
        });

        xit('responds without read permission with 403', async () => {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to the base module, with 403', async () => {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to the base module, with 403', async () => {
        });

        xit('responds with empty list when there are no root elements for the given list name', async () => {
        });

        xit('responds with a list of root elements', async () => {
            // check for haschildren!
        });

        xit('does not return root elements for recordtypes where the user has no access to', async () => {
        });

    });

    describe('GET/:recordtypename', () => {

        xit('responds without authentication with 403', async () => {
        });

        xit('responds without read permission with 403', async () => {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async () => {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async () => {
        });

        xit('responds with 400 when the recordtypename is invalid', async () => {
        });

        xit('responds with empty list when there are no elements of the given record type', async () => {
        });

        xit('responds with empty list when the user has no access to the record type', async () => {
        });

        xit('responds with a list of all elements of the given record type', async () => {
        });

    });

    describe('GET/:recordtypename/:entityname', () => {

        xit('responds without authentication with 403', async () => {
        });

        xit('responds without read permission with 403', async () => {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to the module of the record type, with 403', async () => {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to the module of the record type, with 403', async () => {
        });

        xit('responds with 400 when the recordtypename is invalid', async () => {
        });

        xit('responds with 404 when the entityname is invalid', async () => {
        });

        xit('responds with 404 when the object to request does not belong to client of the logged in user', async () => {
        });

        xit('responds with the record data of the given entityname', async () => {
        });

    });

    describe('POST/:recordtypename', () => {

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

        xit('responds with 409 when the name can be defined but is used by another entity', async () => {
        });

        xit('creates a new entity and generates a name when name cannot be defined', async () => {
        });

        xit('creates a new entity and generates a name when name can be defined but was not sent', async () => {
        });

        xit('recalculates the referenced parents when the object to create is a relation of type "parent-child"', async () => {
        });

        xit('returns the name of the created entity', async () => {
        });

        xit('recalculates the formulas of the created entity immediately', async () => {
        });

    });

    describe('PUT/:recordtypename/:entityname', () => {

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

        xit('responds with 404 when the object to update does not belong to client of the logged in user', async () => {
        });

        xit('does not update the name when it was sent', async () => {
        });

        xit('updates all given fields of the entity and returns 200', async () => {
        });

        xit('does not update fields which are not sent', async () => {
        });

        xit('recalculates the formerly referenced parents when the object to update is a relation and its type changed away from "parent-child"', async () => {
        });

        xit('recalculates the formerly referenced parents when the object to update is a relation and its type changed to "parent-child"', async () => {
        });

        xit('recalculates the formerly referenced parents when the object to update is a relation and its first relation element changed', async () => {
        });

        xit('recalculates the formerly referenced parents when the object to update is a relation and its second relation element changed', async () => {
        });

        xit('recalculates the new referenced parents when the object to update is a relation and its type changed away from "parent-child"', async () => {
        });

        xit('recalculates the new referenced parents when the object to update is a relation and its type changed to "parent-child"', async () => {
        });

        xit('recalculates the new referenced parents when the object to update is a relation and its first relation element changed', async () => {
        });

        xit('recalculates the new referenced parents when the object to update is a relation and its second relation element changed', async () => {
        });

        xit('recalculates the formulas of the updated entity immediately', async () => {
        });

    });

});
