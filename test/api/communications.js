/**
 * UNIT Tests for api/communications
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('API communications', function() {

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.preparePersons();
        await th.prepareCommunications();
        await th.prepareRelations();
    });


    function compareCommunication(actual, expected) {
        ["_id", "clientId", "contact", "personId", "medium", "type"].forEach((f) => {
            assert.ok(typeof(actual[f]) !== "undefined");
            assert.strictEqual(actual[f], expected[f]);
        });
    }

    function compareCommunications(actual, expected) {
        assert.strictEqual(actual.length, expected.length);
        actual.sort((a, b) => { return a._id.localeCompare(b._id); });
        expected.sort((a, b) => { return a._id.localeCompare(b._id); });
        for (var i = 0; i < actual.length; i++) compareCommunication(actual[i], expected[i]);
    }

    function mapCommunications(elements, clientname) {
        var mediums = {
            emailwork: "email",
            emailother: "email",
            phonework: "phone",
            phonemobile: "phone",
            phoneother: "phone"
        };
        var types = {
            emailwork: "work",
            emailother: "other",
            phonework: "work",
            phonemobile: "mobile",
            phoneother: "other"
        };
        return elements.map((e) => { return { _id: e.name, clientId: clientname, contact: e.contact, personId: e.personname, medium: mediums[e.communicationtypename], type: types[e.communicationtypename] } });
    }

    describe('GET/forPerson/:id', function() {

        var api = co.apis.communications + '/forPerson';
        th.apiTests.getId.defaultNegative(api, co.permissions.CRM_PERSONS, co.collections.persons.name);
        th.apiTests.getId.clientDependentNegative(api, co.collections.persons.name);
        
        it('returns all communications for the given person', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementId = "client0_person0";
            var elementsFromDatabase = mapCommunications(await Db.getDynamicObjects("client0", "communications", { personname: elementId }), "client0");
            var elementsFromApi = (await th.get(`/api/${co.apis.communications}/forPerson/${elementId}?token=${token}`).expect(200)).body;
            compareCommunications(elementsFromApi, elementsFromDatabase);
        });

    });

    describe('GET/:id', function() {

        th.apiTests.getId.defaultNegative(co.apis.communications, co.permissions.CRM_PERSONS, co.collections.communications.name);
        th.apiTests.getId.clientDependentNegative(co.apis.communications, co.collections.communications.name);
         
        it('returns the communication with all details for the given id', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementId = "client0_communication0";
            var elementFromDatabase = mapCommunications([await Db.getDynamicObject("client0", "communications", elementId)], "client0")[0];
            var elementFromApi = (await th.get(`/api/${co.apis.communications}/${elementId}?token=${token}`).expect(200)).body;
            compareCommunication(elementFromApi, elementFromDatabase);
        });
       
    });

    describe('POST/', function() {

        function createPostTestCommunication() {
            return { contact: "c", personId: "client0_person0", medium: "email", type: "work" };
        }

        th.apiTests.post.defaultNegative(co.apis.communications, co.permissions.CRM_PERSONS, createPostTestCommunication);
        th.apiTests.post.defaultPositive(co.apis.communications, co.collections.communications.name, createPostTestCommunication, mapCommunications);
                
        it('responds without giving a personId with 400', async() => {
            var elementToSend = createPostTestCommunication();
            delete elementToSend.personId;
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.communications}?token=${token}`).send(elementToSend).expect(400);
        });
                
        it('responds with not existing personId with 400', async() => {
            var elementToSend = createPostTestCommunication();
            elementToSend.personId = '999999999999999999999999';
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.communications}?token=${token}`).send(elementToSend).expect(400);
        });
        
        it('responds with 400 when the person of the communication does not belong to the same client as the logged in user', async() => {
            var elementToSend = createPostTestCommunication();
            elementToSend.personId = "client1_person0"; // Other client
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.communications}?token=${token}`).send(elementToSend).expect(400);
        });

    });

    describe('PUT/:id', function() {

        async function createPutTestCommunication(clientname) {
            var testelement = { name: clientname + "_testcommunication0", contact: "c", personname: "client0_person0", communicationtypename: "emailwork" };
            await Db.insertDynamicObject(clientname, "communications", testelement);
            return mapCommunications([testelement], clientname)[0];
        }

        th.apiTests.put.defaultNegative(co.apis.communications, co.permissions.CRM_PERSONS, createPutTestCommunication);
        th.apiTests.put.clientDependentNegative(co.apis.communications, createPutTestCommunication);

        it('updates the communication and returns the updated entity', async() => {
            var originalelement = await createPutTestCommunication("client0");
            var elementupdate = { contact: "Ronny" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/${co.apis.communications}/${originalelement._id}?token=${token}`).send(elementupdate).expect(200);
            var elementFromDatabase = await Db.getDynamicObject("client0", "communications", originalelement._id);
            assert.strictEqual(elementFromDatabase.contact, elementupdate.contact);
        });

        it('does not change the person when a new personId is given', async() => {
            var originalelement = await createPutTestCommunication("client0");
            var elementupdate = { contact: "Ronny", personId: "client0_person1" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/${co.apis.communications}/${originalelement._id}?token=${token}`).send(elementupdate).expect(200);
            var elementFromDatabase = await Db.getDynamicObject("client0", "communications", originalelement._id);
            assert.strictEqual(elementFromDatabase.contact, elementupdate.contact);
            assert.strictEqual(elementFromDatabase.personname, originalelement.personId);
        });
        
    });

    describe('DELETE/:id', function() {

        async function getDeleteCommunicationId(clientname) {
            return clientname + "_communication0";
        }

        th.apiTests.delete.defaultNegative(co.apis.communications, co.permissions.CRM_PERSONS, getDeleteCommunicationId);
        th.apiTests.delete.clientDependentNegative(co.apis.communications, getDeleteCommunicationId);
        th.apiTests.delete.defaultPositive(co.apis.communications, co.collections.communications.name, getDeleteCommunicationId);
        
    });

});
