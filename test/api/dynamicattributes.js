/**
 * UNIT Tests for api/dynamicattributes
 */
var assert = require('assert');
var superTest = require('supertest');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');
var bcryptjs =  require('bcryptjs');


describe('API dynamicattributes', function() {

    var server = require('../../app');
    
    // Clear and prepare database with clients, user groups and users
    beforeEach(() => {
        return testHelpers.cleanDatabase()
            .then(testHelpers.prepareClients)
            .then(testHelpers.prepareClientModules)
            .then(testHelpers.prepareUserGroups)
            .then(testHelpers.prepareUsers)
            .then(testHelpers.preparePermissions)
            .then(testHelpers.prepareFolders)
            .then(testHelpers.prepareDocuments)
            .then(testHelpers.prepareDynamicAttributes)
            .then(testHelpers.prepareDynamicAttributeOptions)
            .then(testHelpers.prepareDynamicAttributeValues);
    });

////////////////////////// AUTHENTICATION ////////////////////////////////////    

    it('responds to GET/model/:modelName without authentication with 403', function() {
        var modelName = 'users';
         return superTest(server).get(`/api/dynamicattributes/model/${modelName}`).expect(403);
    });

    it('responds to GET/model/:modelName without read permission with 403', function() {
        // Remove the corresponding permission
        return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function() {
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
                var modelName = 'users';
                return superTest(server).get(`/api/dynamicattributes/model/${modelName}?token=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/model/:modelName when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'base').then(function(){
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                var modelName = 'users';
                return superTest(server).get(`/api/dynamicattributes/model/${modelName}?token=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/model/:modelName when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'base').then(function(){
            return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                var modelName = 'users';
                return superTest(server).get(`/api/dynamicattributes/model/${modelName}?token=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/:id without authentication with 403', function() {
        return db.get('dynamicattributes').findOne({type: 'boolean'}).then(function(dynamicAttributeFromDB){
            return superTest(server).get(`/api/dynamicattributes/${dynamicAttributeFromDB._id}`).expect(403);
        });
    });

    it('responds to GET/:id without read permission with 403', function() {
        return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function() {
            return db.get('dynamicattributes').findOne({type: 'boolean'}).then(function(dynamicAttributeFromDB){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                   return superTest(server).get(`/api/dynamicattributes/${dynamicAttributeFromDB._id}?token=${token}`).expect(403); 
                });
            });   
        });
    });

    it('responds to GET/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'base').then(function(){
            return db.get('dynamicattributes').findOne({type: 'boolean'}).then(function(dynamicAttributeFromDB){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                   return superTest(server).get(`/api/dynamicattributes/${dynamicAttributeFromDB._id}?token=${token}`).expect(403); 
                });
            });    
        });
    });

    it('responds to GET/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'base').then(function(){
            return db.get('dynamicattributes').findOne({type: 'boolean'}).then(function(dynamicAttributeFromDB){
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                   return superTest(server).get(`/api/dynamicattributes/${dynamicAttributeFromDB._id}?token=${token}`).expect(403); 
                });
            });    
        });
    });

    it('responds to GET/:id with an id of an existing dynamic attribute which does not belong to the same client as the logged in user with 403', function() {
        return db.get('clients').findOne({name: '0'}).then(function(clientFromDB){
            return db.get('dynamicattributes').findOne({clientId: clientFromDB._id}).then(function(dynamicAttributeFromDB){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    return superTest(server).get(`/api/dynamicattributes/${dynamicAttributeFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/option/:id without authentication with 403', function() {
        return db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(picklistAttributeFromDB){
            return db.get('dynamicattributeoptions').find({dynamicAttributeId: picklistAttributeFromDB._id}).then(function(optionFromDB){
                return superTest(server).get(`/api/dynamicattributes/option/${optionFromDB._id}`).expect(403);
            });
        });
    });

    it('responds to GET/option/:id without read permission with 403', function() {
        return db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(picklistAttributeFromDB){
            return db.get('dynamicattributeoptions').find({dynamicAttributeId: picklistAttributeFromDB._id}).then(function(optionFromDB){
                return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return superTest(server).get(`/api/dynamicattributes/option/${optionFromDB._id}`).expect(403);
                    });
                });
            });
        });        
    });

    it('responds to GET/option/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(picklistAttributeFromDB){
            return db.get('dynamicattributeoptions').find({dynamicAttributeId: picklistAttributeFromDB._id}).then(function(optionFromDB){
                return testHelpers.removeClientModule('1', 'base').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return superTest(server).get(`/api/dynamicattributes/option/${optionFromDB._id}`).expect(403);
                    });
                });
            });
        }); 
    });

    it('responds to GET/option/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(picklistAttributeFromDB){
            return db.get('dynamicattributeoptions').find({dynamicAttributeId: picklistAttributeFromDB._id}).then(function(optionFromDB){
                return testHelpers.removeClientModule('1', 'base').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                        return superTest(server).get(`/api/dynamicattributes/option/${optionFromDB._id}`).expect(403);
                    });
                });
            });
        });
    });

    xit('responds to GET/option/:id with an id of an existing dynamic attribute option which does not belong to the same client as the logged in user with 403', function() {
    });

    xit('responds to GET/options/:id without authentication with 403', function() {
    });

    xit('responds to GET/options/:id without read permission with 403', function() {
    });

    xit('responds to GET/options/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to GET/options/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to GET/options/:id with an id of an existing dynamic attribute which does not belong to the same client as the logged in user with 403', function() {
    });

    xit('responds to GET/values/:modelName/:id without authentication with 403', function() {
    });

    xit('responds to GET/values/:modelName/:id without read permission with 403', function() {
    });

    xit('responds to GET/values/:modelName/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to GET/values/:modelName/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to GET/values/:modelName/:id with an id of an existing dynamic attribute value which does not belong to the same client as the logged in user with 403', function() {
    });

    xit('responds to GET/types without authentication with 403', function() {
    });

    xit('responds to GET/types without read permission with 403', function() {
    });

    xit('responds to GET/types when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to GET/types when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to POST/ without authentication with 403', function() {
    });

    xit('responds to POST/ without write permission with 403', function() {
    });

    xit('responds to POST/ when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to POST/ when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to POST/option without authentication with 403', function() {
    });

    xit('responds to POST/option without write permission with 403', function() {
    });

    xit('responds to POST/option when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to POST/option when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to POST/values/:modelName/:id without authentication with 403', function() {
    });

    xit('responds to POST/values/:modelName/:id without write permission with 403', function() {
    });

    xit('responds to POST/values/:modelName/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to POST/values/:modelName/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to POST/values/:modelName/:id with an id of an existing entity which does not belong to the same client as the logged in user with 403', function() {
    });

    xit('responds to PUT/:id without authentication with 403', function() {
    });

    xit('responds to PUT/:id without write permission with 403', function() {
    });

    xit('responds to PUT/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to PUT/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to PUT/:id with an id of an existing dynamic attribute which does not belong to the same client as the logged in user with 403', function() {
    });

    xit('responds to PUT/option/:id without authentication with 403', function() {
    });

    xit('responds to PUT/option/:id without write permission with 403', function() {
    });

    xit('responds to PUT/option/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to PUT/option/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to PUT/option/:id with an id of an existing dynamic attribute option which does not belong to the same client as the logged in user with 403', function() {
    });

    xit('responds to PUT/values/:modelName/:id without authentication with 403', function() {
    });

    xit('responds to PUT/values/:modelName/:id without write permission with 403', function() {
    });

    xit('responds to PUT/values/:modelName/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to PUT/values/:modelName/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to PUT/values/:modelName/:id with an id of an existing entity which does not belong to the same client as the logged in user with 403', function() {
    });

    xit('responds to DELETE/:id without authentication with 403', function() {
    });

    xit('responds to DELETE/:id without write permission with 403', function() {
    });

    xit('responds to DELETE/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to DELETE/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to DELETE/:id with an id of an existing dynamic attribute which does not belong to the same client as the logged in user with 403', function() {
    });

    xit('responds to DELETE/option/:id without authentication with 403', function() {
    });

    xit('responds to DELETE/option/:id without write permission with 403', function() {
    });

    xit('responds to DELETE/option/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to DELETE/option/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to DELETE/option/:id with an id of an existing dynamic attribute option which does not belong to the same client as the logged in user with 403', function() {
    });

    xit('responds to DELETE/values/:modelName/:id without authentication with 403', function() {
    });

    xit('responds to DELETE/values/:modelName/:id without write permission with 403', function() {
    });

    xit('responds to DELETE/values/:modelName/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
    });

    xit('responds to DELETE/values/:modelName/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
    });

    xit('responds to DELETE/values/:modelName/:id with an id of an existing entity which does not belong to the same client as the logged in user with 403', function() {
    });

