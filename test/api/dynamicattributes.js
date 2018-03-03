/**
 * UNIT Tests for api/dynamicattributes
 */
var assert = require('assert');
var th = require('../testhelpers');
var bcryptjs =  require('bcryptjs');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('API dynamicattributes', () => {

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareFolders();
        await th.prepareDocuments();
        await th.preparePredefinedDynamicAttibutesForClient("client0");
        await th.prepareRelations();
    });

    describe('GET/:id', () => {

        th.apiTests.getId.defaultNegative(co.apis.dynamicattributes, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, co.collections.dynamicattributes.name);
        th.apiTests.getId.clientDependentNegative(co.apis.dynamicattributes, co.collections.dynamicattributes.name);

        it('responds with all details of the dynamic attribute', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var attributeFromApi = (await th.get(`/api/${co.apis.dynamicattributes}/client0_da0?token=${token}`).expect(200)).body;
            assert.ok(attributeFromApi);
            assert.strictEqual(attributeFromApi._id, "client0_da0");
            assert.strictEqual(attributeFromApi.modelName, "users");
            assert.strictEqual(attributeFromApi.name_en, "Gewicht");
            assert.strictEqual(attributeFromApi.name_de, "Gewicht");
            assert.strictEqual(attributeFromApi.clientId, "client0");
            assert.strictEqual(attributeFromApi.type, "text");
            assert.strictEqual(attributeFromApi.identifier, "gewicht");
            assert.strictEqual(attributeFromApi.isInactive, false);
        });

    });

    describe('GET/model/:modelName', () => {

        var api = co.apis.dynamicattributes + '/model/users';
        th.apiTests.get.defaultNegative(api, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES);
    
        it('responds without giving a modelName with 404', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.get(`/api/${co.apis.dynamicattributes}/model/?token=${token}`).expect(404);
        });
        
        it('responds with invalid modelName with empty list', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var das = (await th.get(`/api/${co.apis.dynamicattributes}/model/invalidModelName?token=${token}`).expect(200)).body;
            assert.strictEqual(das.length, 0);
        });

        it('responds where no dynamic attributes exist for the given modelName with an empty list', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var attributes = (await th.get(`/api/${co.apis.dynamicattributes}/model/activities?token=${token}`).expect(200)).body;
            assert.strictEqual(attributes.length, 0);
        });

        it('responds with a list containing all dynamic attributes of the given modelName', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var das = (await th.get(`/api/${co.apis.dynamicattributes}/model/users?token=${token}`).expect(200)).body;
            assert.strictEqual(das.length, 4);
            assert.strictEqual(das[0]._id, "client0_da0");
            assert.strictEqual(das[1]._id, "client0_da1");
            assert.strictEqual(das[2]._id, "client0_da2");
            assert.strictEqual(das[3]._id, "client0_da3");
            // Stichprobenhaft
            assert.strictEqual(das[0].modelName, "users");
            assert.strictEqual(das[0].name_en, "Gewicht");
            assert.strictEqual(das[0].name_de, "Gewicht");
            assert.strictEqual(das[0].clientId, "client0");
            assert.strictEqual(das[0].type, "text");
            assert.strictEqual(das[0].identifier, "gewicht");
            assert.strictEqual(das[0].isInactive, false);
        });

    });

    describe('GET/models', () =>{

        var mmodelsApi = co.apis.dynamicattributes + '/models';
        th.apiTests.get.defaultNegative(mmodelsApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES);

        it('responds with a list of all models that can have dynamic attributes', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var allModelsFromConfig = co.collections;
            var relevantModels = Object.values(allModelsFromConfig).filter(function(model){return model.canHaveAttributes});
            var modelsFromApi = (await th.get(`/api/${co.apis.dynamicattributes}/models?token=${token}`).expect(200)).body;
            assert.strictEqual(modelsFromApi.length, relevantModels.length);
            for (var i = 0; i < modelsFromApi.length; i++) {
                ['name', 'icon', 'canHaveAttributes'].forEach((key) => {
                    assert.strictEqual(modelsFromApi[i][key].toString(), relevantModels[i][key].toString());
                });
            }
        });
    });

    describe('GET/option/:id', () => {

        var optionApi = `${co.apis.dynamicattributes}/option`;

        th.apiTests.getId.defaultNegative(optionApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, co.collections.dynamicattributeoptions.name);
        th.apiTests.getId.clientDependentNegative(optionApi, co.collections.dynamicattributeoptions.name);

        it('responds with all details of the dynamic attribute option', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var dao = (await th.get(`/api/${co.apis.dynamicattributes}/option/client0_dao0?token=${token}`).expect(200)).body;
            assert.ok(dao);
            assert.strictEqual(dao._id, "client0_dao0");
            assert.strictEqual(dao.dynamicAttributeId, "client0_da1");
            assert.strictEqual(dao.text_en, "männlich");
            assert.strictEqual(dao.text_de, "männlich");
            assert.strictEqual(dao.clientId, "client0");
            assert.strictEqual(dao.value, "m");
        });

    });

    describe('GET/options/:id', () => {

        var optionsApi = `${co.apis.dynamicattributes}/options`;

        th.apiTests.getId.defaultNegative(optionsApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, co.collections.dynamicattributes.name);
        th.apiTests.getId.clientDependentNegative(optionsApi, co.collections.dynamicattributes.name);

        it('responds with a list of all options and their details of the dynamic attribute', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var daos = (await th.get(`/api/${co.apis.dynamicattributes}/options/client0_da1?token=${token}`).expect(200)).body;
            assert.strictEqual(daos.length, 2);
            assert.strictEqual(daos[0]._id, "client0_dao0");
            assert.strictEqual(daos[1]._id, "client0_dao1");
            // Stichprobenhaft
            assert.strictEqual(daos[0]._id, "client0_dao0");
            assert.strictEqual(daos[0].dynamicAttributeId, "client0_da1");
            assert.strictEqual(daos[0].text_en, "männlich");
            assert.strictEqual(daos[0].text_de, "männlich");
            assert.strictEqual(daos[0].clientId, "client0");
            assert.strictEqual(daos[0].value, "m");
        });

    });

    describe('GET/values/:modelName/:id', () => {

        var api = co.apis.dynamicattributes + '/values/users';

        th.apiTests.getId.defaultNegative(api, false, co.collections.users.name);
        th.apiTests.getId.clientDependentNegative(api, co.collections.users.name);
        
        it('responds without giving a model name and entity id with 404', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.get(`/api/${co.apis.dynamicattributes}/values/?token=${token}`).expect(404);
        });
        
        it('responds without giving an entity id but with giving a modelName with 404', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.get(`/api/${co.apis.dynamicattributes}/values/users/?token=${token}`).expect(404);
        });
        
        it('responds with invalid modelName with 404', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.get(`/api/${co.apis.dynamicattributes}/values/invalidModelName/client0_usergroup0_user0?token=${token}`).expect(404);
        });

        it('responds with invalid entity id with 404', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.get(`/api/${co.apis.dynamicattributes}/values/users/invalidId?token=${token}`).expect(404);
        });

        it('responds where no dynamic attribute values exist for the given entity id with a value list where the values are null', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var valuesFromApi = (await th.get(`/api/${co.apis.dynamicattributes}/values/users/client0_usergroup0_user1?token=${token}`).expect(200)).body;
            assert.strictEqual(valuesFromApi.length, 3); // inactive attributes are not contained
            valuesFromApi.forEach((dav) => {
                assert.ok(typeof(dav.type) !== "undefined");
                assert.ok(typeof(dav.type._id) !== "undefined");
                assert.ok(typeof(dav.type.type) !== "undefined");
                assert.ok(typeof(dav.type.name_en) !== "undefined");
                assert.ok(typeof(dav.type.name_de) !== "undefined");
                assert.ok(typeof(dav.options) !== "undefined");
                assert.strictEqual(dav.value, null);
            });
        });

        it('responds with a list containing all dynamic attribute values (and all of their details) defined for the given entity id', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var valuesFromApi = (await th.get(`/api/${co.apis.dynamicattributes}/values/users/client0_usergroup0_user0?token=${token}`).expect(200)).body;
            assert.strictEqual(valuesFromApi.length, 3);
            
            assert.strictEqual(valuesFromApi[0].value, "client0_dao1");
            assert.ok(valuesFromApi[0].type);
            assert.strictEqual(valuesFromApi[0].type._id, "client0_da1");
            assert.strictEqual(valuesFromApi[0].type.type, "picklist");
            assert.strictEqual(valuesFromApi[0].type.name_en, "Geschlecht");
            assert.strictEqual(valuesFromApi[0].type.name_de, "Geschlecht");
            assert.ok(valuesFromApi[0].options);
            assert.strictEqual(valuesFromApi[0].options.length, 2);
            assert.strictEqual(valuesFromApi[0].options[0]._id, "client0_dao0");
            assert.strictEqual(valuesFromApi[0].options[0].text_en, "männlich");
            assert.strictEqual(valuesFromApi[0].options[0].text_de, "männlich");
            assert.strictEqual(valuesFromApi[0].options[1]._id, "client0_dao1");
            assert.strictEqual(valuesFromApi[0].options[1].text_en, "weiblich");
            assert.strictEqual(valuesFromApi[0].options[1].text_de, "weiblich");

            assert.strictEqual(valuesFromApi[1].value, "60");
            assert.ok(valuesFromApi[1].type);
            assert.strictEqual(valuesFromApi[1].type._id, "client0_da0");
            assert.strictEqual(valuesFromApi[1].type.type, "text");
            assert.strictEqual(valuesFromApi[1].type.name_en, "Gewicht");
            assert.strictEqual(valuesFromApi[1].type.name_de, "Gewicht");

            // Größe ist inaktiv und daher hier nicht drin

            assert.strictEqual(valuesFromApi[2].value, "client0_dao2");
            assert.ok(valuesFromApi[2].type);
            assert.strictEqual(valuesFromApi[2].type._id, "client0_da3");
            assert.strictEqual(valuesFromApi[2].type.type, "picklist");
            assert.strictEqual(valuesFromApi[2].type.name_en, "Haarfarbe");
            assert.strictEqual(valuesFromApi[2].type.name_de, "Haarfarbe");
            assert.ok(valuesFromApi[2].options);
            assert.strictEqual(valuesFromApi[2].options.length, 2);
            assert.strictEqual(valuesFromApi[2].options[0]._id, "client0_dao2");
            assert.strictEqual(valuesFromApi[2].options[0].text_en, "braun");
            assert.strictEqual(valuesFromApi[2].options[0].text_de, "braun");
            assert.strictEqual(valuesFromApi[2].options[1]._id, "client0_dao3");
            assert.strictEqual(valuesFromApi[2].options[1].text_en, "blond");
            assert.strictEqual(valuesFromApi[2].options[1].text_de, "blond");
        });

    });

    async function createTestDynamicAttribute() {
        return {
            modelName: co.collections.users.name,
            type: 'text',
            name_en: 'Name EN',
            name_de: 'Name DE'
        };
    }

    describe('POST/', () => {

        th.apiTests.post.defaultNegative(co.apis.dynamicattributes, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, createTestDynamicAttribute);

        it('responds without giving a modelName with 400', async() => {
            var attributeToSend = await createTestDynamicAttribute();
            delete attributeToSend.modelName;
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.dynamicattributes}?token=${token}`).send(attributeToSend).expect(400);
        });

        it('responds with an invalid modelName with 400', async() => {
            var attributeToSend = await createTestDynamicAttribute();
            attributeToSend.modelName = 'invalidModelName';
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.dynamicattributes}?token=${token}`).send(attributeToSend).expect(400);
        });

        it('responds without giving name_en with 400', async() => {
            var attributeToSend = await createTestDynamicAttribute();
            delete attributeToSend.name_en;
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.dynamicattributes}?token=${token}`).send(attributeToSend).expect(400);
        });

        it('responds without giving a type with 400', async() => {
            var attributeToSend = await createTestDynamicAttribute();
            delete attributeToSend.type;
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.dynamicattributes}?token=${token}`).send(attributeToSend).expect(400);
        });

        it('responds with an invalid type with 400', async() => {
            var attributeToSend = await createTestDynamicAttribute();
            attributeToSend.type = 'invalidType';
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.dynamicattributes}?token=${token}`).send(attributeToSend).expect(400);
        });

        it('responds with a new dynamic attribute containing generated _id', async() => {
            var attributeToSend = await createTestDynamicAttribute();
            var token = await th.defaults.login("client0_usergroup0_user0");
            var createdAttribute = (await th.post(`/api/${co.apis.dynamicattributes}?token=${token}`).send(attributeToSend).expect(200)).body;
            assert.ok(createdAttribute._id);
            var da = await Db.getDynamicObject("client0", co.collections.dynamicattributes.name, createdAttribute._id);
            assert.ok(da);
            assert.strictEqual(da.label, attributeToSend.name_de);
            assert.strictEqual(da.dynamicattributetypename, attributeToSend.type);
            assert.strictEqual(da.modelname, attributeToSend.modelName);
        });

        it('Wenn identifier angegeben ist, wird zwar ein neues erzeugt, aber ohne identifier', async() => {
            var attributeToSend = await createTestDynamicAttribute();
            attributeToSend.identifier = "newidentifier";
            var token = await th.defaults.login("client0_usergroup0_user0");
            var createdAttribute = (await th.post(`/api/${co.apis.dynamicattributes}?token=${token}`).send(attributeToSend).expect(200)).body;
            assert.ok(createdAttribute._id);
            var da = await Db.getDynamicObject("client0", co.collections.dynamicattributes.name, createdAttribute._id);
            assert.ok(da);
            assert.strictEqual(da.identifier, null);
        });

    });

    async function createTestDynamicAttributeOption() {
        return {
            dynamicAttributeId: "client0_da1",
            text_en: 'unknown sex',
            text_de: 'sächlich'
        };
    }

    describe('POST/option', () => {

        var optionApi = `${co.apis.dynamicattributes}/option`;

        th.apiTests.post.defaultNegative(optionApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, createTestDynamicAttributeOption);

        it('responds without giving a dynamicAttributeId with 400', async() => {
            var optionToSend = await createTestDynamicAttributeOption();
            delete optionToSend.dynamicAttributeId;
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.dynamicattributes}/option?token=${token}`).send(optionToSend).expect(400);
        });

        it('responds with an invalid dynamicAttributeId with 400', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var optionToSend = await createTestDynamicAttributeOption(co.dynamicAttributeTypes.picklist);
            optionToSend.dynamicAttributeId = 'invalidId';
            await th.post(`/api/${co.apis.dynamicattributes}/option?token=${token}`).send(optionToSend).expect(400);
        });

        it('responds with a not existing dynamicAttributeId with 400', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var optionToSend = await createTestDynamicAttributeOption(co.dynamicAttributeTypes.picklist);
            optionToSend.dynamicAttributeId = '999999999999999999999999';
            await th.post(`/api/${co.apis.dynamicattributes}/option?token=${token}`).send(optionToSend).expect(400);
        });

        it('responds without giving text_en with 400', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var optionToSend = await createTestDynamicAttributeOption(co.dynamicAttributeTypes.picklist);
            delete optionToSend.text_en;
            await th.post(`/api/${co.apis.dynamicattributes}/option?token=${token}`).send(optionToSend).expect(400);
        });

        it('responds 400 when the type of the attribute is not picklist', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var optionToSend = {
                dynamicAttributeId: "client0_da0", //  text
                text_en: 'unknown sex',
                text_de: 'sächlich'
            };
            await th.post(`/api/${co.apis.dynamicattributes}/option?token=${token}`).send(optionToSend).expect(400);
        });

        it('responds with a new dynamic attribute option containing generated _id', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var optionToSend = await createTestDynamicAttributeOption();
            var createdOption = (await th.post(`/api/${co.apis.dynamicattributes}/option?token=${token}`).send(optionToSend).expect(200)).body;
            assert.ok(createdOption._id);
            var dao = await Db.getDynamicObject("client0", co.collections.dynamicattributeoptions.name, createdOption._id);
            assert.ok(dao);
            assert.strictEqual(dao.label, optionToSend.text_de);
            assert.strictEqual(dao.dynamicattributename, optionToSend.dynamicAttributeId);
        });

        it('Erstellt eine neue Option, wenn value angegeben ist, aber ohne value (Definieren von values per API derzeit nicht erlaubt, da Vorgaben überschireben werden könnten).', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var optionToSend = await createTestDynamicAttributeOption();
            optionToSend.value = "weiblich";
            var createdOption = (await th.post(`/api/${co.apis.dynamicattributes}/option?token=${token}`).send(optionToSend).expect(200)).body;
            assert.ok(createdOption._id);
            var dao = await Db.getDynamicObject("client0", co.collections.dynamicattributeoptions.name, createdOption._id);
            assert.ok(dao);
            assert.strictEqual(dao.value, null);
        });

    });

    async function createTestDynamicAttributeValues(clientname) {
        return [
            { dynamicAttributeId: clientname + "_da0", value: '70' },
            { dynamicAttributeId: clientname + "_da1", value: clientname + "_dao0" },
            { dynamicAttributeId: clientname + "_da2", value: '110' },
            { dynamicAttributeId: clientname + "_da3", value: clientname + "_dao3" }
        ]
     }

    describe('POST/values/:modelName/:id', () => {

        var api = `${co.apis.dynamicattributes}/option`;

        th.apiTests.post.defaultNegative(`${co.apis.dynamicattributes}/values/users/client0_usergroup0_user1`, undefined, createTestDynamicAttributeValues);

        it('responds without giving a model name and entity id with 404', async() => {
            var valuesToSend = await createTestDynamicAttributeValues("client0");
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.dynamicattributes}/values/?token=${token}`).send(valuesToSend).expect(404);
        });

        it('responds without giving an entity id but with giving a modelName with 404', async() => {
            var valuesToSend = await createTestDynamicAttributeValues("client0");
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/?token=${token}`).send(valuesToSend).expect(404);
        });

        it('responds without giving values with 400', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/client0_usergroup0_user0?token=${token}`).send().expect(400);
        });

        it('responds without giving a dynamicAttributeId in one of the values with 400', async() => {
            var valuesToSend = await createTestDynamicAttributeValues("client0");
            var token = await th.defaults.login("client0_usergroup0_user0");
            delete valuesToSend[0].dynamicAttributeId;
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/client0_usergroup0_user0?token=${token}`).send(valuesToSend).expect(400);
        });
        
        it('responds with invalid modelName with 400', async() => {
            var valuesToSend = await createTestDynamicAttributeValues("client0");
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.dynamicattributes}/values/invalidModelName/client0_usergroup0_user0?token=${token}`).send(valuesToSend).expect(400);
        });

        it('responds with an invalid entity id with 404', async() => {
            var valuesToSend = await createTestDynamicAttributeValues("client0");
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/invalidId?token=${token}`).send(valuesToSend).expect(404);
        });

        it('responds with an invalid dynamicAttributeId with 400', async() => {
            var valuesToSend = await createTestDynamicAttributeValues("client0");
            var token = await th.defaults.login("client0_usergroup0_user0");
            valuesToSend[0].dynamicAttributeId = 'invalidId';
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/client0_usergroup0_user0?token=${token}`).send(valuesToSend).expect(400);
        });

        it('responds to invalid (null) update values with 400', async() => {
            var valuesToSend = null;
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/client0_usergroup0_user0?token=${token}`).send(valuesToSend).expect(400);
        });

        it('responds to invalid (random string) update values with 400', async() => {
            var valuesToSend = "ramdom_string";
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/client0_usergroup0_user0?token=${token}`).send(valuesToSend).expect(400);
        });

        it('updates the given values', async() => {
            var valuesToSend = await createTestDynamicAttributeValues("client0");
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/client0_usergroup0_user0?token=${token}`).send(valuesToSend).expect(200);
            var valuesFromDatabase = await Db.getDynamicObjects("client0", co.collections.dynamicattributevalues.name, { entityname: 'client0_usergroup0_user0' });
            assert.strictEqual(valuesFromDatabase.length, valuesToSend.length);
            for (var i = 0; i < valuesFromDatabase.length; i++) {
                assert.strictEqual(valuesFromDatabase[i].dynamicattributename, valuesToSend[i].dynamicAttributeId);
                assert.strictEqual(valuesFromDatabase[i].value, valuesToSend[i].value);
            }
        });

        it('does not update values when empty list is sent', async() => {
            var valuesToSend = [];
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/client0_usergroup0_user0?token=${token}`).send(valuesToSend).expect(200);
            var valuesFromDatabase = await Db.getDynamicObjects("client0", co.collections.dynamicattributevalues.name, { entityname: 'client0_usergroup0_user0' });
            assert.strictEqual(valuesFromDatabase.length, 4);
            assert.strictEqual(valuesFromDatabase[0].dynamicattributename, "client0_da0");
            assert.strictEqual(valuesFromDatabase[0].value, "60");
            assert.strictEqual(valuesFromDatabase[1].dynamicattributename, "client0_da1");
            assert.strictEqual(valuesFromDatabase[1].value, "client0_dao1");
            assert.strictEqual(valuesFromDatabase[2].dynamicattributename, "client0_da2");
            assert.strictEqual(valuesFromDatabase[2].value, "170");
            assert.strictEqual(valuesFromDatabase[3].dynamicattributename, "client0_da3");
            assert.strictEqual(valuesFromDatabase[3].value, "client0_dao2");
        });

        it('updates only sent values', async() => {
            var valuesToSend = [
                { dynamicAttributeId: "client0_da2", value: '110' },
                { dynamicAttributeId: "client0_da3", value: "client0_dao3" }
            ];
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.post(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/client0_usergroup0_user0?token=${token}`).send(valuesToSend).expect(200);
            var valuesFromDatabase = await Db.getDynamicObjects("client0", co.collections.dynamicattributevalues.name, { entityname: 'client0_usergroup0_user0' });
            assert.strictEqual(valuesFromDatabase.length, 4);
            assert.strictEqual(valuesFromDatabase[0].dynamicattributename, "client0_da0");
            assert.strictEqual(valuesFromDatabase[0].value, "60");
            assert.strictEqual(valuesFromDatabase[1].dynamicattributename, "client0_da1");
            assert.strictEqual(valuesFromDatabase[1].value, "client0_dao1");
            assert.strictEqual(valuesFromDatabase[2].dynamicattributename, "client0_da2");
            assert.strictEqual(valuesFromDatabase[2].value, "110");
            assert.strictEqual(valuesFromDatabase[3].dynamicattributename, "client0_da3");
            assert.strictEqual(valuesFromDatabase[3].value, "client0_dao3");
        });

    });

    xdescribe('PUT/:id', () => {

        function createPutTestDynamicAttribute() {
            return createTestDynamicAttribute().then(function(attr) {
                return db.get(co.collections.dynamicattributes.name).insert(attr);
            });
        }

        th.apiTests.put.defaultNegative(co.apis.dynamicattributes, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, createPutTestDynamicAttribute);
        th.apiTests.put.clientDependentNegative(co.apis.dynamicattributes, createPutTestDynamicAttribute);

        it('responds with a new modelName with an updated record but with old modelName', async () => {
            var token = await th.defaults.login();
            var attributeToSend = await createPutTestDynamicAttribute();
            attributeToSend.modelName = co.collections.usergroups.name;
            var updatedAttribute = (await th.put(`/api/${co.apis.dynamicattributes}/${attributeToSend._id}?token=${token}`).send(attributeToSend).expect(200)).body;
            assert.strictEqual(updatedAttribute.modelName, co.collections.users.name);
        });

        it('responds with a new type with an updated record but with old type', async () => {
            var token = await th.defaults.login();
            var attributeToSend = await createPutTestDynamicAttribute();
            attributeToSend.type = co.dynamicAttributeTypes.boolean;
            var updatedAttribute = (await th.put(`/api/${co.apis.dynamicattributes}/${attributeToSend._id}?token=${token}`).send(attributeToSend).expect(200)).body;
            assert.strictEqual(updatedAttribute.type, co.dynamicAttributeTypes.text);
        });

        it('responds with an updated dynamic attribute', async () => {
            var token = await th.defaults.login();
            var attributeToSend = await createPutTestDynamicAttribute();
            attributeToSend.name_en = 'updated name en';
            attributeToSend.name_de = 'updated name de';
            var updatedAttribute = (await th.put(`/api/${co.apis.dynamicattributes}/${attributeToSend._id}?token=${token}`).send(attributeToSend).expect(200)).body;
            assert.strictEqual(updatedAttribute.name_en, attributeToSend.name_en);
            assert.strictEqual(updatedAttribute.name_de, attributeToSend.name_de);
        });

        it('Liefert 404, wenn das DA inaktiv ist', async () => {
            var da = await db.get(co.collections.dynamicattributes.name).findOne({ name_en: 'Gewicht' });
            await db.update(co.collections.dynamicattributes.name, da._id, { $set: { isInactive: true } });
            da.name_en = 'Masse';
            var token = await th.defaults.login();
            return th.put(`/api/${co.apis.dynamicattributes}/${da._id}?token=${token}`).send(da).expect(404);
        });

    });

    xdescribe('PUT/option/:id', () => {

        function createPutTestDynamicAttributeOption() {
            return createTestDynamicAttributeOption().then(function(option) {
                return db.get(co.collections.dynamicattributeoptions.name).insert(option);
            });
        }

        var optionApi = `${co.apis.dynamicattributes}/option`;

        th.apiTests.put.defaultNegative(optionApi, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, createPutTestDynamicAttributeOption);
        th.apiTests.put.clientDependentNegative(optionApi, createPutTestDynamicAttributeOption);

        it('responds with a new dynamicAttributeId with an updated record but with old dynamicAttributeId', async () => {
            var token = await th.defaults.login();
            var optionToSend = await createPutTestDynamicAttributeOption();
            var otherDynamicAttribute = await db.get(co.collections.dynamicattributes.name).findOne({ clientId: optionToSend.clientId, modelName: co.collections.users.name, type: co.dynamicAttributeTypes.text });
            var originalAttributeId = optionToSend.dynamicAttributeId;
            optionToSend.dynamicAttributeId = otherDynamicAttribute._id;
            var updatedOption = (await th.put(`/api/${optionApi}/${optionToSend._id}?token=${token}`).send(optionToSend).expect(200)).body;
            assert.strictEqual(updatedOption.dynamicAttributeId, originalAttributeId.toString());
        });

        it('responds with an updated dynamic attribute option', async () => {
            var token = await th.defaults.login();
            var optionToSend = await createPutTestDynamicAttributeOption();
            optionToSend.text_en = 'new text en';
            optionToSend.text_de = 'new text de';
            var updatedOption = (await th.put(`/api/${optionApi}/${optionToSend._id}?token=${token}`).send(optionToSend).expect(200)).body;
            assert.strictEqual(updatedOption.text_en, optionToSend.text_en);
            assert.strictEqual(updatedOption.text_de, optionToSend.text_de);
        });

        it('Liefert 404, wenn das zugehörige DA inaktiv ist', async () => {
            var da = await db.get(co.collections.dynamicattributes.name).findOne({ name_en: 'Geschlecht' });
            var dao = await db.get(co.collections.dynamicattributeoptions.name).findOne({ text_en: 'männlich' });
            await db.update(co.collections.dynamicattributes.name, da._id, { $set: { isInactive: true } });
            var token = await th.defaults.login();
            dao.text_en = 'sächlich';
            return th.put(`/api/${co.apis.dynamicattributes}/option/${dao._id}?token=${token}`).send(dao).expect(404);
        });

    });

    xdescribe('DELETE/:id', () => {

        function createDeleteTestDynamicAttribute() {
            return createTestDynamicAttribute().then(function(attr) {
                return db.get(co.collections.dynamicattributes.name).insert(attr);
            }).then(function(insertedAttribute) {
                return Promise.resolve(insertedAttribute._id);
            });
        }

        th.apiTests.delete.defaultNegative(co.apis.dynamicattributes, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, createDeleteTestDynamicAttribute);
        th.apiTests.delete.clientDependentNegative(co.apis.dynamicattributes, createDeleteTestDynamicAttribute);

        it('responds with a correct id with 204 and deletes the dynamic attribute, all of its dynamic attribute options and all of its dynamic attribute values from the database', async () => {
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

        it('Liefert 405, wenn das DA einen identifier hat', async () => {
            var da = await db.get(co.collections.dynamicattributes.name).findOne({ name_en: 'Gewicht' });
            var token = await th.defaults.login();
            return th.del(`/api/${co.apis.dynamicattributes}/${da._id}?token=${token}`).expect(405);
        });

        it('Liefert 404, wenn das DA inaktiv ist', async () => {
            var da = await db.get(co.collections.dynamicattributes.name).findOne({ name_en: 'Größe' });
            await db.update(co.collections.dynamicattributes.name, da._id, { $set: { isInactive: true } });
            var token = await th.defaults.login();
            return th.del(`/api/${co.apis.dynamicattributes}/${da._id}?token=${token}`).expect(404);
        });

    });

    xdescribe('DELETE/option/:id', () => {

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

        it('responds with a correct id with 204 and deletes the dynamic attribute option and all dynamic attribute values which use it from the database', async () => {
            var token = await th.defaults.login();
            var client = await th.defaults.getClient();
            var option = await th.dbObjects.dynamicattributeoptions.find((dao) => dao.clientId !== null && dao.clientId.toString() === client._id.toString());
            await th.del(`/api/${optionApi}/${option._id}?token=${token}`).expect(204);
            var optionAfterDeletion = await db.get(co.collections.dynamicattributeoptions.name).findOne(option._id);
            var values = await db.get(co.collections.dynamicattributevalues.name).find({value:option._id});
            assert.ok(!optionAfterDeletion);
            assert.strictEqual(values.length, 0);
        });

        it('Liefert 404, wenn das zugehörige DA inaktiv ist', async () => {
            var da = await db.get(co.collections.dynamicattributes.name).findOne({ name_en: 'Haarfarbe' });
            var dao = await db.get(co.collections.dynamicattributeoptions.name).findOne({ text_en: 'braun' });
            await db.update(co.collections.dynamicattributes.name, da._id, { $set: { isInactive: true } });
            var token = await th.defaults.login();
            return th.del(`/api/${co.apis.dynamicattributes}/option/${dao._id}?token=${token}`).expect(404);
        });

        it('Liefert 405, wenn die Option einen value hat', async () => {
            var da = await db.get(co.collections.dynamicattributes.name).findOne({ name_en: 'Geschlecht' });
            var dao = await db.get(co.collections.dynamicattributeoptions.name).findOne({ text_en: 'männlich' });
            var token = await th.defaults.login();
            return th.del(`/api/${co.apis.dynamicattributes}/option/${dao._id}?token=${token}`).expect(405);
        });

    });

    xdescribe('DELETE/values/:modelName/:id', () => {

        it('responds without authentication with 403', async () => {
            var user = await th.defaults.getUser();
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}`).expect(403);
        });

        it('responds without write permission with 403', async () => {
            var user = await th.defaults.getUser();
            await th.removeWritePermission(th.defaults.user, co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES);
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', async () => {
            var user = await th.defaults.getUser();
            await th.removeClientModule(th.defaults.client, co.modules.base);
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', async () => {
            var user = await th.defaults.getUser();
            await th.removeClientModule(th.defaults.client, co.modules.base);
            var token = await th.defaults.login(th.defaults.adminUser);
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).expect(403);
        });

        it('responds with an id of an existing entity which does not belong to the same client as the logged in user with 403', async () => {
            var user = await th.defaults.getUser('0_0_0');
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).expect(403);
        });

        it('responds without giving a model name and entity id with 400', async () => {
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/?token=${token}`).expect(400);
        });

        it('responds without giving an entity id but with giving a modelName with 404', async () => {
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/?token=${token}`).expect(404);
        });
        
        it('responds with invalid modelName with 400', async () => {
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/invalidModelName/${user._id}?token=${token}`).expect(400);
        });
        
        it('responds with invalid entity id with 400', async () => {
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/invalidId?token=${token}`).expect(400);
        });

        it('responds with not existing entity id with 403', async () => {
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/999999999999999999999999?token=${token}`).expect(403);
        });

        it('responds with correct modelName and id with 204 and deletes all dynamic attribute values for the entity from the database', async () => {
            var user = await th.defaults.getUser();
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.dynamicattributes}/values/${co.collections.users.name}/${user._id}?token=${token}`).expect(204);
            var valuesAfter = await db.get(co.collections.dynamicattributevalues.name).find({entityId:user._id});
            assert.strictEqual(valuesAfter.length, 0);
        });

    });

});
