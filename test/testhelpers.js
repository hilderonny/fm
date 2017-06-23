/**
 * This file provides functions for preparing test data for several tests.
 * @example require('testhelper').doLoginAndGetToken('admin', 'admin').then(function(token){ ... });
 */
var superTest = require('supertest');
var server = require('../app');
var async = require('async');
var db = require('../middlewares/db');
var bcryptjs = require('bcryptjs');
var assert = require('assert');
var hat = require('hat');
var fs = require('fs');
var path = require('path');
var localConfig = require('../config/localconfig.json'); // http://stackoverflow.com/a/14678694
var documentsHelper = require('../utils/documentsHelper');
var moduleConfig = require('../config/module-config.json');
var co = require('../utils/constants');
var monk = require('monk');

var th = module.exports;

var dbObjects = {};

th.bulkInsert = (collectionName, docs) => {
    if (!dbObjects[collectionName]) {
        dbObjects[collectionName] = [];
    }
    dbObjects[collectionName] = dbObjects[collectionName].concat(docs);
    return db.get(collectionName).bulkWrite(docs.map((doc) => { return {insertOne:{document:doc}} })).then((res) => {
        var docsToReturn = [];
        for (var i = 0; i < res.insertedCount; i++) {
            docs[i]._id = res.insertedIds[i];
            docsToReturn.push(docs[i]);
        }
        return new Promise((resolve, reject) => {
            resolve(docsToReturn);
        });
    });
};

// Generate license key with hat, https://github.com/substack/node-hat
var generateLicenseKey = () => {
    return hat(1024, 32);
};

/**
 * Removes all documents from the database and creates an admin user. Used before all tests.
 * The returned promise has no parameter.
 */
th.cleanDatabase = () => {
    dbObjects = {};
    var promises = [
        'activities',
        'clientmodules',
        'clients',
        'documents',
        'fmobjects',
        'folders',
        'permissions',
        'portalmodules',
        'portals',
        'relations',
        'usergroups',
        'users',
        'markers'
    ].map((key) => db.get(key).drop());
    return Promise.all(promises); // Wait for all drop Promises to complete
};

/**
 * Performs a login with the given credentials and returns a promise with the token as result
 */
th.doLoginAndGetToken = (username, password) => {
    if (!username) throw new Error('Please provide an username');
    if (username.split("_").length != 3) throw new Error(`The username must be of form <client>_<usergroup>_<user> or _<usergroup>_<user>. You provided "${username}"`);
    return new Promise((resolve, reject) => {
        superTest(server)
            .post('/api/login')
            .send({ 'username' : username, 'password' : password })
            .end((err, res) => {
                resolve(res.body.token);
            });
    });
};

/**
 * Vereinfachter Zugriff auf superTest.get()-Funktion. Damit spart man sich das Einbinden von superTest in Tests
 */
th.get = superTest(server).get;

/**
 * Vereinfachter Zugriff auf superTest.post()-Funktion. Damit spart man sich das Einbinden von superTest in Tests
 */
th.post = superTest(server).post;

/**
 * Vereinfachter Zugriff auf superTest.put()-Funktion. Damit spart man sich das Einbinden von superTest in Tests
 */
th.put = superTest(server).put;

/**
 * Vereinfachter Zugriff auf superTest.del()-Funktion. Damit spart man sich das Einbinden von superTest in Tests
 */
th.del = superTest(server).del;

/**
 * Creates 3 clients and returns a promise without parameters.
 */
th.prepareClients = () => {
    return th.bulkInsert('clients', [
        { name: '0' },
        { name: '1' }
    ]);
};

/**
 * Creates 3 client module assignments for each existing client and returns a promise without parameters.
 */
th.prepareClientModules = () => {
    var clientModules = [];
    dbObjects.clients.forEach((client) => {
        clientModules.push({ clientId: client._id, module: 'base' });
        clientModules.push({ clientId: client._id, module: 'activities' });
        clientModules.push({ clientId: client._id, module: 'documents' });
        clientModules.push({ clientId: client._id, module: 'fmobjects' });
        clientModules.push({ clientId: client._id, module: 'licenseserver' });
    });
    return th.bulkInsert('clientmodules', clientModules);
};

/**
 * Removes the access to a module from the given client
 */
th.removeClientModule = (clientName, module) => {
    return new Promise((resolve, reject) => {
        return db.get('clients').findOne({ name: clientName }).then((client) => {
            return db.get('clientmodules').remove({ clientId: client._id, module: module }).then(resolve);
        });
    });
};

/**
 * Creates 3 user groups for each existing client plus for the portal (without client) and returns
 * a promise.
 * The names of the user groups have following schema: [IndexOfClient]_[IndexOfUserGroup].
 */
