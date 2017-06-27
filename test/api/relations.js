/**
 * UNIT Tests for api/relations
 */
var assert = require('assert');
var fs = require('fs');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');
var async = require('async');

describe('API relations', function() {

    var server = require('../../app');
    
    beforeEach(() => {
        return testHelpers.cleanDatabase()
            .then(testHelpers.prepareClients)
            .then(testHelpers.prepareClientModules)
            .then(testHelpers.prepareUserGroups)
            .then(testHelpers.prepareUsers)
            .then(testHelpers.prepareActivities)
            .then(testHelpers.preparePermissions)
            .then(testHelpers.prepareRelations);
    });

    describe('GET/', function() {

        it('responds with 404', function() {
            return superTest(server).get('/api/relations').expect(404);
        });

    });

    describe('/:entityType/:id', function() {

        xit('responds without authentication with 403', function() {
        });

        xit('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        });

        xit('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        });

        xit('responds with an invalid id with 400', function() {
        });

        xit('responds with an invalid entity type with an empty list', function() {
        });
        
        xit('responds with an id where no entity of given entity type exists with 403', function() {
        });

        xit('responds with 403 when the entity of the given entity type with a given id does not belong to the client of the user', function() {
        });

        it('returns all details of the realtion belongs to a given type1/2', function() {
            var relationFromDatabase, linkedrelationFromDatabase;
            return testHelpers.createRelation('activities', '1_0_0_0', 'users', '1_0_0').then(function(preparedRelation){
                return db.get('relations').insert(preparedRelation);
            }).then(function(createdRelation){
                relationFromDatabase=createdRelation; 
                return db.get('relations').find({type1:relationFromDatabase.type1,id1:relationFromDatabase.id1}).then(function(listrelationFromDatabse){                    
                    linkedrelationFromDatabase=listrelationFromDatabse;
                    return testHelpers.doLoginAndGetToken('1_0_0','test');
                }).then(function(token){
                    return superTest(server).get(`/api/relations/${relationFromDatabase.type1}/${relationFromDatabase.id1}?token=${token}`).expect(200);                    
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

        // Negative tests

        it('responds without authentication with 403', function() {
            return testHelpers.createRelation('activities', '1_0_0_1', 'users', '1_0_0').then((preparedRelation) => {                       
                return superTest(server).post(`/api/relations`).send(preparedRelation).expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return testHelpers.removeClientModule('1', 'base').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                    return testHelpers.createRelation('activities', '1_0_0_1', 'users', '1_0_0').then((preparedRelation) => {                       
                        return superTest(server).post(`/api/relations?token=${token}`).send(preparedRelation).expect(403);
                    });
                });              
            });  
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return testHelpers.removeClientModule('1', 'base').then(function() {
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token)=>{
                    return testHelpers.createRelation('activities', '1_0_0_1', 'users', '1_0_0').then((preparedRelation) => {                       
                        return superTest(server).post(`/api/relations?token=${token}`).send(preparedRelation).expect(403);
                    });
                });              
            });  
        });

        
        it('responds with 400 when the relation has no attribute "type1"', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                return testHelpers.createRelation('activities', '1_0_0_1', 'users', '1_0_0').then((preparedRelation) =>{
                    delete preparedRelation.type1;
                    return superTest(server).post(`/api/relations?token=${token}`).send(preparedRelation).expect(400);

                });
            });
        });

        it('responds with 400 when the relation has no attribute "type2"', function() {
             return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                return testHelpers.createRelation('activities', '1_0_0_1', 'users', '1_0_0').then((preparedRelation) =>{
                    delete preparedRelation.type2;
                    return superTest(server).post(`/api/relations?token=${token}`).send(preparedRelation).expect(400);
                });
            });
        });

        it('responds with 400 when the relation has no attribute "id1"', function() {
             return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                return testHelpers.createRelation('activities', '1_0_0_1', 'users', '1_0_0').then((preparedRelation) =>{
                    delete preparedRelation.id1;
                    return superTest(server).post(`/api/relations?token=${token}`).send(preparedRelation).expect(400);

                });
            });
        });

        it('responds with 400 when the relation has no attribute "id2"', function() {
             return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                return testHelpers.createRelation('activities', '1_0_0_1', 'users', '1_0_0').then((preparedRelation) =>{
                    delete preparedRelation.id2;
                    return superTest(server).post(`/api/relations?token=${token}`).send(preparedRelation).expect(400);

                });
            });
        });

        it('responds with 400 when id1 is invalid', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                return testHelpers.createRelation('activities', '1_0_0_1', 'users', '1_0_0').then((preparedRelation) =>{
                    preparedRelation.id1 = 'invalid';
                    return superTest(server).post(`/api/relations?token=${token}`).send(preparedRelation).expect(400);
               });
            });
        });

        it('responds with 400 when id2 is invalid', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                return testHelpers.createRelation('activities', '1_0_0_1', 'users', '1_0_0').then((preparedRelation) =>{
                    preparedRelation.id2 = 'invalid';
                    return superTest(server).post(`/api/relations?token=${token}`).send(preparedRelation).expect(400);
               });
            });
        });

        it('responds with 404 when there is no type1 entity for the given id1', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                return testHelpers.createRelation('activities', '1_0_0_1', 'users', '1_0_0').then((preparedRelation)=>{
                    return db.get('clients').findOne({name: '1'}).then((client)=>{
                        preparedRelation.id1 = client._id;
                        return superTest(server).post(`/api/relations?token=${token}`).send(preparedRelation).expect(404);
                    });
                });
            });
        });

        it('responds with 404 when there is no type2 entity for the given id2', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                return testHelpers.createRelation('activities', '1_0_0_1', 'users', '1_0_0').then((preparedRelation)=>{
                    return db.get('clients').findOne({name: '1'}).then((client)=>{
                        preparedRelation.id2 = client._id;
                        return superTest(server).post(`/api/relations?token=${token}`).send(preparedRelation).expect(404);
                    });
                });
            });
        });

        it('responds with 403 when the type1 entity for the given id1 does not belong to the client of the user', function() {
            return testHelpers.doLoginAndGetToken('1_0_0','test').then((token)=>{
                return testHelpers.createRelation('activities', '0_0_0_0', 'users', '1_0_0').then((preparedRelation)=>{
                    return superTest(server).post(`/api/relations?token=${token}`).send(preparedRelation).expect(403);
                });
            });
        });

        it('responds with 403 when the type2 entity for the given id2 does not belong to the client of the user', function() {
            return testHelpers.doLoginAndGetToken('1_0_0','test').then((token)=>{
                return testHelpers.createRelation('activities', '1_0_0_0', 'users', '0_0_0').then((preparedRelation)=>{
                    return superTest(server).post(`/api/relations?token=${token}`).send(preparedRelation).expect(403);
                });
            });
        });

        // Positive tests

        it('responds with 200 and creates a relation between two entities of different types', function() {
            var relationFromDatabase;
            return testHelpers.createRelation('activities', '1_0_0_0', 'users', '1_0_0').then(function(preparedRelation) {
                return db.get('relations').insert(preparedRelation);
            }).then(function(createdRelation) {
                relationFromDatabase = createdRelation;
                return testHelpers.doLoginAndGetToken('1_0_0','test');
            }).then(function(token) {
                var newRelation = {
                    type1: relationFromDatabase.type1,
                    type2: relationFromDatabase.type2,
                    id1: relationFromDatabase.id1.toString(),
                    id2: relationFromDatabase.id2.toString()
                };
                return superTest(server).post(`/api/relations?token=${token}`).send(newRelation).expect(200);
            }).then(function(response) {
                var relationFromApi = response.body; 
                db.get('relations').findOne(relationFromApi._id).then((relationAfterCreation)=>{
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
              var relationFromDatabase;
            return testHelpers.createRelation('activities', '1_0_0_0', 'activities', '1_0_0_1').then(function(preparedRelation) {
                return db.get('relations').insert(preparedRelation);
            }).then(function(createdRelation) {
                relationFromDatabase = createdRelation;
                return testHelpers.doLoginAndGetToken('1_0_0','test');
            }).then(function(token) {
                var newRelation = {
                    type1: relationFromDatabase.type1,
                    type2: relationFromDatabase.type2,
                    id1: relationFromDatabase.id1.toString(),
                    id2: relationFromDatabase.id2.toString()
                };
                return superTest(server).post(`/api/relations?token=${token}`).send(newRelation).expect(200);
            }).then(function(response) {
                var relationFromApi = response.body; 
                db.get('relations').findOne(relationFromApi._id).then(function(relationAfterCreation){
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
            var relationFromDatabase;
            return testHelpers.createRelation('activities', '1_0_0_0', 'activities', '1_0_0_0').then(function(preparedRelation) {
                return db.get('relations').insert(preparedRelation);
            }).then(function(createdRelation) {
                relationFromDatabase = createdRelation;
                return testHelpers.doLoginAndGetToken('1_0_0','test');
            }).then(function(token) {
                var newRelation = {
                    type1: relationFromDatabase.type1,
                    type2: relationFromDatabase.type2,
                    id1: relationFromDatabase.id1.toString(),
                    id2: relationFromDatabase.id2.toString()
                };
                return superTest(server).post(`/api/relations?token=${token}`).send(newRelation).expect(200);
            }).then(function(response) {
                var relationFromApi = response.body; 
                db.get('relations').findOne(relationFromApi._id).then(function(relationAfterCreation){
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
            return testHelpers.createRelation('activities', '1_0_0_0', 'users', '1_0_0').then(function(preparedRelation) {
                return db.get('relations').insert(preparedRelation);
            }).then(function(createdRelation) {
                relationFromDatabase = createdRelation;
                return testHelpers.doLoginAndGetToken('1_0_0','test');
            }).then(function(token) {
                var newRelation = {
                    type1: relationFromDatabase.type1,
                    type2: relationFromDatabase.type2,
                    id1: relationFromDatabase.id1.toString(),
                    id2: relationFromDatabase.id2.toString()
                };
                return superTest(server).post(`/api/relations?token=${token}`).send(newRelation).expect(200);
            }).then(function(response) {
                assert.strictEqual(response.body._id, relationFromDatabase._id.toString());
                return Promise.resolve();
            });
        });
    });

    describe('PUT/', function() {

        it('responds with 404', function() { 
            return db.get('relations').findOne({type1: 'clients'}).then((relation)=>{
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{                 
                    var id = relation._id;
                    var updatedRelation={
                        type1:'activities'
                    };                                
                    return superTest(server).put(`/api/relations/${id}?token=${token}`).send(updatedRelation).expect(404);
                });
            });              
        });
    });

    describe('DELETE/', function() {

        // Negative tests
        it('responds without authentication with 403', function() {           
             return db.get('relations').findOne({type1:'activities'}).then((relation) => {                       
                return superTest(server).del('/api/relations/' + relation._id.toString()).expect(403);
            });           
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            var relationFromDatabase;
            return testHelpers.createRelation('activities', '1_0_0_0', 'users', '1_0_0').then(function(preparedRelation){
                return db.get('relations').insert(preparedRelation);
            }).then(function(createdRelation){
                relationFromDatabase=createdRelation;
                return testHelpers.removeClientModule('1','base').then(function(){
                    return testHelpers.doLoginAndGetToken('1_1_0','test');
                }).then(function(token){
                    return superTest(server).del(`/api/relations/${relationFromDatabase._id}?token=${token}`).expect(403);                    
                });
            });            
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            var relationFromDatabase;
            return testHelpers.createRelation('activities', '1_0_0_0', 'users', '1_0_0').then(function(preparedRelation){
                return db.get('relations').insert(preparedRelation);
            }).then(function(createdRelation){
                relationFromDatabase=createdRelation;
                return testHelpers.removeClientModule('1','base').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0','test');
                }).then(function(token){
                    return superTest(server).del(`/api/relations/${relationFromDatabase._id}?token=${token}`).expect(403);                    
                });
            });    
           
        });

        it('responds with an invalid id with 400', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return superTest(server).del('/api/relations/invalidId?token=' + token).expect(400);
            });
        });
        
        it('responds with an id where no relation exists with 403', function() {
            var relationFromDatabase;
            return testHelpers.createRelation('activities', '1_0_0_0', 'users', '1_0_0').then(function(preparedRelation){
                return db.get('relations').insert(preparedRelation);
            }).then(function(createdRelation){
                relationFromDatabase=createdRelation;
                return testHelpers.doLoginAndGetToken('1_0_0','test');              
            }).then(function(token){
                return superTest(server).del('/api/relations/999999999999999999999999?token=' + token).expect(403); 
            });         
        });
        it('responds with 403 when the relations with a given id does not belong to the client of the user', function() {
            var relationFromDatabase;
            return testHelpers.createRelation('activities', '1_0_0_0', 'users', '1_0_0').then(function(preparedRelation){
                return db.get('relations').insert(preparedRelation);
            }).then(function(createdRelation){
                relationFromDatabase=createdRelation;
                return testHelpers.doLoginAndGetToken('0_0_0','test');              
            }).then(function(token){
                return superTest(server).del(`/api/relations/${relationFromDatabase._id}?token=${token}`).expect(403); 
            });    
        });
           
       // Positive tests

        it('responds with 204 after successfully deleting the relation', function() {
             var relationFromDatabase;
            return testHelpers.createRelation('activities', '1_0_0_0', 'users', '1_0_0').then(function(preparedRelation) {
                return db.get('relations').insert(preparedRelation);
            }).then(function(createdRelation) {
                relationFromDatabase = createdRelation;
                return testHelpers.doLoginAndGetToken('1_0_0','test');
            }).then(function(token) {              
                return superTest(server).del(`/api/relations/${relationFromDatabase._id}?token=${token}`).expect(204);
            }).then(function(response) {
                return db.get('relations').findOne(relationFromDatabase._id);
            }).then(function(relationFromDatabaseAfterDeletion){
                assert.ok(!relationFromDatabaseAfterDeletion, 'The relation has not been deleted yet');
                return Promise.resolve();               
            });
                
        });
    });

});
