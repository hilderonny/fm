/**
 * UNIT Tests for utils/dynamicAttributesHelper
 */
var assert = require('assert');
var th = require('../testHelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');
var dynamicAttributesHelper = require('../../utils/dynamicAttributesHelper');
var monk = require('monk');
var moduleConfig = require('../../config/module-config.json');

describe('UTILS dynamicAttributesHelper', function() {
    
    /**
     * Modul-config mit vorgegebenen DAs vorbereiten, wir benutzen ein eigenes Modul "DAtest"
     */
    function prepareModuleConfigForDynamicAttributes() {
        moduleConfig.modules.DAtest = {
            dynamicattributes: {
                users: [
                    {
                        identifier: 'DAtest_user_1',
                        name_en: 'DAtest_user_1',
                        type: co.dynamicAttributeTypes.text
                    },
                    {
                        identifier: 'DAtest_user_2',
                        name_en: 'DAtest_user_2',
                        type: co.dynamicAttributeTypes.picklist,
                        options: [
                            { text_en: 'DAtest_user_2_1', value: 'DAtest_user_2_1' },
                            { text_en: 'DAtest_user_2_2', value: 'DAtest_user_2_2' }
                        ]
                    }
                ]
            }
        };
    }

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareDynamicAttributes();
        await th.preparePredefinedDynamicAttibutesForClient("client0");
        prepareModuleConfigForDynamicAttributes();
    });

    afterEach(() => {
        delete moduleConfig.modules.DAtest;
    });

    describe('createDynamicAttributeOption', function() {

        it('Erstellt eine Option, wenn kein value angegeben ist, auch wenn es schon eine mit demselben text_en gibt', async function() {
            var da = await db.get(co.collections.dynamicattributes.name).findOne({ identifier:'geschlecht' });
            var optionToCreate = { clientId: da.clientId, text_en: 'männlich', dynamicAttributeId: da._id };
            var createdOption = await dynamicAttributesHelper.createDynamicAttributeOption(optionToCreate);
            var daos = await db.get(co.collections.dynamicattributeoptions.name).find({ dynamicAttributeId:da._id, text_en: 'männlich' });
            assert.strictEqual(daos.length, 2);
            var optionInDatabase = daos.find((d) => d._id.equals(createdOption._id));
            assert.ok(optionInDatabase);
            assert.ok(optionInDatabase.clientId.equals(da.clientId));
        });

        it('Generiert eine neue _id, auch wenn diese vorgegeben wurde', async function() {
            var da = await db.get(co.collections.dynamicattributes.name).findOne({ identifier:'geschlecht' });
            var id = monk.id();
            var optionToCreate = { _id: id, clientId: da.clientId, text_en: 'männlich', dynamicAttributeId: da._id };
            var createdOption = await dynamicAttributesHelper.createDynamicAttributeOption(optionToCreate);
            assert.ok(!createdOption._id.equals(id));
        });

        it('Erstellt eine Option, wenn sie einen value hat und noch keine mit demselben value existiert', async function() {
        });

        it('Liefert die bestehende Option, wenn eine mit einem value erzeugt werden soll, der schon in der Datenbank ist', async function() {
            var existingOption = await db.get(co.collections.dynamicattributeoptions.name).findOne({ value:'männlich' });
            var optionToCreate = { clientId: existingOption.clientId, text_en: 'männlich', value: 'männlich', dynamicAttributeId: existingOption.dynamicAttributeId };
            var createdOption = await dynamicAttributesHelper.createDynamicAttributeOption(optionToCreate);
            var daos = await db.get(co.collections.dynamicattributeoptions.name).find({ dynamicAttributeId:createdOption.dynamicAttributeId });
            assert.strictEqual(daos.length, 2);
            assert.ok(createdOption._id.equals(existingOption._id));
        });
        
    });

    describe('activateDynamicAttributesForClient', function() {
        
        it('Macht nichts, wenn das Modul keine vorgegebenen DAs hat', async function() {
            moduleConfig.modules.ModuleWithoutDAs = {};
            var client = await th.defaults.getClient();
            var dasBeforeCount = (await db.get(co.collections.dynamicattributes.name).find({clientId:client._id})).length;
            await dynamicAttributesHelper.activateDynamicAttributesForClient(client._id, 'ModuleWithoutDAs');
            var dasAfterCount = (await db.get(co.collections.dynamicattributes.name).find({clientId:client._id})).length;
            assert.strictEqual(dasAfterCount, dasBeforeCount);
        });

        it('Erstellt bzw. aktiviert alle vorgegebenen DAs des Moduls für den gegebenen Mandanten', async function() {
            var client = await th.defaults.getClient();
            await dynamicAttributesHelper.activateDynamicAttributesForClient(client._id, 'DAtest');
            var das = await db.get(co.collections.dynamicattributes.name).find({ clientId:client._id, modelName:co.collections.users.name });
            assert.ok(das.find((a) => a.identifier === 'DAtest_user_1' && !a.isInactive));
            assert.ok(das.find((a) => a.identifier === 'DAtest_user_2' && !a.isInactive));
        });

        it('Erstellt bzw. aktiviert alle vorgegebenen DA-Optionen bei Picklisten des Moduls für den gegebenen Mandanten', async function() {
            var client = await th.defaults.getClient();
            await dynamicAttributesHelper.activateDynamicAttributesForClient(client._id, 'DAtest');
            var daos = await db.get(co.collections.dynamicattributeoptions.name).find({ clientId:client._id });
            assert.ok(daos.find((o) => o.value === 'DAtest_user_2_1'));
            assert.ok(daos.find((o) => o.value === 'DAtest_user_2_2'));
        });
        
    });

    describe('createDynamicAttribute', function() {

        it('Generiert eine neue _id, auch wenn diese vorgegeben wurde', async function() {
            var client = await th.defaults.getClient();
            var id = monk.id();
            var attributeToCreate = { _id: id, clientId: client._id, name_en: 'Furzel' };
            var createdAttribute = await dynamicAttributesHelper.createDynamicAttribute(attributeToCreate);
            assert.ok(!createdAttribute._id.equals(id));
        });

        it('Wenn ein Attribut mit demselben identifier für den Mandanten existiert, wird dieses einfach aktiviert', async function() {
            var client = await th.defaults.getClient();
            var existingAttribute = await db.get(co.collections.dynamicattributes.name).insert({ clientId: client._id, name_en: 'Hampel', identifier: 'Hampel', isInactive:true });
            var attributeToCreate = { clientId: client._id, name_en: 'Hampel', identifier: 'Hampel' };
            var createdAttribute = await dynamicAttributesHelper.createDynamicAttribute(attributeToCreate);
            assert.ok(createdAttribute._id.equals(existingAttribute._id));
            assert.ok(!createdAttribute.isInactive);
        });

        it('Wenn identifier angegeben wurde und kein Attribut damit schon existiert, wird eines erzeugt', async function() {
            var client = await th.defaults.getClient();
            var attributeToCreate = { clientId: client._id, name_en: 'Hampel', identifier: 'Hampel' };
            var createdAttribute = await dynamicAttributesHelper.createDynamicAttribute(attributeToCreate);
            assert.ok(createdAttribute._id);
            assert.ok(!createdAttribute.isInactive);
        });

        it('Wenn kein identifier angegeben wurde, wird das Attribut einfach erzeugt.', async function() {
            var client = await th.defaults.getClient();
            var existingAttribute = await db.get(co.collections.dynamicattributes.name).insert({ clientId: client._id, name_en: 'Hampel', identifier: 'Hampel', isInactive:true });
            var attributeToCreate = { clientId: client._id, name_en: 'Hampel' };
            var createdAttribute = await dynamicAttributesHelper.createDynamicAttribute(attributeToCreate);
            assert.ok(!createdAttribute._id.equals(existingAttribute._id));
            assert.ok(!createdAttribute.isInactive);
        });
        
    });

    describe('deactivateDynamicAttribute', function() {

        it('Setzt bei allen DAs, die der Abfrage entsprechen, isInactive auf true', async function() {
            await dynamicAttributesHelper.deactivateDynamicAttribute({name_en:'textattribute'});
            var das = await db.get(co.collections.dynamicattributes.name).find({ name_en:'textattribute' });
            assert.ok(das.length > 0);
            das.forEach((a) => {
                assert.ok(a.isInactive);
            });
        });
        
    });

    describe('deactivateDynamicAttributesForClient', function() {

        it('Wenn das Modul keine DA-Vorgaben hat, passiert nichts weiter', async function() {
            moduleConfig.modules.ModuleWithoutDAs = {};
            var client = await th.defaults.getClient();
            var dasBeforeCount = (await db.get(co.collections.dynamicattributes.name).find({isInactive:true})).length;
            await dynamicAttributesHelper.deactivateDynamicAttributesForClient(client._id, 'ModuleWithoutDAs');
            var dasAfterCount = (await db.get(co.collections.dynamicattributes.name).find({isInactive:true})).length;
            assert.strictEqual(dasAfterCount, dasBeforeCount);
        });

        it('Deaktiviert alle vorgegebenen DAs des Moduls für den gegebenen Mandanten', async function() {
            // Erst mal aktivieren
            var client = await th.defaults.getClient();
            await dynamicAttributesHelper.activateDynamicAttributesForClient(client._id, 'DAtest');
            // Nun wieder deaktivieren
            await dynamicAttributesHelper.deactivateDynamicAttributesForClient(client._id, 'DAtest');
            var das = await db.get(co.collections.dynamicattributes.name).find({ clientId:client._id, modelName:co.collections.users.name });
            assert.ok(das.find((a) => a.identifier === 'DAtest_user_1' && a.isInactive));
            assert.ok(das.find((a) => a.identifier === 'DAtest_user_2' && a.isInactive));
        });
        
    });

    describe('deleteAllDynamicAttributeValuesForEntity', function() {

        it('Löscht alle DA-Werte für eine gegebene Entität', async function() {
            var user = await th.defaults.getUser();
            var valuesBefore = await db.get(co.collections.dynamicattributevalues.name).find({entityId:user._id});
            assert.ok(valuesBefore.length > 0);
            await dynamicAttributesHelper.deleteAllDynamicAttributeValuesForEntity(user._id);
            var valuesAfter = await db.get(co.collections.dynamicattributevalues.name).find({entityId:user._id});
            assert.strictEqual(valuesAfter.length, 0);
        });
        
    });

});
