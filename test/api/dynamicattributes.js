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

    it('responds to GET/option/:id with an id of an existing dynamic attribute option which does not belong to the same client as the logged in user with 403', function() {
        return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){ //get user of client 0
            return db.get('dynamicattributeoptions').findOne({clientId: userFromDB.clientId}).then(function(attributeOptionFromDB){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    return superTest(server).get(`/api/dynamicattributes/option/${attributeOptionFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/options/:id without authentication with 403', function() {
        return db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(attributeFromDB){
            return superTest(server).get(`/api/dynamicattributes/options/${attributeFromDB._id}`).expect(403);
        });
    });

    it('responds to GET/options/:id without read permission with 403', function() {
        return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function(){
            return db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(attributeFromDB){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    return superTest(server).get(`/api/dynamicattributes/options/${attributeFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/options/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
         return testHelpers.removeClientModule('1', 'base').then(function(){
            return db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(attributeFromDB){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    return superTest(server).get(`/api/dynamicattributes/options/${attributeFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/options/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
         return testHelpers.removeClientModule('1', 'base').then(function(){
            return db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(attributeFromDB){
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                    return superTest(server).get(`/api/dynamicattributes/options/${attributeFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/options/:id with an id of an existing dynamic attribute which does not belong to the same client as the logged in user with 403', function() {
        return db.get('clients').findOne({name: '0'}).then(function(client0FromDB){
            return db.get('dynamicattributes').findOne({type: 'picklist', clientId: client0FromDB._id}).then(function(attributeFromDB){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    return superTest(server).get(`/api/dynamicattributes/options/${attributeFromDB._id}?token=${token}`).expect(403);
                });
            });
        });  
    });

    it('responds to GET/values/:modelName/:id without authentication with 403', function() {
        return db.get('users').findOne({name: '1_0_0'}).then(function(userFromDB){
            return superTest(server).get(`/api/dynamicattributes/values/users/${userFromDB._id}`).expect(403);
        });
    });

    it('responds to GET/values/:modelName/:id without read permission with 403', function() {
        return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function(){
            return db.get('users').findOne({name: '1_0_0'}).then(function(userFromDB){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    return superTest(server).get(`/api/dynamicattributes/values/users/${userFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to GET/values/:modelName/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'base').then(function(){
            return db.get('users').findOne({name: '1_0_0'}).then(function(userFromDB){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                    return superTest(server).get(`/api/dynamicattributes/values/users/${userFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    //TODO when using client 0 (i.e. loggedin user of client 1 still has access to desired module) test returns 400 istead the expected 200, because validateModelName fails
    it('responds to GET/values/:modelName/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'base').then(function(){
            return db.get('users').findOne({name: '1_0_0'}).then(function(userFromDB){
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                    return superTest(server).get(`/api/dynamicattributes/values/users/${userFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    //TODO validateModelName fails; test returns 400
    it('responds to GET/values/:modelName/:id with an id of an existing dynamic attribute value which does not belong to the same client as the logged in user with 403', function() {
        return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){ //find user for client 0
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){ //log in as user of client 1
                return superTest(server).get(`/api/dynamicattributes/values/users/${userFromDB._id}?token=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/types without authentication with 403', function() {
        return superTest(server).get(`/api/dynamicattributes/types`).expect(403);
    });

    it('responds to GET/types without read permission with 403', function() {
        return testHelpers.removeReadPermission('1_0_0', 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function(){
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return superTest(server).get(`/api/dynamicattributes/types?token=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/types when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'base').then(function(){
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return superTest(server).get(`/api/dynamicattributes/types?token=${token}`).expect(403);
            });
        });
    });

    it('responds to GET/types when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return testHelpers.removeClientModule('1', 'base').then(function(){
            return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                return superTest(server).get(`/api/dynamicattributes/types?token=${token}`).expect(403);
            });
        });
    });

    it('responds to POST/ without authentication with 403', function() {
        //Required properties are model, name_en and type
        var newAttribute = {model: 'usergroups', name_en: 'color', type: 'text'};
        return superTest(server).post(`/api/dynamicattributes`).send(newAttribute).expect(403);
    });

    it('responds to POST/ without write permission with 403', function() {
        //Required properties are model, name_en and type
        var newAttribute = {model: 'usergroups', name_en: 'color', type: 'text'}; 
        return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function(){
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return superTest(server).post(`/api/dynamicattributes?token=${token}`).send(newAttribute).expect(403);
            });
        });
    });

    it('responds to POST/ when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        //Required properties are model, name_en and type
        var newAttribute = {model: 'usergroups', name_en: 'color', type: 'text'}; 
        return testHelpers.removeClientModule('1', 'base').then(function(){
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                return superTest(server).post(`/api/dynamicattributes?token=${token}`).send(newAttribute).expect(403);
            });
        });
    });

    it('responds to POST/ when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        //Required properties are model, name_en and type
        var newAttribute = {model: 'usergroups', name_en: 'color', type: 'text'}; 
        return testHelpers.removeClientModule('1', 'base').then(function(){
            return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                return superTest(server).post(`/api/dynamicattributes?token=${token}`).send(newAttribute).expect(403);
            });
        });
    });

    it('responds to POST/option without authentication with 403', function() {
        // Required properties are dynamicattributeid and text_en
        return db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(attributeFromDB){
            var newAttributeOption = {dynamicattributeid: attributeFromDB._id, text_en: 'other'};
            return superTest(server).post(`/api/dynamicattributes/option`).send(newAttributeOption).expect(403);
        });
    });

    it('responds to POST/option without write permission with 403', function() {
        // Required properties are dynamicattributeid and text_en
        return db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(attributeFromDB){
            var newAttributeOption = {dynamicattributeid: attributeFromDB._id, text_en: 'other'};
            return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                     return superTest(server).post(`/api/dynamicattributes/option?token=${token}`).send(newAttributeOption).expect(403);
                });
            });
        });
    });

    it('responds to POST/option when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        // Required properties are dynamicattributeid and text_en
        return db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(attributeFromDB){
            var newAttributeOption = {dynamicattributeid: attributeFromDB._id, text_en: 'other'};
            return testHelpers.removeClientModule('1', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                     return superTest(server).post(`/api/dynamicattributes/option?token=${token}`).send(newAttributeOption).expect(403);
                });
            });
        });
    });

    it('responds to POST/option when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        // Required properties are dynamicattributeid and text_en
        return db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(attributeFromDB){
            var newAttributeOption = {dynamicattributeid: attributeFromDB._id, text_en: 'other'};
            return testHelpers.removeClientModule('1', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                     return superTest(server).post(`/api/dynamicattributes/option?token=${token}`).send(newAttributeOption).expect(403);
                });
            });
        });
    });

    it('responds to POST/values/:modelName/:id without authentication with 403', function() {
        var modelName = 'users';
        return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
            var id = userFromDB._id;
            var newValues = {};
            return superTest(server).post(`/api/dynamicattributes/values/${modelName}/${id}`).send(newValues).expect(403);
        });
    });

    it('responds to POST/values/:modelName/:id without write permission with 403', function() {
        var modelName = 'users';
        return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
            var id = userFromDB._id;
            var newValues = {};
            return testHelpers.removeWritePermission('0_0_0', 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function(){
                return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                    return superTest(server).post(`/api/dynamicattributes/values/${modelName}/${id}?token=${token}`).send(newValues).expect(403);
                });
            });
        });
    });

    it('responds to POST/values/:modelName/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        var modelName = 'users';
        return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
            var id = userFromDB._id;
            var newValues = {};
            return testHelpers.removeClientModule('0', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                    return superTest(server).post(`/api/dynamicattributes/values/${modelName}/${id}?token=${token}`).send(newValues).expect(403);
                });
            });
        });
    });

    it('responds to POST/values/:modelName/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        var modelName = 'users';
        return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
            var id = userFromDB._id;
            var newValues = {};
            return testHelpers.removeClientModule('0', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('0_0_ADMIN0', 'test').then(function(token){
                    return superTest(server).post(`/api/dynamicattributes/values/${modelName}/${id}?token=${token}`).send(newValues).expect(403);
                });
            });
        });
    });

    //test fails because validateModelName fails
    it('responds to POST/values/:modelName/:id with an id of an existing entity which does not belong to the same client as the logged in user with 403', function() {
        var modelName = 'users';
        return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){ //clent 0
            var id = userFromDB._id;
            var newValues = {};
            return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){ //client 1
                return superTest(server).post(`/api/dynamicattributes/values/${modelName}/${id}?token=${token}`).send(newValues).expect(403);
            });
        });
    });

    it('responds to PUT/:id without authentication with 403', function() {
       return db.get('clients').findOne({name: '1'}).then(function(client1){ //find client 1
            return db.get('dynamicattributes').findOne({name_en: 'gender', clientId: client1._id}).then(function(attributeFromDB){
                var id = attributeFromDB._id;
                var updatedAttribute = {name_en: 'sex'};
                return superTest(server).put(`/api/dynamicattributes/${id}`).send(updatedAttribute).expect(403);
            });
        });
    });

    it('responds to PUT/:id without write permission with 403', function() {
       return db.get('clients').findOne({name: '1'}).then(function(client1){ 
            return db.get('dynamicattributes').findOne({name_en: 'gender', clientId: client1._id}).then(function(attributeFromDB){
                var id = attributeFromDB._id;
                var updatedAttribute = {name_en: 'sex'};
                return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function(){
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){ 
                        return superTest(server).put(`/api/dynamicattributes/${id}?token=${token}`).send(updatedAttribute).expect(403);
                    });
                });
            });
        });
    });

    it('responds to PUT/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
       return db.get('clients').findOne({name: '0'}).then(function(client0){ //find client 0
            return db.get('dynamicattributes').findOne({name_en: 'gender', clientId: client0._id}).then(function(attributeFromDB){
                var id = attributeFromDB._id;
                var updatedAttribute = {name_en: 'sex'};
                return testHelpers.removeClientModule('0', 'base').then(function(){
                    return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ //logged in user belongs to client 0
                        return superTest(server).put(`/api/dynamicattributes/${id}?token=${token}`).send(updatedAttribute).expect(403);
                    });
                });
            });
        });
    });

    //TODO test gives false positive result; 403 is alway returned because validateSameClientId fails as well and returns 403
    it('responds to PUT/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
       return db.get('usergroups').findOne({name: '_0'}).then(function(usergroupFromDB){ 
            return db.get('dynamicattributes').findOne({name_en: 'gender', clientId: usergroupFromDB.clientId}).then(function(attributeFromDB){
                var id = attributeFromDB._id;
                var updatedAttribute = {name_en: 'sex'};
                return testHelpers.removeClientModule('1', 'base').then(function(){
                    return testHelpers.doLoginAndGetToken('0_0_ADMIN0', 'test').then(function(token){ //logged in user belongs to client 0
                        return superTest(server).put(`/api/dynamicattributes/${id}?token=${token}`).send(updatedAttribute).expect(403);
                    });
                });
            });
        });
    });

    it('responds to PUT/:id with an id of an existing dynamic attribute which does not belong to the same client as the logged in user with 403', function() {
       return db.get('clients').findOne({name: '1'}).then(function(client1){ //find client 1
            return db.get('dynamicattributes').findOne({name_en: 'gender', clientId: client1._id}).then(function(attributeFromDB){
                var id = attributeFromDB._id;
                var updatedAttribute = {name_en: 'sex'};
                return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ //logged in user belongs to client 0
                    return superTest(server).put(`/api/dynamicattributes/${id}?token=${token}`).send(updatedAttribute).expect(403);
                });
            });
        });
    });

    it('responds to PUT/option/:id without authentication with 403', function() {
      return db.get('clients').findOne({name: '0'}).then(function(client1){ 
            return db.get('dynamicattributes').findOne({name_en: 'gender', clientId: client1._id}).then(function(attributeFromDB){
                return db.get('dynamicattributeoptions').findOne({dynamicAttributeId: attributeFromDB._id}).then(function(attributeOptionFromDB){
                    var updatedAttributeOption = {text_en: 'some_new_text'};
                    var attributeOptionId = attributeOptionFromDB._id;
                    return superTest(server).put(`/api/dynamicattributes/option/${attributeOptionId}`).send(updatedAttributeOption).expect(403);
                });
            });
        });
    });

    it('responds to PUT/option/:id without write permission with 403', function() {
      return db.get('clients').findOne({name: '1'}).then(function(client1){ 
            return db.get('dynamicattributes').findOne({name_en: 'gender', clientId: client1._id}).then(function(attributeFromDB){
                return db.get('dynamicattributeoptions').findOne({dynamicAttributeId: attributeFromDB._id}).then(function(attributeOptionFromDB){
                    var updatedAttributeOption = {text_en: 'some_new_text'};
                    var attributeOptionId = attributeOptionFromDB._id;
                    return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function(){
                        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){ 
                            return superTest(server).put(`/api/dynamicattributes/option/${attributeOptionId}?token=${token}`).send(updatedAttributeOption).expect(403);
                        });
                    });
                });
            });
        });
    });

    it('responds to PUT/option/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
      return db.get('clients').findOne({name: '1'}).then(function(client1){ 
            return db.get('dynamicattributes').findOne({name_en: 'gender', clientId: client1._id}).then(function(attributeFromDB){
                return db.get('dynamicattributeoptions').findOne({dynamicAttributeId: attributeFromDB._id}).then(function(attributeOptionFromDB){
                    var updatedAttributeOption = {text_en: 'some_new_text'};
                    var attributeOptionId = attributeOptionFromDB._id;
                    return testHelpers.removeClientModule('1', 'base').then(function(){
                        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){ 
                            return superTest(server).put(`/api/dynamicattributes/option/${attributeOptionId}?token=${token}`).send(updatedAttributeOption).expect(403);
                        });
                    });
                });
            });
        });
    });

    it('responds to PUT/option/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
      return db.get('clients').findOne({name: '1'}).then(function(client1){ 
            return db.get('dynamicattributes').findOne({name_en: 'gender', clientId: client1._id}).then(function(attributeFromDB){
                return db.get('dynamicattributeoptions').findOne({dynamicAttributeId: attributeFromDB._id}).then(function(attributeOptionFromDB){
                    var updatedAttributeOption = {text_en: 'some_new_text'};
                    var attributeOptionId = attributeOptionFromDB._id;
                    return testHelpers.removeClientModule('1', 'base').then(function(){
                        return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ 
                            return superTest(server).put(`/api/dynamicattributes/option/${attributeOptionId}?token=${token}`).send(updatedAttributeOption).expect(403);
                        });
                    });
                });
            });
        });
    });

    it('responds to PUT/option/:id with an id of an existing dynamic attribute option which does not belong to the same client as the logged in user with 403', function() {
      return db.get('clients').findOne({name: '0'}).then(function(client1){ 
            return db.get('dynamicattributes').findOne({name_en: 'gender', clientId: client1._id}).then(function(attributeFromDB){
                return db.get('dynamicattributeoptions').findOne({dynamicAttributeId: attributeFromDB._id}).then(function(attributeOptionFromDB){
                    var updatedAttributeOption = {text_en: 'some_new_text'};
                    var attributeOptionId = attributeOptionFromDB._id;
                    return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){ 
                        return superTest(server).put(`/api/dynamicattributes/option/${attributeOptionId}?token=${token}`).send(updatedAttributeOption).expect(403);
                    });
                });
            });
        });
     });

    it('responds to PUT/values/:modelName/:id without authentication with 403', function() {
        return db.get('users').findOne({name: '0_0_0'}).then(function(entity){
            var updatedAttributevalue = {gender: 'male'}; 
            var modelName = 'users';
            return superTest(server).put(`/api/dynamicattributes/values/${modelName}/${entity._id}`).expect(403);
        });
    });

    it('responds to PUT/values/:modelName/:id without write permission with 403', function() {
        return db.get('users').findOne({name: '0_0_0'}).then(function(entity){
            var updatedAttributevalue = {gender: 'male'}; 
            var modelName = 'users';
            return testHelpers.removeWritePermission('0_0_0', 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function(){
                return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
                    return superTest(server).put(`/api/dynamicattributes/values/${modelName}/${entity._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to PUT/values/:modelName/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('users').findOne({name: '0_0_0'}).then(function(entity){
            var updatedAttributevalue = {gender: 'male'}; 
            var modelName = 'users';
            return testHelpers.removeClientModule('0', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
                    return superTest(server).put(`/api/dynamicattributes/values/${modelName}/${entity._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to PUT/values/:modelName/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('users').findOne({name: '0_0_0'}).then(function(entity){
            var updatedAttributevalue = {gender: 'male'}; 
            var modelName = 'users';
            return testHelpers.removeClientModule('0', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('0_0_ADMIN0', 'test').then(function(token){ 
                    return superTest(server).put(`/api/dynamicattributes/values/${modelName}/${entity._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    //TODO test fails because tested functionality is not implemented yet
    it('responds to PUT/values/:modelName/:id with an id of an existing entity which does not belong to the same client as the logged in user with 403', function() {
          return db.get('users').findOne({name: '0_0_0'}).then(function(entity){
            var updatedAttributevalue = {gender: 'male'}; 
            var modelName = 'users';
            return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
                return superTest(server).put(`/api/dynamicattributes/values/${modelName}/${entity._id}?token=${token}`).expect(403);
            });           
        });      
    });

    it('responds to DELETE/:id without authentication with 403', function() {
        return db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(attributeFromDB){
            return superTest(server).del(`/api/dynamicattributes/${attributeFromDB._id}`).expect(403);
        });
    });

    it('responds to DELETE/:id without write permission with 403', function() {
        return db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(attributeFromDB){
            return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){ 
                    return superTest(server).del(`/api/dynamicattributes/${attributeFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(attributeFromDB){
            return testHelpers.removeClientModule('1', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){ 
                    return superTest(server).del(`/api/dynamicattributes/${attributeFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(attributeFromDB){
            return testHelpers.removeClientModule('1', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ 
                    return superTest(server).del(`/api/dynamicattributes/${attributeFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/:id with an id of an existing dynamic attribute which does not belong to the same client as the logged in user with 403', function() {
        return db.get('clients').findOne({name: '0'}).then(function(client0){
            return db.get('dynamicattributes').findOne({type: 'picklist', clientId: client0._id}).then(function(attributeFromDB){
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ 
                    return superTest(server).del(`/api/dynamicattributes/${attributeFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/option/:id without authentication with 403', function() {
        return db.get('dynamicattributeoptions').findOne({text_en: 'female'}).then(function(attributeOptionFromDB){
            return superTest(server).del(`/api/dynamicattributes/option/${attributeOptionFromDB._id}`).expect(403);
        });
    });

    it('responds to DELETE/option/:id without write permission with 403', function() {
        return db.get('dynamicattributeoptions').findOne({text_en: 'female'}).then(function(attributeOptionFromDB){
            return testHelpers.removeWritePermission('1_0_0', 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){ 
                    return superTest(server).del(`/api/dynamicattributes/option/${attributeOptionFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/option/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('dynamicattributeoptions').findOne({text_en: 'female'}).then(function(attributeOptionFromDB){
            return testHelpers.removeClientModule('1', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){ 
                    return superTest(server).del(`/api/dynamicattributes/option/${attributeOptionFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/option/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('dynamicattributeoptions').findOne({text_en: 'female'}).then(function(attributeOptionFromDB){
            return testHelpers.removeClientModule('1', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){ 
                    return superTest(server).del(`/api/dynamicattributes/option/${attributeOptionFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/option/:id with an id of an existing dynamic attribute option which does not belong to the same client as the logged in user with 403', function() {
        return db.get('clients').findOne({name: '0'}).then(function(client0){
            return db.get('dynamicattributeoptions').findOne({text_en: 'female', clientId: client0._id}).then(function(attributeOptionFromDB){
                return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){ 
                    return superTest(server).del(`/api/dynamicattributes/option/${attributeOptionFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/values/:modelName/:id without authentication with 403', function() {
        return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
            return superTest(server).del(`/api/dynamicattributes/values/users/${userFromDB._id}`).expect(403);
        });
    });

    it('responds to DELETE/values/:modelName/:id without write permission with 403', function() {
        return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
            return testHelpers.removeWritePermission('0_0_0', 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES').then(function(){
                return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                    return superTest(server).del(`/api/dynamicattributes/values/users/${userFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/values/:modelName/:id when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
        return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
            return testHelpers.removeClientModule('0', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                    return superTest(server).del(`/api/dynamicattributes/values/users/${userFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/values/:modelName/:id when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
        return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
            return testHelpers.removeClientModule('0', 'base').then(function(){
                return testHelpers.doLoginAndGetToken('0_0_ADMIN0', 'test').then(function(token){
                    return superTest(server).del(`/api/dynamicattributes/values/users/${userFromDB._id}?token=${token}`).expect(403);
                });
            });
        });
    });

    it('responds to DELETE/values/:modelName/:id with an id of an existing entity which does not belong to the same client as the logged in user with 403', function() {
        return db.get('users').findOne({name: '1_0_0'}).then(function(userFromDB){ //client 1 
            return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ //client 0 
                return superTest(server).del(`/api/dynamicattributes/values/users/${userFromDB._id}?token=${token}`).expect(403);
            });
        });
    });

////////////////////////// INVALID PARAMETERS ////////////////////////////////    
    
    it('responds to GET/model/:modelName without giving a modelName with 400', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
            return superTest(server).get(`/api/dynamicattributes/model?token=${token}`).expect(400);
        });
    });
    
    it('responds to GET/model/:modelName with invalid modelName with 400', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token) {
            var modelName = 'fakeName';
            return superTest(server).get(`/api/dynamicattributes/model/${modelName}?token=${token}`).expect(400);
        });
    });
    
    it('responds to GET/:id without giving an id with 400', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
            return superTest(server).get(`/api/dynamicattributes?token=${token}`).expect(400);
        });
    });
    
    it('responds to GET/:id with invalid id with 400', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
            return superTest(server).get(`/api/dynamicattributes/invalid?token=${token}`).expect(400);
        });
    });

    it('responds to GET/:id with not existing dynamic attribute id with 403', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
            return superTest(server).get(`/api/dynamicattributes/999999999999999999999999?token=${token}`).expect(403);
        });
    });
    
    it('responds to GET/option/:id without giving an id with 400', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
            return superTest(server).get(`/api/dynamicattributes/option?token=${token}`).expect(400);
        }); 
    });
    
    it('responds to GET/option/:id with invalid id with 400', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
            return superTest(server).get(`/api/dynamicattributes/option/invalid?token=${token}`).expect(400);
        });        
    });

    it('responds to GET/option/:id with not existing dynamic attribute option id with 403', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
            return superTest(server).get(`/api/dynamicattributes/option/999999999999999999999999?token=${token}`).expect(403);
        });  
    });
    
    it('responds to GET/options/:id without giving an id with 400', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
            return superTest(server).get(`/api/dynamicattributes/options?token=${token}`).expect(400);
        }); 
    });
    
    it('responds to GET/options/:id with invalid id with 400', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
            return superTest(server).get(`/api/dynamicattributes/options/invalid?token=${token}`).expect(400);
        });  
    });

    it('responds to GET/options/:id with not existing dynamic attribute id with 403', function() {
        return testHelpers.doLoginAndGetToken('1_0_0', 'test').then(function(token){
            return superTest(server).get(`/api/dynamicattributes/options/999999999999999999999999?token=${token}`).expect(403);
        });  
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

    it('responds to DELTE/:id without giving an id with 400', function() {
        return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
            return superTest(server).del(`/api/dynamicattributes/?token=${token}`).expect(400);
        });
    });
    
    it('responds to DELTE/:id with invalid id with 400', function() {
        return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
            return superTest(server).del(`/api/dynamicattributes/invalidId?token=${token}`).expect(400);
        });
    });

    it('responds to DELTE/:id with not existing dynamic attribute id with 403', function() {
        return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
            return superTest(server).del(`/api/dynamicattributes/999999999999999999999999?token=${token}`).expect(403);
        });
    });

    it('responds to DELTE/option/:id without giving an id with 400', function() {
        return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
            return superTest(server).del(`/api/dynamicattributes/option?token=${token}`).expect(400);
        });
    });
    
    it('responds to DELTE/option/:id with invalid id with 400', function() {
        return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
            return superTest(server).del(`/api/dynamicattributes/option/invalidId?token=${token}`).expect(400);
        });
    });

    it('responds to DELTE/option/:id with not existing dynamic attribute option id with 403', function() {
        return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
            return superTest(server).del(`/api/dynamicattributes/option/999999999999999999999999?token=${token}`).expect(403);
        });
    });

    it('responds to DELTE/values/:modelName/:id without giving a model name and entity id with 400', function() {
        return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
            return superTest(server).del(`/api/dynamicattributes/values?token=${token}`).expect(400);
        });
    });

    it('responds to DELTE/values/:modelName/:id without giving an entity id but with giving a modelName with 400', function() {
        return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
            return superTest(server).del(`/api/dynamicattributes/values/users?token=${token}`).expect(400);
        });
    });
    
    it('responds to DELTE/values/:modelName/:id with invalid modelName with 400', function() {
        return db.get('users').findOne({name: '0_0_0'}).then(function(userFromDB){
            return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
                var fakeModelName = 'lalala';
                var entityId = userFromDB._id;
                return superTest(server).del(`/api/dynamicattributes/values/${fakeModelName}/${entityId}?token=${token}`).expect(400);
            });
        });
    });
    
    it('responds to DELTE/values/:modelName/:id with invalid entity id with 400', function() {
        return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
            return superTest(server).del(`/api/dynamicattributes/values/users/invalidId?token=${token}`).expect(400);
        });
    });

    it('responds to DELTE/values/:modelName/:id with not existing entity id with 403', function() {
        return testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
            return superTest(server).del(`/api/dynamicattributes/values/users/999999999999999999999999?token=${token}`).expect(403);
        });
    });

