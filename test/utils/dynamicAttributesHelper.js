/**
 * UNIT Tests for utils/dynamicAttributesHelper
 */
var assert = require('assert');
var th = require('../testHelpers');
var co = require('../../utils/constants');
var dynamicAttributesHelper = require('../../utils/dynamicAttributesHelper');
var moduleConfig = require('../../config/module-config.json');
var Db = require("../../utils/db").Db;

describe('UTILS dynamicAttributesHelper', () => {
    
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
        await th.preparePredefinedDynamicAttibutesForClient("client0");
        prepareModuleConfigForDynamicAttributes();
    });

    afterEach(() => {
        delete moduleConfig.modules.DAtest;
    });

    describe('createDynamicAttributeOption', () => {

        it('Erstellt eine Option, wenn kein value angegeben ist, auch wenn es schon eine mit demselben text_en gibt', async() => {
            var da = await Db.getDynamicObject("client0", co.collections.dynamicattributes.name, { identifier:'geschlecht' });
            var optionToCreate = { text_en: 'männlich', dynamicAttributeId: da.name };
            var createdOption = await dynamicAttributesHelper.createDynamicAttributeOption(optionToCreate, "client0");
            var daos =await Db.getDynamicObjects("client0", co.collections.dynamicattributeoptions.name, { dynamicattributename: da.name, label: 'männlich' });
            assert.strictEqual(daos.length, 2);
            var optionInDatabase = daos.find((d) => d.name === createdOption.name);
            assert.ok(optionInDatabase);
        });

        it('Erstellt eine Option, wenn sie einen value hat und noch keine mit demselben value existiert', async() => {
            var da = await Db.getDynamicObject("client0", co.collections.dynamicattributes.name, { identifier:'geschlecht' });
            var optionToCreate = { text_en: 'sächlich', dynamicAttributeId: da.name, value: "s" };
            var createdOption = await dynamicAttributesHelper.createDynamicAttributeOption(optionToCreate, "client0");
            var daos = await Db.getDynamicObjects("client0", co.collections.dynamicattributeoptions.name, { dynamicattributename: da.name, label: 'sächlich' });
            assert.strictEqual(daos.length, 1);
        });

        it('Liefert die bestehende Option, wenn eine mit einem value erzeugt werden soll, der schon in der Datenbank ist', async() => {
            var da = await Db.getDynamicObject("client0", co.collections.dynamicattributes.name, { identifier:'geschlecht' });
            var optionToCreate = { text_en: 'männlich', dynamicAttributeId: da.name, value: "m" };
            var createdOption = await dynamicAttributesHelper.createDynamicAttributeOption(optionToCreate, "client0");
            var daos = await Db.getDynamicObjects("client0", co.collections.dynamicattributeoptions.name, { dynamicattributename: da.name, label: 'männlich' });
            assert.strictEqual(daos.length, 1);
            assert.strictEqual(daos[0].name, "client0_dao0");
        });
        
    });

    describe('activateDynamicAttributesForClient', () => {
        
        it('Macht nichts, wenn das Modul keine vorgegebenen DAs hat', async() => {
            moduleConfig.modules.ModuleWithoutDAs = {};
            var dasBeforeCount = (await Db.getDynamicObjects("client0", co.collections.dynamicattributes.name)).length;
            await dynamicAttributesHelper.activateDynamicAttributesForClient("client0", 'ModuleWithoutDAs');
            var dasAfterCount = (await Db.getDynamicObjects("client0", co.collections.dynamicattributes.name)).length;
            assert.strictEqual(dasAfterCount, dasBeforeCount);
        });

        it('Erstellt bzw. aktiviert alle vorgegebenen DAs des Moduls für den gegebenen Mandanten', async() => {
            await dynamicAttributesHelper.activateDynamicAttributesForClient("client0", 'DAtest');
            var das = await Db.getDynamicObjects("client0", co.collections.dynamicattributes.name, { modelname:co.collections.users.name });
            assert.ok(das.find((a) => a.identifier === 'DAtest_user_1' && !a.isinactive));
            assert.ok(das.find((a) => a.identifier === 'DAtest_user_2' && !a.isinactive));
        });

        it('Erstellt bzw. aktiviert alle vorgegebenen DA-Optionen bei Picklisten des Moduls für den gegebenen Mandanten', async() => {
            await dynamicAttributesHelper.activateDynamicAttributesForClient("client0", 'DAtest');
            var daos = await Db.getDynamicObjects("client0", co.collections.dynamicattributeoptions.name);
            assert.ok(daos.find((o) => o.value === 'DAtest_user_2_1'));
            assert.ok(daos.find((o) => o.value === 'DAtest_user_2_2'));
        });
        
    });

    describe('createDynamicAttribute', () => {

        it('Wenn ein Attribut mit demselben identifier für den Mandanten existiert, wird dieses einfach aktiviert', async() => {
            var existingAttribute = await Db.insertDynamicObject("client0", co.collections.dynamicattributes.name, { name: "client0_testda0", label: 'Hampel', identifier: 'Hampel', isinactive:true });
            var attributeToCreate = { clientId: "client0", name_en: 'Hampel', identifier: 'Hampel' };
            var createdAttribute = await dynamicAttributesHelper.createDynamicAttribute(attributeToCreate);
            assert.ok(createdAttribute.name === existingAttribute.name);
            assert.ok(!createdAttribute.isinactive);
        });

        it('Wenn identifier angegeben wurde und kein Attribut damit schon existiert, wird eines erzeugt', async() => {
            var attributeToCreate = { clientId: "client0", name_en: 'Hampel', identifier: 'Hampel' };
            var createdAttribute = await dynamicAttributesHelper.createDynamicAttribute(attributeToCreate);
            assert.ok(createdAttribute.name);
            assert.ok(!createdAttribute.isinactive);
        });

        it('Wenn kein identifier angegeben wurde, wird das Attribut einfach erzeugt.', async() => {
            var existingAttribute = await Db.insertDynamicObject("client0", co.collections.dynamicattributes.name, { name: "client0_testda0", label: 'Hampel', identifier: 'Hampel', isinactive:true });
            var attributeToCreate = { clientId: "client0", name_en: 'Hampel' };
            var createdAttribute = await dynamicAttributesHelper.createDynamicAttribute(attributeToCreate);
            assert.notEqual(createdAttribute.name, existingAttribute.name);
            assert.ok(!createdAttribute.isinactive);
        });
        
    });

    describe('deactivateDynamicAttributesForClient', () => {

        it('Wenn das Modul keine DA-Vorgaben hat, passiert nichts weiter', async() => {
            moduleConfig.modules.ModuleWithoutDAs = {};
            var dasBeforeCount = (await Db.getDynamicObjects("client0", co.collections.dynamicattributes.name, {isinactive:true})).length;
            await dynamicAttributesHelper.deactivateDynamicAttributesForClient("client0", 'ModuleWithoutDAs');
            var dasAfterCount = (await Db.getDynamicObjects("client0", co.collections.dynamicattributes.name, {isinactive:true})).length;
            assert.strictEqual(dasAfterCount, dasBeforeCount);
        });

        it('Deaktiviert alle vorgegebenen DAs des Moduls für den gegebenen Mandanten', async() => {
            // Erst mal aktivieren
            await dynamicAttributesHelper.activateDynamicAttributesForClient("client0", 'DAtest');
            // Nun wieder deaktivieren
            await dynamicAttributesHelper.deactivateDynamicAttributesForClient("client0", 'DAtest');
            var das = await Db.getDynamicObjects("client0", co.collections.dynamicattributes.name, {modelname:co.collections.users.name});
            assert.ok(das.find((a) => a.identifier === 'DAtest_user_1' && a.isinactive));
            assert.ok(das.find((a) => a.identifier === 'DAtest_user_2' && a.isinactive));
        });
        
    });

    describe('deleteAllDynamicAttributeValuesForEntity', () => {

        it('Löscht alle DA-Werte für eine gegebene Entität', async() => {
            var valuesBefore = await Db.getDynamicObjects("client0", co.collections.dynamicattributevalues.name, {entityname:"client0_usergroup0_user0"});
            assert.ok(valuesBefore.length > 0);
            await dynamicAttributesHelper.deleteAllDynamicAttributeValuesForEntity("client0", "client0_usergroup0_user0");
            var valuesAfter = await Db.getDynamicObjects("client0", co.collections.dynamicattributevalues.name, {entityname:"client0_usergroup0_user0"});
            assert.strictEqual(valuesAfter.length, 0);
        });
        
    });

});
