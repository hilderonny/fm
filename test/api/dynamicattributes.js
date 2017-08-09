/**
 * UNIT Tests for api/dynamicattributes
 */
var assert = require('assert');
var superTest = require('supertest');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var bcryptjs =  require('bcryptjs');
var co = require('../../utils/constants');

describe.only('API dynamicattributes', function() {

    var optionApi = `${co.apis.dynamicattributes}/option`;
    var optionsApi = `${co.apis.dynamicattributes}/options`;
    var typesApi = `${co.apis.dynamicattributes}/types`;
    
    // Clear and prepare database with clients, user groups and users
    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions)
            .then(th.prepareFolders)
            .then(th.prepareDocuments)
            .then(th.prepareDynamicAttributes)
            .then(th.prepareDynamicAttributeOptions)
            .then(th.prepareDynamicAttributeValues);
    });

    describe('GET/:id', function() {

        th.apiTests.getId.defaultNegative(co.apis.dynamicattributes, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, co.collections.dynamicattributes.name);
        th.apiTests.getId.clientDependentNegative(co.apis.dynamicattributes, co.collections.dynamicattributes.name);

        it('responds with all details of the dynamic attribute', function(done) {
            db.get(co.collections.dynamicattributes.name).findOne({type: 'picklist'}).then(function(attributeFromDB){
                th.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                    th.get(`/api/dynamicattributes/${attributeFromDB._id}?token=${token}`).then(function(res, err){
                        if(err){return done(err);}
                        var attributeFromApi = res.body;
                        //console.log(attributeFromApi);
                        //TODO implement actual comparisson between attributeFromDB and attributeFromApi
                        done();
                    });
                });
            });
        });

    });

    describe('GET/model/:modelName', function() {

        it('responds without authentication with 403', function() {
            var modelName = 'users';
            return th.get(`/api/dynamicattributes/model/${modelName}`).expect(403);
        });

        it('responds without read permission with 403', function() {
            // Remove the corresponding permission
            return th.removeReadPermission('1_0_0', co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES).then(function() {
                return th.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                    var modelName = 'users';
                    return th.get(`/api/dynamicattributes/model/${modelName}?token=${token}`).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'base').then(function(){
                return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    var modelName = 'users';
                    return th.get(`/api/dynamicattributes/model/${modelName}?token=${token}`).expect(403);
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'base').then(function(){
                return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                    var modelName = 'users';
                    return th.get(`/api/dynamicattributes/model/${modelName}?token=${token}`).expect(403);
                });
            });
        });
    
        it('responds without giving a modelName with 400', function() {
            return th.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                return th.get(`/api/dynamicattributes/model?token=${token}`).expect(400);
            });
        });
        
        it('responds with invalid modelName with 400', function() {
            return th.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                var modelName = 'fakeName';
                return th.get(`/api/dynamicattributes/model/${modelName}?token=${token}`).expect(400);
            });
        });

        xit('responds where no dyanmic attributes exist for the given modelName with an empty list', function() {
        });

        xit('responds with a list containing all dynamic attributes of the given modelName', function() {
        });

    });

    describe('GET/option/:id', function() {

        th.apiTests.getId.defaultNegative(optionApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, co.collections.dynamicattributeoptions.name);
        th.apiTests.getId.clientDependentNegative(optionApi, co.collections.dynamicattributeoptions.name);

        it('responds with all details of the dynamic attribute option', function(done) {
            db.get(co.collections.dynamicattributes.name).findOne({type: 'picklist'}).then(function(attributeFromDB){
                db.get('dynamicattributeoptions').findOne({dynamicAttributeId: attributeFromDB._id}).then(function(attributeOptionFromDB){
                    th.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                        th.get(`/api/dynamicattributes/option/${attributeOptionFromDB._id}?token=${token}`).then(function(res, err){
                            if(err){return done(err);}
                            var attributeOptionFromApi = res.body;
                            //console.log(attributeOptionFromApi);
                            //TODO implement actual comparisson
                            done();     
                        });
                    });
                });
            });
        });

    });

    describe('GET/options/:id', function() {

        th.apiTests.getId.defaultNegative(optionsApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, co.collections.dynamicattributes.name);
        th.apiTests.getId.clientDependentNegative(optionsApi, co.collections.dynamicattributes.name);

        it('responds with a list of all options and their details of the dynamic attribute', function(done) {
            db.get('clients').findOne({name: '0'}).then(function(client0){
                db.get(co.collections.dynamicattributes.name).findOne({type: 'picklist', clientId: client0._id}).then(function(attributeFromDB){
                    db.get('dynamicattributeoptions').find({dynamicAttributeId: attributeFromDB._id}).then(function(OptionsFromDB){
                        testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ //user from client 0
                            superTest(server).get(`/api/dynamicattributes/options/${attributeFromDB._id}?token=${token}`).then(function(res, err){
                                if(err){return done(err);}
                                var OptionsFromApi = res.body;
                                console.log(OptionsFromApi);
                                console.log('Test fails for now :(');
                                //TODO implement actual comparisson 
                                done();
                            });
                        });    
                    });
                });
            });
        });

    });

    describe('GET/types', function() {

        th.apiTests.get.defaultNegative(typesApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES);

        xit('responds with a list of all possible dynamic attribute types', function() {
        });

    });

    describe('GET/values/:modelName/:id', function() {

        it('responds without authentication with 403', function() {
            return db.get('users').findOne({name: '1_0_0'}).then(function(userFromDB){
                return th.get(`/api/dynamicattributes/values/users/${userFromDB._id}`).expect(403);
            });
        });

        it('responds without read permission with 403', function() {
            return th.removeReadPermission('1_0_0', co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES).then(function(){
                return db.get('users').findOne({name: '1_0_0'}).then(function(userFromDB){
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return th.get(`/api/dynamicattributes/values/users/${userFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'base').then(function(){
                return db.get('users').findOne({name: '1_0_0'}).then(function(userFromDB){
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return th.get(`/api/dynamicattributes/values/users/${userFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        //TODO when using client 0 (i.e. loggedin user of client 1 still has access to desired module) test returns 400 istead the expected 200, because validateModelName fails
        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return th.removeClientModule('1', 'base').then(function(){
                return db.get('users').findOne({name: '1_0_0'}).then(function(userFromDB){
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                        return th.get(`/api/dynamicattributes/values/users/${userFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        //TODO validateModelName fails; test returns 400
        it('responds with an id of an existing dynamic attribute value which does not belong to the same client as the logged in user with 403', function() {
            return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){ //find user for client 0
                return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){ //log in as user of client 1
                    return th.get(`/api/dynamicattributes/values/users/${userFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    
        xit('responds without giving a model name and entity id with 400', function() {
        });
        
        xit('responds without giving an entity id but with giving a modelName with 400', function() {
        });
        
        xit('responds with invalid modelName with 400', function() {
        });

        xit('responds with invalid entity id with 400', function() {
        });

        xit('responds with not existing entity id with 403', function() {
        });

        xit('responds where no dynamic attribute values exist for the given entity id with an empty list', function() {
        });

        xit('responds with a list containing all dynamic attribute values (and all of their details) defined for the given entity id', function() {
        });

    });

    function createTestDynamicAttribute() {
        return db.get(co.collections.clients.name).findOne({name:'1'}).then(function(client) {
            return Promise.resolve({
                modelName: co.collections.users.name,
                clientId: client._id,
                type: co.dynamicAttributeTypes.text,
                name_en: 'Name EN',
                name_de: 'Name DE',
                name_bg: 'Name BG',
                name_ar: 'Name AR'
            });
        });
    }

    describe('POST/', function() {

        th.apiTests.post.defaultNegative(co.apis.dynamicattributes, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, createTestDynamicAttribute)

        xit('responds without giving a modelName with 400', function() {
        });

        xit('responds with an invalid modelName with 400', function() {
        });

        xit('responds without giving name_en with 400', function() {
        });

        xit('responds without giving a type with 400', function() {
        });

        xit('responds with an invalid type with 400', function() {
        });

        xit('responds with a new dynamic attribute containing generated _id and clientId', function() {
        });

    });

    function createTestDynamicAttributeOption() {
        return createTestDynamicAttribute().then(function(attr) {
            return db.get(co.collections.dynamicattributes.name).insert(attr);
        }).then(function(insertedAttribute) {
            return Promise.resolve({
                clientId: insertedAttribute.clientId,
                dynamicAttributeId: insertedAttribute._id,
                test_en: 'Text EN',
                text_de: 'Text DE',
                text_bg: 'Text BG',
                text_ar: 'Text AR'
            });
        });
    }

    describe('POST/option', function() {

        th.apiTests.post.defaultNegative(optionApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, createTestDynamicAttributeOption)

        xit('responds without giving a dynamicAttributeId with 400', function() {
        });

        xit('responds with an invalid dynamicAttributeId with 400', function() {
        });

        xit('responds with a not existing dynamicAttributeId with 400', function() {
        });

        xit('responds without giving text_en with 400', function() {
        });

        xit('responds with a new dynamic attribute option containing generated _id and clientId', function() {
        });

    });

    describe('POST/values/:modelName/:id', function() {

        it('responds without authentication with 403', function() {
            var modelName = 'users';
            return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
                var id = userFromDB._id;
                var newValues = {};
                return th.post(`/api/dynamicattributes/values/${modelName}/${id}`).send(newValues).expect(403);
            });
        });

        it('responds without write permission with 403', function() {
            var modelName = 'users';
            return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
                var id = userFromDB._id;
                var newValues = {};
                return th.removeWritePermission('0_0_0', co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES).then(function(){
                    return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                        return th.post(`/api/dynamicattributes/values/${modelName}/${id}?token=${token}`).send(newValues).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            var modelName = 'users';
            return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
                var id = userFromDB._id;
                var newValues = {};
                return th.removeClientModule('0', 'base').then(function(){
                    return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                        return th.post(`/api/dynamicattributes/values/${modelName}/${id}?token=${token}`).send(newValues).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            var modelName = 'users';
            return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
                var id = userFromDB._id;
                var newValues = {};
                return th.removeClientModule('0', 'base').then(function(){
                    return th.doLoginAndGetToken('0_0_ADMIN0', 'test').then(function(token){
                        return th.post(`/api/dynamicattributes/values/${modelName}/${id}?token=${token}`).send(newValues).expect(403);
                    });
                });
            });
        });

        //test fails because validateModelName fails
        it('responds with an id of an existing entity which does not belong to the same client as the logged in user with 403', function() {
            var modelName = 'users';
            return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){ //clent 0
                var id = userFromDB._id;
                var newValues = {};
                return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){ //client 1
                    return th.post(`/api/dynamicattributes/values/${modelName}/${id}?token=${token}`).send(newValues).expect(403);
                });
            });
        });

        xit('responds without giving a model name and entity id with 400', function() {
        });

        xit('responds without giving an entity id but with giving a modelName with 400', function() {
        });

        xit('responds without giving a dynamic attribute value with 400', function() {
        });

        xit('responds without giving a dynamicAttributeId with 400', function() {
        });
        
        xit('responds with invalid modelName with 400', function() {
        });

        xit('responds with an invalid entity id with 400', function() {
        });

        xit('responds with a not existing entity id with 400', function() {
        });

        xit('responds with an invalid dynamicAttributeId with 400', function() {
        });

        xit('responds with a not existing dynamicAttributeId with 400', function() {
        });

        xit('responds without giving text_en with 400', function() {
        });

        xit('responds with a list of new dynamic attribute values containing generated _id\'s, clientId\'s and entityId\'s', function() {
        });

    });

    describe('PUT/:id', function() {

        function createPutTestDynamicAttribute() {
            return createTestDynamicAttribute().then(function(attr) {
                return db.get(co.collections.dynamicattributes.name).insert(attr);
            });
        }

        th.apiTests.put.defaultNegative(co.apis.dynamicattributes, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, createPutTestDynamicAttribute);
        th.apiTests.put.clientDependentNegative(co.apis.dynamicattributes, createPutTestDynamicAttribute);

        xit('responds with a new modelName with an updated record but with old modelName', function() {
        });

        xit('responds with a new type with an updated record but with old type', function() {
        });

        xit('responds with an updated dynamic attribute', function() {
        });

    });

    describe('PUT/option/:id', function() {

        function createPutTestDynamicAttributeOption() {
            return createTestDynamicAttributeOption().then(function(option) {
                return db.get(co.collections.dynamicattributeoptions.name).insert(option);
            });
        }

        th.apiTests.put.defaultNegative(optionApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, createPutTestDynamicAttributeOption);
        th.apiTests.put.clientDependentNegative(optionApi, createPutTestDynamicAttributeOption);

        xit('responds with a new dynamicAttributeId with an updated record but with old dynamicAttributeId', function() {
        });

        xit('responds with an updated dynamic attribute option', function() {
        });

    });

    describe('PUT/values/:modelName/:id', function() {

        it('responds without authentication with 403', function() {
            return db.get('users').findOne({name: '0_0_0'}).then(function(entity){
                var updatedAttributevalue = {gender: 'male'}; 
                var modelName = 'users';
                return th.put(`/api/dynamicattributes/values/${modelName}/${entity._id}`).expect(403);
            });
        });

        it('responds without write permission with 403', function() {
            return db.get('users').findOne({name: '0_0_0'}).then(function(entity){
                var updatedAttributevalue = {gender: 'male'}; 
                var modelName = 'users';
                return th.removeWritePermission('0_0_0', co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES).then(function(){
                    return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
                        return th.put(`/api/dynamicattributes/values/${modelName}/${entity._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('users').findOne({name: '0_0_0'}).then(function(entity){
                var updatedAttributevalue = {gender: 'male'}; 
                var modelName = 'users';
                return th.removeClientModule('0', 'base').then(function(){
                    return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
                        return th.put(`/api/dynamicattributes/values/${modelName}/${entity._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('users').findOne({name: '0_0_0'}).then(function(entity){
                var updatedAttributevalue = {gender: 'male'}; 
                var modelName = 'users';
                return th.removeClientModule('0', 'base').then(function(){
                    return th.doLoginAndGetToken('0_0_ADMIN0', 'test').then(function(token){ 
                        return th.put(`/api/dynamicattributes/values/${modelName}/${entity._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        //TODO test fails because tested functionality is not implemented yet
        it('responds with an id of an existing entity which does not belong to the same client as the logged in user with 403', function() {
            return db.get('users').findOne({name: '0_0_0'}).then(function(entity){
                var updatedAttributevalue = {gender: 'male'}; 
                var modelName = 'users';
                return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
                    return th.put(`/api/dynamicattributes/values/${modelName}/${entity._id}?token=${token}`).expect(403);
                });           
            });      
        });

        xit('responds without giving a model name and entity id with 400', function() {
        });

        xit('responds without giving an entity id but with giving a modelName with 400', function() {
        });
        
        xit('responds with invalid modelName with 400', function() {
        });
        
        xit('responds with invalid entity id with 400', function() {
        });

        xit('responds with not existing entity id with 403', function() {
        });

        xit('responds containg values with new _id\'s with updated records but with old _id\'s', function() {
        });

        xit('responds containg values with new clientId\'s with updated records but with old clientId\'s', function() {
        });

        xit('responds containg values with new dynamicAttributeId\'s with updated records but with old dynamicAttributeId\'s', function() {
        });

        xit('responds containg values with new entityId\'s with updated records but with old entityId\'s', function() {
        });

        xit('responds with a list of updated dynamic attribute values', function() {
        });

    });

    describe('DELETE/:id', function() {

        function createDeleteTestDynamicAttribute() {
            return createTestDynamicAttribute().then(function(attr) {
                return db.get(co.collections.dynamicattributes.name).insert(attr);
            }).then(function(insertedAttribute) {
                return Promise.resolve(insertedAttribute._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.dynamicattributes, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, createDeleteTestDynamicAttribute);
        th.apiTests.delete.clientDependentNegative(co.apis.dynamicattributes, createDeleteTestDynamicAttribute);

        xit('responds with a correct id with 204 and deletes the dynamic attribute, all of its dynamic attribute options and all of its dynamic attribute values from the database', function() {
        });

    });

    describe('DELETE/option/:id', function() {

        function createDeleteTestDynamicAttributeOption() {
            return createTestDynamicAttributeOption().then(function(option) {
                return db.get(co.collections.dynamicattributeoptions.name).insert(option);
            }).then(function(insertedOption) {
                return Promise.resolve(insertedOption._id);
            });
        }

        th.apiTests.delete.defaultNegative(optionApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, createDeleteTestDynamicAttributeOption);
        th.apiTests.delete.clientDependentNegative(optionApi, createDeleteTestDynamicAttributeOption);

        xit('responds with a correct id with 204 and deletes the dynamic attribute option and all dynamic attribute values which use it from the database', function() {
        });

    });

    describe('DELETE/values/:modelName/:id', function() {

        it('responds without authentication with 403', function() {
            return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
                return th.del(`/api/dynamicattributes/values/users/${userFromDB._id}`).expect(403);
            });
        });

        it('responds without write permission with 403', function() {
            return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
                return th.removeWritePermission('0_0_0', co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES).then(function(){
                    return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                        return th.del(`/api/dynamicattributes/values/users/${userFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
                return th.removeClientModule('0', 'base').then(function(){
                    return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                        return th.del(`/api/dynamicattributes/values/users/${userFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
                return th.removeClientModule('0', 'base').then(function(){
                    return th.doLoginAndGetToken('0_0_ADMIN0', 'test').then(function(token){
                        return th.del(`/api/dynamicattributes/values/users/${userFromDB._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with an id of an existing entity which does not belong to the same client as the logged in user with 403', function() {
            return db.get('users').findOne({name: '1_0_0'}).then(function(userFromDB){ //client 1 
                return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){ //client 0 
                    return th.del(`/api/dynamicattributes/values/users/${userFromDB._id}?token=${token}`).expect(403);
                });
            });
        });

        it('responds without giving a model name and entity id with 400', function() {
            return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
                return th.del(`/api/dynamicattributes/values?token=${token}`).expect(400);
            });
        });

        it('responds without giving an entity id but with giving a modelName with 400', function() {
            return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
                return th.del(`/api/dynamicattributes/values/users?token=${token}`).expect(400);
            });
        });
        
        it('responds with invalid modelName with 400', function() {
            return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
                return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
                    var fakeModelName = 'lalala';
                    var entityId = userFromDB._id;
                    return th.del(`/api/dynamicattributes/values/${fakeModelName}/${entityId}?token=${token}`).expect(400);
                });
            });
        });
        
        it('responds with invalid entity id with 400', function() {
            return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
                return th.del(`/api/dynamicattributes/values/users/invalidId?token=${token}`).expect(400);
            });
        });

        it('responds with not existing entity id with 403', function() {
            return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
                return th.del(`/api/dynamicattributes/values/users/999999999999999999999999?token=${token}`).expect(403);
            });
        });

        xit('responds with correct modelName and id with 204 and deletes all dynamic attribute values for the entity from the database', function() {
        });

    });

});
