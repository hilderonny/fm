/**
 * UNIT Tests for api/clientmodules
 */
var assert = require('assert');
var fs = require('fs');
var th = require('../testHelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');
var moduleConfig = require('../../config/module-config.json');

describe('API clientmodules', function() {

    var server = require('../../app');
    
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
        prepareModuleConfigForDynamicAttributes();
    });

    afterEach(() => {
        delete moduleConfig.modules.DAtest;
    });

    describe('GET/forClient/:id', function() {

        it('responds without authentication with 403', function() {
            return db.get('clients').findOne({name: '1'}).then((client) => {
                return th.get('/api/clientmodules/forClient/' + client._id.toString()).expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '0'}).then(function(clientFromDatabase){
                return th.removeClientModule('1', 'clients').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        return th.get(`/api/clientmodules/forClient/${clientFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '0'}).then(function(clientFromDatabase){
                return th.removeClientModule('1', 'clients').then(function() {
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                        return th.get(`/api/clientmodules/forClient/${clientFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds without read permission with 403', function() {
            return db.get('clients').findOne({name: '0'}).then(function(clientFromDatabase){
                // Remove the corresponding permission
                return th.removeReadPermission('_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(function(){
                    return th.doLoginAndGetToken('_0_0', 'test').then(function(token){
                        return th.get(`/api/clientmodules/forClient/${clientFromDatabase._id}?token=${token}`).expect(403);
                    });
                });
            });
        });

        it('responds with incorrect query parameter clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return th.get(`/api/clientmodules/forClient/invalid?token=${token}`).expect(400);
            });
        });

        it('responds with not existing clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return th.get(`/api/clientmodules/forClient/999999999999999999999999?token=${token}`).expect(400);
            });
        });

        it('responds with all client modules where the states are correctly set', async function() {
            var client = await th.defaults.getClient();
            var token = await th.defaults.login();
            var clientModulesFromDatabase = await db.get(co.collections.clientmodules.name).find({clientId: client._id});
            var clientModulesFromApi = (await th.get(`/api/${co.apis.clientmodules}/forClient/${client._id}?token=${token}`).expect(200)).body;
            var keysFromDatabase = clientModulesFromDatabase.map((p) => p.key);
            var keysFromApi = clientModulesFromApi.map((p) => p.key);
            keysFromDatabase.forEach((key) => {
                assert.ok(keysFromApi.indexOf(key) >= 0, `Client module ${key} not returned by API.`);
            });
            keysFromApi.forEach((key) => {
                assert.ok(keysFromDatabase.indexOf(key) >= 0, `Client module ${key} not prepared in database`);
            });
        });

        it('responds with all client modules even when some of them are not defined in database', async function() {
            var client = await th.defaults.getClient();
            var token = await th.defaults.login();
            var moduleToCheck = co.modules.documents;
            // Zugriff aus Datenbank löschen
            await db.remove(co.collections.clientmodules.name, {module:moduleToCheck});
            var clientModulesFromApi = (await th.get(`/api/${co.apis.clientmodules}/forClient/${client._id}?token=${token}`).expect(200)).body;
            var relevantClientModule = clientModulesFromApi.find((p) => p.module === moduleToCheck);
            assert.ok(relevantClientModule);
            assert.strictEqual(relevantClientModule.active, false);
        });

    });

    describe('POST/', function() {

        it('responds without authentication with 403', function() {
            return db.get('clients').findOne({name: '1'}).then((client) => {
                return th.post('/api/clientmodules')
                    .send({
                        clientId: client._id.toString(),
                        module: 'clients'
                    })
                    .expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                return th.removeClientModule('1', 'clients').then(function() {
                    return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                        var clientModule = {module: 'base', clientId: clientFromDatabase._id}
                        return th.post(`/api/clientmodules?token=${token}`).send(clientModule).expect(403);
                    });
                });
            });
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                return th.removeClientModule('1', 'clients').then(function() {
                    return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                        var clientModule = {module: 'base', clientId: clientFromDatabase._id}
                        return th.post(`/api/clientmodules?token=${token}`).send(clientModule).expect(403);
                    });
                });
            });
        });

        it('responds without write permission with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                //Remove the corresponding permission
                return th.removeWritePermission('_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(function(){
                    return th.doLoginAndGetToken('_0_0', 'test').then(function(token){
                        var clientModule = {module: 'base', clientId: clientFromDatabase._id}
                        return th.post(`/api/clientmodules?token=${token}`).send(clientModule).expect(403);
                    });
                });
            });
        });

        it('responds without giving a client module assignment with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                return th.post('/api/clientmodules?token=' + token).send().expect(400);
            });
        });

        it('responds without a clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                var newClientModule = { 
                    module: 'activities'
                };
                return th.post('/api/clientmodules?token=' + token).send(newClientModule).expect(400);
            });
        });

        it('responds with an incorrect clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                var newClientModule = { 
                    module: 'activities',
                    clientId: 'invalid'
                };
                return th.post('/api/clientmodules?token=' + token).send(newClientModule).expect(400);
            });
        });

        it('responds with a not existing clientId with 400', function() {
            return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                var newClientModule = { 
                    module: 'activities',
                    clientId: '999999999999999999999999'
                };
                return th.post('/api/clientmodules?token=' + token).send(newClientModule).expect(400);
            });
        });

        it('responds with correct client module assignment data with inserted client module assignment containing an _id field', function() {
            var moduleToTest = 'activities';
            var newClientModule = { module: moduleToTest };
            return th.removeClientModule(th.defaults.client, moduleToTest).then(function() {
                return db.get(co.collections.clients.name).findOne({name:th.defaults.client});
            }).then(function(client) {
                newClientModule.clientId = client._id.toString();
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                return th.post(`/api/${co.apis.clientmodules}?token=${token}`).send(newClientModule).expect(200);
            }).then(function(response) {
                var clientModuleFromApi = response.body;
                assert.ok(clientModuleFromApi._id, 'Inserted client module does not contain an _id field');
                delete clientModuleFromApi._id;
                th.compareApiAndDatabaseObjects(co.collections.clientmodules.name, Object.keys(newClientModule), clientModuleFromApi, newClientModule);
                return Promise.resolve();
            });
        });

        it('responds with the existing assignment when an assignment between a client and a module already exists', function() {
            var moduleToTest = 'activities';
            var relevantClient, existingClientModule;
            return db.get(co.collections.clients.name).findOne({name:th.defaults.client}).then(function(client) {
                relevantClient = client;
                return db.get(co.collections.clientmodules.name).findOne({clientId:client._id, module:moduleToTest});
            }).then(function(clientModule) {
                existingClientModule = clientModule;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
            }).then(function(token) {
                var newClientModule = { 
                    module: moduleToTest,
                    clientId: relevantClient._id.toString()
                };
                return th.post(`/api/${co.apis.clientmodules}?token=${token}`).send(newClientModule).expect(200);
            }).then(function(response) {
                assert.strictEqual(response.body._id, existingClientModule._id.toString());
            });
        });

        it('Vorgegebene DAs, die noch nicht existieren, werden angelegt und sind nicht inaktiv', async function() {
            var client = await th.defaults.getClient();
            var token = await th.defaults.login();
            var moduleAssignment = { module: 'DAtest', clientId: client._id.toString() };
            await th.post(`/api/${co.apis.clientmodules}?token=${token}`).send(moduleAssignment).expect(200);
            var das = await db.get(co.collections.dynamicattributes.name).find({identifier:{$exists:true}});
            assert.strictEqual(das.length, 2);
            assert.ok(das[0].clientId.equals(client._id));
            assert.ok(das.find((da) => da.identifier === 'DAtest_user_1' && !da.isInactive ));
            assert.ok(das[1].clientId.equals(client._id));
            assert.ok(das.find((da) => da.identifier === 'DAtest_user_2' && !da.isInactive ));
            var daos = await db.get(co.collections.dynamicattributeoptions.name).find({value:{$exists:true}});
            assert.strictEqual(daos.length, 2);
            assert.ok(daos.find((dao) => dao.value === 'DAtest_user_2_1' ));
            assert.ok(daos[0].clientId.equals(client._id));
            assert.ok(daos.find((dao) => dao.value === 'DAtest_user_2_2' ));
            assert.ok(daos[1].clientId.equals(client._id));
        });

        it('Vorgegebene DAs, die bereits aktiv sind, bleiben aktiv', async function() {
            // DAs vorbereiten
            var client = await th.defaults.getClient();
            await db.get(co.collections.dynamicattributes.name).insert({ clientId: client._id, identifier:'DAtest_user_1', name_en:'DAtest_user_1', type: co.dynamicAttributeTypes.text });
            // Der Rest wie oben
            var token = await th.defaults.login();
            var moduleAssignment = { module: 'DAtest', clientId: client._id.toString() };
            await th.post(`/api/${co.apis.clientmodules}?token=${token}`).send(moduleAssignment).expect(200);
            var das = await db.get(co.collections.dynamicattributes.name).find({identifier:{$exists:true}});
            assert.strictEqual(das.length, 2); // Es müssen dennoch 2 DAs vorhanden sein
            var textAttribute = das.find((da) => da.identifier === 'DAtest_user_1' && !da.isInactive );
            assert.ok(textAttribute);
            assert.ok(textAttribute.clientId.equals(client._id));
        });

        it('Vorgegebene DAs, die inaktiv sind, werden aktiviert', async function() {
            // DAs vorbereiten
            var client = await th.defaults.getClient();
            await db.get(co.collections.dynamicattributes.name).insert({ clientId: client._id, identifier:'DAtest_user_1', name_en:'DAtest_user_1', type: co.dynamicAttributeTypes.text, isInactive: true });
            // Der Rest wie oben
            var token = await th.defaults.login();
            var moduleAssignment = { module: 'DAtest', clientId: client._id.toString() };
            await th.post(`/api/${co.apis.clientmodules}?token=${token}`).send(moduleAssignment).expect(200);
            var das = await db.get(co.collections.dynamicattributes.name).find({identifier:{$exists:true}});
            assert.strictEqual(das.length, 2);
            var textAttribute = das.find((da) => da.identifier === 'DAtest_user_1' && !da.isInactive ); // Nur aktive rausfiltern, da muss das vorher inaktive mit drin sein
            assert.ok(textAttribute);
            assert.ok(textAttribute.clientId.equals(client._id));
        });
        
    });

    describe('DELETE/:id', function() {

        it('responds without authentication with 403', function() {
            return db.get('clientmodules').findOne({module: 'activities'}).then((clientmodule) => {
                return th.del('/api/clientmodules/' + clientmodule._id.toString()).expect(403);
            });
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                var clientId = clientFromDatabase._id;
                return db.get('clientmodules').findOne({module: 'documents', clientId:  clientId}).then(function(clientModuleFromDatabase){
                    return th.removeClientModule('1', 'clients').then(function() {
                        return th.doLoginAndGetToken('1_0_0', 'test').then(function(token){
                            var id = clientModuleFromDatabase._id;
                            return th.del(`/api/clientmodules/${id}?token=${token}`).expect(403);
                        });
                    });
                });
            });    
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                var clientId = clientFromDatabase._id;
                return db.get('clientmodules').findOne({module: 'documents', clientId:  clientId}).then(function(clientModuleFromDatabase){
                    return th.removeClientModule('1', 'clients').then(function() {
                        return th.doLoginAndGetToken('1_0_ADMIN0', 'test').then(function(token){
                            var id = clientModuleFromDatabase._id;
                            return th.del(`/api/clientmodules/${id}?token=${token}`).expect(403);
                        });
                    });
                });
            });    
        });

        it('responds without write permission with 403', function() {
            return db.get('clients').findOne({name: '1'}).then(function(clientFromDatabase){
                var clientId = clientFromDatabase._id;
                return db.get('clientmodules').findOne({module: 'documents', clientId:  clientId}).then(function(clientModuleFromDatabase){
                    //use portal user 
                    return th.removeWritePermission('_0_0', 'PERMISSION_ADMINISTRATION_CLIENT').then(function(){
                        return th.doLoginAndGetToken('_0_0', 'test').then(function(token){
                            var id = clientModuleFromDatabase._id;
                            return th.del(`/api/clientmodules/${id}?token=${token}`).expect(403);
                        });
                    });
                });
            });    
        });

        it('responds with an invalid id with 400', function() {
            return db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    return th.del(`/api/clientmodules/invalid?token=${token}`).send(clientModuleFromDatabase).expect(400);
                });
            });
        });

        it('responds with an id where no client module exists exists with 404', function() {
            return db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                return th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    return th.del(`/api/clientmodules/999999999999999999999999?token=${token}`).send(clientModuleFromDatabase).expect(404);
                });
            });
        });

        it('responds with a correct id with 204', function(done) {
            db.get('clientmodules').findOne({ module : 'activities' }).then((clientModuleFromDatabase) => {
                th.doLoginAndGetToken('_0_0', 'test').then((token) => {
                    th.del(`/api/clientmodules/${clientModuleFromDatabase._id}?token=${token}`).send(clientModuleFromDatabase).expect(204).end((err, res) => {
                        if (err) {
                            done(err);
                            return;
                        }
                        db.get('clientmodules').findOne(clientModuleFromDatabase._id).then((stillExistingClientModule) => {
                            assert.ok(!stillExistingClientModule, 'client module has not been deleted from database');
                            done();
                        });
                    });
                });
            });
        });

        it('Vorgegebene DAs werden deaktiviert', async function() {
            // DAs vorbereiten
            var client = await th.defaults.getClient();
            await db.get(co.collections.dynamicattributes.name).insert({ clientId: client._id, identifier:'DAtest_user_1', name_en:'DAtest_user_1', type: co.dynamicAttributeTypes.text });
            // Modulzuordnung vorbereiten
            var zuordnung = await db.get(co.collections.clientmodules.name).insert({ module: 'DAtest', clientId: client._id });
            // Deaktivieren
            var token = await th.defaults.login();
            await th.del(`/api/${co.apis.clientmodules}/${zuordnung._id}?token=${token}`).expect(204);
            var das = await db.get(co.collections.dynamicattributes.name).find({identifier:{$exists:true}});
            assert.strictEqual(das.length, 1); // Das Attribut muss dennoch vorhanden sein
            var inactiveAttribute = das.find((da) => da.identifier === 'DAtest_user_1' && da.isInactive );
            assert.ok(inactiveAttribute);
            assert.ok(inactiveAttribute.clientId.equals(client._id));
        });
        
    });

});