////////////////////////// INVALID PARAMETERS ////////////////////////////////    
    
    xit('responds to GET/model/:modelName without giving a modelName with 400', function() {
    });
    
    xit('responds to GET/model/:modelName with invalid modelName with 400', function() {
    });
    
    xit('responds to GET/:id without giving an id with 400', function() {
    });
    
    xit('responds to GET/:id with invalid id with 400', function() {
    });

    xit('responds to GET/:id with not existing dynamic attribute id with 403', function() {
    });
    
    xit('responds to GET/option/:id without giving an id with 400', function() {
    });
    
    xit('responds to GET/option/:id with invalid id with 400', function() {
    });

    xit('responds to GET/option/:id with not existing dynamic attribute option id with 403', function() {
    });
    
    xit('responds to GET/options/:id without giving an id with 400', function() {
    });
    
    xit('responds to GET/options/:id with invalid id with 400', function() {
    });

    xit('responds to GET/options/:id with not existing dynamic attribute id with 403', function() {
    });
    
    xit('responds to GET/values/:modelName/:id without giving a model name and entity id with 400', function() {
    });
    
    xit('responds to GET/values/:modelName/:id without giving an entity id but with giving a modelName with 400', function() {
    });
    
    xit('responds to GET/values/:modelName/:id with invalid modelName with 400', function() {
    });

    xit('responds to GET/values/:modelName/:id with invalid entity id with 400', function() {
    });

    xit('responds to GET/values/:modelName/:id with not existing entity id with 403', function() {
    });

    xit('responds to POST/ without giving a dynamic attribute with 400', function() {
    });

    xit('responds to POST/ without giving a modelName with 400', function() {
    });

    xit('responds to POST/ with an invalid modelName with 400', function() {
    });

    xit('responds to POST/ without giving name_en with 400', function() {
    });

    xit('responds to POST/ without giving a type with 400', function() {
    });

    xit('responds to POST/ with an invalid type with 400', function() {
    });

    xit('responds to POST/option without giving a dynamic attribute option with 400', function() {
    });

    xit('responds to POST/option without giving a dynamicAttributeId with 400', function() {
    });

    xit('responds to POST/option with an invalid dynamicAttributeId with 400', function() {
    });

    xit('responds to POST/option with a not existing dynamicAttributeId with 400', function() {
    });

    xit('responds to POST/option without giving text_en with 400', function() {
    });

    xit('responds to POST/values/:modelName/:id without giving a model name and entity id with 400', function() {
    });

    xit('responds to POST/values/:modelName/:id without giving an entity id but with giving a modelName with 400', function() {
    });

    xit('responds to POST/values/:modelName/:id without giving a dynamic attribute value with 400', function() {
    });

    xit('responds to POST/values/:modelName/:id without giving a dynamicAttributeId with 400', function() {
    });
    
    xit('responds to POST/values/:modelName/:id with invalid modelName with 400', function() {
    });

    xit('responds to POST/values/:modelName/:id with an invalid entity id with 400', function() {
    });

    xit('responds to POST/values/:modelName/:id with a not existing entity id with 400', function() {
    });

    xit('responds to POST/values/:modelName/:id with an invalid dynamicAttributeId with 400', function() {
    });

    xit('responds to POST/values/:modelName/:id with a not existing dynamicAttributeId with 400', function() {
    });

    xit('responds to POST/values/:modelName/:id without giving text_en with 400', function() {
    });

    xit('responds to PUT/:id without giving an id with 400', function() {
    });
    
    xit('responds to PUT/:id with invalid id with 400', function() {
    });

    xit('responds to PUT/:id with not existing dynamic attribute id with 403', function() {
    });

    xit('responds to PUT/:id with a new _id with an updated record but with old _id', function() {
    });

    xit('responds to PUT/:id with a new clientId with an updated record but with old clientId', function() {
    });

    xit('responds to PUT/:id with a new modelName with an updated record but with old modelName', function() {
    });

    xit('responds to PUT/:id with a new type with an updated record but with old type', function() {
    });

    xit('responds to PUT/option/:id without giving an id with 400', function() {
    });
    
    xit('responds to PUT/option/:id with invalid id with 400', function() {
    });

    xit('responds to PUT/option/:id with not existing dynamic attribute option id with 403', function() {
    });

    xit('responds to PUT/option/:id with a new _id with an updated record but with old _id', function() {
    });

    xit('responds to PUT/option/:id with a new clientId with an updated record but with old clientId', function() {
    });

    xit('responds to PUT/option/:id with a new dynamicAttributeId with an updated record but with old dynamicAttributeId', function() {
    });

    xit('responds to PUT/values/:modelName/:id without giving a model name and entity id with 400', function() {
    });

    xit('responds to PUT/values/:modelName/:id without giving an entity id but with giving a modelName with 400', function() {
    });
    
    xit('responds to PUT/values/:modelName/:id with invalid modelName with 400', function() {
    });
    
    xit('responds to PUT/values/:modelName/:id with invalid entity id with 400', function() {
    });

    xit('responds to PUT/values/:modelName/:id with not existing entity id with 403', function() {
    });

    xit('responds to PUT/values/:modelName/:id containg values with new _id\'s with updated records but with old _id\'s', function() {
    });

    xit('responds to PUT/values/:modelName/:id containg values with new clientId\'s with updated records but with old clientId\'s', function() {
    });

    xit('responds to PUT/values/:modelName/:id containg values with new dynamicAttributeId\'s with updated records but with old dynamicAttributeId\'s', function() {
    });

    xit('responds to PUT/values/:modelName/:id containg values with new entityId\'s with updated records but with old entityId\'s', function() {
    });

    xit('responds to DELTE/:id without giving an id with 400', function() {
    });
    
    xit('responds to DELTE/:id with invalid id with 400', function() {
    });

    xit('responds to DELTE/:id with not existing dynamic attribute id with 403', function() {
    });

    xit('responds to DELTE/option/:id without giving an id with 400', function() {
    });
    
    xit('responds to DELTE/option/:id with invalid id with 400', function() {
    });

    xit('responds to DELTE/option/:id with not existing dynamic attribute option id with 403', function() {
    });

    xit('responds to DELTE/values/:modelName/:id without giving a model name and entity id with 400', function() {
    });

    xit('responds to DELTE/values/:modelName/:id without giving an entity id but with giving a modelName with 400', function() {
    });
    
    xit('responds to DELTE/values/:modelName/:id with invalid modelName with 400', function() {
    });
    
    xit('responds to DELTE/values/:modelName/:id with invalid entity id with 400', function() {
    });

    xit('responds to DELTE/values/:modelName/:id with not existing entity id with 403', function() {
    });

