/**
 * UNIT Tests for api/dynamicattributes
 */
var assert = require('assert');
var superTest = require('supertest');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var bcryptjs =  require('bcryptjs');
var co = require('../../utils/constants');
var monk = require('monk');

describe('API dynamicattributes', function() {

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
            var attributeFromApi = (await th.get(`/api/${co.apis.dynamicattributes}/${attributeFromDatabase._id}?token=${token}`).expect(200)).body;
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
            return th.get(`/api/${co.apis.dynamicattributes}/model/?token=${token}`).expect(400);
        });
        
        it('responds with invalid modelName with 400', async function() {
            var token = await th.defaults.login();
            return th.get(`/api/${co.apis.dynamicattributes}/model/invalidModelName?token=${token}`).expect(400);
        });

        it('responds where no dynamic attributes exist for the given modelName with an empty list', async function() {
            var modelName = co.collections.users.name;
            await db.get(co.collections.dynamicattributes.name).remove({ modelName: modelName });
            var token = await th.defaults.login();
            var attributes = (await th.get(`/api/${co.apis.dynamicattributes}/model/${modelName}?token=${token}`).expect(200)).body;
            assert.strictEqual(attributes.length, 0);
        });

        it('responds with a list containing all dynamic attributes of the given modelName', async function() {
            var modelName = co.collections.users.name;
            var token = await th.defaults.login();
            var client = await th.defaults.getClient();
            var attributesFromDb = await db.get(co.collections.dynamicattributes.name).find({clientId: client._id});
            var attributesFromApi = (await th.get(`/api/${co.apis.dynamicattributes}/model/${modelName}?token=${token}`).expect(200)).body;
            for (var i = 0; i < attributesFromApi.length; i++) {
                ['_id', 'modelName', 'name_en', 'clientId', 'type'].forEach((key) => {
                    assert.strictEqual(attributesFromApi[i][key].toString(), attributesFromDb[i][key].toString());
                });
            }
        });

    });

    describe('GET/option/:id', function() {

        var optionApi = `${co.apis.dynamicattributes}/option`;

        th.apiTests.getId.defaultNegative(optionApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, co.collections.dynamicattributeoptions.name);
        th.apiTests.getId.clientDependentNegative(optionApi, co.collections.dynamicattributeoptions.name);

        it('responds with all details of the dynamic attribute option', async function() {
            var client = await th.defaults.getClient();
            var attributeFromDB = await db.get(co.collections.dynamicattributes.name).findOne({type: 'picklist', clientId: client._id});
            var attributeOptionFromDB = await db.get(co.collections.dynamicattributeoptions.name).findOne({dynamicAttributeId: attributeFromDB._id});
            var token = await th.defaults.login();
            var attributeOptionFromApi = (await th.get(`/api/${co.apis.dynamicattributes}/option/${attributeOptionFromDB._id}?token=${token}`).expect(200)).body;
            ['_id', 'dynamicAttributeId', 'clientId', 'text_en'].forEach((key) => {
                assert.strictEqual(attributeOptionFromApi[key].toString(), attributeOptionFromDB[key].toString());
            });
        });

    });

    describe('GET/options/:id', function() {

        var optionsApi = `${co.apis.dynamicattributes}/options`;

        th.apiTests.getId.defaultNegative(optionsApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, co.collections.dynamicattributes.name);
        th.apiTests.getId.clientDependentNegative(optionsApi, co.collections.dynamicattributes.name);

        it('responds with a list of all options and their details of the dynamic attribute', async function() {
            var client = await th.defaults.getClient();
            var attributeFromDB = await db.get(co.collections.dynamicattributes.name).findOne({type: 'picklist', clientId: client._id});
            var optionsFromDb = await db.get(co.collections.dynamicattributeoptions.name).find({dynamicAttributeId: attributeFromDB._id});
            var token = await th.defaults.login();
            var optionsFromApi = (await th.get(`/api/${co.apis.dynamicattributes}/options/${attributeFromDB._id}?token=${token}`).expect(200)).body;
            assert.strictEqual(optionsFromApi.length, optionsFromDb.length);
            for (var i = 0; i < optionsFromApi.length; i++) {
                ['_id', 'dynamicAttributeId', 'clientId', 'text_en'].forEach((key) => {
                    assert.strictEqual(optionsFromApi[i][key].toString(), optionsFromDb[i][key].toString());
                });
            }
        });

    });

    describe('GET/values/:modelName/:id', function() {

        var api = co.apis.dynamicattributes + '/values/users';
        th.apiTests.getId.defaultNegative(api, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, co.collections.users.name);
        th.apiTests.getId.clientDependentNegative(api, co.collections.users.name);
    
        it('responds without giving a model name and entity id with 400', async function() {
            var token = await th.defaults.login();
            await th.get(`/api/${co.apis.dynamicattributes}/values/?token=${token}`).expect(400);
        });
        
        it('responds without giving an entity id but with giving a modelName with 404', async function() {
            var token = await th.defaults.login();
            await th.get(`/api/${co.apis.dynamicattributes}/values/users/?token=${token}`).expect(404);
        });
        
        it('responds with invalid modelName with 403', async function() {
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.get(`/api/${co.apis.dynamicattributes}/values/invalidModelName/${user._id.toString()}?token=${token}`).expect(403);
        });

        it('responds with invalid entity id with 400', async function() {
            var token = await th.defaults.login();
            await th.get(`/api/${co.apis.dynamicattributes}/values/users/invalidId?token=${token}`).expect(400);
        });

        it('responds with not existing entity id with 400', async function() {
            var token = await th.defaults.login();
            await th.get(`/api/${co.apis.dynamicattributes}/values/users/999999999999999999999999}?token=${token}`).expect(400);
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

    function createTestDynamicAttribute(type) {
        return th.defaults.getClient().then(function(client) {
            return Promise.resolve({
                modelName: co.collections.users.name,
                clientId: client._id,
                type: type || 'text',
                name_en: 'Name EN',
                name_de: 'Name DE'
            });
        });
    }

    describe('POST/', function() {

        //th.apiTests.post.defaultNegative(co.apis.dynamicattributes, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, createTestDynamicAttribute)

        it('responds without giving a modelName with 400', async function() {
            var attributeToSend = await createTestDynamicAttribute();
            delete attributeToSend.modelName;
            var token = await th.defaults.login();
            await th.post(`/api/${co.apis.dynamicattributes}?token=${token}`).send(attributeToSend).expect(400);
        });

        it('responds with an invalid modelName with 400', async function() {
            var attributeToSend = await createTestDynamicAttribute();
            attributeToSend.modelName = 'invalidModelName';
            var token = await th.defaults.login();
            await th.post(`/api/${co.apis.dynamicattributes}?token=${token}`).send(attributeToSend).expect(400);
        });

        it('responds without giving name_en with 400', async function() {
            var attributeToSend = await createTestDynamicAttribute();
            delete attributeToSend.name_en;
            var token = await th.defaults.login();
            await th.post(`/api/${co.apis.dynamicattributes}?token=${token}`).send(attributeToSend).expect(400);
        });

        it('responds without giving a type with 400', async function() {
            var attributeToSend = await createTestDynamicAttribute();
            delete attributeToSend.type;
            var token = await th.defaults.login();
            await th.post(`/api/${co.apis.dynamicattributes}?token=${token}`).send(attributeToSend).expect(400);
        });

        it('responds with an invalid type with 400', async function() {
            var attributeToSend = await createTestDynamicAttribute();
            attributeToSend.type = 'invalidType';
            var token = await th.defaults.login();
            await th.post(`/api/${co.apis.dynamicattributes}?token=${token}`).send(attributeToSend).expect(400);
        });

        it('responds with a new dynamic attribute containing generated _id and clientId', async function() {
            var attributeToSend = await createTestDynamicAttribute();
            var token = await th.defaults.login();
            var createdAttribute = (await th.post(`/api/${co.apis.dynamicattributes}?token=${token}`).send(attributeToSend).expect(200)).body;
            assert.ok(createdAttribute._id);
            Object.keys(attributeToSend).forEach((key) => {
                assert.strictEqual(createdAttribute[key].toString(), attributeToSend[key].toString());
            });
        });

    });

    function createTestDynamicAttributeOption(type) {
        return createTestDynamicAttribute(type).then(function(attr) {
            return db.get(co.collections.dynamicattributes.name).insert(attr);
        }).then(function(insertedAttribute) {
            return Promise.resolve({
                dynamicAttributeId: insertedAttribute._id,
                clientId: insertedAttribute.clientId,
                text_en: 'Text EN',
                text_de: 'Text DE'
            });
        });
    }

    describe('POST/option', function() {

        var optionApi = `${co.apis.dynamicattributes}/option`;

        th.apiTests.post.defaultNegative(optionApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, createTestDynamicAttributeOption)

        it('responds without giving a dynamicAttributeId with 400', async function() {
            var optionToSend = await createTestDynamicAttributeOption();
            delete optionToSend.dynamicAttributeId;
            var token = await th.defaults.login();
            await th.post(`/api/${co.apis.dynamicattributes}/option?token=${token}`).send(optionToSend).expect(400);
        });

        it('responds with an invalid dynamicAttributeId with 400', async function() {
            var token = await th.defaults.login();
            var optionToSend = await createTestDynamicAttributeOption(co.dynamicAttributeTypes.picklist);
            optionToSend.dynamicAttributeId = 'invalidId';
            await th.post(`/api/${co.apis.dynamicattributes}/option?token=${token}`).send(optionToSend).expect(400);
        });

        it('responds with a not existing dynamicAttributeId with 400', async function() {
            var token = await th.defaults.login();
            var optionToSend = await createTestDynamicAttributeOption(co.dynamicAttributeTypes.picklist);
            optionToSend.dynamicAttributeId = '999999999999999999999999';
            await th.post(`/api/${co.apis.dynamicattributes}/option?token=${token}`).send(optionToSend).expect(400);
        });

        it('responds without giving text_en with 400', async function() {
            var token = await th.defaults.login();
            var optionToSend = await createTestDynamicAttributeOption(co.dynamicAttributeTypes.picklist);
            delete optionToSend.text_en;
            await th.post(`/api/${co.apis.dynamicattributes}/option?token=${token}`).send(optionToSend).expect(400);
        });

        it('responds 400 when the type of the attribute is not picklist', async function() {
            var token = await th.defaults.login();
            var optionToSend = await createTestDynamicAttributeOption(co.dynamicAttributeTypes.text);
            await th.post(`/api/${co.apis.dynamicattributes}/option?token=${token}`).send(optionToSend).expect(400);
        });

        it('responds with a new dynamic attribute option containing generated _id and clientId', async function() {
            var token = await th.defaults.login();
            var optionToSend = await createTestDynamicAttributeOption(co.dynamicAttributeTypes.picklist);
            var createdOption = (await th.post(`/api/${co.apis.dynamicattributes}/option?token=${token}`).send(optionToSend).expect(200)).body;
            assert.ok(createdOption._id);
            Object.keys(optionToSend).forEach((key) => {
                assert.strictEqual(createdOption[key].toString(), optionToSend[key].toString());
            });
        });

    });

    async function createTestDynamicAttributeValues() {
        var client = await th.defaults.getClient();
        var user = await th.defaults.getUser();
        var attributes = th.dbObjects.dynamicattributes.filter((da) => da.modelName === co.collections.users.name && da.clientId && da.clientId.toString() === client._id.toString());
        var values = [];
        attributes.forEach((da) => {
            var value;
            if (da.type === 'text') {
                value = 'new  text';
            } else if (da.type === 'boolean') {
                value = true;
            } else if (da.type === 'picklist') {
                value = th.dbObjects.dynamicattributeoptions.find((o) => o.dynamicAttributeId.toString() === da._id.toString())._id;
            }
            values.push({daId: da._id, value: value });
        });
        return values;
    }

    describe('POST/values/:modelName/:id', function() {

        it('responds without authentication with 403', async function() {
            var valuesToSend = await createTestDynamicAttributeValues();
            var user = await th.defaults.getUser('0_0_0');
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}`).send(valuesToSend).expect(403);
        });

        it('responds without write permission with 403', async function() {
            var valuesToSend = await createTestDynamicAttributeValues();
            var user = await th.defaults.getUser('0_0_0');
            var token = await th.defaults.login();
            await th.removeWritePermission('0_0_0', co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES);
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).send(valuesToSend).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', async function() {
            var valuesToSend = await createTestDynamicAttributeValues();
            var user = await th.defaults.getUser('0_0_0');
            var token = await th.defaults.login();
            await th.removeClientModule('0', co.modules.base);
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).send(valuesToSend).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', async function() {
            var valuesToSend = await createTestDynamicAttributeValues();
            var user = await th.defaults.getUser('0_0_0');
            var token = await th.defaults.login('0_0_ADMIN0');
            await th.removeClientModule('0', co.modules.base);
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).send(valuesToSend).expect(403);
        });

        it('responds with an id of an existing entity which does not belong to the same client as the logged in user with 403', async function() {
            var valuesToSend = await createTestDynamicAttributeValues();
            var user = await th.defaults.getUser('0_0_0');
            var token = await th.defaults.login(); // 1_0_0
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).send(valuesToSend).expect(403);
        });

        it('responds without giving a model name and entity id with 404', async function() {
            var valuesToSend = await createTestDynamicAttributeValues();
            var user = await th.defaults.getUser('1_0_0');
            var token = await th.defaults.login();
            await th.post(`/api/${co.apis.dynamicattributes}/values/?token=${token}`).send(valuesToSend).expect(404);
        });

        it('responds without giving an entity id but with giving a modelName with 404', async function() {
            var valuesToSend = await createTestDynamicAttributeValues();
            var token = await th.defaults.login();
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/?token=${token}`).send(valuesToSend).expect(404);
        });

        it('responds without giving values with 400', async function() {
            var user = await th.defaults.getUser('1_0_0');
            var token = await th.defaults.login();
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).send().expect(400);
        });

        it('responds without giving a dynamicAttributeId in one of the values with 400', async function() {
            var valuesToSend = await createTestDynamicAttributeValues();
            delete valuesToSend[0].daId;
            var user = await th.defaults.getUser('1_0_0');
            var token = await th.defaults.login();
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).send(valuesToSend).expect(400);
        });
        
        it('responds with invalid modelName with 400', async function() {
            var valuesToSend = await createTestDynamicAttributeValues();
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.post(`/api/${co.apis.dynamicattributes}/values/invalidModelName/${user._id}?token=${token}`).send(valuesToSend).expect(400);
        });

        it('responds with an invalid entity id with 400', async function() {
            var valuesToSend = await createTestDynamicAttributeValues();
            var token = await th.defaults.login();
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/invalidId?token=${token}`).send(valuesToSend).expect(400);
        });

        it('responds with a not existing entity id with 403', async function() {
            var valuesToSend = await createTestDynamicAttributeValues();
            var token = await th.defaults.login();
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/999999999999999999999999?token=${token}`).send(valuesToSend).expect(403);
        });

        it('responds with an invalid dynamicAttributeId with 400', async function() {
            var valuesToSend = await createTestDynamicAttributeValues();
            valuesToSend[0].daId = 'invalidId';
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).send(valuesToSend).expect(400);
        });

        it('responds with a not existing dynamicAttributeId with 400', async function() {
            var valuesToSend = await createTestDynamicAttributeValues();
            valuesToSend[0].daId = '999999999999999999999999';
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).send(valuesToSend).expect(400);
        });

        it('responds with a dynamicAttributeId which belongs to another client with 400', async function() {
            var client = await th.defaults.getClient('0');
            var valuesToSend = await createTestDynamicAttributeValues();
            var otherDynamicAttribute = await db.get(co.collections.dynamicattributes.name).findOne({ clientId: client._id, modelName: co.collections.users.name, type: co.dynamicAttributeTypes.text });
            valuesToSend[0].daId = otherDynamicAttribute._id.toString();
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).send(valuesToSend).expect(400);
        });

        it('updates the given values', async function() {
            var valuesToSend = await createTestDynamicAttributeValues();
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            var valueIds = (await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).send(valuesToSend).expect(200)).body;
            var monkedIds = valueIds.map((id) => monk.id(id));
            var valuesFromDatabase = await db.get(co.collections.dynamicattributevalues.name).find({ _id: { $in : monkedIds } });
            for (var i = 0; i < valuesToSend.length; i++) {
                var valueToSend = valuesToSend[i];
                var valueFromDatabase = valuesFromDatabase[i];
                assert.ok(valueFromDatabase.clientId);
                assert.ok(valueFromDatabase.entityId);
                assert.strictEqual(valueFromDatabase.dynamicAttributeId.toString(), valueToSend.daId.toString());
                assert.strictEqual(valueFromDatabase.value.toString(), valueToSend.value.toString());
            }
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

        it('responds with a new modelName with an updated record but with old modelName', async function() {
            var token = await th.defaults.login();
            var attributeToSend = await createPutTestDynamicAttribute();
            attributeToSend.modelName = co.collections.usergroups.name;
            var updatedAttribute = (await th.put(`/api/${co.apis.dynamicattributes}/${attributeToSend._id}?token=${token}`).send(attributeToSend).expect(200)).body;
            assert.strictEqual(updatedAttribute.modelName, co.collections.users.name);
        });

        it('responds with a new type with an updated record but with old type', async function() {
            var token = await th.defaults.login();
            var attributeToSend = await createPutTestDynamicAttribute();
            attributeToSend.type = co.dynamicAttributeTypes.boolean;
            var updatedAttribute = (await th.put(`/api/${co.apis.dynamicattributes}/${attributeToSend._id}?token=${token}`).send(attributeToSend).expect(200)).body;
            assert.strictEqual(updatedAttribute.type, co.dynamicAttributeTypes.text);
        });

        it('responds with an updated dynamic attribute', async function() {
            var token = await th.defaults.login();
            var attributeToSend = await createPutTestDynamicAttribute();
            attributeToSend.name_en = 'updated name en';
            attributeToSend.name_de = 'updated name de';
            var updatedAttribute = (await th.put(`/api/${co.apis.dynamicattributes}/${attributeToSend._id}?token=${token}`).send(attributeToSend).expect(200)).body;
            assert.strictEqual(updatedAttribute.name_en, attributeToSend.name_en);
            assert.strictEqual(updatedAttribute.name_de, attributeToSend.name_de);
        });

    });

    describe('PUT/option/:id', function() {

        function createPutTestDynamicAttributeOption() {
            return createTestDynamicAttributeOption().then(function(option) {
                return db.get(co.collections.dynamicattributeoptions.name).insert(option);
            });
        }

        var optionApi = `${co.apis.dynamicattributes}/option`;

        th.apiTests.put.defaultNegative(optionApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, createPutTestDynamicAttributeOption);
        th.apiTests.put.clientDependentNegative(optionApi, createPutTestDynamicAttributeOption);

        it('responds with a new dynamicAttributeId with an updated record but with old dynamicAttributeId', async function() {
            var token = await th.defaults.login();
            var optionToSend = await createPutTestDynamicAttributeOption();
            var otherDynamicAttribute = await db.get(co.collections.dynamicattributes.name).findOne({ clientId: optionToSend.clientId, modelName: co.collections.users.name, type: co.dynamicAttributeTypes.text });
            var originalAttributeId = optionToSend.dynamicAttributeId;
            optionToSend.dynamicAttributeId = otherDynamicAttribute._id;
            var updatedOption = (await th.put(`/api/${optionApi}/${optionToSend._id}?token=${token}`).send(optionToSend).expect(200)).body;
            assert.strictEqual(updatedOption.dynamicAttributeId, originalAttributeId.toString());
        });

        it('responds with an updated dynamic attribute option', async function() {
            var token = await th.defaults.login();
            var optionToSend = await createPutTestDynamicAttributeOption();
            optionToSend.text_en = 'new text en';
            optionToSend.text_de = 'new text de';
            var updatedOption = (await th.put(`/api/${optionApi}/${optionToSend._id}?token=${token}`).send(optionToSend).expect(200)).body;
            assert.strictEqual(updatedOption.text_en, optionToSend.text_en);
            assert.strictEqual(updatedOption.text_de, optionToSend.text_de);
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

        it('responds with a correct id with 204 and deletes the dynamic attribute, all of its dynamic attribute options and all of its dynamic attribute values from the database', async function() {
            var token = await th.defaults.login();
            var client = await th.defaults.getClient();
            var attribute = await th.dbObjects.dynamicattributes.find((da) => da.clientId !== null && da.clientId.toString() === client._id.toString() && da.type === co.dynamicAttributeTypes.picklist);
            await th.del(`/api/${co.apis.dynamicattributes}/${attribute._id}?token=${token}`).expect(204);
            var attributeAfterDeletion = await db.get(co.collections.dynamicattributes.name).findOne(attribute._id);
            var options = await db.get(co.collections.dynamicattributeoptions.name).find({dynamicAttributeId:attribute._id});
            var values = await db.get(co.collections.dynamicattributevalues.name).find({dynamicAttributeId:attribute._id});
            assert.ok(!attributeAfterDeletion);
            assert.strictEqual(options.length, 0);
            assert.strictEqual(values.length, 0);
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

        var optionApi = `${co.apis.dynamicattributes}/option`;

        th.apiTests.delete.defaultNegative(optionApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, createDeleteTestDynamicAttributeOption);
        th.apiTests.delete.clientDependentNegative(optionApi, createDeleteTestDynamicAttributeOption);

        it('responds with a correct id with 204 and deletes the dynamic attribute option and all dynamic attribute values which use it from the database', async function() {
            var token = await th.defaults.login();
            var client = await th.defaults.getClient();
            var option = await th.dbObjects.dynamicattributeoptions.find((dao) => dao.clientId !== null && dao.clientId.toString() === client._id.toString());
            await th.del(`/api/${optionApi}/${option._id}?token=${token}`).expect(204);
            var optionAfterDeletion = await db.get(co.collections.dynamicattributeoptions.name).findOne(option._id);
            var values = await db.get(co.collections.dynamicattributevalues.name).find({value:option._id});
            assert.ok(!optionAfterDeletion);
            assert.strictEqual(values.length, 0);
        });

    });

    describe('DELETE/values/:modelName/:id', function() {

        it('responds without authentication with 403', async function() {
            var user = await th.defaults.getUser();
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}`).expect(403);
        });

        it('responds without write permission with 403', async function() {
            var user = await th.defaults.getUser();
            await th.removeWritePermission(th.defaults.user, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES);
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', async function() {
            var user = await th.defaults.getUser();
            await th.removeClientModule(th.defaults.client, co.modules.base);
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', async function() {
            var user = await th.defaults.getUser();
            await th.removeClientModule(th.defaults.client, co.modules.base);
            var token = await th.defaults.login(th.defaults.adminUser);
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).expect(403);
        });

        it('responds with an id of an existing entity which does not belong to the same client as the logged in user with 403', async function() {
            var user = await th.defaults.getUser('0_0_0');
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).expect(403);
        });

        it('responds without giving a model name and entity id with 400', async function() {
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/?token=${token}`).expect(400);
        });

        it('responds without giving an entity id but with giving a modelName with 404', async function() {
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/?token=${token}`).expect(404);
        });
        
        it('responds with invalid modelName with 400', async function() {
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/invalidModelName/${user._id}?token=${token}`).expect(400);
        });
        
        it('responds with invalid entity id with 400', async function() {
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/invalidId?token=${token}`).expect(400);
        });

        it('responds with not existing entity id with 403', async function() {
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/999999999999999999999999?token=${token}`).expect(403);
        });

        it('responds with correct modelName and id with 204 and deletes all dynamic attribute values for the entity from the database', async function() {
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).expect(204);
            var valuesAfter = await db.get(co.collections.dynamicattributevalues.name).find({entityId:user._id});
            assert.strictEqual(valuesAfter.length, 0);
        });

    });

});
