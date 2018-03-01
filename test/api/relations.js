/**
 * UNIT Tests for api/relations
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('API relations', () => {
    
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
        await th.preparePersons();
        await th.prepareRelations();
    });

    describe('GET/:entityType/:id', () => {

        var api = `${co.apis.relations}/persons`;

        th.apiTests.getId.defaultNegative(api, undefined, co.collections.relations.name, undefined, undefined, undefined, undefined, true);

        it('responds with an invalid entity type with an empty list', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var relations = (await th.get(`/api/${co.apis.relations}/invalidEntityType/client0_person0?token=${token}`).expect(200)).body;
            assert.strictEqual(relations.length, 0);
        });
        
        it('responds with an id where no entity of given entity type exists with empty list', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var relations = (await th.get(`/api/${co.apis.relations}/persons/invalidid?token=${token}`).expect(200)).body;
            assert.strictEqual(relations.length, 0);
        });

        it('returns all details of the relations belongs to a given type1/2', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var relations = (await th.get(`/api/${co.apis.relations}/persons/client0_person0?token=${token}`).expect(200)).body;
            assert.strictEqual(relations.length, 1);
            assert.ok(relations[0]._id);
            assert.strictEqual(relations[0].id1, "client0_person0");
            assert.strictEqual(relations[0].type1, "persons");
            assert.strictEqual(relations[0].id1, "client0_person0");
            assert.strictEqual(relations[0].type2, "persons");
         });

    });

    describe('POST/', () => {

        th.apiTests.post.defaultNegative(co.apis.relations, false, () => { return { type1: co.collections.activities.name, id1: "client0_activity0", type2: co.collections.persons.name, id2: "client0_person0" }});

        async function negativePostTest(postobject) {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.relations}?token=${token}`).send(postobject).expect(400);
        }
        
        it('responds with 400 when the relation has no attribute "type1"', async() => {
            await negativePostTest({ id1: "client0_activity0", type2: co.collections.persons.name, id2: "client0_person0" });
        });

        it('responds with 400 when the relation has no attribute "type2"', async() => {
            await negativePostTest({ type1: co.collections.activities.name, id1: "client0_activity0", id2: "client0_person0" });
        });

        it('responds with 400 when the relation has no attribute "id1"', async() => {
            await negativePostTest({ type1: co.collections.activities.name, type2: co.collections.persons.name, id2: "client0_person0" });
        });

        it('responds with 400 when the relation has no attribute "id2"', async() => {
            await negativePostTest({ type1: co.collections.activities.name, id1: "client0_activity0", type2: co.collections.persons.name });
        });

        it('responds with 400 when id1 is invalid', async() => {
            await negativePostTest({ type1: co.collections.activities.name, id1: "invalidid", type2: co.collections.persons.name, id2: "client0_person0" });
        });

        it('responds with 400 when id2 is invalid', async() => {
            await negativePostTest({ type1: co.collections.activities.name, id1: "client0_activity0", type2: co.collections.persons.name, id2: "invalidid" });
        });

        it('responds with 400 when type1 is invalid', async() => {
            await negativePostTest({ type1: "invalidtype", id1: "client0_activity0", type2: co.collections.persons.name, id2: "client0_person0" });
        });

        it('responds with 400 when type2 is invalid', async() => {
            await negativePostTest({ type1: co.collections.activities.name, id1: "client0_activity0", type2: "invalidtype", id2: "invalidid" });
        });

        it('responds with 200 and creates a relation between two entities of different types', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var relationtosend = { type1: co.collections.activities.name, id1: "client0_activity0", type2: co.collections.persons.name, id2: "client0_person0" };
            await th.post(`/api/${co.apis.relations}?token=${token}`).send(relationtosend).expect(200);
            var relationfromdatabase = await Db.getDynamicObject("client0", co.collections.relations.name, { datatype1name: co.collections.activities.name, name1: "client0_activity0", datatype2name: co.collections.persons.name, name2: "client0_person0" });
            assert.ok(relationfromdatabase);
        });

        it('responds with 200 and creates a relation between two entities of same types', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var relationtosend = { type1: co.collections.activities.name, id1: "client0_activity0", type2: co.collections.activities.name, id2: "client0_activity1" };
            await th.post(`/api/${co.apis.relations}?token=${token}`).send(relationtosend).expect(200);
            var relationfromdatabase = await Db.getDynamicObject("client0", co.collections.relations.name, { datatype1name: co.collections.activities.name, name1: "client0_activity0", datatype2name: co.collections.activities.name, name2: "client0_activity1" });
            assert.ok(relationfromdatabase);
        });  

        it('responds with 200 and creates a relation between the same entities (id1=id2 and type1=type2)', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var relationtosend = { type1: co.collections.activities.name, id1: "client0_activity0", type2: co.collections.activities.name, id2: "client0_activity0" };
            await th.post(`/api/${co.apis.relations}?token=${token}`).send(relationtosend).expect(200);
            var relationsfromdatabase = await Db.getDynamicObjects("client0", co.collections.relations.name, { datatype1name: co.collections.activities.name, name1: "client0_activity0", datatype2name: co.collections.activities.name, name2: "client0_activity0" });
            assert.strictEqual(relationsfromdatabase.length, 2); // Must be 2 because testhelper already created such a relation
        });

    });

    describe('DELETE/', () => {

        async function getDeleteRelationId() {
            return "client0_activities_client0_activity0_activities_client0_activity0";
        }

        th.apiTests.delete.defaultNegative(co.apis.relations, undefined, getDeleteRelationId);
        th.apiTests.delete.defaultPositive(co.apis.relations, co.collections.relations.name, getDeleteRelationId, true); // skip relations test

    });

});
