/**
 * UNIT Tests for api/activities
 */
var assert = require('assert');
var fs = require('fs');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('API activities', () => {

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
        await th.prepareRelations();
    });

    function compareActivity(actual, expected) {
        assert.ok(typeof(actual._id) !== "undefined");
        assert.ok(typeof(actual.clientId) !== "undefined");
        assert.ok(typeof(actual.date) !== "undefined");
        assert.ok(typeof(actual.name) !== "undefined");
        assert.ok(typeof(actual.task) !== "undefined");
        assert.ok(typeof(actual.isDone) !== "undefined");
        assert.ok(typeof(actual.type) !== "undefined");
        assert.ok(typeof(actual.comment) !== "undefined");
        assert.ok(typeof(actual.createdByUserId) !== "undefined");
        assert.ok(typeof(actual.isForAllUsers) !== "undefined");
        assert.strictEqual(actual._id, expected._id);
        assert.strictEqual(actual.clientId, expected.clientId);
        assert.strictEqual(actual.date, expected.date);
        assert.strictEqual(actual.name, expected.name);
        assert.strictEqual(actual.task, expected.task);
        assert.strictEqual(actual.isDone, expected.isDone);
        assert.strictEqual(actual.type, expected.type);
        assert.strictEqual(actual.comment, expected.comment);
        assert.strictEqual(actual.createdByUserId, expected.createdByUserId);
        assert.strictEqual(actual.isForAllUsers, expected.isForAllUsers);
    }

    function compareActivities(actual, expected) {
        assert.strictEqual(actual.length, expected.length);
        actual.sort((a, b) => { return a._id.localeCompare(b._id); });
        expected.sort((a, b) => { return a._id.localeCompare(b._id); });
        for (var i = 0; i < actual.length; i++) compareActivity(actual[i], expected[i]);
    }

    function mapActivities(activities, clientname) {
        return activities.map((a) => { return { _id: a.name, clientId: clientname, date: (new Date(a.date)).toISOString(), name: a.label, task: a.task, isDone: a.isdone, type: a.activitytypename, comment: a.comment, createdByUserId: a.createdbyusername, isForAllUsers: a.isforallusers } });
    }
    
    describe('GET/', () => {

        th.apiTests.get.defaultNegative(co.apis.activities, co.permissions.OFFICE_ACTIVITY); 

        it('returns all activities with all details of the logged in user and public activities of the client', async () => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var activitiesFromDatabase = (await Db.getDynamicObjects("client0", "activities")).map((a) => { return { _id: a.name, clientId: "client0", date: (new Date(a.date)).toISOString(), name: a.label, task: a.task, isDone: a.isdone, type: a.activitytypename, comment: a.comment, createdByUserId: a.createdbyusername, isForAllUsers: a.isforallusers } });
            var activitiesFromRequest = (await th.get(`/api/${co.apis.activities}?token=${token}`).expect(200)).body;
            assert.ok(activitiesFromRequest.length === activitiesFromDatabase.length - 1);
            activitiesFromDatabase.pop(); //Remove last element for comparing
            compareActivities(activitiesFromRequest, activitiesFromDatabase);
        });

    });

    describe('GET/forIds', () => {

        async function createTestActivities(clientname) {
            var nowTicks = (new Date()).getTime();
            var testActivities = [
                { name: clientname + "_testactivity0", date: nowTicks - 172800000, label: "testactivity0", task: null, isdone: false, activitytypename: "ACTIVITIES_TYPE_WARRANTY", comment: "comment", createdbyusername: "client0_usergroup0_user0", isforallusers: false },
                { name: clientname + "_testactivity1", date: nowTicks - 172800000, label: "testactivity1", task: null, isdone: false, activitytypename: "ACTIVITIES_TYPE_WARRANTY", comment: "comment", createdbyusername: "client0_usergroup0_user1", isforallusers: true },
                { name: clientname + "_testactivity2", date: nowTicks - 172800000, label: "testactivity1", task: null, isdone: false, activitytypename: "ACTIVITIES_TYPE_WARRANTY", comment: "comment", createdbyusername: "client0_usergroup0_user1", isforallusers: false }
            ];
            await Db.insertDynamicObject(clientname, "activities", testActivities[0]);
            await Db.insertDynamicObject(clientname, "activities", testActivities[1]);
            await Db.insertDynamicObject(clientname, "activities", testActivities[2]);
            return [ testActivities[0], testActivities[1] ].map((a) => { return { _id: a.name, clientId: clientname, date: (new Date(a.date)).toISOString(), name: a.label, task: a.task, isDone: a.isdone, type: a.activitytypename, comment: a.comment, createdByUserId: a.createdbyusername, isForAllUsers: a.isforallusers } });
        }  
        
        th.apiTests.getForIds.defaultNegative(co.apis.activities, co.permissions.OFFICE_ACTIVITY, co.collections.activities.name, createTestActivities);
        th.apiTests.getForIds.clientDependentNegative(co.apis.activities, co.collections.activities.name, createTestActivities);
        th.apiTests.getForIds.defaultPositive(co.apis.activities, co.collections.activities.name, createTestActivities);

    });

    describe('GET/:id', () => {
        
        th.apiTests.getId.defaultNegative(co.apis.activities, co.permissions.OFFICE_ACTIVITY, co.collections.activities.name);
        th.apiTests.getId.clientDependentNegative(co.apis.activities, co.collections.activities.name);

        it('responds with existing id with all details of the activity', async () => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementFromDatabase = [(await Db.getDynamicObject("client0", "activities", "client0_activity0"))].map((a) => { return { _id: a.name, clientId: "client0", date: (new Date(a.date)).toISOString(), name: a.label, task: a.task, isDone: a.isdone, type: a.activitytypename, comment: a.comment, createdByUserId: a.createdbyusername, isForAllUsers: a.isforallusers } })[0];
            var elementFromApi = (await th.get(`/api/${co.apis.activities}/client0_activity0?token=${token}`).expect(200)).body;
            compareActivity(elementFromApi, elementFromDatabase);
        });        
     
        it('attribute "currentUserCanWrite" is true when the user is the creator of the activity', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementFromApi = (await th.get(`/api/${co.apis.activities}/client0_activity0?token=${token}`).expect(200)).body;
            assert.ok(!!elementFromApi.currentUserCanWrite);
        });

        it('attribute "currentUserCanWrite" is false when the user is not the creator of the activity and when the activity is public', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementFromApi = (await th.get(`/api/${co.apis.activities}/client0_activity2?token=${token}`).expect(200)).body;
            assert.ok(!elementFromApi.currentUserCanWrite);
        });

    });

    describe('POST/', () => {

        function createPostTestActivity() {
            return { date: (new Date()).toISOString(), name: "testactivity0", task: null, isDone: false, type: "ACTIVITIES_TYPE_WARRANTY", comment: "comment", isForAllUsers: false };
        }

        th.apiTests.post.defaultNegative(co.apis.activities, co.permissions.OFFICE_ACTIVITY, createPostTestActivity);
        th.apiTests.post.defaultPositive(co.apis.activities, co.collections.activities.name, createPostTestActivity, mapActivities);

        it('creates the activity and sets the attribute "createdByUserId" to the _id of the user', async() => {
            var activity = createPostTestActivity();
            var token = await th.defaults.login("client0_usergroup0_user0");
            var activityFromApi = (await th.post(`/api/${co.apis.activities}?token=${token}`).send(activity).expect(200)).body;
            var activityFromDatabase = await Db.getDynamicObject("client0", "activities", activityFromApi._id);
            assert.strictEqual(activityFromDatabase.createdbyusername, "client0_usergroup0_user0");
        }); 

    });

    describe('PUT/:id', () => {

        async function createPutTestActivity(clientname) {
            var testactivity = { name: clientname + "_testactivity", date: (new Date()).getTime(), label: "client0_activity0", task: null, isdone: true, activitytypename: "ACTIVITIES_TYPE_NONE", comment: "comment", createdbyusername: "client0_usergroup0_user0", isforallusers: false };
            await Db.insertDynamicObject(clientname, "activities", testactivity);
            return mapActivities([testactivity], clientname)[0];
        }

        th.apiTests.put.defaultNegative(co.apis.activities, co.permissions.OFFICE_ACTIVITY, createPutTestActivity);
        th.apiTests.put.clientDependentNegative(co.apis.activities, createPutTestActivity);
        
        it('responds with 403 when the user is not the creator', async() => {
            var activity = { name: "client0_testactivity", date: (new Date()).getTime(), label: "client0_activity0", task: null, isdone: true, activitytypename: "ACTIVITIES_TYPE_NONE", comment: "comment", createdbyusername: "client0_usergroup0_user1", isforallusers: false };
            await Db.insertDynamicObject("client0", "activities", activity);
            var token = await th.defaults.login("client0_usergroup0_user0"); // Other user
            var activityupdate = { type: 'ACTIVITIES_TYPE_CALL_ON_CUSTOMERS' };
            await th.put(`/api/${co.apis.activities}/${activity.name}?token=${token}`).send(activityupdate).expect(403);
        });

        it('responds with a correct activity with the updated activity and its new properties', async() => {
            var originalactivity = await createPutTestActivity("client0");
            var activityupdate = { type: 'ACTIVITIES_TYPE_CALL_ON_CUSTOMERS' };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/${co.apis.activities}/${originalactivity._id}?token=${token}`).send(activityupdate).expect(200);
            var elementFromDatabase = await Db.getDynamicObject("client0", "activities", originalactivity._id);
            assert.strictEqual(elementFromDatabase.activitytypename, activityupdate.type);
        });

    });

    describe('DELETE/:id', () => {

        async function getDeleteActivityId(clientname) {
            var testactivity = { name: clientname + "_testactivity", date: (new Date()).getTime(), label: "client0_activity0", task: null, isdone: true, activitytypename: "ACTIVITIES_TYPE_NONE", comment: "comment", createdbyusername: "client0_usergroup0_user0", isforallusers: false };
            await Db.insertDynamicObject(clientname, "activities", testactivity);
            return testactivity.name;
        }

        th.apiTests.delete.defaultNegative(co.apis.activities, co.permissions.OFFICE_ACTIVITY, getDeleteActivityId);
        th.apiTests.delete.clientDependentNegative(co.apis.activities, getDeleteActivityId);
        th.apiTests.delete.defaultPositive(co.apis.activities, co.collections.activities.name, getDeleteActivityId);
    
        it('returns 403 when the user is not the creator of the activity', async () => {
            var activity = { name: "client0_testactivity", date: (new Date()).getTime(), label: "client0_activity0", task: null, isdone: true, activitytypename: "ACTIVITIES_TYPE_NONE", comment: "comment", createdbyusername: "client0_usergroup0_user1", isforallusers: false };
            await Db.insertDynamicObject("client0", "activities", activity);
            var token = await th.defaults.login("client0_usergroup0_user0"); // Other user
            await th.del(`/api/${co.apis.activities}/${activity.name}?token=${token}`).expect(403);
        });
    });
});