th.prepareUserGroups = () => {
    var userGroups = [];
    dbObjects.clients.forEach((client) => {
        userGroups.push({ name: client.name + '_0', clientId: client._id });
        userGroups.push({ name: client.name + '_1', clientId: client._id });
    });
    // Add user groups for portal
    userGroups.push({ name: '_0', clientId: null });
    return th.bulkInsert('usergroups', userGroups);
};

/**
 * Creates 3 users for each existing user group and returns a promise.
 * The names of the users have following schema: [IndexOfClient]_[IndexOfUserGroup]_[IndexOfUser].
 * The passwords of the users have following schema: [IndexOfClient]_[IndexOfUserGroup]_[IndexOfUser].
 * The password of each user is "test"
 */
th.prepareUsers = () => {
    var hashedPassword = '$2a$10$mH67nsfTbmAFqhNo85Mz4.SuQ3kyZbiYslNdRDHhaSO8FbMuNH75S'; // Encrypted version of 'test'. Because bryptjs is very slow in tests.
    var users = [];
    dbObjects.usergroups.forEach((userGroup) => {
        users.push({ name: userGroup.name + '_0', pass: hashedPassword, clientId: userGroup.clientId, userGroupId: userGroup._id });
        users.push({ name: userGroup.name + '_ADMIN0', pass: hashedPassword, clientId: userGroup.clientId, userGroupId: userGroup._id, isAdmin: true }); // Administrator
    });
    return th.bulkInsert('users', users);
};

/**
 * Creates default permissions with read / write for each user group for each permission key.
 * Can be deleted selectively within tests
 */
