/**
 * UNIT Tests for api/relations
 */
var assert = require('assert');
var fs = require('fs');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');

describe('API relations', function() {
    
    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.prepareActivities)
            .then(th.preparePermissions)
            .then(th.prepareRelations);
    });

    describe('GET/', function() {

        it('responds with 404', function() {
            return th.get(`/api/${co.apis.relations}`).expect(404);
        });

    });

    describe('GET/:entityType/:id', function() {

        function createGetTestRelation() {
            return th.createRelation(co.collections.activities.name, th.defaults.activity, co.collections.users.name, th.defaults.user).then(function(preparedRelation) {
                return db.get(co.collections.relations.name).insert(preparedRelation);
            });
        }

        it('responds without authentication with 403', function() {
            return createGetTestRelation().then(function(createdRelation) {
                return th.get(`/api/${co.apis.relations}/${createdRelation.type1}/${createdRelation.id1.toString()}`).expect(403);
            });
        });

        function checkForUser(user) {
            return function() {
                var relationFromDatabase;
                var moduleName = th.getModuleForApi(co.apis.relations);
                return th.removeClientModule(th.defaults.client, moduleName).then(function() {
                    return createGetTestRelation();
                }).then(function(createdRelation) {
                    relationFromDatabase = createdRelation;
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
                }).then(function(token) {
                    return th.get(`/api/${co.apis.relations}/${relationFromDatabase.type1}/${relationFromDatabase.id1.toString()}?token=${token}`).expect(403);
                });
            }
        }
        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser(th.defaults.user));
        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser(th.defaults.adminUser));

        it('responds with an invalid id with 400', function() {
            var relationFromDatabase;
            return createGetTestRelation().then(function(createdRelation) {
                relationFromDatabase = createdRelation;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.relations}/${relationFromDatabase.type1}/invalidId?token=${token}`).expect(400);
            });
        });

        it('responds with an invalid entity type with an empty list', function() {
            var relationFromDatabase;
            return createGetTestRelation().then(function(createdRelation) {
                relationFromDatabase = createdRelation;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.relations}/invalidEntityType/${relationFromDatabase.id1.toString()}?token=${token}`).expect(200);
            }).then(function(response) {
                var relations = response.body;
                assert.ok(Array.isArray(relations));
                assert.strictEqual(relations.length, 0);
                return Promise.resolve();
            });
        });
        
        it('responds with an id where no entity of given entity type exists with empty list', function() {
            var relationFromDatabase;
            return createGetTestRelation().then(function(createdRelation) {
                relationFromDatabase = createdRelation;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.relations}/${relationFromDatabase.type1}/999999999999999999999999?token=${token}`).expect(200);
            }).then(function(response) {
                var relations = response.body;
                assert.ok(Array.isArray(relations));
                assert.strictEqual(relations.length, 0);
                return Promise.resolve();
            });
        });

        it('responds with empty list when the relation for the given entityType and id does not belong to the client of the user', function() {
            var relationFromDatabase;
            return createGetTestRelation().then(function(createdRelation) {
                relationFromDatabase = createdRelation;
                return th.doLoginAndGetToken(th.defaults.otherUser, th.defaults.password);
            }).then(function(token) {
                return th.get(`/api/${co.apis.relations}/${relationFromDatabase.type1}/${relationFromDatabase.id1.toString()}?token=${token}`).expect(200);
            }).then(function(response) {
                var relations = response.body;
                assert.ok(Array.isArray(relations));
                assert.strictEqual(relations.length, 0);
                return Promise.resolve();
            });
        });

        it('returns all details of the realtion belongs to a given type1/2', function() {
            var relationFromDatabase, linkedrelationFromDatabase;
            return createGetTestRelation().then(function(createdRelation){
                relationFromDatabase=createdRelation; 
                return db.get(co.apis.relations).find({type1:relationFromDatabase.type1,id1:relationFromDatabase.id1}).then(function(listrelationFromDatabse){                    
                    linkedrelationFromDatabase=listrelationFromDatabse;
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
                }).then(function(token){
                    return th.get(`/api/${co.apis.relations}/${relationFromDatabase.type1}/${relationFromDatabase.id1.toString()}?token=${token}`).expect(200);                    
                }).then(function(response){
                    var allrelationFromApi = response.body;                   
                    assert.strictEqual(allrelationFromApi.length, linkedrelationFromDatabase.length,`Number of relation differ (${allrelationFromApi.length} from API, ${linkedrelationFromDatabase.length} in database)` )
                    for(var i=0; i<allrelationFromApi.length; i++){
                        var relationFromApi = allrelationFromApi[i];
                        var relationFromDatabase = linkedrelationFromDatabase[i];
                        assert.strictEqual(relationFromApi.id1, relationFromDatabase.id1.toString(), `The id1 in database does not match id1 in  API ("${relationFromDatabase.id1}" vs. "${relationFromApi.id1}")`);
                        assert.strictEqual(relationFromApi.id2, relationFromDatabase.id2.toString(), `Id2 in database does not match the one from API ("${relationFromDatabase.id2}" vs. "${relationFromApi.id2}")`);
                        assert.strictEqual(relationFromApi.type1, relationFromDatabase.type1, `type1 user id in database does not match the one from API ("${relationFromDatabase.type1}" vs. "${relationFromApi.type1}")`);
                        assert.strictEqual(relationFromApi.type2, relationFromDatabase.type2, `type2 name in database does not match the name from API ("${relationFromDatabase.type2}" vs. "${relationFromApi.type2}")`);                    

                    }
                    return Promise.resolve();
                });
            });    
         });

    });

    describe('POST/', function() {

        function createPostTestRelation() {
            return th.createRelation(co.collections.activities.name, th.defaults.activity, co.collections.users.name, th.defaults.user);
        }

        th.apiTests.post.defaultNegative(co.apis.relations, false, createPostTestRelation);
        
        it('responds with 400 when the relation has no attribute "type1"', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token)=>{
                return createPostTestRelation().then((preparedRelation) =>{
                    delete preparedRelation.type1;
                    return th.post(`/api/${co.apis.relations}?token=${token}`).send(preparedRelation).expect(400);

                });
            });
        });

        it('responds with 400 when the relation has no attribute "type2"', function() {
             return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token)=>{
                return createPostTestRelation().then((preparedRelation) =>{
                    delete preparedRelation.type2;
                    return th.post(`/api/${co.apis.relations}?token=${token}`).send(preparedRelation).expect(400);
                });
            });
        });

        it('responds with 400 when the relation has no attribute "id1"', function() {
             return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token)=>{
                return createPostTestRelation().then((preparedRelation) =>{
                    delete preparedRelation.id1;
                    return th.post(`/api/${co.apis.relations}?token=${token}`).send(preparedRelation).expect(400);

                });
            });
        });

        it('responds with 400 when the relation has no attribute "id2"', function() {
             return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token)=>{
                return createPostTestRelation().then((preparedRelation) =>{
                    delete preparedRelation.id2;
                    return th.post(`/api/${co.apis.relations}?token=${token}`).send(preparedRelation).expect(400);

                });
            });
        });

        it('responds with 400 when id1 is invalid', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token)=>{
                return createPostTestRelation().then((preparedRelation) =>{
                    preparedRelation.id1 = 'invalid';
                    return th.post(`/api/${co.apis.relations}?token=${token}`).send(preparedRelation).expect(400);
               });
            });
        });

        it('responds with 400 when id2 is invalid', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token)=>{
                return createPostTestRelation().then((preparedRelation) =>{
                    preparedRelation.id2 = 'invalid';
                    return th.post(`/api/${co.apis.relations}?token=${token}`).send(preparedRelation).expect(400);
               });
            });
        });

        it('responds with 404 when there is no type1 entity for the given id1', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token)=>{
                return createPostTestRelation().then((preparedRelation)=>{
                    return db.get('clients').findOne({name: '1'}).then((client)=>{
                        preparedRelation.id1 = client._id;
                        return th.post(`/api/${co.apis.relations}?token=${token}`).send(preparedRelation).expect(404);
                    });
                });
            });
        });

        it('responds with 404 when there is no type2 entity for the given id2', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token)=>{
                return createPostTestRelation().then((preparedRelation)=>{
                    return db.get('clients').findOne({name: '1'}).then((client)=>{
                        preparedRelation.id2 = client._id;
                        return th.post(`/api/${co.apis.relations}?token=${token}`).send(preparedRelation).expect(404);
                    });
                });
            });
        });

        it('responds with 403 when the type1 entity for the given id1 does not belong to the client of the user', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token)=>{
                return th.createRelation(co.collections.activities.name, '0_0_0_0', co.collections.users.name, th.defaults.user).then((preparedRelation)=>{
                    return th.post(`/api/${co.apis.relations}?token=${token}`).send(preparedRelation).expect(403);
                });
            });
        });

        it('responds with 403 when the type2 entity for the given id2 does not belong to the client of the user', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then((token)=>{
                return th.createRelation(co.collections.activities.name, th.defaults.activity, co.collections.users.name, '0_0_0').then((preparedRelation)=>{
                    return th.post(`/api/${co.apis.relations}?token=${token}`).send(preparedRelation).expect(403);
                });
            });
        });

        // Positive tests

        it('responds with 200 and creates a relation between two entities of different types', function() {
            var preparedRelation;
            return createPostTestRelation().then(function(relation) {
                preparedRelation = relation;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                var newRelation = {
                    type1: preparedRelation.type1,
                    type2: preparedRelation.type2,
                    id1: preparedRelation.id1.toString(),
                    id2: preparedRelation.id2.toString()
                };
                return th.post(`/api/${co.apis.relations}?token=${token}`).send(newRelation).expect(200);
            }).then(function(response) {
                var relationFromApi = response.body; 
                db.get(co.collections.relations.name).findOne(relationFromApi._id).then((relationAfterCreation)=>{
                    assert.ok(relationAfterCreation, 'New Relation wasn not created');
                    assert.strictEqual(relationAfterCreation.type1, relationFromApi.type1,`type1 (${relationFromApi.type1} from API, differs from type1 ${relationAfterCreation.type1} in database)` );
                    assert.strictEqual(relationAfterCreation.id1.toString(), relationFromApi.id1.toString(),`Id1 (${relationFromApi.id1} from API, differs from id1 ${relationAfterCreation.id1} in database)`  );
                    assert.strictEqual(relationAfterCreation.id2.toString(), relationFromApi.id2.toString(),`Id2 (${relationFromApi.id2} from API, differs from id2 ${relationAfterCreation.id2} in database)`  );
                    assert.strictEqual(relationAfterCreation.type2, relationFromApi.type2,`type2 (${relationFromApi.type2} from API, differs from type2 ${relationAfterCreation.type2} in database)` );  
                });                
                return Promise.resolve();
            });           
        });

        it('responds with 200 and creates a relation between two entities of same types', function() {
            var preparedRelation;
            return th.createRelation(co.collections.activities.name, th.defaults.activity, co.collections.activities.name, '1_0_0_1').then(function(relation) {
                preparedRelation = relation;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                var newRelation = {
                    type1: preparedRelation.type1,
                    type2: preparedRelation.type2,
                    id1: preparedRelation.id1.toString(),
                    id2: preparedRelation.id2.toString()
                };
                return th.post(`/api/${co.apis.relations}?token=${token}`).send(newRelation).expect(200);
            }).then(function(response) {
                var relationFromApi = response.body; 
                db.get(co.collections.relations.name).findOne(relationFromApi._id).then(function(relationAfterCreation){
                    assert.ok(relationAfterCreation, 'New Relation wasn not created');
                    assert.strictEqual(relationAfterCreation.type1, relationFromApi.type2,`type1 (${relationFromApi.type2} from API, differs from type2 ${relationAfterCreation.type1} in database)` );
                    assert.strictEqual(relationAfterCreation.id1.toString(), relationFromApi.id1.toString(),`Id1 (${relationFromApi.id1} from API, differs from id1 ${relationAfterCreation.id1} in database)`  );
                    assert.strictEqual(relationAfterCreation.id2.toString(), relationFromApi.id2.toString(),`Id2 (${relationFromApi.id2} from API, differs from id2 ${relationAfterCreation.id2} in database)`  );
                    assert.strictEqual(relationAfterCreation.type2, relationFromApi.type1,`type2 (${relationFromApi.type1} from API, differs from type2 ${relationAfterCreation.type2} in database)` );                    
                });                
                return Promise.resolve();
            });
        });  

        it('responds with 200 and creates a relation between the same entities (id1=id2 and type1=type2)', function() {
            var preparedRelation;
            return th.createRelation(co.collections.activities.name, th.defaults.activity, co.collections.activities.name, th.defaults.activity).then(function(relation) {
                preparedRelation = relation;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                var newRelation = {
                    type1: preparedRelation.type1,
                    type2: preparedRelation.type2,
                    id1: preparedRelation.id1.toString(),
                    id2: preparedRelation.id2.toString()
                };
                return th.post(`/api/${co.apis.relations}?token=${token}`).send(newRelation).expect(200);
            }).then(function(response) {
                var relationFromApi = response.body; 
                db.get(co.collections.relations.name).findOne(relationFromApi._id).then(function(relationAfterCreation){
                    assert.ok(relationAfterCreation, 'New Relation wasn not created');
                    assert.strictEqual(relationAfterCreation.type1, relationFromApi.type2,`type1 (${relationFromApi.type2} from API, differs from type2 ${relationAfterCreation.type1} in database)` );
                    assert.strictEqual(relationAfterCreation.id1.toString(), relationFromApi.id2.toString(),`Id1 (${relationFromApi.id2} from API, differs from id1 ${relationAfterCreation.id1} in database)`  );
                    assert.strictEqual(relationAfterCreation.id2.toString(), relationFromApi.id1.toString(),`Id2 (${relationFromApi.id1} from API, differs from id2 ${relationAfterCreation.id2} in database)`  );
                    assert.strictEqual(relationAfterCreation.type2, relationFromApi.type1,`type2 (${relationFromApi.type1} from API, differs from type2 ${relationAfterCreation.type2} in database)` );
                });                
                return Promise.resolve();
            });        
        });

        it('responds with 200 but does not create a relation between two entities where a relation already exists', function() {
            var relationFromDatabase;
            return createPostTestRelation().then(function(preparedRelation) {
                return db.get(co.collections.relations.name).insert(preparedRelation);
            }).then(function(createdRelation) {
                relationFromDatabase = createdRelation;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                var newRelation = {
                    type1: relationFromDatabase.type1,
                    type2: relationFromDatabase.type2,
                    id1: relationFromDatabase.id1.toString(),
                    id2: relationFromDatabase.id2.toString()
                };
                return th.post(`/api/${co.apis.relations}?token=${token}`).send(newRelation).expect(200);
            }).then(function(response) {
                assert.strictEqual(response.body._id, relationFromDatabase._id.toString());
                return Promise.resolve();
            });
        });
    });

    describe('PUT/', function() {

        it('responds with 404', function() { 
            var relationFromDatabase;
            return th.createRelation(co.collections.activities.name, th.defaults.activity, co.collections.users.name, th.defaults.user).then(function(preparedRelation) {
                return db.get(co.collections.relations.name).insert(preparedRelation);
            }).then(function(createdRelation) {
                relationFromDatabase = createdRelation;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                var updatedRelation = {
                    type1: co.collections.activities.name
                };                                
                return th.put(`/api/${co.apis.relations}/${relationFromDatabase._id.toString()}?token=${token}`).send(updatedRelation).expect(404);
            });              
        });
    });

    describe('DELETE/', function() {

        function getDeleteRelationId() {
            return th.createRelation(co.collections.activities.name, th.defaults.activity, co.collections.users.name, th.defaults.user).then(function(preparedRelation) {
                return db.get(co.collections.relations.name).insert(preparedRelation);
            }).then(function(createdRelation) {
                return Promise.resolve(createdRelation._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.relations, false, getDeleteRelationId);
        th.apiTests.delete.clientDependentNegative(co.apis.relations, getDeleteRelationId);
        th.apiTests.delete.defaultPositive(co.apis.relations, co.collections.relations.name, getDeleteRelationId, true);

    });

});
