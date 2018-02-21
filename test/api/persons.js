/**
 * UNIT Tests for api/persons
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('API persons', function() {

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

    function comparePerson(actual, expected) {
        ["_id", "clientId", "firstname", "lastname", "description"].forEach((f) => {
            assert.ok(typeof(actual[f]) !== "undefined");
            assert.strictEqual(actual[f], expected[f]);
        });
    }

    function comparePersons(actual, expected) {
        assert.strictEqual(actual.length, expected.length);
        actual.sort((a, b) => { return a._id.localeCompare(b._id); });
        expected.sort((a, b) => { return a._id.localeCompare(b._id); });
        for (var i = 0; i < actual.length; i++) comparePerson(actual[i], expected[i]);
    }

    function mapPersons(elements, clientname) {
        return elements.map((e) => { return { _id: e.name, clientId: clientname, firstname: e.firstname, lastname: e.lastname, description: e.description } });
    }

    describe('GET/', function() {

        th.apiTests.get.defaultNegative(co.apis.persons, co.permissions.CRM_PERSONS);

        it('responds with list of all persons of the client of the logged in user containing all details', async () => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementsFromDatabase = mapPersons(await Db.getDynamicObjects("client0", "persons"), "client0");
            var elementsFromRequest = (await th.get(`/api/${co.apis.persons}?token=${token}`).expect(200)).body;
            comparePersons(elementsFromRequest, elementsFromDatabase);
        });

    });

    describe('GET/forIds', function() {

        async function createTestPersons(clientname) {
            var testElements = [
                { name: clientname + "_testperson0", firstname: "fn0", lastname: "ln0", description: "d0" },
                { name: clientname + "_testperson1", firstname: "fn0", lastname: "ln0", description: "d0" }
            ];
            await Db.insertDynamicObject(clientname, "persons", testElements[0]);
            await Db.insertDynamicObject(clientname, "persons", testElements[1]);
            return mapPersons(testElements, clientname);
        }

        th.apiTests.getForIds.defaultNegative(co.apis.persons, co.permissions.CRM_PERSONS, co.collections.persons.name, createTestPersons);
        th.apiTests.getForIds.clientDependentNegative(co.apis.persons, co.collections.persons.name, createTestPersons);
        th.apiTests.getForIds.defaultPositive(co.apis.persons, co.collections.persons.name, createTestPersons);

    });

    describe('GET/:id', function() {

        th.apiTests.getId.defaultNegative(co.apis.persons, co.permissions.CRM_PERSONS, co.collections.persons.name);
        th.apiTests.getId.clientDependentNegative(co.apis.persons, co.collections.persons.name);

        it('responds with existing id with all details of the person', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var elementId = "client0_person0";
            var elementFromDatabase = mapPersons([await Db.getDynamicObject("client0", "persons", elementId)], "client0")[0];
            var elementFromApi = (await th.get(`/api/${co.apis.persons}/${elementId}?token=${token}`).expect(200)).body;
            comparePerson(elementFromApi, elementFromDatabase);
        });
        
    });

    describe('POST/', function() {

        function createPostTestPerson() {
            return { firstname: "fn", lastname: "ln", description: "d" };
        }

        th.apiTests.post.defaultNegative(co.apis.persons, co.permissions.CRM_PERSONS, createPostTestPerson);
        th.apiTests.post.defaultPositive(co.apis.persons, co.collections.persons.name, createPostTestPerson, mapPersons);

    });

    describe('PUT/:id', function() {

        async function createPutTestPerson(clientname) {
            var testelement = { name: clientname + "_testperson0", firstname: "fn", lastname: "ln", description: "d" };
            await Db.insertDynamicObject(clientname, "persons", testelement);
            return mapPersons([testelement], clientname)[0];
        }

        th.apiTests.put.defaultNegative(co.apis.persons, co.permissions.CRM_PERSONS, createPutTestPerson);
        th.apiTests.put.clientDependentNegative(co.apis.persons, createPutTestPerson);

        it('responds with a correct person with the updated person and its new properties', async() => {
            var originalelement = await createPutTestPerson("client0");
            var elementupdate = { firstname: "newfirstname" };
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.put(`/api/${co.apis.persons}/${originalelement._id}?token=${token}`).send(elementupdate).expect(200);
            var elementFromDatabase = await Db.getDynamicObject("client0", "persons", originalelement._id);
            assert.strictEqual(elementFromDatabase.firstname, elementupdate.firstname);
        });
        
    });

    describe('DELETE/:id', function() {

        async function getDeletePersonId(clientname) {
            return clientname + "_person0";
        }

        th.apiTests.delete.defaultNegative(co.apis.persons, co.permissions.CRM_PERSONS, getDeletePersonId);
        th.apiTests.delete.clientDependentNegative(co.apis.persons, getDeletePersonId);
        th.apiTests.delete.defaultPositive(co.apis.persons, co.collections.persons.name, getDeletePersonId);

        it('also deletes all communications of the person', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var id = "client0_person0";
            await th.del(`/api/${co.apis.persons}/${id}?token=${token}`).expect(204);
            var communications = await Db.getDynamicObjects("client0", "communications", { personname: id });
            assert.strictEqual(communications.length, 0);
        });
        
    });

});