////////////////////////// POSITIVE TESTS ////////////////////////////////////    

    xit('responds to GET/model/:modelName where no dyanmic attributes exist for the given modelName with an empty list', function() {
    });

    xit('responds to GET/model/:modelName with a list containing all dynamic attributes of the given modelName', function() {
    });

    xit('responds to GET/:id with all details of the dynamic attribute', function() {
    });

    xit('responds to GET/option/:id with all details of the dynamic attribute option', function() {
    });

    xit('responds to GET/options/:id with a list of all options and their details of the dynamic attribute', function() {
    });

    xit('responds to GET/values/:modelName/:id where no dynamic attribute values exist for the given entity id with an empty list', function() {
    });

    xit('responds to GET/values/:modelName/:id with a list containing all dynamic attribute values (and all of their details) defined for the given entity id', function() {
    });

    xit('responds to GET/types with a list of all possible dynamic attribute types', function() {
    });

    xit('responds to POST/ with a new dynamic attribute containing generated _id and clientId', function() {
    });

    xit('responds to POST/option with a new dynamic attribute option containing generated _id and clientId', function() {
    });

    xit('responds to POST/values/:modelName/:id with a list of new dynamic attribute values containing generated _id\'s, clientId\'s and entityId\'s', function() {
    });

    xit('responds to PUT/:id with an updated dynamic attribute', function() {
    });

    xit('responds to PUT/option/:id with an updated dynamic attribute option', function() {
    });

    xit('responds to PUT/values/:modelName/:id with a list of updated dynamic attribute values', function() {
    });

    xit('responds to DELETE/:id with a correct id with 204 and deletes the dynamic attribute, all of its dynamic attribute options and all of its dynamic attribute values from the database', function() {
    });

    xit('responds to DELETE/option/:id with a correct id with 204 and deletes the dynamic attribute option and all dynamic attribute values which use it from the database', function() {
    });

    xit('responds to DELETE/values/:modelName/:id with correct modelName and id with 204 and deletes all dynamic attribute values for the entity from the database', function() {
    });

});
