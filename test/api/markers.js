/**
 * UNIT Tests for api/markers
 */
var assert = require('assert');
var fs = require('fs');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');

describe('API markers', function() {

    var server = require('../../app');

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareMarkers();
    });

    describe('GET/', function() {

        // Positive tests

       it('returns a list of all markers of the client of the user', function(done) {
            testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) =>{
                db.get('clients').findOne({name :'1'}).then((clientFromDatabase)=>{
                    var clientId = clientFromDatabase._id;
                    db.get('users').findOne({name: '1_0_0'}).then((loggedinUser)=>{
                        db.get('markers').find({clientId:clientId}).then((allmarkersFromDatabase) =>{
                            superTest(server)
                            .get(`/api/markers?token=${token}`)
                            .expect(200)
                            .end(function(err, res){
                                if(err){
                                    done(err);
                                    return;
                                } 
                                var allmarkersFromApi = res.body;                                
                                if(res.body.clientId !=null)  
                                {
                                    assert.strictEqual(allmarkersFromApi.length, allmarkersFromDatabase.length, `Number of markers differ (${allmarkersFromApi.length} from API, ${allmarkersFromDatabase.length} in database)`);
                                    allmarkersFromDatabase.forEach((markerFromDatabase)=>{
                                        var markerFound = false;
                                        for(var i = 0; i< allmarkersFromApi.length; i++){
                                            var markerFromApi = allmarkersFromApi[i];
                                            if(markerFromApi._id !== markerFromDatabase._id.toString()){
                                                continue;
                                            }
                                            markerFound = true;
                                            Object.keys(markerFromDatabase).forEach((key)=>{
                                                var valueFromDatabase = markerFromDatabase[key].toString();
                                                var valueFromApi = markerFromApi[key].toString();
                                                assert.strictEqual(valueFromApi, valueFromDatabase, `${key} of marker ${markerFromApi._id} differs (${valueFromApi} from API, ${valueFromDatabase} in database)`);
                                            });
                                        }
                                        assert.ok(markerFound, `marker  was not returned by API`);
                                    });
                                }
                                done();                                  
                            });                        
                        }).catch(done);
                     });            
                 });
            });                 
        
        });
        
    });

    describe('POST/', function() {

        // Negative tests

        it('responds with 400 when marker has no attributes', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                var newMarker = {
                    lat:'',
                    lng:''
                }
                return superTest(server).post('/api/markers?token='+token).send(newMarker).expect(400);
            });
        });

        it('responds with 400 when attribute "lat" is not set', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                var newMarker = {
                    lat:''
                }
                return superTest(server).post('/api/markers?token='+token).send(newMarker).expect(400);
            });
        });

        it('responds with 400 when attribute "lng" is not set', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                var newMarker = {
                    lang:''
                }
                return superTest(server).post('/api/markers?token='+token).send(newMarker).expect(400);
            });
        });

        // Positive tests

        it('creates a marker and returns it including the _id', function(done) {
            testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{            
                var newMarker = {
                    lat: 'lat',
                    lng:'lng'
                }               
                superTest(server)
                    .post(`/api/markers?token=${token}`)
                    .send(newMarker)
                    .expect(200)
                    .end(function(err, res){
                        if(err){
                            done(err);
                            return;
                        }
                        var markerFromApi = res.body;                                      
                        db.get('markers').findOne(markerFromApi.id).then((markerafterCreation)=>{
                            assert.ok(markerafterCreation, 'New maker was not created');
                            assert.strictEqual(markerafterCreation.lat, markerFromApi.lat, 'Latitude  from Api and Database do not match');
                            assert.strictEqual(markerafterCreation.lng, markerFromApi.lng, 'longitude from Api and Database do not match');
                            done();
                        }).catch(done);
                    });
                });
          });

    });

    describe('DELETE/:id', function() {
        // Negative tests

        it('responds with an invalid id with 400', function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return superTest(server).del('/api/markers/invalidId?token=' + token).expect(400);
            });
        });
        
        it('responds with 404 when there is no marker for the given _id', function() {
            return db.get('markers').findOne({name: '1_0_0_1'}).then((markerFromDatabase)=>{
                return testHelpers.doLoginAndGetToken('1_0_0','test').then((token)=>{
                    return superTest(server).del('/api/markers/999999999999999999999999?token='+ token).send(markerFromDatabase).expect(404);
                });
            });
        });

        // Positive tests

       it('responds with 204', function(done) {
            db.get('markers').findOne({name: '1_0_0_1'}).then((markerFromDatabaseBeforeDeletion)=>{
                testHelpers.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                    var id = markerFromDatabaseBeforeDeletion._id;
                    superTest(server)
                        .del(`/api/markers/${id}?token=${token}`)
                        .expect(204)
                        .end(function(err, res){
                            if(err){
                                done(err);
                                return;                            
                            }
                            db.get('marker').findOne(id).then((markerFromDatabaseAfterDeletion) => {
                                assert.ok(!markerFromDatabaseAfterDeletion, 'The marker has not been deleted yet');
                                done();

                            }).catch(done);
                        });                    
                });
            });
        });
    
    });
});
