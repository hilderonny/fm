/**
 * UNIT Tests for api/dynamicattributes
 */
var assert = require('assert');
var superTest = require('supertest');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var bcryptjs =  require('bcryptjs');
var co = require('../../utils/constants');

describe('API dynamicattributes', function() {

    var optionApi = `${co.apis.dynamicattributes}/option`;
    var optionsApi = `${co.apis.dynamicattributes}/options`;
    
    // Clear and prepare database with clients, user groups and users
    beforeEach(async function() {
        await th.cleanDatabase();
        await th.prepareClients();
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareFolders();
        await th.prepareDocuments();
        await th.prepareDynamicAttributes();
        await th.prepareDynamicAttributeOptions();
        await th.prepareDynamicAttributeValues();
        return Promise.resolve();
    });

    describe('GET/:id', function() {

        th.apiTests.getId.defaultNegative(co.apis.dynamicattributes, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, co.collections.dynamicattributes.name);
        th.apiTests.getId.clientDependentNegative(co.apis.dynamicattributes, co.collections.dynamicattributes.name);

        it('responds with all details of the dynamic attribute', async function() {
            // Siehe https://stackoverflow.com/a/28250697/5964970
            // await erfordert NodeJS 8.2.1 (wird vorerst nur auf Testsystemen und auf fm.avorium.de installiert)
            var client = await th.defaults.getClient();
            var attributeFromDatabase = await db.get(co.collections.dynamicattributes.name).findOne({type: 'picklist', clientId: client._id});
            var token = await th.defaults.login();
            var attributeFromApi = (await th.get(`/api/dynamicattributes/${attributeFromDatabase._id}?token=${token}`).expect(200)).body;
            ['_id', 'modelName', 'name_en', 'clientId', 'type'].forEach((key) => {
                assert.strictEqual(attributeFromApi[key].toString(), attributeFromDatabase[key].toString());
            });
        });

    });

    describe('GET/model/:modelName', function() {

        var api = co.apis.dynamicattributes + '/model/users';
        th.apiTests.get.defaultNegative(api, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, co.collections.dynamicattributes.name);
    
        it('responds without giving a modelName with 400', async function() {
            var token = await th.defaults.login();
            return th.get(`/api/dynamicattributes/model/?token=${token}`).expect(400);
        });
        
        it('responds with invalid modelName with 400', async function() {
            var token = await th.defaults.login();
            return th.get(`/api/dynamicattributes/model/invalidModelName?token=${token}`).expect(400);
        });

        it('responds where no dynamic attributes exist for the given modelName with an empty list', async function() {
            var modelName = co.collections.users.name;
            await db.get(co.collections.dynamicattributes.name).remove({ modelName: modelName });
            var token = await th.defaults.login();
            var attributes = (await th.get(`/api/dynamicattributes/model/${modelName}?token=${token}`).expect(200)).body;
            assert.strictEqual(attributes.length, 0);
        });

        it('responds with a list containing all dynamic attributes of the given modelName', async function() {
            var modelName = co.collections.users.name;
            var token = await th.defaults.login();
            var client = await th.defaults.getClient();
            var attributesFromDb = await db.get(co.collections.dynamicattributes.name).find({clientId: client._id});
            var attributesFromApi = (await th.get(`/api/dynamicattributes/model/${modelName}?token=${token}`).expect(200)).body;
            for (var i = 0; i < attributesFromApi.length; i++) {
                ['_id', 'modelName', 'name_en', 'clientId', 'type'].forEach((key) => {
                    assert.strictEqual(attributesFromApi[i][key].toString(), attributesFromDb[i][key].toString());
                });
            }
        });

    });

    describe('GET/option/:id', function() {

        th.apiTests.getId.defaultNegative(optionApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, co.collections.dynamicattributeoptions.name);
        th.apiTests.getId.clientDependentNegative(optionApi, co.collections.dynamicattributeoptions.name);

        it('responds with all details of the dynamic attribute option', async function() {
            var client = await th.defaults.getClient();
            var attributeFromDB = await db.get(co.collections.dynamicattributes.name).findOne({type: 'picklist', clientId: client._id});
            var attributeOptionFromDB = await db.get(co.collections.dynamicattributeoptions.name).findOne({dynamicAttributeId: attributeFromDB._id});
            var token = await th.defaults.login();
            var attributeOptionFromApi = (await th.get(`/api/dynamicattributes/option/${attributeOptionFromDB._id}?token=${token}`).expect(200)).body;
            ['_id', 'dynamicAttributeId', 'clientId', 'text_en'].forEach((key) => {
                assert.strictEqual(attributeOptionFromApi[key].toString(), attributeOptionFromDB[key].toString());
            });
        });

    });

    describe('GET/options/:id', function() {

        th.apiTests.getId.defaultNegative(optionsApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, co.collections.dynamicattributes.name);
        th.apiTests.getId.clientDependentNegative(optionsApi, co.collections.dynamicattributes.name);

        it('responds with a list of all options and their details of the dynamic attribute', async function() {
            var client = await th.defaults.getClient();
            var attributeFromDB = await db.get(co.collections.dynamicattributes.name).findOne({type: 'picklist', clientId: client._id});
            var optionsFromDb = await db.get(co.collections.dynamicattributeoptions.name).find({dynamicAttributeId: attributeFromDB._id});
            var token = await th.defaults.login();
            var optionsFromApi = (await th.get(`/api/dynamicattributes/options/${attributeFromDB._id}?token=${token}`).expect(200)).body;
            assert.strictEqual(optionsFromApi.length, optionsFromDb.length);
            for (var i = 0; i < optionsFromApi.length; i++) {
                ['_id', 'dynamicAttributeId', 'clientId', 'text_en'].forEach((key) => {
                    assert.strictEqual(optionsFromApi[i][key].toString(), optionsFromDb[i][key].toString());
                });
            }
        });

    });

    describe.only('GET/values/:modelName/:id', function() {

        var api = co.apis.dynamicattributes + '/values/users';
        th.apiTests.getId.defaultNegative(api, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, co.collections.users.name);
        th.apiTests.getId.clientDependentNegative(api, co.collections.users.name);
    
        it('responds without giving a model name and entity id with 400', async function() {
            var token = await th.defaults.login();
            return th.get(`/api/${co.apis.dynamicattributes}/values/?token=${token}`).expect(400);
        });
        
        it('responds without giving an entity id but with giving a modelName with 404', async function() {
            var token = await th.defaults.login();
            return th.get(`/api/${co.apis.dynamicattributes}/values/users/?token=${token}`).expect(404);
        });
        
        it('responds with invalid modelName with 403', async function() {
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            return th.get(`/api/${co.apis.dynamicattributes}/values/invalidModelName/${user._id.toString()}?token=${token}`).expect(403);
        });

        it('responds with invalid entity id with 400', async function() {
            var token = await th.defaults.login();
            return th.get(`/api/${co.apis.dynamicattributes}/values/users/invalidId?token=${token}`).expect(400);
        });

        it('responds with not existing entity id with 400', async function() {
            var token = await th.defaults.login();
            return th.get(`/api/${co.apis.dynamicattributes}/values/users/999999999999999999999999}?token=${token}`).expect(400);
        });

        it('responds where no dynamic attribute values exist for the given entity id with an value list where the values are null', async function() {
            var user = await th.defaults.getUser();
            await db.get(co.collections.dynamicattributevalues.name).remove({entityId:user._id});
            var token = await th.defaults.login();
            var valuesFromApi = (await th.get(`/api/${co.apis.dynamicattributes}/values/users/${user._id.toString()}?token=${token}`).expect(200)).body;
            assert.notEqual(valuesFromApi.length, 0);
            var clientId = user.clientId.toString();
            valuesFromApi.forEach((dav) => {
                assert.ok(dav.type);
                assert.ok(dav.type._id);
                assert.ok(dav.type.type);
                assert.ok(dav.options);
                assert.strictEqual(dav.type.clientId, clientId);
                assert.strictEqual(dav.value, null);
            });
        });

        it('responds with a list containing all dynamic attribute values (and all of their details) defined for the given entity id', async function() {
            var user = await th.defaults.getUser();
            var valuesFromDatabase = await db.get(co.collections.dynamicattributevalues.name).find({entityId: user._id});
            var token = await th.defaults.login();
            var valuesFromApi = (await th.get(`/api/${co.apis.dynamicattributes}/values/users/${user._id.toString()}?token=${token}`).expect(200)).body;
            var clientId = user.clientId.toString();
            for (var i = 0; i < valuesFromDatabase.length; i++) {
                var valueFromDatabase = valuesFromDatabase[i];
                var valueFromApi = valuesFromApi.find((v) => v.type._id === valueFromDatabase.dynamicAttributeId.toString());
                assert.ok(valueFromApi);
                assert.strictEqual(valueFromApi.value.toString(), valueFromDatabase.value.toString());
                assert.strictEqual(valueFromApi.type.clientId, valueFromDatabase.clientId.toString());
            }
        });

    });

    function createTestDynamicAttribute() {
        return db.get(co.collections.clients.name).findOne({name:'1'}).then(function(client) {
            return Promise.resolve({
                modelName: co.collections.users.name,
                clientId: client._id,
                type: 'text',
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

        it('responds without giving an entity id but with giving a modelName with 404', function() {
            return th.doLoginAndGetToken('0_0_0', 'test').then(function(token){ 
                return th.del(`/api/dynamicattributes/values/users?token=${token}`).expect(404);
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