th.preparePermissions = () => {
    var permissions = [];
    dbObjects.usergroups.forEach((userGroup) => {
        permissions.push({ key: 'PERMISSION_ADMINISTRATION_CLIENT', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        permissions.push({ key: 'PERMISSION_ADMINISTRATION_USER', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        permissions.push({ key: 'PERMISSION_ADMINISTRATION_USERGROUP', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        permissions.push({ key: 'PERMISSION_BIM_FMOBJECT', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        permissions.push({ key: 'PERMISSION_OFFICE_ACTIVITY', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        permissions.push({ key: 'PERMISSION_OFFICE_DOCUMENT', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        permissions.push({ key: 'PERMISSION_LICENSESERVER_PORTAL', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        permissions.push({ key: 'PERMISSION_SETTINGS_CLIENT', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        permissions.push({ key: 'PERMISSION_SETTINGS_PORTAL', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        permissions.push({ key: 'PERMISSION_SETTINGS_USER', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
    });
    return th.bulkInsert('permissions', permissions);
};

/**
 * Deletes the canRead flag of a permission of the usergroup of the user with the given name.
 */
th.removeReadPermission = (userName, permissionKey) => {
    return new Promise((resolve, reject) => {
        return db.get('users').findOne({ name: userName }).then((user) => {
            return db.get('permissions').findOneAndUpdate({ key: permissionKey, userGroupId: user.userGroupId }, { $set: { canRead: false} }).then(resolve);
        });
    });
};

/**
 * Deletes the canWrite flag of a permission of the udsergroup of the user with the given name.
 */
th.removeWritePermission = (userName, permissionKey) => {
    return new Promise((resolve, reject) => {
        return db.get('users').findOne({ name: userName }).then((user) => {
            return db.get('permissions').findOneAndUpdate({ key: permissionKey, userGroupId: user.userGroupId }, { $set: { canWrite: false} }).then(resolve);
        });
    });
};

/**
 * Deletes the canRead and canWrite flags of a permission of the usergroup of the user with the given name.
 */
th.removeAllPermissions = (userName, permissionKey) => {
    return new Promise((resolve, reject) => {
        return db.get('users').findOne({ name: userName }).then((user) => {
            return db.get('permissions').findOneAndUpdate({ key: permissionKey, userGroupId: user.userGroupId }, { $set: { canRead: false, canWrite: false} }).then(resolve);
        });
    });
};

/**
 * Creates 3 portals
 * Two active and one not
 * 
 */

th.preparePortals = () => {
    var portals = [{name: 'p1', isActive: true, licenseKey: 'LicenseKey1'},
                   {name: 'p2', isActive: false, licenseKey: 'LicenseKey2'}];
    return th.bulkInsert('portals', portals);
};

/**
 * Creates 5 portal modules for each existing portal 
 * 
 */

th.preparePortalModules = () => {
    var portalModules = [];
    dbObjects.portals.forEach((portal) => {
        portalModules.push({portalId: portal._id, module: 'base'});
        portalModules.push({portalId: portal._id, module: 'clients'});
        portalModules.push({portalId: portal._id, module: 'documents'});
        portalModules.push({portalId: portal._id, module: 'fmobjects'});
        portalModules.push({portalId: portal._id, module: 'portalbase'});
    });
    return th.bulkInsert('portalmodules', portalModules);
};

/**
 * Creates 3 activities for each user
 * The name schema is [UserName]_[IndexOfActivity]
 * - one activity in the past (yesterday, Gewährleistung)
 * - one activity in 1 hour (Kundenbesuch)
 * - one activity next year (Wartung)
 */
th.prepareActivities = () => {
    var activities = [];
    var now = new Date();
    dbObjects.users.forEach((user) => {
        now.setHours(now.getHours() - 24);
        activities.push({
            date: now.toISOString(),
            clientId: user.clientId,
            createdByUserId: user._id,
            participantUserIds: [],
            name: user.name + '_0',
            type: 'Gewährleistung'
        });
        now.setHours(now.getHours() + 25);
        activities.push({
            date: now.toISOString(),
            clientId: user.clientId,
            createdByUserId: user._id,
            participantUserIds: [],
            name: user.name + '_1',
            type: 'Kundenbesuch'
        });
        now.setYear(now.getYear() + 1901);
        activities.push({
            date: now.toISOString(),
            clientId: user.clientId,
            createdByUserId: user._id,
            participantUserIds: [],
            name: user.name + '_2',
            type: 'Wartung'
        });
    });
    return th.bulkInsert('activities', activities);
};

/**
 * Fügt einen Benutzer einer Aktivität als Teilnehmer hinzu
 */
th.addUserAsParticipantToActivity = function(userName, activitiyName) {
    return new Promise((resolve, reject) => {
        return db.get('users').findOne({ name: userName }).then((user) => {
            return db.get('activities').findOneAndUpdate({ name: activitiyName }, { $addToSet: { 
                participantUserIds: user._id
            } }).then(resolve);
        });
    });
};

/**
 * Creates 2 markers for each user
 *  The name schema is [UserName]_[IndexOfMarkers]
 */
th.prepareMarkers = () => {
    var markers = [];
    dbObjects.users.forEach((user)=>{
        markers.push({
            clientId: user.clientId,
            name: user.name + '_0',
            lat: 'lat',
            lng: 'lng'
        });
        markers.push({
            clientId: user.clientId,
            name: user.name +  '_1',
            lat: 'lat',
            lng: 'lng'        
        });
    });
    return th.bulkInsert('markers', markers);
};


/**
 * Creates 3 FM objects for each client
 * The name schema is [ClientName]_[IndexOfFmObject]
 * All are in the top level
 */
th.prepareFmObjects = () => {
    var fmObjects = [];
    dbObjects.clients.forEach((client) => {
        fmObjects.push({ name: client.name + '_0', clientId: client._id, type: 'Projekt', path:',' });
        fmObjects.push({ name: client.name + '_1', clientId: client._id, type: 'Gebäude', path:',' });
    });
    return th.bulkInsert('fmobjects', fmObjects).then((insertedRootFmObjects) => {
        var level1FmObjects = [];
        insertedRootFmObjects.forEach((rootFmObject) => {
            level1FmObjects.push({ name: rootFmObject.name + '_0', clientId: rootFmObject.clientId, type: 'Etage', path: rootFmObject.path + rootFmObject._id.toString() + ',', parentId: rootFmObject._id });
            level1FmObjects.push({ name: rootFmObject.name + '_1', clientId: rootFmObject.clientId, type: 'Raum', path: rootFmObject.path + rootFmObject._id.toString() + ',', parentId: rootFmObject._id });
        });
        return th.bulkInsert('fmobjects', level1FmObjects);
    });
};

/**
 * Creates 3 folders for each client with a folder hierarchiy of 3 levels
 * The name schema is
 * [ClientName]_[IndexOfFolder]
 * [ClientName]_[IndexOfFolder]_[IndexOfSubFolder]
 * [ClientName]_[IndexOfFolder]_[IndexOfSubFolder]_[IndexOfSubFolder]
 */
th.prepareFolders = () => {
    var rootFolders = [];
    dbObjects.clients.forEach((client) => {
        rootFolders.push({ name: client.name + '_0', clientId: client._id });
        rootFolders.push({ name: client.name + '_1', clientId: client._id });
    });
    // Add folder to portal
    rootFolders.push({ name: 'portalfolder', clientId: null });
    return th.bulkInsert('folders', rootFolders).then((insertedRootFolders) => {
        var level1Folders = [];
        insertedRootFolders.forEach((insertedRootFolder) => {
            level1Folders.push({ name: insertedRootFolder.name + '_0', clientId: insertedRootFolder.clientId, parentFolderId: insertedRootFolder._id });
            level1Folders.push({ name: insertedRootFolder.name + '_1', clientId: insertedRootFolder.clientId, parentFolderId: insertedRootFolder._id });
        });
        return th.bulkInsert('folders', level1Folders).then((insertedLevel1Folders) => {
            var level2Folders = [];
            insertedLevel1Folders.forEach((insertedLevel1Folder) => {
                level2Folders.push({ name: insertedLevel1Folder.name + '_0', clientId: insertedLevel1Folder.clientId, parentFolderId: insertedLevel1Folder._id });
                level2Folders.push({ name: insertedLevel1Folder.name + '_1', clientId: insertedLevel1Folder.clientId, parentFolderId: insertedLevel1Folder._id });
            });
            return th.bulkInsert('folders', level2Folders);
        });
    });
};

var createPath = (pathToCreate) => {
    try {
        fs.statSync(pathToCreate);
        return; // Her we come only when the path exists
    }
    catch (err) {
        // path does not exist, create it
        createPath(path.dirname(pathToCreate));
        fs.mkdirSync(pathToCreate);
    }
}

/**
 * Creates a file for the all existing documents in documents/[clientId]/documentId with the document's ID as content
 */
th.prepareDocumentFiles = () => {
    return new Promise((resolve, reject) => {
        dbObjects.documents.forEach((document) => {
            var filePath = documentsHelper.getDocumentPath(document._id);
            createPath(path.dirname(filePath));
            fs.writeFileSync(filePath, document._id.toString());
        });
        resolve();
    });
};

/**
 * Removes all created document files for cleanup. Uses the database content because the tests could have created files.
 */
th.removeDocumentFiles = () => {
    return new Promise((resolve, reject) => {
        db.get('documents').find().then((documents) => {
            documents.forEach((document) => {
                var id = document._id.toString();
                var filePath = documentsHelper.getDocumentPath(document._id);
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            });
            var documentsBasePath = path.join(
                __dirname, 
                '/../',
                localConfig.documentspath
            );
            db.get('clients').find().then((clients) => {
                clients.forEach((client) => {
                    var clientPath = path.join(documentsBasePath, client._id.toString());
                    if (fs.existsSync(clientPath)) fs.rmdirSync(clientPath);
                });
                resolve();
            });
        });
    });
};

/**
 * Creates 2 documents for each folder and additionally 2 documents for each client in the root folder
 * The name schema is
 * [FolderName]_[IndexOfDocument]
 * [ClientName]_[IndexOfDocument]
 */
th.prepareDocuments = () => {
    var documents = [];
    dbObjects.folders.forEach((folder) => {
        documents.push({ name: folder.name + '_0', clientId: folder.clientId, parentFolderId: folder._id });
        documents.push({ name: folder.name + '_1', clientId: folder.clientId, parentFolderId: folder._id });
    });
    // Documents in root folder
    dbObjects.clients.forEach((client) => {
        documents.push({ name: client.name + '_0', clientId: client._id });
        documents.push({ name: client.name + '_1', clientId: client._id });
    });
    return th.bulkInsert('documents', documents);
};

/**
 * Create a relation to each activity for each document in the database.
 */
th.prepareRelations = function() {
    var relations = [];
    var keys = Object.keys(dbObjects);
    keys.forEach(function(key1) {
        keys.forEach(function(key2) {
            relations.push({ type1: key1, id1: dbObjects[key1][0]._id, type2: key2, id2: dbObjects[key2][0]._id });
        });
    });
    return th.bulkInsert('relations', relations);
};

/**
 * Creates 3 documents for each folder
 * Asynchronous call:
 * return testHelpers.compareApiAndDatabaseObjects(
 *  'clients',
 *  [ '_id', 'name' ],
 *  clientFromApi,
 *  clientFromDatabase
 * )
 */
th.compareApiAndDatabaseObjects = (name, keysFromDatabase, apiObject, databaseObject) => {
    var keyCountFromApi = Object.keys(apiObject).length;
    var keyCountFromDatabase = keysFromDatabase.length;
    assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of ${name} ${apiObject._id} differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
    keysFromDatabase.forEach((key) => {
        var valueFromDatabase = databaseObject[key].toString(); // Compare on a string basis because the API returns strings only
        var valueFromApi = apiObject[key].toString();
        assert.strictEqual(valueFromApi, valueFromDatabase, `${key} of ${name} ${apiObject._id} differs (${valueFromApi} from API, ${valueFromDatabase} in database)`);
    });
};

function getModuleForApi(api) {
    // Use only the first parts until the slash
    api = api.split('/')[0];
    for (var moduleName in moduleConfig.modules) {
        var m = moduleConfig.modules[moduleName];
        // API
        if (m.api && m.api.find((a) => a === api))  {
            return moduleName;
        }
    };
}

th.defaults = {
    adminUser: '1_0_ADMIN0',
    client: '1',
    otherClient: '0',
    otherUser: '0_0_0',
    password: 'test',
    portal: 'p1',
    user: '1_0_0',
    userGroup: '1_0'
};

th.apiTests = {
    get: {
        defaultNegative: function(api, permission) {
            it('responds without authentication with 403', function() {
                return th.get(`/api/${api}`).expect(403);
            });
            it('responds without read permission with 403', function() {
                // Remove the corresponding permission
                return th.removeReadPermission(th.defaults.user, permission).then(function() {
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
                }).then(function(token) {
                    return th.get(`/api/${api}?token=${token}`).expect(403);
                });
            });
            function checkForUser(user) {
                return function() {
                    var moduleName = getModuleForApi(api);
                    return th.removeClientModule(th.defaults.client, moduleName).then(function() {
                        return th.doLoginAndGetToken(user, th.defaults.password);
                    }).then(function(token) {
                        return th.get(`/api/${api}?token=${token}`).expect(403);
                    });
                }
            }
            it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser(th.defaults.user));
            it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser(th.defaults.adminUser));
        }
    },
    getForIds: {
        defaultNegative: function(api, permission, collection, createTestObjects) {
            it('responds without authentication with 403', function() {
                return createTestObjects().then(function(testObjects) {
                    return th.bulkInsert(collection, testObjects);
                }).then(function(insertedTestObjects) {
                    var testObjectIds = insertedTestObjects.map((to) => to._id.toString());
                    return th.get(`/api/${api}/forIds?ids=${testObjectIds.join(',')}`).expect(403);
                });
            });
            function checkForUser(user) {
                return function() {
                    var moduleName = getModuleForApi(api);
                    var testObjectIds;
                    return th.removeClientModule(th.defaults.client, moduleName).then(function() {
                        return createTestObjects();
                    }).then(function(testObjects) {
                        return th.bulkInsert(collection, testObjects);
                    }).then(function(insertedTestObjects) {
                        testObjectIds = insertedTestObjects.map((to) => to._id.toString());
                        return th.doLoginAndGetToken(user, th.defaults.password);
                    }).then(function(token) {
                        return th.get(`/api/${api}/forIds?ids=${testObjectIds.join(',')}&token=${token}`).expect(403);
                    });
                }
            }
            it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser(th.defaults.user));
            it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser(th.defaults.adminUser));
            it('responds with empty list when user has no read permission', function() {
                var testObjectIds;
                return th.removeReadPermission(th.defaults.user, permission).then(function() {
                    return createTestObjects();
                }).then(function(testObjects) {
                    return th.bulkInsert(collection, testObjects);
                }).then(function(insertedTestObjects) {
                    testObjectIds = insertedTestObjects.map((to) => to._id.toString());
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
                }).then(function(token) {
                    return th.get(`/api/${api}/forIds?ids=${testObjectIds.join(',')}&token=${token}`).expect(200);
                }).then(function(response) {
                    assert.equal(response.body.length, 0);
                    return Promise.resolve();
                });
            });
            it('responds with empty list when query parameter "ids" does not exist', function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    return th.get(`/api/${api}/forIds?token=${token}`).expect(200);
                }).then(function(response) {
                    assert.equal(response.body.length, 0);
                    return Promise.resolve();
                });
            });
            it('returns only elements of correct ids when parameter "ids" contains faulty IDs', function() {
                var testObjectIds, insertedTestObjects;
                return createTestObjects().then(function(testObjects) {
                    return th.bulkInsert(collection, testObjects);
                }).then(function(objects) {
                    insertedTestObjects = objects;
                    testObjectIds = objects.map((to) => to._id.toString());
                    testObjectIds.push('invalidId');
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
                }).then(function(token) {
                    return th.get(`/api/${api}/forIds?ids=${testObjectIds.join(',')}&token=${token}`).expect(200);
                }).then(function(response) {
                    var objects = response.body;
                    var idCount = insertedTestObjects.length;
                    assert.equal(objects.length, idCount);
                    for (var i = 0; i < idCount; i++) {
                        assert.strictEqual(objects[i].name, insertedTestObjects[i].name);
                    }
                    return Promise.resolve();
                });
            });
            it('returns only elements of correct ids when parameter "ids" contains IDs where no entities exist for', function() {
                var testObjectIds, insertedTestObjects;
                return createTestObjects().then(function(testObjects) {
                    return th.bulkInsert(collection, testObjects);
                }).then(function(objects) {
                    insertedTestObjects = objects;
                    testObjectIds = objects.map((to) => to._id.toString());
                    testObjectIds.push('999999999999999999999999');
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
                }).then(function(token) {
                    return th.get(`/api/${api}/forIds?ids=${testObjectIds.join(',')}&token=${token}`).expect(200);
                }).then(function(response) {
                    var objects = response.body;
                    var idCount = insertedTestObjects.length;
                    assert.equal(objects.length, idCount);
                    for (var i = 0; i < idCount; i++) {
                        assert.strictEqual(objects[i]._id, insertedTestObjects[i]._id.toString());
                    }
                    return Promise.resolve();
                });
            });
        },
        clientDependentNegative: function(api, collection, createTestObjects) {
            it('returns only elements of the client of the logged in user when "ids" contains IDs of entities of another client', function() {
                var testObjectIds, insertedTestObjects, testObjects;
                return createTestObjects().then(function(objects) {
                    testObjects = objects;
                    return db.get(co.collections.clients).findOne({name:th.defaults.otherClient});
                }).then(function(otherClient) {
                    testObjects.push({
                        clientId:otherClient._id
                    });
                    return th.bulkInsert(collection, testObjects);
                }).then(function(objects) {
                    insertedTestObjects = objects;
                    testObjectIds = objects.map((to) => to._id.toString());
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
                }).then(function(token) {
                    return th.get(`/api/${api}/forIds?ids=${testObjectIds.join(',')}&token=${token}`).expect(200);
                }).then(function(response) {
                    var objects = response.body;
                    var idCount = insertedTestObjects.length - 1; // The last one was from the foreign client
                    assert.equal(objects.length, idCount);
                    for (var i = 0; i < idCount; i++) {
                        assert.strictEqual(objects[i]._id, insertedTestObjects[i]._id.toString());
                    }
                    return Promise.resolve();
                });
            });
        },
        defaultPositive: function(api, collection, createTestObjects) {
            it('returns a list of elements with all details for the given IDs', function() {
                var testElementIds, insertedElements;
                return createTestObjects().then(function(objects) {
                    return th.bulkInsert(collection, objects);
                }).then(function(objects) {
                    insertedElements = objects;
                    testElementIds = objects.map((to) => to._id.toString());
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
                }).then(function(token) {
                    return th.get(`/api/${api}/forIds?ids=${testElementIds.join(',')}&token=${token}`).expect(200);
                }).then(function(response) {
                    var elementsFromApi = response.body;
                    var idCount = insertedElements.length;
                    assert.equal(elementsFromApi.length, idCount);
                    for (var i = 0; i < idCount; i++) {
                        var elementFromApi = elementsFromApi[i];
                        var elementFromDatabase = insertedElements[i];
                        Object.keys(elementFromApi).forEach(function(key) {
                            assert.ok(elementFromDatabase[key]);
                            assert.strictEqual(elementFromApi[key].toString(), elementFromDatabase[key].toString());
                        });
                    }
                    return Promise.resolve();
                });
            });
        }
    },
    getId: {
        defaultNegative: function(api, permission, collection) {
            var testObject = {};
            it('responds without authentication with 403', function() {
                return db.get(collection).insert(testObject).then(function(insertedObject) {
                    return th.get(`/api/${api}/${insertedObject._id.toString()}`).expect(403);
                });
            });
            it('responds without read permission with 403', function() {
                var insertedId;
                return th.removeReadPermission(th.defaults.user, permission).then(function() {
                    return db.get(collection).insert(testObject);
                }).then(function(insertedObject) {
                    insertedId = insertedObject._id.toString();
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
                }).then(function(token) {
                    return th.get(`/api/${api}/${insertedId}?token=${token}`).expect(403);
                });
            });
            function checkForUser(user) {
                return function() {
                    var insertedId;
                    var moduleName = getModuleForApi(api);
                    return th.removeClientModule(th.defaults.client, moduleName).then(function() {
                        return db.get(collection).insert(testObject);
                    }).then(function(insertedObject) {
                        insertedId = insertedObject._id.toString();
                        return th.doLoginAndGetToken(user, th.defaults.password);
                    }).then(function(token) {
                        return th.get(`/api/${api}/${insertedId}?token=${token}`).expect(403);
                    });
                }
            }
            it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser(th.defaults.user));
            it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser(th.defaults.adminUser));
            it('responds with invalid id with 400', function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    return th.get(`/api/${api}/invalidId?token=${token}`).expect(400);
                });
            });
            it('responds with not existing id with 403', function() {
                // Here the validateSameClientId comes into the game and returns a 403 because the requested element is
                // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    return th.get(`/api/${api}/999999999999999999999999?token=${token}`).expect(403);
                });
            });
        },
        clientDependentNegative: function(api, collection) {
            it('responds with 403 when the object with the given ID does not belong to the client of the logged in user', function() {
                var insertedId;
                // Get other client
                return db.get(co.collections.clients).findOne({name:th.defaults.otherClient}).then(function(client) {
                    // Create an object for the other client
                    return db.get(collection).insert({clientId:client._id});
                }).then(function(insertedObject) {
                    insertedId = insertedObject._id.toString();
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
                }).then(function(token) {
                    return th.get(`/api/${api}/${insertedId}?token=${token}`).expect(403);
                });
            });
        }
    },
    post: {
        defaultNegative: function(api, permission, createTestObject) {
            it('responds without authentication with 403', function() {
                return createTestObject().then(function(testObject) {
                    return th.post(`/api/${api}`).send(testObject).expect(403);
                });
            });
            it('responds without write permission with 403', function() {
                var loginToken;
                return th.removeWritePermission(th.defaults.user, permission).then(function() {
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
                }).then(function(token) {
                    loginToken = token;
                    return createTestObject();
                }).then(function(testObject) {
                    return th.post(`/api/${api}?token=${loginToken}`).send(testObject).expect(403);
                });
            });
            function checkForUser(user) {
                return function() {
                    var loginToken;
                    var moduleName = getModuleForApi(api);
                    return th.removeClientModule(th.defaults.client, moduleName).then(function() {
                        return th.doLoginAndGetToken(user, th.defaults.password);
                    }).then(function(token) {
                        loginToken = token;
                        return createTestObject();
                    }).then(function(testObject) {
                        return th.post(`/api/${api}?token=${loginToken}`).send(testObject).expect(403);
                    });
                }
            }
            it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser(th.defaults.user));
            it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser(th.defaults.adminUser));
            it('responds with 400 when not sending an object to insert', function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    return th.post(`/api/${api}?token=${token}`).expect(400);
                });
            });
        }
    },
    put: {
        defaultNegative: function(api, permission, createTestObject) {
            it('responds without authentication with 403', function() {
                return createTestObject().then(function(testObject) {
                    return th.put(`/api/${api}/${testObject._id}`).send(testObject).expect(403);
                });
            });
            it('responds without write permission with 403', function() {
                var loginToken;
                return th.removeWritePermission(th.defaults.user, permission).then(function() {
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
                }).then(function(token) {
                    loginToken = token;
                    return createTestObject();
                }).then(function(testObject) {
                    return th.put(`/api/${api}/${testObject._id}?token=${loginToken}`).send(testObject).expect(403);
                });
            });
            function checkForUser(user) {
                return function() {
                    var loginToken;
                    var moduleName = getModuleForApi(api);
                    return th.removeClientModule(th.defaults.client, moduleName).then(function() {
                        return th.doLoginAndGetToken(user, th.defaults.password);
                    }).then(function(token) {
                        loginToken = token;
                        return createTestObject();
                    }).then(function(testObject) {
                        return th.put(`/api/${api}/${testObject._id}?token=${loginToken}`).send(testObject).expect(403);
                    });
                }
            }
            it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser(th.defaults.user));
            it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser(th.defaults.adminUser));
            it('responds with 400 when not sending an object to insert', function() {
                var loginToken;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    loginToken = token;
                    return createTestObject();
                }).then(function(testObject) {
                    return th.put(`/api/${api}/${testObject._id}?token=${loginToken}`).expect(400);
                });
            });
            it('responds with 400 when the _id is invalid', function() {
                var loginToken;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    loginToken = token;
                    return createTestObject();
                }).then(function(testObject) {
                    return th.put(`/api/${api}/invalidId?token=${loginToken}`).send(testObject).expect(400);
                });
            });
            it('responds with 403 when no object for the the _id exists', function() {
                var loginToken;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    loginToken = token;
                    return createTestObject();
                }).then(function(testObject) {
                    return th.put(`/api/${api}/999999999999999999999999?token=${loginToken}`).send(testObject).expect(403);
                });
            });
            it('responds with the original _id when it was changed (_id cannot be changed)', function() {
                var loginToken;
                var originalId;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    loginToken = token;
                    return createTestObject();
                }).then(function(testObject) {
                    originalId = testObject._id.toString();
                    testObject._id = monk.id();
                    return th.put(`/api/${api}/${originalId}?token=${loginToken}`).send(testObject).expect(200);
                }).then(function(response) {
                    assert.strictEqual(response.body._id, originalId);
                    return Promise.resolve();
                });
            });
        },
        clientDependentNegative: function(api, createTestObject) {
            it('responds with 403 when the object to update does not belong to client of the logged in user', function() {
                var loginToken;
                // Login as user from client 0
                return th.doLoginAndGetToken(th.defaults.otherUser, th.defaults.password).then(function(token) {
                    loginToken = token;
                    // Make sure, that the object belongs to client 1!
                    return createTestObject();
                }).then(function(testObject) {
                    return th.put(`/api/${api}/${testObject._id}?token=${loginToken}`).send(testObject).expect(403);
                });
            });
            it('responds with the original clientId when it was changed (clientId cannot be changed)', function() {
                var loginToken;
                var otherClientId;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    loginToken = token;
                    return db.get(co.collections.clients).findOne({name:th.defaults.otherClient});
                }).then(function(client) {
                    otherClientId = client._id.toString();
                    return createTestObject();
                }).then(function(testObject) {
                    testObject.clientId = otherClientId;
                    return th.put(`/api/${api}/${testObject._id}?token=${loginToken}`).send(testObject).expect(200);
                }).then(function(response) {
                    assert.notEqual(response.body.clientId, otherClientId);
                    return Promise.resolve();
                });
            });
        }
    },
    delete: {
        defaultNegative: function(api, permission, getId) {
            it('responds without authentication with 403', function() {
                return getId().then(function(id) {
                    return th.del(`/api/${api}/${id.toString()}`).expect(403);
                });
            });
            it('responds without write permission with 403', function() {
                var loginToken;
                return th.removeWritePermission(th.defaults.user, permission).then(function() {
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
                }).then(function(token) {
                    loginToken = token;
                    return getId();
                }).then(function(id) {
                    return th.del(`/api/${api}/${id.toString()}?token=${loginToken}`).expect(403);
                });
            });
            function checkForUser(user) {
                return function() {
                    var loginToken;
                    var moduleName = getModuleForApi(api);
                    return th.removeClientModule(th.defaults.client, moduleName).then(function() {
                        return th.doLoginAndGetToken(user, th.defaults.password);
                    }).then(function(token) {
                        loginToken = token;
                        return getId();
                    }).then(function(id) {
                        return th.del(`/api/${api}/${id.toString()}?token=${loginToken}`).expect(403);
                    });
                }
            }
            it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser(th.defaults.user));
            it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser(th.defaults.adminUser));
            it('responds with 400 when the _id is invalid', function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    return th.del(`/api/${api}/invalidId?token=${token}`).expect(400);
                });
            });
            it('responds with 403 when no object for the the _id exists', function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    return th.del(`/api/${api}/999999999999999999999999?token=${token}`).expect(403);
                });
            });
        },
        clientDependentNegative: function(api, getId) {
            it('responds with 403 when the object to delete does not belong to client of the logged in user', function() {
                var loginToken;
                // Login as user from client 0
                return th.doLoginAndGetToken(th.defaults.otherUser, th.defaults.password).then(function(token) {
                    loginToken = token;
                    // Make sure, that the object belongs to client 1!
                    return getId();
                }).then(function(id) {
                    return th.del(`/api/${api}/${id.toString()}?token=${loginToken}`).expect(403);
                });
            });
        },
        defaultPositive: function(api, collection, getId) {
            it('deletes the object and return 204', function() {
                var loginToken, objectId;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    loginToken = token;
                    return getId();
                }).then(function(id) {
                    objectId = id;
                    return th.del(`/api/${api}/${objectId.toString()}?token=${loginToken}`).expect(204);
                }).then(function() {
                    return db.get(collection).findOne(objectId);
                }).then(function(objectInDatabase) {
                    assert.ok(!objectInDatabase);
                    return Promise.resolve();
                });
            });
            it('All relations, where the element is the source (type1, id1), are also deleted', function() {
                var loginToken, objectId;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    loginToken = token;
                    return getId();
                }).then(function(id) {
                    objectId = id;
                    return th.del(`/api/${api}/${objectId.toString()}?token=${loginToken}`).expect(204);
                }).then(function() {
                    return db.get(co.collections.relations).find({type1:collection,id1:objectId});
                }).then(function(objectsInDatabase) {
                    assert.equal(objectsInDatabase.length, 0);
                    return Promise.resolve();
                });
            });
            it('All relations, where the element is the target (type2, id2), are also deleted', function() {
                var loginToken, objectId;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    loginToken = token;
                    return getId();
                }).then(function(id) {
                    objectId = id;
                    return th.del(`/api/${api}/${objectId.toString()}?token=${loginToken}`).expect(204);
                }).then(function() {
                    return db.get(co.collections.relations).find({type2:collection,id2:objectId});
                }).then(function(objectsInDatabase) {
                    assert.equal(objectsInDatabase.length, 0);
                    return Promise.resolve();
                });
            });
        }
    }
};
