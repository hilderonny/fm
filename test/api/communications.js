/**
 * UNIT Tests for api/communications
 */
var assert = require('assert');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var bcryptjs =  require('bcryptjs');
var co = require('../../utils/constants');

describe('API communications', function() {

    // Clear and prepare database with clients, user groups and users
    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions)
            .then(th.preparePersons)
            .then(th.preparePersonCommunications)
            .then(th.prepareRelations);
    });

    describe('GET/forPerson/:id', function() {

        var api = co.apis.communications + '/forPerson';
        th.apiTests.getId.defaultNegative(api, co.permissions.CRM_PERSONS, co.collections.persons.name);
        th.apiTests.getId.clientDependentNegative(api, co.collections.persons.name);
        
        it('returns all communications for the given person', function() {
            var personFromDatabase, communicationsFromDatabase;
            return db.get(co.collections.persons.name).findOne({lastname: th.defaults.person}).then(function(person) {
                personFromDatabase = person;
                return db.get(co.collections.communications.name).find({personId: person._id});
            }).then((communications) => {
                communicationsFromDatabase = communications;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.communications}/forPerson/${personFromDatabase._id}?token=${token}`).expect(200);
            }).then(function(response) {
                var communicationsFromRequest = response.body;
                assert.strictEqual(communicationsFromRequest.length, communicationsFromDatabase.length);
                for (var i = 0; i < communicationsFromDatabase.length; i++) {
                    assert.strictEqual(communicationsFromRequest[i]._id, communicationsFromDatabase[i]._id.toString());
                    assert.strictEqual(communicationsFromRequest[i].medium, communicationsFromDatabase[i].medium);
                    assert.strictEqual(communicationsFromRequest[i].contact, communicationsFromDatabase[i].contact);
                    assert.strictEqual(communicationsFromRequest[i].type, communicationsFromDatabase[i].type);
                }
                return Promise.resolve();
            });
            
        });

    });

    describe('GET/:id', function() {

        th.apiTests.getId.defaultNegative(co.apis.communications, co.permissions.CRM_PERSONS, co.collections.communications.name);
        th.apiTests.getId.clientDependentNegative(co.apis.communications, co.collections.communications.name);
         
        it('returns the communication with all details for the given id', function() {
            var communicationFromDatabase;
            return db.get(co.collections.communications.name).findOne({contact: th.defaults.personCommunication}).then((communication) => {
                communicationFromDatabase = communication;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.communications}/${communicationFromDatabase._id}?token=${token}`).expect(200);
            }).then(function(response) {
                var communicationFromRequest = response.body;
                assert.strictEqual(communicationFromRequest._id, communicationFromDatabase._id.toString());
                ['medium', 'contact', 'type'].forEach((k) => {
                    assert.strictEqual(communicationFromRequest[k], communicationFromDatabase[k]);
                });
                return Promise.resolve();
            });
        });
       
    });

    describe('POST/', function() {

        function createPostTestCommunication() {
            return db.get(co.collections.persons.name).findOne({lastname:th.defaults.person}).then(function(person) {
                var testObject = {
                    medium: 'email',
                    contact: 'Kontakt',
                    type: 'work',
                    personId: person._id.toString()
                };
                return Promise.resolve(testObject);
            });
        }

        th.apiTests.post.defaultNegative(co.apis.communications, co.permissions.CRM_PERSONS, createPostTestCommunication);
                
        it('responds without giving a personId with 400', function() {
            var communicationToSend;
            return createPostTestCommunication().then((communication) => {
                communicationToSend = communication;
                delete communicationToSend.personId;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post(`/api/${co.apis.communications}?token=${token}`).send(communicationToSend).expect(400);
            });
        });
                
        it('responds with not existing personId with 400', function() {
            var communicationToSend;
            return createPostTestCommunication().then((communication) => {
                communicationToSend = communication;
                communicationToSend.personId = '999999999999999999999999';
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post(`/api/${co.apis.communications}?token=${token}`).send(communicationToSend).expect(400);
            });
        });
        
        xit('responds with 400 when the person of the communication does not belong to the same client as the logged in user', function() {

        });

        it('responds with correct data with inserted communication containing an _id field', function() {
            var communicationToSend;
            return createPostTestCommunication().then((communication) => {
                communicationToSend = communication;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post(`/api/${co.apis.communications}?token=${token}`).send(communicationToSend).expect(200);
            }).then((response) => {
                var communicationFromApi = response.body;
                assert.ok(communicationFromApi._id);
                ['medium', 'contact', 'type'].forEach((k) => {
                    assert.strictEqual(communicationFromApi[k], communicationToSend[k]);
                });
            });
        });

    });

    describe('PUT/:id', function() {

        function createPutTestCommunication() {
            return db.get(co.collections.communications.name).findOne({contact:th.defaults.personCommunication}).then(function(communication) {
                var testObject = {
                    _id: communication._id.toString(),
                    medium: 'phone',
                    contact: 'New Contact',
                    type: 'other',
                    personId: communication.personId.toString()
                };
                return Promise.resolve(testObject);
            });
        }

        th.apiTests.put.defaultNegative(co.apis.communications, co.permissions.CRM_PERSONS, createPutTestCommunication);
        th.apiTests.put.clientDependentNegative(co.apis.communications, createPutTestCommunication);

        it('updates the communication and returns the updated entity', function() {
            var communicationToSend;
            return createPutTestCommunication().then((communication) => {
                communicationToSend = communication;
                communicationToSend.medium = 'email';
                communicationToSend.contact = 'updated contact';
                communicationToSend.type = 'work';
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.put(`/api/${co.apis.communications}/${communicationToSend._id.toString()}?token=${token}`).send(communicationToSend).expect(200);
            }).then((response) => {
                var communicationFromApi = response.body;
                Object.keys(communicationToSend).forEach((k) => {
                    assert.strictEqual(communicationFromApi[k], communicationToSend[k]);
                });
            });
        });

        it('does not change the person when a new personId is given', function() {
            var communicationToSend, newPersonId;
            return db.get(co.collections.persons.name).findOne({lastname:'1_1'}).then((person) => {
                newPersonId = person._id.toString();
                return createPutTestCommunication();
            }).then((communication) => {
                communicationToSend = communication;
                communicationToSend.personId = newPersonId;
                communicationToSend.medium = 'email';
                communicationToSend.contact = 'updated contact';
                communicationToSend.type = 'work';
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.put(`/api/${co.apis.communications}/${communicationToSend._id.toString()}?token=${token}`).send(communicationToSend).expect(200);
            }).then((response) => {
                var communicationFromApi = response.body;
                assert.notEqual(communicationFromApi.personId, newPersonId);
            });
        });
        
    });

    describe('DELETE/:id', function() {

        function getDeleteCommunicationId() {
            return db.get(co.collections.communications.name).findOne({contact:th.defaults.personCommunication}).then(function(communication) {
                delete communication._id;
                communication.medium = 'email';
                return db.get(co.collections.communications.name).insert(communication);
            }).then(function(insertedCommunication) {
                return Promise.resolve(insertedCommunication._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.communications, co.permissions.CRM_PERSONS, getDeleteCommunicationId);
        th.apiTests.delete.clientDependentNegative(co.apis.communications, getDeleteCommunicationId);
        th.apiTests.delete.defaultPositive(co.apis.communications, co.collections.communications.name, getDeleteCommunicationId, true);
        
    });

});
