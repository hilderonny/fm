/**
 * UNIT Tests for api/activities
 */
var assert = require('assert');
var fs = require('fs');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');

describe('API activities', function() {

    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions)
            .then(th.prepareActivities)
            .then(th.prepareRelations);
    });

    describe('GET/', function() {

        // Negative tests

        it('responds without authentication with 403', function() {
            return th.get('/api/activities').expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'activities').then(function() {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return th.get('/api/activities?token='+token).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
             return th.removeClientModule('1', 'activities').then(function() {
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                    return th.get(`/api/activities?token=${token}`).expect(403);
                });
            });
        });

        it('responds without read permission with 403', function() {
            // Remove the corresponding permission
            return th.removeReadPermission('1_0_0', 'PERMISSION_OFFICE_ACTIVITY').then(function() {
                return th.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                    return th.get('/api/activities?token='+token).expect(403);
                    
                });
            });
        });

        // Positive tests

        it('returns all activities with all details of the users client where the user is creator or participant', function(done) {
           th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
               db.get('clients').findOne({name: '1'}).then((clientFromDatabase)=>{
                    var clientId = clientFromDatabase._id;                    
                    db.get('users').findOne({name:'1_0_0'}).then((loggedinUser)=>{
                        var userId = loggedinUser._id;                      
                        db.get('activities').find({ clientId: clientId, createdByUserId: userId
                        }).then((allactivitiesFromDatabase)=>{
                            th
                                .get(`/api/activities?token=${token}`)
                                .expect(200)
                                .end(function(err, res){
                                    if(err){
                                        done(err);
                                        return;
                                    }
                                    var allactivitiesFromApi = res.body;
                                    assert.strictEqual(allactivitiesFromApi.length, allactivitiesFromDatabase.length, `Number of activities differ (${allactivitiesFromApi.length} from API, ${allactivitiesFromDatabase.length} in database)` );
                                    allactivitiesFromDatabase.forEach((activityFromDatabase) => {
                                        var activityFound = false;
                                        for(var i = 0; i < allactivitiesFromApi.length; i++){
                                            var activityFromApi = allactivitiesFromApi[i];
                                            if(activityFromApi._id !== activityFromDatabase._id.toString()){
                                                continue;
                                            }
                                            activityFound = true;
                                            Object.keys(activityFromDatabase).forEach((key)=>{
                                                var valueFromDatabase = activityFromDatabase[key].toString();
                                                var valueFromApi = activityFromApi[key].toString();
                                                assert.strictEqual(valueFromApi, valueFromDatabase, `${key} of activity ${activityFromApi._id} differs (${valueFromApi} from API, ${valueFromDatabase} in database)`);
                                            });                                    
                                        }
                                        assert.ok(activityFound, `Activity "${activityFromDatabase.name}" was not returned by API`);
                                    });
                                    done();
                                });
                        }).catch(done);
                   });
                   
                });
            });       
        });

    });

    describe('GET/forIds', function() {

        // Negative tests

        it('responds without authentication with 403', function() {
            // Collect IDs
            return db.get('activities').find().then((allactivities)=>{
                var ids = allactivities.map(function(activity) { return activity._id.toString() }).join(',');
                return th.get(`/api/activities/forIds?ids=${ids}`).expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'activities').then(function() {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    return db.get('activities').find().then((allactivities)=>{
                        var ids = allactivities.map(function(activity) { return activity._id.toString() }).join(',');
                        return th.get(`/api/activities/forIds?token=${token}&ids=${ids}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'activities').then(function() {
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => {
                    return db.get('activities').find().then((allactivities)=>{
                        var ids = allactivities.map(function(activity) { return activity._id.toString() }).join(',');
                        return th.get(`/api/activities/forIds?token=${token}&ids=${ids}`).expect(403);
                    });
                });
            });
        });

        it('responds with empty list when user has no read permission', function(done) {
            th.removeReadPermission('1_0_0', 'PERMISSION_OFFICE_ACTIVITY').then(function() {
                th.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                    db.get('activities').find().then((allactivities)=>{
                        var ids = allactivities.map(function(activity) { return activity._id.toString() }).join(',');
                        th.get(`/api/activities/forIds?token=${token}&ids=${ids}`).expect(200).end(function(err, res){
                            var activitiesFromRequest = res.body;
                            assert.strictEqual(activitiesFromRequest.length, 0, `The returned array is not empty (${activitiesFromRequest.length} elements)`);
                            done();
                        });
                    }).catch(done);
                });
            });
        });

        it('responds with empty list when query parameter "ids" does not exist', function(done) {
            th.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                th.get(`/api/activities/forIds?token=${token}`).expect(200).end(function(err, res){
                    var activitiesFromRequest = res.body;
                    assert.strictEqual(activitiesFromRequest.length, 0, `The returned array is not empty (${activitiesFromRequest.length} elements)`);
                    done();
                });
            }).catch(done);
        });

        it('returns only elements of correct ids when parameter "ids" contains faulty IDs', function(done) {
            // Es werden von der API nur solche Termine geliefert, bei denen der Benutzer Ersteller oder Teilnehmer ist
            db.get('users').findOne({name:'1_0_0'}).then(function(user) {
                th.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                    db.get('clients').findOne({name:'1'}).then(function(client) {
                        db.get('activities').find({clientId:client._id, $or: [ { createdByUserId: user._id }, { participantUserIds: user._id } ]}).then((allactivities)=>{
                            var ids = allactivities.map(function(activity) { return activity._id.toString() }).join(',');
                            ids += ',faulty';
                            th.get(`/api/activities/forIds?token=${token}&ids=${ids}`).expect(200).end(function(err, res){
                                var activitiesFromRequest = res.body;
                                assert.strictEqual(activitiesFromRequest.length, allactivities.length, `API did not return correct number of elements (${activitiesFromRequest.length} from API, ${allactivities.length} in database)`);
                                done();
                            });
                        }).catch(done);
                    });
                });
            });
        });

        it('returns only elements of correct ids when parameter "ids" contains IDs where no entities exist for', function(done) {
            // Es werden von der API nur solche Termine geliefert, bei denen der Benutzer Ersteller oder Teilnehmer ist
            db.get('users').findOne({name:'1_0_0'}).then(function(user) {
                th.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                    db.get('clients').findOne({name:'1'}).then(function(client) {
                        db.get('activities').find({clientId:client._id, $or: [ { createdByUserId: user._id }, { participantUserIds: user._id } ]}).then((allactivities)=>{
                            var ids = allactivities.map(function(activity) { return activity._id.toString() }).join(',');
                            ids += ',999999999999999999999999';
                            th.get(`/api/activities/forIds?token=${token}&ids=${ids}`).expect(200).end(function(err, res){
                                var activitiesFromRequest = res.body;
                                assert.strictEqual(activitiesFromRequest.length, allactivities.length, `API did not return correct number of elements (${activitiesFromRequest.length} from API, ${allactivities.length} in database)`);
                                done();
                            });
                        }).catch(done);
                    });
                });
            });
        });

        it('returns only elements of the client of the logged in user when "ids" contains IDs of entities of another client', function(done) {
            // Es werden von der API nur solche Termine geliefert, bei denen der Benutzer Ersteller oder Teilnehmer ist
            db.get('users').findOne({name:'1_0_0'}).then(function(user) {
                th.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                    db.get('clients').findOne({name:'1'}).then(function(client) {
                        db.get('activities').find().then((allactivities)=>{
                            db.get('activities').find({clientId:client._id, $or: [ { createdByUserId: user._id }, { participantUserIds: user._id } ]}).then((allactivitiesofclient)=>{
                                var ids = allactivities.map(function(activity) { return activity._id.toString() }).join(',');
                                th.get(`/api/activities/forIds?token=${token}&ids=${ids}`).expect(200).end(function(err, res){
                                    var activitiesFromRequest = res.body;
                                    assert.strictEqual(activitiesFromRequest.length, allactivitiesofclient.length, `API did not return correct number of elements (${activitiesFromRequest.length} from API, ${allactivitiesofclient.length} in database)`);
                                    done();
                                });
                            }).catch(done);
                        });
                    });
                });
            });
        });

        // Positive tests

        it('returns a list of activities with all details for the given IDs', function(done) {
            // Es werden von der API nur solche Termine geliefert, bei denen der Benutzer Ersteller oder Teilnehmer ist
            db.get('users').findOne({name:'1_0_0'}).then(function(user) {
                th.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                    db.get('clients').findOne({name:'1'}).then(function(client) {
                        db.get('activities').find({clientId:client._id, $or: [ { createdByUserId: user._id }, { participantUserIds: user._id } ]}).then((allactivities)=>{
                            var ids = allactivities.map(function(activity) { return activity._id.toString() }).join(',');
                            th.get(`/api/activities/forIds?token=${token}&ids=${ids}`).expect(200).end(function(err, res){
                                var activitiesFromRequest = res.body;
                                assert.strictEqual(activitiesFromRequest.length, allactivities.length, `API did not return correct number of elements (${activitiesFromRequest.length} from API, ${allactivities.length} in database)`);
                                for (var i = 0; i < activitiesFromRequest.length; i++) {
                                    var activityFromRequest = activitiesFromRequest[i];
                                    var activityFromDatabase = allactivities[i];
                                    assert.strictEqual(activityFromRequest.date, activityFromDatabase.date, `The date in database does not match date in  API ("${activityFromDatabase.name}" vs. "${activityFromRequest.name}")`);
                                    assert.strictEqual(activityFromRequest.clientId, activityFromDatabase.clientId.toString(), `Activity client id in database does not match the one from API ("${activityFromDatabase.clientId}" vs. "${activityFromRequest.clientGroupId}")`);
                                    assert.strictEqual(activityFromRequest.createdByUserId, activityFromDatabase.createdByUserId.toString(), `Activity user id in database does not match the one from API ("${activityFromDatabase.createdByUserId}" vs. "${activityFromRequest.createdByUserId}")`);
                                    assert.strictEqual(activityFromRequest.name, activityFromDatabase.name, `Activity name in database does not match the name from API ("${activityFromDatabase.name}" vs. "${activityFromRequest.name}")`);
                                    assert.strictEqual(activityFromRequest.type, activityFromDatabase.type, `Activity type in database does not match the name from API ("${activityFromDatabase.type}" vs. "${activityFromRequest.type}")`);
                                }
                                done();
                            });
                        }).catch(done);
                    });
                });
            });
        });
    });

    describe('GET/:id', function() {

        // Negative tests

        it('responds without authentication with 403', function() {
            return db.get('activities').findOne({name: '1_0_0_0'}).then(function(activity) {
                return th.get('/api/activities/'+ activity._id.toString()).expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('activities').findOne({name: '1_0_0_0'}).then((activityFromDB) => {
                return th.removeClientModule('1', 'activities').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var id =activityFromDB._id;
                        return th.get(`/api/activities/${id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('activities').findOne({name: '1_0_0_0'}).then((activityFromDB) => {
                return th.removeClientModule('1', 'activities').then(function() {
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                         var id =activityFromDB._id;
                        return th.get(`/api/activities/${id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds without read permission with 403', function() {
            return db.get('activities').findOne({ name : '1_0_0_0' }).then((activityFromDatabase) => {
                // Remove the corresponding permission
                return th.removeReadPermission('1_0_0', 'PERMISSION_OFFICE_ACTIVITY').then(() => {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        return th.get(`/api/activities/${activityFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });


        it('responds with invalid id with 400', function() {
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return th.get('/api/activities/invalidId?token='+token).expect(400);
            });
        });
       
        it('responds with not existing id with 403', function() {
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                return th.get('/api/activities/999999999999999999999999?token='+token).expect(403);
            });
        });

        it('responds with 403 when the activity with the given _id does not belong to the client of the user', function() {
            return db.get('activities').findOne({name: '0_0_0_0'}).then((activity) =>{
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                var id= activity._id;
                return  th
                        .get(`/api/activities/${id}?token=${token}`)
                        .expect(403);
                });
            });
        }); 

        // Positive tests

        it('returns all details of the activity with the given _id', function(done) {
            db.get('activities').findOne({name:'1_0_0_0'}).then((activity) => {
                th.doLoginAndGetToken('1_0_0' , 'test').then((token)=>{
                    var id=activity._id;
                    th
                        .get(`/api/activities/${id}?token=${token}`)
                        .expect(200)
                        .end(function(err,res){
                            var activityFromRequest = res.body;
                            assert.strictEqual(activityFromRequest.date, activity.date, `The date in database does not match date in  API ("${activity.name}" vs. "${activityFromRequest.name}")`);
                            assert.strictEqual(activityFromRequest.clientId, activity.clientId.toString(), `Activity client id in database does not match the one from API ("${activity.clientId}" vs. "${activityFromRequest.clientGroupId}")`);
                            assert.strictEqual(activityFromRequest.createdByUserId, activity.createdByUserId.toString(), `Activity user id in database does not match the one from API ("${activity.createdByUserId}" vs. "${activityFromRequest.createdByUserId}")`);
                            assert.strictEqual(activityFromRequest.name, activity.name, `Activity name in database does not match the name from API ("${activity.name}" vs. "${activityFromRequest.name}")`);
                            assert.strictEqual(activityFromRequest.type, activity.type, `Activity type in database does not match the name from API ("${activity.type}" vs. "${activityFromRequest.type}")`);
                            done();
                        });
                }).catch(done);
            });
        });
     
        it('attribute "fullyEditable" is true when the user is the creator of the activity', function(done) {
            db.get('activities').findOne({name: '1_1_0_0'}).then((activity)=>{
                th.doLoginAndGetToken('1_1_0','test').then((token)=>{
                    var id = activity._id;
                    th
                        .get(`/api/activities/${id}?token=${token}`)
                        .expect(200)
                        .end(function(err,res){
                            var activityFromRequest = res.body;
                            assert.ok(activityFromRequest.fullyEditable, 'Flag fullyEditable is false but should be true');
                            done();
                        });
                }).catch(done);
            });
        });

        it('attribute "fullyEditable" is false when the user is only a participant of the activity', function(done) {
            th.addUserAsParticipantToActivity('1_0_0', '1_1_0_0').then(function(activity) {
                th.doLoginAndGetToken('1_0_0','test').then((token)=>{
                    var id = activity._id;
                    th
                        .get(`/api/activities/${id}?token=${token}`)
                        .expect(200)
                        .end(function(err,res){
                            var activityFromRequest = res.body;
                            assert.ok(!activityFromRequest.fullyEditable, 'Flag fullyEditable is true but should be false');
                            done();
                        });
                }).catch(done);
            });
        });

    });

    describe('POST/', function() {

        // Negative tests

        it('responds without authentication with 403', function() {           
            return th.post('/api/activities')
                .send({ name: 'name' })
                .expect(403);
        });

         it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'activities').then(function() {
                return db.get('activities').findOne({name: '1_1_0_1'}).then((activityFromDB) => {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var newActivity = { 
                            name: 'newName'
                        };
                        return th.post(`/api/activities?token=${token}`).send(newActivity).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'activities').then(function() {
                return db.get('activities').findOne({name: '1_1_0_1'}).then((activityFromDB) => {
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        var newActivity = { 
                            name: 'newName',
                        };
                        return th.post(`/api/activities?token=${token}`).send(newActivity).expect(403);
                    });
                });
            });
        });

        it('responds without write permission with 403', function() {
             // Remove the corresponding permission
            return th.removeWritePermission('1_0_0', 'PERMISSION_OFFICE_ACTIVITY').then(() => {
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var newActivity = { 
                        name: 'newActivity'
                    };
                    return th.post('/api/activities?token='+token).send(newActivity).expect(403);
                });
            });
        });

        it('responds with 400 when no activity is given', function() {
            return th.doLoginAndGetToken('_0_ADMIN0', 'test').then((token) => {
                return th.post('/api/activities?token=' + token).send().expect(400);
            });
        });

        // Positive tests

        it('creates the activity and sets the attribute "createdByUserId" to the _id of the user', function(done) {
            th.doLoginAndGetToken('1_0_0','test').then((token) => {
                var newActivity={
                    name:'newActivity'
                };
                th
                    .post('/api/activities?token='+token)
                    .send(newActivity)
                    .expect(200)
                    .end(function(err, res){
                        if(err){
                            done(err);
                            return;
                        }
                        var activityFromApi = res.body;
                        var id = res.body._id;                        
                        db.get('activities').findOne(id).then((activityafterCreation)=>{
                            assert.ok(activityafterCreation, 'New activity was not created');
                            assert.strictEqual(activityafterCreation.name, activityFromApi.name, 'Names from Api and Database do not match');
                            assert.strictEqual(activityafterCreation.createdByUserId.toString(), activityFromApi.createdByUserId, 'Creators of the Activity do not match');
                            done();
                        }).catch(done);
                    });
            });
        }); 

        it('creates the activity and sets only correct participantUserIds', function(done) {
            db.get('users').findOne({name:'1_0_ADMIN0'}).then((user_1_0_ADMIN0) =>{
                db.get('users').findOne({name:'1_1_0'}).then((user_1_1_0) =>{
                    th.doLoginAndGetToken('1_0_0','test').then((token) => {
                        var newActivity={
                            name:'newActivity',
                            participantUserIds: [ user_1_0_ADMIN0._id.toString(), 'faultyId', user_1_1_0._id.toString() ]
                        };
                        th.post('/api/activities?token='+token).send(newActivity).expect(200).end(function(err, res){
                            if(err){
                                done(err);
                                return;
                            }
                            var activityFromApi = res.body;
                            db.get('activities').findOne(activityFromApi._id).then((activityafterCreation)=>{
                                assert.ok(activityafterCreation, 'New activity was not created');
                                assert.strictEqual(activityafterCreation.participantUserIds.length, 2, 'Number of participant IDs is not correct');
                                assert.strictEqual(activityafterCreation.participantUserIds[0].toString(), user_1_0_ADMIN0._id.toString(), 'First participant does not match');
                                assert.strictEqual(activityafterCreation.participantUserIds[1].toString(), user_1_1_0._id.toString(), 'Second participant does not match');
                                done();
                            }).catch(done);
                        });
                    });
                });
            });
        }); 

    });

    describe('PUT/:id', function() {

        // Negative tests

        it('responds without authentication with 403', function() {
            return db.get('activities').findOne({name: '1_0_0_0'}).then((activity) => {
                var activityId = activity._id.toString();
                return th.put('/api/activities/'+activityId)
                    .send({ name: 'name'})
                    .expect(403);
            });
            
        });

       it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('activities').findOne({ name : '1_1_0_1' }).then((activity) => {
                return th.removeClientModule('1', 'activities').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var updatedActivity = {
                            name: 'newName'
                        };
                        return th.put(`/api/activities/${activity._id}?token=${token}`).send(updatedActivity).expect(403);
                    });
                });
            });
        });

       it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('activities').findOne({ name : '1_1_0_0' }).then((activity) => {
                return th.removeClientModule('1', 'activities').then(function() {
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then((token) => { // Has isAdmin flag
                        var updatedActivity = {
                            name: 'newName'
                        };
                        return th.put(`/api/activities/${activity._id}?token=${token}`).send(updatedActivity).expect(403);
                    });
                });
            });
        });

        it('responds without write permission with 403', function() {
            return db.get('activities').findOne({ name : '1_0_0_0' }).then((activity) => {
                // Remove the corresponding permission
                return th.removeWritePermission('1_0_0', 'PERMISSION_OFFICE_ACTIVITY').then(() => {
                    return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                        var updatedActivity = {
                            name: 'newName'
                        };
                        return th.put(`/api/activities/${activity._id}?token=${token}`).send(updatedActivity).expect(403);
                    });
                });
            });
        });


        it('responds with an invalid id with 400', function() {
            return th.doLoginAndGetToken('1_1_0', 'test').then((token) =>{
                return th
                    .put('/api/activities/invalidID?token='+token)
                    .expect(400);
            });
        });

        it('responds with an id that does not exist with 404', function() {
            return db.get('activities').findOne({name: '1_1_0_0'}).then((activity) =>{
            return th.doLoginAndGetToken('1_1_0', 'test').then((token) => {
                return  th
                        .put(`/api/activities/${activity._id}?token=${token}`)
                        .send()
                        .expect(400);
                });
            });
        });

        it('responds without giving data with 400', function() {
            return db.get('activities').findOne({name:'1_1_0_0'}).then((activity)=>{
                return th.doLoginAndGetToken('1_1_0', 'test').then((token)=>{
                    return th.put(`/api/activities/${activity._id}?token=${token}`).send().expect(400);
                });
            });
        });

        it('responds with entity with original _id when _id is given as parameter (_id cannot be changed)', function(done) {
            db.get('activities').findOne({name: '1_0_0_0'}).then((activity)=>{
                th.doLoginAndGetToken('1_0_0','test').then ((token)=>{
                    var updatedActivity = {
                        _id: '888888888888888888888888',
                        name: 'name'
                    };
                    th
                        .put(`/api/activities/${activity._id}?token=${token}`)
                        .send(updatedActivity)
                        .expect(200)
                        .end(function(err, res){
                            if(err){
                                done(err);
                                return;
                            }
                            var idFromApi = res.body._id;
                            assert.strictEqual(idFromApi, activity._id.toString(), `_id cannot be changed ("${idFromApi}" vs. "${activity._id}")`);
                            done();
                        });
                }).catch(done);

            });
        });


        it('responds with entity with original clientId when clientId is given as parameter (clientId cannot be changed)', function(done) {
            db.get('activities').findOne({name:'1_0_0_0'}).then((activity)=>{
                th.doLoginAndGetToken('1_0_0','test').then((token)=>{
                    var id= activity._id;
                    var updatedActivity ={
                        clientId: '888888888888888888888888',
                        name: 'newName'
                    };
                    th
                        .put(`/api/activities/${id}?token=${token}`)
                        .send(updatedActivity)
                        .expect(200)
                        .end(function(err, res){
                            if(err){
                                done(err);
                                return;
                            }
                            var idFromApi = res.body.clientId;
                            assert.strictEqual(idFromApi, activity.clientId.toString(), `ClientId cannot be changed ("${idFromApi}" vs. "${activity.clientId}")`);
                            done();
                        });
                }).catch(done);
            });        
        });

        it('responds with 403 when the activity with the given _id does not belong to the client of the user', function() {
            return db.get('activities').findOne({name: '0_0_0_0'}).then((activity) =>{
            return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                var id= activity._id.toString();
                return  th
                        .put(`/api/activities/${id}?token=${token}`)
                        .send()
                        .expect(403);
                });
            });

        });

        it('responds with 403 when the user is not the creator and tries to update the "date" attribute of the activity', function() {
             return db.get('activities').findOne({name: '1_1_0_0'}).then((activity) =>{
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var id=activity._id.toString();
                    var updatedActivity  = {
                        date:'newdate'
                    }
                    return th
                        .put(`/api/activities/${id}?token=${token}`)
                        .send(updatedActivity)
                        .expect(403);
                });
            });
        });

           it('responds with 403 when the user is not the creator and tries to update the "participantUserIds" attribute of the activity', function() {
            return db.get('activities').findOne({name: '1_1_0_0'}).then((activity) =>{
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var id=activity._id.toString();
                    var updatedActivity  = {
                        participantUserIds:'newparticipantUserIds'
                    }
                    return th
                        .put(`/api/activities/${id}?token=${token}`)
                        .send(updatedActivity)
                        .expect(403);
                });
            });

        });

        it('responds with 403 when the user is not the creator and tries to update the "task" attribute of the activity', function() {
            return db.get('activities').findOne({name: '1_1_0_0'}).then((activity) =>{
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var id=activity._id.toString();
                    var updatedActivity  = {
                        task:'newTask'
                    }
                    return th
                        .put(`/api/activities/${id}?token=${token}`)
                        .send(updatedActivity)
                        .expect(403);
                });
            });
            
        });

        it('responds with 403 when the user is not the creator and tries to update the "type" attribute of the activity', function() {
            return db.get('activities').findOne({name: '1_1_0_0'}).then((activity) =>{
                return th.doLoginAndGetToken('1_0_0', 'test').then((token) => {
                    var id=activity._id.toString();
                    var updatedActivity  = {
                        type:'newType'
                    }
                    return th
                        .put(`/api/activities/${id}?token=${token}`)
                        .send(updatedActivity)
                        .expect(403);
                });
            });
        });

        // Positive tests

        it('updates all attributes of the activity when the user is the creator', function(done) {
             db.get('activities').findOne({name: '1_0_0_0'}).then((activityFromDatabaseBeforeUpdate)=>{
                th.doLoginAndGetToken('1_0_0', 'test').then((token)=>{
                    var id= activityFromDatabaseBeforeUpdate._id;
                    var updatedActivity = {
                        name: 'newName',
                        type: 'newType',
                        task: 'newTask',
                        date: 'newDate'
                    };
                    th
                        .put(`/api/activities/${id}?token=${token}`)
                        .send(updatedActivity)
                        .expect(200)
                        .end(function(err, res){
                            if(err){
                                done(err);
                                return;
                            }
                            var activityFromApi = res.body;
                            db.get('activities').findOne(id).then((activityFromDatabaseAfterUpdate)=>{
                                assert.strictEqual(updatedActivity.name, activityFromDatabaseAfterUpdate.name, `name (${updatedActivity.name} from API, differs from name ${activityFromDatabaseAfterUpdate.name} in database)`);
                                assert.strictEqual(updatedActivity.type, activityFromDatabaseAfterUpdate.type, `type  (${updatedActivity.type} from API, differs from name ${activityFromDatabaseAfterUpdate.type} in database)` );
                                assert.strictEqual(updatedActivity.task, activityFromDatabaseAfterUpdate.task, `task  (${updatedActivity.type} from API, differs from name ${activityFromDatabaseAfterUpdate.type} in database)`);
                                assert.strictEqual(updatedActivity.date, activityFromDatabaseAfterUpdate.date, `date  (${updatedActivity.date} from API, differs from name ${activityFromDatabaseAfterUpdate.date} in database)`);
                                done();
                            }).catch(done);
                        });

                });

            });
        });

        it('updates all custom attributes (except date, participantUserIds, task and type) of the activity when the user is not the creator (no need to be a participant)', function(done) {
            db.get('activities').findOne({name:'1_1_0_0'}).then((activityFromDatabaseBeforeUpdate)=>{
                th.doLoginAndGetToken('1_0_0','test').then((token)=>{
                    var id = activityFromDatabaseBeforeUpdate._id;
                    var updatedActivity= {
                        name: 'newName'
                    };
                    th
                        .put(`/api/activities/${id}?token=${token}`)
                        .send(updatedActivity)
                        .expect(200)
                        .end(function(err, res){
                            if(err){
                                done(err);
                                return;
                            }
                            var activityFromApi = res.body;
                            db.get('activities').findOne(id).then((activityFromDatabaseAfterUpdate)=>{
                                assert.strictEqual(updatedActivity.name, activityFromDatabaseAfterUpdate.name, `name (${updatedActivity.name} from API, differs from name ${activityFromDatabaseAfterUpdate.name} in database)`);
                                done();
                            }).catch(done);                             
                        });
                });
            });
        });

    });

    describe('DELETE/:id', function() {

        function getDeleteActivityId() {
            return db.get(co.collections.activities.name).findOne({name:th.defaults.activity}).then(function(activity) {
                delete activity._id;
                activity.name = 'newActivity';
                return db.get(co.collections.activities.name).insert(activity);
            }).then(function(insertedActivity) {
                return th.createRelationsToActivity(co.collections.activities.name, insertedActivity);
            }).then(function(insertedActivity) {
                return Promise.resolve(insertedActivity._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.activities, co.permissions.OFFICE_ACTIVITY, getDeleteActivityId);
        th.apiTests.delete.clientDependentNegative(co.apis.activities, getDeleteActivityId);
        th.apiTests.delete.defaultPositive(co.apis.activities, co.collections.activities.name, getDeleteActivityId);
    
    });
});
