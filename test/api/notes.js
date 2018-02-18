/**
 * UNIT Tests for api/notes
 */
var assert = require('assert');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var bcryptjs = require('bcryptjs');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe.only('API notes', () => {

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    // Clear and prepare database with clients, user groups and users
    beforeEach(async () => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareNotes();
        await th.prepareRelations();
    });

    function compareNote(actualNote, expectedNote) {
        assert.ok(typeof(actualNote._id) !== "undefined");
        assert.ok(typeof(actualNote.clientId) !== "undefined");
        assert.ok(typeof(actualNote.content) !== "undefined");
        assert.strictEqual(actualNote._id, expectedNote._id);
        assert.strictEqual(actualNote.clientId, expectedNote.clientId);
        assert.strictEqual(actualNote.content, expectedNote.content);
    }

    function compareNotes(actualNotes, expectedNotes) {
        assert.strictEqual(actualNotes.length, expectedNotes.length);
        for (var i = 0; i < actualNotes.length; i++) compareNote(actualNotes[i], expectedNotes[i]);
    }

    describe('GET/', function(){

        th.apiTests.get.defaultNegative(co.apis.notes, co.permissions.OFFICE_NOTE); 
        
        it('responds with list of all notes of the client of the logged in user containing all details', async () => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var notesFromDatabase = (await Db.getDynamicObjects("client0", "notes")).map((n) => { return { _id: n.name, clientId: "client0", content: n.content } });
            var notesFromRequest = (await th.get(`/api/${co.apis.notes}?token=${token}`).expect(200)).body;
            compareNotes(notesFromRequest, notesFromDatabase);
        });
    });
    
    describe('GET/:id', function() {
        
        th.apiTests.getId.defaultNegative(co.apis.notes, co.permissions.OFFICE_NOTE, co.collections.notes.name);
        th.apiTests.getId.clientDependentNegative(co.apis.notes, co.collections.notes.name);

        it('responds with existing id with all details of the note', async () => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var noteFromDatabase = (await Db.getDynamicObject("client0", "notes", "client0_note0"));
            var noteFromApi = (await th.get(`/api/${co.apis.notes}/client0_note0?token=${token}`).expect(200)).body;
            compareNote(noteFromApi, { _id: noteFromDatabase.name, clientId: "client0", content: noteFromDatabase.content });
        });        
    });

    describe.only('GET/forIds', function(){

        function createTestNotes() {
            return db.get(co.collections.users.name).findOne({name:th.defaults.user}).then(function(user) {
                var clientId = user.clientId;
                var testObjects = ['testNoteContent1', 'testNoteContent2'].map(function(content) {
                    return {
                        content: content,
                        clientId: clientId
                    }
                });
                return Promise.resolve(testObjects);
            });
        }  
        
        th.apiTests.getForIds.defaultNegative(co.apis.notes, co.permissions.OFFICE_NOTE, co.collections.notes.name, createTestNotes);
        th.apiTests.getForIds.clientDependentNegative(co.apis.notes,  co.collections.notes.name, createTestNotes);

        it('returns a list of notes with all details for the given IDs', function() {
            var testNotesIds, insertedNotes;
            return createTestNotes().then(function(objects) {
                return th.bulkInsert(co.collections.notes.name, objects);
            }).then(function(objects) {
                insertedNotes = objects;
                testNotesIds = objects.map((to) => to._id.toString());
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.notes}/forIds?ids=${testNotesIds.join(',')}&token=${token}`).expect(200);
            }).then(function(response) {
                var notes = response.body;
                var idCount = insertedNotes.length;
                assert.equal(notes.length, idCount);
                for (var i = 0; i < idCount; i++) {
                    assert.strictEqual(notes[i]._id, insertedNotes[i]._id.toString());
                    assert.strictEqual(notes[i].content, insertedNotes[i].content);                    
                    assert.strictEqual(notes[i].clientId, insertedNotes[i].clientId.toString());
                }
                return Promise.resolve();
            });
        });   
    
    });
    
    describe('POST/', function() {

        function createPostTestNote() {
            var testObject = {
                content: 'content'                
            };
            return Promise.resolve(testObject);
        }
        th.apiTests.post.defaultNegative(co.apis.notes, co.permissions.OFFICE_NOTE, createPostTestNote);

        it('responds with correct data with inserted note containing an _id field', function() {
            var newNote, loginToken;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token) => {
                loginToken = token;
                return createPostTestNote();
            }).then(function(note) {
                newNote = note;
                return th.post(`/api/${co.apis.notes}?token=${loginToken}`).send(newNote).expect(200);
            }).then(function(response) {
                var noteFromApi = response.body;
                var keyCountFromApi = Object.keys(noteFromApi).length - 2; // _id and clientId is returned additionally
                var keys = Object.keys(newNote);
                var keyCountFromDatabase = keys.length; 
                assert.strictEqual(keyCountFromApi, keyCountFromDatabase);
                assert.strictEqual(newNote.content, noteFromApi.content);
                return Promise.resolve();
            });
        });

    });

    describe('PUT/:id' , function(){

        async function createPutTestNote() {
            var user = await th.defaults.getUser();
            return db.get(co.collections.notes.name).findOne({clientId: user.clientId}).then(function(note) {
                var testObject = {
                    _id: note._id.toString(),
                    content: 'New content'                    
                };
                return Promise.resolve(testObject);
            });
        }

        th.apiTests.put.defaultNegative(co.apis.notes, co.permissions.OFFICE_NOTE, createPutTestNote);
        th.apiTests.put.clientDependentNegative(co.apis.notes, createPutTestNote);

        it('responds with a correct note with the updated notes and its new properties', async function() {

            var updatedNote = {
                content: 'New content'
            };

            var user = await th.defaults.getUser();
            var token = await th.defaults.login(user.name);
            var noteFromDatabase = await db.get(co.collections.notes.name).findOne({clientId: user.clientId});
            var noteFromApi = (await th.put(`/api/${co.apis.notes}/${noteFromDatabase._id.toString()}?token=${token}`).send(updatedNote).expect(200)).body;
            assert.strictEqual(updatedNote.content, noteFromApi.content);           
            return Promise.resolve();           
        });
    });
    
    describe('DELETE/:id', function(){
        async function getDeleteNoteId() {
            var user = await th.defaults.getUser();
            return db.get(co.collections.notes.name).findOne({clientId: user.clientId}).then(function(note) {
                delete note._id;
                return db.get(co.collections.notes.name).insert(note);
            }).then(function(insertedNote) {
                return th.createRelationsToNote(co.collections.notes.name, insertedNote);
            }).then(function(insertedNote) {
                return Promise.resolve(insertedNote._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.notes, co.permissions.OFFICE_NOTE, getDeleteNoteId);
        th.apiTests.delete.clientDependentNegative(co.apis.notes, getDeleteNoteId);
        th.apiTests.delete.defaultPositive(co.apis.notes, co.collections.notes.name, getDeleteNoteId);

    });


});

