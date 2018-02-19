/**
 * UNIT Tests for api/persons
 */
var assert = require('assert');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var bcryptjs =  require('bcryptjs');
var co = require('../../utils/constants');

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
        await th.prepareBusinessPartners();
        await th.preparePartnerAddresses();
        await th.prepareRelations();
    });

    describe('GET/', function() {

        th.apiTests.get.defaultNegative(co.apis.persons, co.permissions.CRM_PERSONS);

        it('responds with list of all persons of the client of the logged in user containing all details', function() {
            var persons;
            // We use client 1
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                return th.get(`/api/${co.apis.persons}?token=${token}`).expect(200);
            }).then(function(response){
                persons = response.body;
                assert.strictEqual(persons.length, 2);
                return db.get(co.collections.users.name).findOne({name: th.defaults.user});
            }).then((currentUser) => {
                var currentUserClientId = currentUser.clientId.toString();
                persons.forEach((person) => {
                    ['firstname', 'clientId', 'lastname', 'description'].forEach((propertyName) => {
                        assert.ok(typeof(person[propertyName]) !== 'undefined');
                    });
                    // Check clientId for correctness
                    assert.strictEqual(person.clientId, currentUserClientId);
                });
                return Promise.resolve();
            });
        });

    });

    describe('GET/forIds', function() {

        function createTestPersons() {
            return db.get(co.collections.clients.name).findOne({name:th.defaults.client}).then(function(client) {
                var clientId = client._id;
                var testObjects = ['testPerson1', 'testPerson2', 'testPerson3'].map(function(name) {
                    return {
                        firstname: 'First',
                        lastname: name,
                        description: 'Beschreibung',
                        clientId: clientId
                    }
                });
                return Promise.resolve(testObjects);
            });
        }

        th.apiTests.getForIds.defaultNegative(co.apis.persons, co.permissions.CRM_PERSONS, co.collections.persons.name, createTestPersons);
        th.apiTests.getForIds.clientDependentNegative(co.apis.persons, co.collections.persons.name, createTestPersons);

        it('returns a list of persons with all details for the given IDs', function() {
            var testPersonIds, insertedPersons;
            return createTestPersons().then(function(objects) {
                return th.bulkInsert(co.collections.persons.name, objects);
            }).then(function(objects) {
                insertedPersons = objects;
                testPersonIds = objects.map((to) => to._id.toString());
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.persons}/forIds?ids=${testPersonIds.join(',')}&token=${token}`).expect(200);
            }).then(function(response) {
                var persons = response.body;
                var idCount = insertedPersons.length;
                assert.equal(persons.length, idCount);
                for (var i = 0; i < idCount; i++) {
                    assert.strictEqual(persons[i]._id, insertedPersons[i]._id.toString());
                    assert.strictEqual(persons[i].firstname, insertedPersons[i].firstname);
                    assert.strictEqual(persons[i].lastname, insertedPersons[i].lastname);
                    assert.strictEqual(persons[i].description, insertedPersons[i].description);
                    assert.strictEqual(persons[i].clientId, insertedPersons[i].clientId.toString());
                }
                return Promise.resolve();
            });
        });
    });

    describe('GET/:id', function() {

        th.apiTests.getId.defaultNegative(co.apis.persons, co.permissions.CRM_PERSONS, co.collections.persons.name);
        th.apiTests.getId.clientDependentNegative(co.apis.persons, co.collections.persons.name);

        it('responds with existing id with all details of the person', function() {
            var personFromDatabase;
            return db.get(co.collections.persons.name).findOne({lastname: '1_0'}).then(function(person) {
                personFromDatabase = person;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.persons}/${personFromDatabase._id}?token=${token}`).expect(200);
            }).then(function(response) {
                var personFromApi = response.body;
                assert.strictEqual(personFromApi.name, personFromDatabase.name);
                assert.strictEqual(personFromApi.firstname, personFromDatabase.firstname);
                assert.strictEqual(personFromApi.lastname, personFromDatabase.lastname);
                assert.strictEqual(personFromApi.description, personFromDatabase.description);
                assert.strictEqual(personFromApi.clientId, personFromDatabase.clientId.toString());
                return Promise.resolve();
            });
        });
        
    });

    describe('POST/', function() {

        function createPostTestPerson() {
            var testObject = {
                firstname: 'New First',
                lastname: 'New Last',
                description: 'Beschreibung'
            };
            return Promise.resolve(testObject);
        }

        th.apiTests.post.defaultNegative(co.apis.persons, co.permissions.CRM_PERSONS, createPostTestPerson);
        
        it('responds with correct data with inserted person containing an _id field', function() {
            var newPerson, loginToken;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                loginToken = token;
                return createPostTestPerson();
            }).then(function(person) {
                newPerson = person;
                return th.post(`/api/${co.apis.persons}?token=${loginToken}`).send(newPerson).expect(200);
            }).then(function(response) {
                var personFromApi = response.body;
                var keyCountFromApi = Object.keys(personFromApi).length - 2; // _id and clientId is returned additionally
                var keys = Object.keys(newPerson);
                var keyCountFromDatabase = keys.length; 
                assert.strictEqual(keyCountFromApi, keyCountFromDatabase);
                assert.strictEqual(newPerson.firstname, personFromApi.firstname);
                assert.strictEqual(newPerson.lastname, personFromApi.lastname);
                assert.strictEqual(newPerson.description, personFromApi.description);
                return Promise.resolve();
            });
        });

    });

    describe('PUT/:id', function() {

        function createPutTestPerson() {
            return db.get(co.collections.persons.name).findOne({lastname:th.defaults.person}).then(function(person) {
                var testObject = {
                    _id: person._id.toString(),
                    firstname: 'New First',
                    lastname: 'New Last',
                    description: 'Beschreibung'
                };
                return Promise.resolve(testObject);
            });
        }

        th.apiTests.put.defaultNegative(co.apis.persons, co.permissions.CRM_PERSONS, createPutTestPerson);
        th.apiTests.put.clientDependentNegative(co.apis.persons, createPutTestPerson);

        it('responds with a correct person with the updated person and its new properties', function() {
            var updatedPerson = {
                firstname: 'Updated First',
                lastname: 'Updated Last',
                description: 'Updated Beschreibung'
            };
            var personFromDatabase;
            return db.get(co.collections.persons.name).findOne({lastname: th.defaults.person}).then(function(user) {
                person = user;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.put(`/api/${co.apis.persons}/${person._id.toString()}?token=${token}`).send(updatedPerson).expect(200);
            }).then(function(response) {
                var personFromApi = response.body;
                assert.strictEqual(updatedPerson.firstname, personFromApi.firstname);
                assert.strictEqual(updatedPerson.lastname, personFromApi.lastname);
                assert.strictEqual(updatedPerson.description, personFromApi.description);
                return Promise.resolve();
            });
        });
        
    });

    describe('DELETE/:id', function() {

        function getDeletePersonId() {
            return db.get(co.collections.persons.name).findOne({lastname:th.defaults.person}).then(function(person) {
                delete person._id;
                person.lastname = 'person to delete';
                return db.get(co.collections.persons.name).insert(person);
            }).then(function(insertedPerson) {
                return th.createRelationsToPerson(co.collections.persons.name, insertedPerson);
            }).then(function(insertedPerson) {
                return Promise.resolve(insertedPerson._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.persons, co.permissions.CRM_PERSONS, getDeletePersonId);
        th.apiTests.delete.clientDependentNegative(co.apis.persons, getDeletePersonId);
        th.apiTests.delete.defaultPositive(co.apis.persons, co.collections.persons.name, getDeletePersonId);

        it('also deletes all communications of the person', function() {
            var personId;
            return db.get(co.collections.persons.name).findOne({lastname:th.defaults.person}).then(function(bp) {
                personId = bp._id;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then((token) => {
                return th.del(`/api/${co.apis.persons}/${personId.toString()}?token=${token}`).expect(204);
            }).then(() => {
                return db.get(co.collections.communications.name).find({personId:personId});
            }).then((communications) => {
                assert.equal(communications.length, 0);
                return Promise.resolve();
            });
        });
        
    });

});