////////////////////////// POSITIVE TESTS ////////////////////////////////////    

    xit('responds to GET/model/:modelName where no dyanmic attributes exist for the given modelName with an empty list', function() {
    });

    xit('responds to GET/model/:modelName with a list containing all dynamic attributes of the given modelName', function() {
    });

    it('responds to GET/:id with all details of the dynamic attribute', function(done) {
        db.get('dynamicattributes').findOne({type: 'picklist'}).then(function(attributeFromDB){
            testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){
                superTest(server).get(`/api/dynamicattributes/${attributeFromDB._id}?token=${token}`).then(function(res, err){
                    if(err){return done(err);}
                    var attributeFromApi = res.body;
                    //console.log(attributeFromApi);
                    //TODO implement actual comparisson between attributeFromDB and attributeFromApi
                    done();
                });
            });
        });
    });

    it('responds to GET/option/:id with all details of the dynamic attribute option', function(done) {
        db.get('clients').findOne({name: '0'}).then(function(client0){ 
            db.get('dynamicattributes').findOne({type: 'picklist', clientId: client0._id}).then(function(attributeFromDB){ //attribute from client 0
                db.get('dynamicattributeoptions').findOne({dynamicAttributeId: attributeFromDB._id}).then(function(attributeOptionFromDB){
                    testHelpers.doLoginAndGetToken('0_0_0', 'test').then(function(token){ //user from client 0
                        superTest(server).get(`/api/dynamicattributes/option/${attributeOptionFromDB._id}?token=${token}`).then(function(res, err){
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

    it('responds to GET/options/:id with a list of all options and their details of the dynamic attribute', function(done) {
        db.get('clients').findOne({name: '0'}).then(function(client0){
            db.get('dynamicattributes').findOne({type: 'picklist', clientId: client0._id}).then(function(attributeFromDB){
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

    xit('responds to GET/values/:modelName/:id where no dynamic attribute values exist for the given entity id with an empty list', function(done) {
    });

    xit('responds to GET/values/:modelName/:id with a list containing all dynamic attribute values (and all of their details) defined for the given entity id', function(done) {
    });

    xit('responds to GET/types with a list of all possible dynamic attribute types', function(done) {
    });

    xit('responds to POST/ with a new dynamic attribute containing generated _id and clientId', function(done) {
    });

    xit('responds to POST/option with a new dynamic attribute option containing generated _id and clientId', function(done) {
    });

    xit('responds to POST/values/:modelName/:id with a list of new dynamic attribute values containing generated _id\'s, clientId\'s and entityId\'s', function(done) {
    });

    xit('responds to PUT/:id with an updated dynamic attribute', function(done) {
    });

    xit('responds to PUT/option/:id with an updated dynamic attribute option', function(done) {
    });

    xit('responds to PUT/values/:modelName/:id with a list of updated dynamic attribute values', function(done) {
    });

    xit('responds to DELETE/:id with a correct id with 204 and deletes the dynamic attribute, all of its dynamic attribute options and all of its dynamic attribute values from the database', function(done) {
    });

    xit('responds to DELETE/option/:id with a correct id with 204 and deletes the dynamic attribute option and all dynamic attribute values which use it from the database', function(done) {
    });

    xit('responds to DELETE/values/:modelName/:id with correct modelName and id with 204 and deletes all dynamic attribute values for the entity from the database', function(done) {
    });

});
