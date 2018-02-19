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

    describe('GET/forIds', function(){

        async function createTestNotes(clientname) {
            var testNotes = [
                { name: clientname + "_testnote0", content: "content0" },
                { name: clientname + "_testnote1", content: "content1" }
            ];
            await Db.insertDynamicObject(clientname, "notes", testNotes[0]);
            await Db.insertDynamicObject(clientname, "notes", testNotes[1]);
            return testNotes.map((n) => { return { _id: n.name, clientId: clientname, content: n.content } });
        }  
        
        th.apiTests.getForIds.defaultNegative(co.apis.notes, co.permissions.OFFICE_NOTE, co.collections.notes.name, createTestNotes);
        th.apiTests.getForIds.clientDependentNegative(co.apis.notes,  co.collections.notes.name, createTestNotes);
        th.apiTests.getForIds.defaultPositive(co.apis.notes,  co.collections.notes.name, createTestNotes);
    
    });
    
    describe.only('POST/', function() {

        function createPostTestNote() {
            var testObject = {
                content: 'content'                
            };
            return testObject;
        }

        th.apiTests.post.defaultNegative(co.apis.notes, co.permissions.OFFICE_NOTE, createPostTestNote);
        th.apiTests.post.defaultPositive(co.apis.notes, co.collections.notes.name, createPostTestNote);

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

