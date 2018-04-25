/**
 * UNIT Tests for api/recordtypes
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('API recordtypes', () => {

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.preparedatatypes();
        await th.preparedatatypefields();
    });
    
    describe('GET/', () => {

        th.apiTests.get.defaultNegative(co.apis.recordtypes, co.permissions.SETTINGS_CLIENT_RECORDTYPES); 

        xit('returns all datatypes of the client including their fields', async () => {
        //     var token = await th.defaults.login("client0_usergroup0_user0");
        //     var activitiesFromDatabase = (await Db.getDynamicObjects("client0", "activities")).map((a) => { return { _id: a.name, clientId: "client0", date: (new Date(a.date)).toISOString(), name: a.label, task: a.task, isDone: a.isdone, type: a.activitytypename, comment: a.comment, createdByUserId: a.createdbyusername, isForAllUsers: a.isforallusers } });
        //     var activitiesFromRequest = (await th.get(`/api/${co.apis.activities}?token=${token}`).expect(200)).body;
        //     assert.ok(activitiesFromRequest.length === activitiesFromDatabase.length - 1);
        //     activitiesFromDatabase.pop(); //Remove last element for comparing
        //     compareActivities(activitiesFromRequest, activitiesFromDatabase);
        });

        xit('does not return datatypes of other clients', async() => {});

    });
    
    describe('GET/field/:recordtypename/:fieldname', () => {

        // th.apiTests.get.defaultNegative(co.apis.recordtypes + "/client0_datatype0/boolean0", co.permissions.SETTINGS_CLIENT_RECORDTYPES); 

        xit('returns 404 when the recordtype does not exist in the client', async() => {});

        xit('returns 404 when the field does not exist in the client', async() => {});

        xit('returns 404 when the recordtype does not exist in the client but in another client', async() => {});

        xit('returns 404 when the field does not exist in the client but in another client', async() => {});

        xit('returns the request field information', async() => {});

    });
    
    describe('GET/lists', () => {

        th.apiTests.get.defaultNegative(co.apis.recordtypes + "/lists", co.permissions.SETTINGS_CLIENT_RECORDTYPES); 

        xit('retreives all list names for the user\'s client defined in module config', async() => {});

        xit('retreives only list names for modules which are available to the client', async() => {});

        xit('retreives list names of portaldatatypes when logged in user is a portal user', async() => {});

        xit('retreives list names of clientdatatypes when logged in user is a client user', async() => {});

    });

    describe('GET/:name', () => {
        
        // th.apiTests.getId.defaultNegative(co.apis.recordtypes, co.permissions.SETTINGS_CLIENT_RECORDTYPES, "recordtypes");
        // th.apiTests.getId.clientDependentNegative(co.apis.recordtypes, "recordtypes");

        xit('returns the datatype and its fields', async() => {});

    });

    describe('POST/', () => {

        // function createPostTestActivity() {
        //     return { date: (new Date()).toISOString(), name: "testactivity0", task: null, isDone: false, type: "ACTIVITIES_TYPE_WARRANTY", comment: "comment", isForAllUsers: false };
        // }

        // th.apiTests.post.defaultNegative(co.apis.activities, co.permissions.OFFICE_ACTIVITY, createPostTestActivity);
        // th.apiTests.post.defaultPositive(co.apis.activities, co.collections.activities.name, createPostTestActivity, mapActivities);

        xit('responds with 400 when no name is given', async() => {});

        xit('responds with 400 when name contains characters other than a-z', async() => {});

        xit('responds with 400 when lists is given but is not an array', async() => {});

        xit('responds with 400 when name is now allowed (used by API routes)', async() => {});

        xit('responds with 409 when a record type with the given name already exists', async() => {});

        xit('creates the recordtype and a field "name" which is set as titlefield and returns 200', async() => {});

        xit('appends the recordtypename to the lists field when not already contained', async() => {});

        xit('does not append the recordtypename to the lists field when already contained', async() => {});

        xit('creates the lists field when not sent in request', async() => {});

        xit('sets the label to "" when not given', async() => {});

        xit('sets the plurallabel to "" when not given', async() => {});

        xit('sets the icon to "" when not given', async() => {});

        xit('sets the permissionkey to "" when not given', async() => {});

    });

    describe('POST/field/:datatypename', () => {

        // function createPostTestActivity() {
        //     return { date: (new Date()).toISOString(), name: "testactivity0", task: null, isDone: false, type: "ACTIVITIES_TYPE_WARRANTY", comment: "comment", isForAllUsers: false };
        // }

        // th.apiTests.post.defaultNegative(co.apis.activities, co.permissions.OFFICE_ACTIVITY, createPostTestActivity);
        // th.apiTests.post.defaultPositive(co.apis.activities, co.collections.activities.name, createPostTestActivity, mapActivities);

        xit('responds with 400 when no name is given', async() => {});

        xit('responds with 400 when name contains characters other than a-z', async() => {});

        xit('responds with 400 when fieldtype is invalid', async() => {});

        xit('responds with 400 when fieldtype is formula and formula is invalid', async() => {});

        xit('responds with 400 when isrequired is not of type boolean', async() => {});

        xit('responds with 400 when isnullable is not of type boolean', async() => {});

        xit('responds with 400 when ishidden is not of type boolean', async() => {});

        xit('responds with 400 when formulaindex is not of type int', async() => {});

        xit('responds with 404 when reference targets an invalid datatype', async() => {});

        xit('responds with 404 when datatype does not exist for client', async() => {});

        xit('responds with 404 when datatype does not exist for client but for other client', async() => {});

        xit('responds with 409 when a field with the given name already exists for the datatype', async() => {});

        xit('creates the field and returns 200', async() => {});

        xit('creates the field even when one with the given name already exists for another datatype', async() => {});

    });

    describe('PUT/field/:datatypename/:fieldname', () => {

        // th.apiTests.put.defaultNegative(co.apis.activities, co.permissions.OFFICE_ACTIVITY, createPutTestActivity);
        // th.apiTests.put.clientDependentNegative(co.apis.activities, createPutTestActivity);

        xit('responds with 400 when fieldtype is formula and sent formula is invalid', async() => {});

        xit('responds with 400 when label is not of type text', async() => {});

        xit('responds with 400 when formula is not of type JSON', async() => {});

        xit('responds with 400 when ishidden is not of type boolean', async() => {});

        xit('responds with 400 when formulaindex is not of type int', async() => {});

        xit('responds with 404 when the datatype does not exist for the client', async() => {});

        xit('responds with 404 when the datatype does not exist for the client, even when it exists for another client', async() => {});

        xit('responds with 404 when the field does not exist for the datatype', async() => {});

        xit('responds with 404 when the field does not exist for the datatype even when it exists for another datatype', async() => {});

        xit('updates the field and returns 200', async() => {});

        xit('does not update the label when it is not set', async() => {});

        xit('does not update the formula when it is not set', async() => {});

        xit('does not update the formulaindex when it is not set', async() => {});

        xit('does not update the ishidden attribute when it is not set', async() => {});

        xit('does nothing but returns 200 when no atteibutes to update are sent', async() => {});

        xit('does not update the name when it was sent', async() => {});

        xit('does not update the fieldtype when it was sent', async() => {});

        xit('does not update isrequired when it was sent', async() => {});

        xit('does not update the reference when it was sent', async() => {});

        xit('does not update isnullable when it was sent', async() => {});

    });

    describe('PUT/:name', () => {

        // async function createPutTestActivity(clientname) {
        //     var testactivity = { name: clientname + "_testactivity", date: (new Date()).getTime(), label: "client0_activity0", task: null, isdone: true, activitytypename: "ACTIVITIES_TYPE_NONE", comment: "comment", createdbyusername: "client0_usergroup0_user0", isforallusers: false };
        //     await Db.insertDynamicObject(clientname, "activities", testactivity);
        //     return mapActivities([testactivity], clientname)[0];
        // }

        // th.apiTests.put.defaultNegative(co.apis.activities, co.permissions.OFFICE_ACTIVITY, createPutTestActivity);
        // th.apiTests.put.clientDependentNegative(co.apis.activities, createPutTestActivity);

        xit('responds with 400 when the titlefield is given but there is no field of this name', async() => {});

        xit('responds with 400 when label is not of type text', async() => {});

        xit('responds with 400 when plurallabel is not of type text', async() => {});

        xit('responds with 400 when titlefield is not of type text', async() => {});

        xit('responds with 400 when lists is not of an array of type text', async() => {});

        xit('responds with 400 when icon is not of type text', async() => {});

        xit('responds with 400 when permissionkey is not of type text', async() => {});

        xit('responds with 400 when canhaverelations is not of type boolean', async() => {});

        xit('responds with 400 when candefinename is not of type boolean', async() => {});

        xit('responds with 404 when the datatype does not exist for the client', async() => {});

        xit('responds with 404 when the datatype does not exist for the client, even when it exists for another client', async() => {});

        xit('updates the datatype and returns 200', async() => {});

        xit('does not update the label when it is not set', async() => {});

        xit('does not update the plurallabel when it is not set', async() => {});

        xit('does not update the titlefield when it is not set', async() => {});

        xit('does not update the lists when it is not set', async() => {});

        xit('does not update the icon when it is not set', async() => {});

        xit('does not update the permissionkey when it is not set', async() => {});

        xit('does not update the permissionkey when it is set but predefined', async() => {});

        xit('does not update the canhaverelations when it is not set', async() => {});

        xit('does not update the canhaverelations when it is set but predefined', async() => {});

        xit('does not update the candefinename when it is not set', async() => {});

        xit('does not update the candefinename when it is set but predefined', async() => {});

        xit('does nothing but returns 200 when no atteibutes to update are sent', async() => {});

        xit('does not update the name when it was sent', async() => {});

        xit('does not update ispredefined when it was sent', async() => {});

        xit('recalculates the formula of all instances when the formula changed', async() => {});

        xit('recalculates the formula of all instances when the formulaindex changed', async() => {});

    });

    describe('DELETE/field/:datatypename/:fieldname', () => {

        // th.apiTests.delete.defaultNegative(co.apis.activities, co.permissions.OFFICE_ACTIVITY, getDeleteActivityId);
        // th.apiTests.delete.clientDependentNegative(co.apis.activities, getDeleteActivityId);
        // th.apiTests.delete.defaultPositive(co.apis.activities, co.collections.activities.name, getDeleteActivityId);

        xit('responds with 400 when the field is set as titlefield in the datatype', async() => {});

        xit('responds with 400 when the field is predefined', async() => {});

        xit('responds with 404 when the datatype does not exist for the client', async() => {});

        xit('responds with 404 when the datatype does not exist for the client, even when it exists for another client', async() => {});

        xit('responds with 404 when the field does not exist for the datatype', async() => {});

        xit('responds with 404 when the field does not exist for the datatype even when it exists for another datatype', async() => {});

        xit('deletes the field and its corresponding table column and returns 204', async() => {});

    });

    describe('DELETE/:name', () => {

        // th.apiTests.delete.defaultNegative(co.apis.activities, co.permissions.OFFICE_ACTIVITY, getDeleteActivityId);
        // th.apiTests.delete.clientDependentNegative(co.apis.activities, getDeleteActivityId);
        // th.apiTests.delete.defaultPositive(co.apis.activities, co.collections.activities.name, getDeleteActivityId);

        xit('responds with 400 when the datatype is predefined', async() => {});

        xit('responds with 400 when datatype is still references by a reference field of another datatype', async() => {});

        xit('responds with 400 when datatype is still references within a relation (datatype1name)', async() => {});

        xit('responds with 400 when datatype is still references within a relation (datatype2name)', async() => {});

        xit('responds with 404 when the datatype does not exist for the client', async() => {});

        xit('responds with 404 when the datatype does not exist for the client, even when it exists for another client', async() => {});

        xit('deletes the datatype, its table and returns 204', async() => {});

        xit('deletes the datatype even when it is references within an own field (ring dependencies are possible and okay)', async() => {});

    });

});
