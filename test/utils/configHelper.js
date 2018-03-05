/**
 * UNIT Tests for utils/configHelper
 */
var assert = require('assert');
var configHelper = require('../../utils/configHelper');
var path = require('path');
var fs = require('fs');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var moduleConfig = require('../../config/module-config.json');

xdescribe('UTILS configHelper', function() {
        
    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
    });

    afterEach(() => {
        delete moduleConfig.modules.testModule;
    });

    function hasDuplicates(list) {
        var indexes = {};
        for (var i in list) {
            var element = list[i];
            if (indexes[element]) return true;
            indexes[element] = element;
        };
        return false;
    }

    describe('getAvailablePermissionKeysForClient', function() {
        it('Returns all permission keys of the module config file when clientId is null', function() {
            moduleConfig.modules.testModule = {
                menu: [ { title: 'TestTitle', items: [ { mainCard: 'TestCard', icon: 'TestIcon', title: 'TestTitle', permission: co.permissions.OFFICE_ACTIVITY } ] } ],
            };
            // Die Konstanten können verwendet werden, da der module-config-Test gewährleistet, dass alle Berechtigungen auch in den Konstanten vorhanden sind
            return configHelper.getAvailablePermissionKeysForClient(null, db).then(function(permissionKeys) {
                // Berechtigungen dürfen sich nicht wiederholen
                assert.ok(!hasDuplicates(permissionKeys));
                // Zurückgegebene Berechtigungen müssen in Konstanten drin stehen
                permissionKeys.forEach(function(permission) {
                    var key = permission.substring(11);
                    assert.ok(co.permissions[key], `Permission key ${key} not found in constants`);
                });
                // Alle konstanten Berechtigungen müssen zurück gegeben worden sein
                Object.keys(co.permissions).forEach(function(key) {
                    var permission = co.permissions[key];
                    assert.ok(permissionKeys.indexOf(permission) >= 0, `Permission ${permission} not returned`);
                });
                return Promise.resolve();
            });
        });

        it('Returns an empty list when there is no client for the given clientId', function() {
            return configHelper.getAvailablePermissionKeysForClient(monk.id('999999999999999999999999'), db).then(function(permissionKeys) {
                assert.strictEqual(permissionKeys.length, 0);
                return Promise.resolve();
            });
        });

        it('Returns an empty list when the client has no modules assigned', function() {
            var clientToUse;
            return th.defaults.getClient().then(function(client) {
                clientToUse = client;
                return db.get(co.collections.clientmodules.name).remove({clientId:client._id});
            }).then(function() {
                return configHelper.getAvailablePermissionKeysForClient(clientToUse._id, db);
            }).then(function(permissionKeys) {
                assert.strictEqual(permissionKeys.length, 0);
                return Promise.resolve();
            });
        });

        it('Returns only those permission keys defined for the modules the client has access to', function() {
            moduleConfig.modules.testModule = {
                menu: [ { title: 'TestTitle', items: [ { mainCard: 'TestCard', icon: 'TestIcon', title: 'TestTitle', permission: co.permissions.OFFICE_ACTIVITY } ] } ],
                settingsets : [ { mainCard: 'TestCard', title: 'TestTitle', type: 'SETTINGSET_TYPE_USER', icon: 'TestIcon', permission: co.permissions.SETTINGS_USER } ]
            };
            var clientToUse;
            return th.defaults.getClient().then(function(client) {
                clientToUse = client;
                return db.get(co.collections.clientmodules.name).remove({clientId:client._id});
            }).then(function() {
                return db.get(co.collections.clientmodules.name).insert({ clientId: clientToUse._id, module: 'testModule' });
            }).then(function() {
                var clientModules = [
                    { clientId: clientToUse._id, module: co.modules.base },
                    { clientId: clientToUse._id, module: co.modules.activities },
                    { clientId: clientToUse._id, module: co.modules.documents }
                ];
                return db.get(co.collections.clientmodules.name).bulkWrite(clientModules.map((clientModule) => { return {insertOne:{document:clientModule}} }));
            }).then(function() {
                return configHelper.getAvailablePermissionKeysForClient(clientToUse._id, db);
            }).then(function(permissionKeys) {
                // Berechtigungen dürfen sich nicht wiederholen
                assert.ok(!hasDuplicates(permissionKeys));
                // Zurückgegebene Berechtigungen müssen in Konstanten drin stehen
                permissionKeys.forEach(function(permission) {
                    var key = permission.substring(11);
                    assert.ok(co.permissions[key], `Permission key ${key} not found in constants`);
                });
                // Alle Berechtigungen für den Mandanten müssen zurück gegeben worden sein
                [
                    co.permissions.ADMINISTRATION_SETTINGS,
                    co.permissions.ADMINISTRATION_USER,
                    co.permissions.ADMINISTRATION_USERGROUP,
                    co.permissions.CORE_RELATIONS,
                    co.permissions.SETTINGS_USER,
                    co.permissions.OFFICE_ACTIVITY,
                    co.permissions.OFFICE_DOCUMENT
                ].forEach(function(permission) {
                    assert.ok(permissionKeys.indexOf(permission) >= 0, `Permission ${permission} not returned`);
                });
                return Promise.resolve();
            });
        });

        it('Returns only permission keys defined in the module config even when the client has assigned a module which is not defined in module config', function() {
            var clientToUse;
            return th.defaults.getClient().then(function(client) {
                clientToUse = client;
                return db.get(co.collections.clientmodules.name).remove({clientId:client._id});
            }).then(function() {
                var clientModules = [
                    { clientId: clientToUse._id, module: 'Wurstel' },
                    { clientId: clientToUse._id, module: 'Hustel' },
                    { clientId: clientToUse._id, module: co.modules.documents }
                ];
                return db.get(co.collections.clientmodules.name).bulkWrite(clientModules.map((clientModule) => { return {insertOne:{document:clientModule}} }));
            }).then(function() {
                return configHelper.getAvailablePermissionKeysForClient(clientToUse._id, db);
            }).then(function(permissionKeys) {
                // Berechtigungen dürfen sich nicht wiederholen
                assert.ok(!hasDuplicates(permissionKeys));
                // Zurückgegebene Berechtigungen müssen in Konstanten drin stehen
                permissionKeys.forEach(function(permission) {
                    var key = permission.substring(11);
                    assert.ok(co.permissions[key], `Permission key ${key} not found in constants`);
                });
                // Alle Berechtigungen für den Mandanten müssen zurück gegeben worden sein
                [
                    co.permissions.OFFICE_DOCUMENT
                ].forEach(function(permission) {
                    assert.ok(permissionKeys.indexOf(permission) >= 0, `Permission ${permission} not returned`);
                });
                return Promise.resolve();
            });
        });

    });
    
    describe('getAvailableModulesForClient', function() {

        it('Returns all modules defined when the clientId is null', function() {
            return configHelper.getAvailableModulesForClient(null, db).then(function(modules) {
                var moduleNames = Object.keys(modules);
                // Module dürfen sich nicht wiederholen
                assert.ok(!hasDuplicates(moduleNames));
                // Zurückgegebene Module müssen in Konstanten drin stehen
                moduleNames.forEach(function(moduleName) {
                    assert.ok(co.modules[moduleName], `Module ${moduleName} not found in constants`);
                });
                // Alle konstanten Module müssen zurück gegeben worden sein
                Object.keys(co.modules).forEach(function(key) {
                    var mod = co.modules[key];
                    assert.ok(moduleNames.indexOf(mod) >= 0, `Module ${mod} not returned`);
                });
                return Promise.resolve();
            });
        });

        it('Returns an empty list when there is no client for the given clientId', function() {
            return configHelper.getAvailableModulesForClient(monk.id('999999999999999999999999'), db).then(function(modules) {
                assert.strictEqual(Object.keys(modules).length, 0);
                return Promise.resolve();
            });
        });

        it('Returns an empty list when the client has no modules assigned', function() {
            var clientToUse;
            return th.defaults.getClient().then(function(client) {
                clientToUse = client;
                return db.get(co.collections.clientmodules.name).remove({clientId:client._id});
            }).then(function() {
                return configHelper.getAvailableModulesForClient(clientToUse._id, db);
            }).then(function(modules) {
                assert.strictEqual(Object.keys(modules).length, 0);
                return Promise.resolve();
            });
        });

        it('Returns a list of modules available to the client with the given clientId', function() {
            var clientToUse;
            return th.defaults.getClient().then(function(client) {
                clientToUse = client;
                return db.get(co.collections.clientmodules.name).remove({clientId:client._id});
            }).then(function() {
                var clientModules = [
                    { clientId: clientToUse._id, module: co.modules.base },
                    { clientId: clientToUse._id, module: co.modules.activities },
                    { clientId: clientToUse._id, module: co.modules.documents }
                ];
                return db.get(co.collections.clientmodules.name).bulkWrite(clientModules.map((clientModule) => { return {insertOne:{document:clientModule}} }));
            }).then(function() {
                return configHelper.getAvailableModulesForClient(clientToUse._id, db);
            }).then(function(modules) {
                var moduleNames = Object.keys(modules);
                // Berechtigungen dürfen sich nicht wiederholen
                assert.ok(!hasDuplicates(moduleNames));
                // Zurückgegebene Module müssen in Konstanten drin stehen
                moduleNames.forEach(function(moduleName) {
                    assert.ok(co.modules[moduleName], `Module ${moduleName} not found in constants`);
                });
                // Alle konstanten Module müssen zurück gegeben worden sein
                [
                    co.modules.base,
                    co.modules.activities,
                    co.modules.documents
                ].forEach(function(key) {
                    var mod = co.modules[key];
                    assert.ok(moduleNames.indexOf(mod) >= 0, `Module ${mod} not returned`);
                });
                return Promise.resolve();
            });
        });

        it('Returns only modules available in the module config even when the client has assigned a module which is not defined in module config', function() {
            var clientToUse;
            return th.defaults.getClient().then(function(client) {
                clientToUse = client;
                return db.get(co.collections.clientmodules.name).remove({clientId:client._id});
            }).then(function() {
                var clientModules = [
                    { clientId: clientToUse._id, module: 'Hampel' },
                    { clientId: clientToUse._id, module: 'Pampel' },
                    { clientId: clientToUse._id, module: co.modules.documents }
                ];
                return db.get(co.collections.clientmodules.name).bulkWrite(clientModules.map((clientModule) => { return {insertOne:{document:clientModule}} }));
            }).then(function() {
                return configHelper.getAvailableModulesForClient(clientToUse._id, db);
            }).then(function(modules) {
                var moduleNames = Object.keys(modules);
                // Berechtigungen dürfen sich nicht wiederholen
                assert.ok(!hasDuplicates(moduleNames));
                // Zurückgegebene Module müssen in Konstanten drin stehen
                moduleNames.forEach(function(moduleName) {
                    assert.ok(co.modules[moduleName], `Module ${moduleName} not found in constants`);
                });
                // Alle konstanten Module müssen zurück gegeben worden sein
                [
                    co.modules.documents
                ].forEach(function(key) {
                    var mod = co.modules[key];
                    assert.ok(moduleNames.indexOf(mod) >= 0, `Module ${mod} not returned`);
                });
                return Promise.resolve();
            });
        });

    });
    
    describe('isPermissionAvailableToClient', function() {

        it('returns false when there is no client for the given id', function() {
            return configHelper.isPermissionAvailableToClient(monk.id('999999999999999999999999'), co.permissions.OFFICE_ACTIVITY, db).then(function(isAvailable) {
                assert.ok(!isAvailable);
                return Promise.resolve();
            });
        });

        it('returns false when there is no permission with the given key', function() {
            return th.defaults.getClient().then(function(client) {
                return configHelper.isPermissionAvailableToClient(client._id, 'Hubbelle Bubbelle', db);
            }).then(function(isAvailable) {
                assert.ok(!isAvailable);
                return Promise.resolve();
            });
        });

        it('returns false when the client has access to no module which contains the permission', function() {
            var clientToUse;
            return th.defaults.getClient().then(function(client) {
                clientToUse = client;
                return db.get(co.collections.clientmodules.name).remove({clientId:client._id});
            }).then(function() {
                return configHelper.isPermissionAvailableToClient(clientToUse._id, co.permissions.OFFICE_ACTIVITY, db);
            }).then(function(isAvailable) {
                assert.ok(!isAvailable);
                return Promise.resolve();
            });
        });

        it('returns true when clientId is null', function() {
            return configHelper.isPermissionAvailableToClient(null, co.permissions.OFFICE_ACTIVITY, db).then(function(isAvailable) {
                assert.ok(isAvailable);
                return Promise.resolve();
            });
        });

        it('returns true when the client has access to the permission which is defined in a menu', function() {
            return th.defaults.getClient().then(function(client) {
                return configHelper.isPermissionAvailableToClient(client._id, co.permissions.OFFICE_ACTIVITY, db);
            }).then(function(isAvailable) {
                assert.ok(isAvailable);
                return Promise.resolve();
            });
        });

        it('returns true when the client has access to the permission which is defined in a settingset', function() {
            return th.defaults.getClient().then(function(client) {
                return configHelper.isPermissionAvailableToClient(client._id, co.permissions.SETTINGS_USER, db);
            }).then(function(isAvailable) {
                assert.ok(isAvailable);
                return Promise.resolve();
            });
        });

    });

});
