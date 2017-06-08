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

var dbObjects = {};

var bulkInsert = (collectionName, docs) => {
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
module.exports.cleanDatabase = () => {
    dbObjects = {};
    var promises = [
        'activities',
        'clientmodules',
        'clients',
        'documents',
        'dynamicattributes',
        'dynamicattributeoptions',
        'dynamicattributevalues',
        'fmobjects',
        'folders',
        'permissions',
        'portalmodules',
        'portals',
        'relations',
        'usergroups',
        'users'
    ].map((key) => db.get(key).drop());
    return Promise.all(promises); // Wait for all drop Promises to complete
};

/**
 * Performs a login with the given credentials and returns a promise with the token as result
 */
module.exports.doLoginAndGetToken = (username, password) => {
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
 * Creates 3 clients and returns a promise without parameters.
 */
module.exports.prepareClients = () => {
    return bulkInsert('clients', [
        { name: '0' },
        { name: '1' }
    ]);
};

/**
 * Creates 3 client module assignments for each existing client and returns a promise without parameters.
 */
module.exports.prepareClientModules = () => {
    var clientModules = [];
    dbObjects.clients.forEach((client) => {
        clientModules.push({ clientId: client._id, module: 'base' });
        clientModules.push({ clientId: client._id, module: 'activities' });
        clientModules.push({ clientId: client._id, module: 'documents' });
        clientModules.push({ clientId: client._id, module: 'fmobjects' });
        clientModules.push({ clientId: client._id, module: 'licenseserver' });
    });
    return bulkInsert('clientmodules', clientModules);
};

/**
 * Removes the access to a module from the given client
 */
module.exports.removeClientModule = (clientName, module) => {
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
module.exports.prepareUserGroups = () => {
    var userGroups = [];
    dbObjects.clients.forEach((client) => {
        userGroups.push({ name: client.name + '_0', clientId: client._id });
        userGroups.push({ name: client.name + '_1', clientId: client._id });
    });
    // Add user groups for portal
    userGroups.push({ name: '_0', clientId: null });
    return bulkInsert('usergroups', userGroups);
};

/**
 * Creates 3 users for each existing user group and returns a promise.
 * The names of the users have following schema: [IndexOfClient]_[IndexOfUserGroup]_[IndexOfUser].
 * The passwords of the users have following schema: [IndexOfClient]_[IndexOfUserGroup]_[IndexOfUser].
 * The password of each user is "test"
 */
module.exports.prepareUsers = () => {
    var hashedPassword = '$2a$10$mH67nsfTbmAFqhNo85Mz4.SuQ3kyZbiYslNdRDHhaSO8FbMuNH75S'; // Encrypted version of 'test'. Because bryptjs is very slow in tests.
    var users = [];
    dbObjects.usergroups.forEach((userGroup) => {
        users.push({ name: userGroup.name + '_0', pass: hashedPassword, clientId: userGroup.clientId, userGroupId: userGroup._id });
        users.push({ name: userGroup.name + '_ADMIN0', pass: hashedPassword, clientId: userGroup.clientId, userGroupId: userGroup._id, isAdmin: true }); // Administrator
    });
    return bulkInsert('users', users);
};

/**
 * Creates default permissions with read / write for each user group for each permission key.
 * Can be deleted selectively within tests
 */
module.exports.preparePermissions = () => {
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
        permissions.push({ key: 'PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
    });
    return bulkInsert('permissions', permissions);
};

/**
 * Deletes the canRead flag of a permission of the usergroup of the user with the given name.
 */
module.exports.removeReadPermission = (userName, permissionKey) => {
    return new Promise((resolve, reject) => {
        return db.get('users').findOne({ name: userName }).then((user) => {
            return db.get('permissions').findOneAndUpdate({ key: permissionKey, userGroupId: user.userGroupId }, { $set: { canRead: false} }).then(resolve);
        });
    });
};

/**
 * Deletes the canWrite flag of a permission of the udsergroup of the user with the given name.
 */
module.exports.removeWritePermission = (userName, permissionKey) => {
    return new Promise((resolve, reject) => {
        return db.get('users').findOne({ name: userName }).then((user) => {
            return db.get('permissions').findOneAndUpdate({ key: permissionKey, userGroupId: user.userGroupId }, { $set: { canWrite: false} }).then(resolve);
        });
    });
};

/**
 * Deletes the canRead and canWrite flags of a permission of the usergroup of the user with the given name.
 */
module.exports.removeAllPermissions = (userName, permissionKey) => {
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

module.exports.preparePortals = () => {
    var portals = [{name: 'p1', isActive: true, licenseKey: 'LicenseKey1'},
                   {name: 'p2', isActive: false, licenseKey: 'LicenseKey2'}];
    return bulkInsert('portals', portals);
};

/**
 * Creates 5 portal modules for each existing portal 
 * 
 */

module.exports.preparePortalModules = () => {
    var portalModules = [];
    dbObjects.portals.forEach((portal) => {
        portalModules.push({portalId: portal._id, module: 'base'});
        portalModules.push({portalId: portal._id, module: 'clients'});
        portalModules.push({portalId: portal._id, module: 'documents'});
        portalModules.push({portalId: portal._id, module: 'fmobjects'});
        portalModules.push({portalId: portal._id, module: 'portalbase'});
    });
    return bulkInsert('portalmodules', portalModules);
};

/**
 * Creates 3 activities for each user
 * The name schema is [UserName]_[IndexOfActivity]
 * - one activity in the past (yesterday, Gewährleistung)
 * - one activity in 1 hour (Kundenbesuch)
 * - one activity next year (Wartung)
 */
module.exports.prepareActivities = () => {
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
    return bulkInsert('activities', activities);
};

/**
 * Fügt einen Benutzer einer Aktivität als Teilnehmer hinzu
 */
module.exports.addUserAsParticipantToActivity = function(userName, activitiyName) {
    return new Promise((resolve, reject) => {
        return db.get('users').findOne({ name: userName }).then((user) => {
            return db.get('activities').findOneAndUpdate({ name: activitiyName }, { $addToSet: { 
                participantUserIds: user._id
            } }).then(resolve);
        });
    });
};

/**
 * Creates 3 FM objects for each client
 * The name schema is [ClientName]_[IndexOfFmObject]
 * All are in the top level
 */
module.exports.prepareFmObjects = () => {
    var fmObjects = [];
    dbObjects.clients.forEach((client) => {
        fmObjects.push({ name: client.name + '_0', clientId: client._id, type: 'Projekt', path:',' });
        fmObjects.push({ name: client.name + '_1', clientId: client._id, type: 'Gebäude', path:',' });
    });
    return bulkInsert('fmobjects', fmObjects).then((insertedRootFmObjects) => {
        var level1FmObjects = [];
        insertedRootFmObjects.forEach((rootFmObject) => {
            level1FmObjects.push({ name: rootFmObject.name + '_0', clientId: rootFmObject.clientId, type: 'Etage', path: rootFmObject.path + rootFmObject._id.toString() + ',', parentId: rootFmObject._id });
            level1FmObjects.push({ name: rootFmObject.name + '_1', clientId: rootFmObject.clientId, type: 'Raum', path: rootFmObject.path + rootFmObject._id.toString() + ',', parentId: rootFmObject._id });
        });
        return bulkInsert('fmobjects', level1FmObjects);
    });
};

/**
 * Creates 3 folders for each client with a folder hierarchiy of 3 levels
 * The name schema is
 * [ClientName]_[IndexOfFolder]
 * [ClientName]_[IndexOfFolder]_[IndexOfSubFolder]
 * [ClientName]_[IndexOfFolder]_[IndexOfSubFolder]_[IndexOfSubFolder]
 */
module.exports.prepareFolders = () => {
    var rootFolders = [];
    dbObjects.clients.forEach((client) => {
        rootFolders.push({ name: client.name + '_0', clientId: client._id });
        rootFolders.push({ name: client.name + '_1', clientId: client._id });
    });
    // Add folder to portal
    rootFolders.push({ name: 'portalfolder', clientId: null });
    return bulkInsert('folders', rootFolders).then((insertedRootFolders) => {
        var level1Folders = [];
        insertedRootFolders.forEach((insertedRootFolder) => {
            level1Folders.push({ name: insertedRootFolder.name + '_0', clientId: insertedRootFolder.clientId, parentFolderId: insertedRootFolder._id });
            level1Folders.push({ name: insertedRootFolder.name + '_1', clientId: insertedRootFolder.clientId, parentFolderId: insertedRootFolder._id });
        });
        return bulkInsert('folders', level1Folders).then((insertedLevel1Folders) => {
            var level2Folders = [];
            insertedLevel1Folders.forEach((insertedLevel1Folder) => {
                level2Folders.push({ name: insertedLevel1Folder.name + '_0', clientId: insertedLevel1Folder.clientId, parentFolderId: insertedLevel1Folder._id });
                level2Folders.push({ name: insertedLevel1Folder.name + '_1', clientId: insertedLevel1Folder.clientId, parentFolderId: insertedLevel1Folder._id });
            });
            return bulkInsert('folders', level2Folders);
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
module.exports.prepareDocumentFiles = () => {
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
module.exports.removeDocumentFiles = () => {
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
module.exports.prepareDocuments = () => {
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
    return bulkInsert('documents', documents);
};

/**
 * Create a relation to each activity for each document in the database.
 */
module.exports.prepareRelations = function() {
    var relations = [];
    var keys = Object.keys(dbObjects);
    keys.forEach(function(key1) {
        keys.forEach(function(key2) {
            relations.push({ type1: key1, id1: dbObjects[key1][0]._id, type2: key2, id2: dbObjects[key2][0]._id });
        });
    });
    return bulkInsert('relations', relations);
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
module.exports.compareApiAndDatabaseObjects = (name, keysFromDatabase, apiObject, databaseObject) => {
    var keyCountFromApi = Object.keys(apiObject).length;
    var keyCountFromDatabase = keysFromDatabase.length;
    assert.strictEqual(keyCountFromApi, keyCountFromDatabase, `Number of returned fields of ${name} ${apiObject._id} differs (${keyCountFromApi} from API, ${keyCountFromDatabase} in database)`);
    keysFromDatabase.forEach((key) => {
        var valueFromDatabase = databaseObject[key].toString(); // Compare on a string basis because the API returns strings only
        var valueFromApi = apiObject[key].toString();
        assert.strictEqual(valueFromApi, valueFromDatabase, `${key} of ${name} ${apiObject._id} differs (${valueFromApi} from API, ${valueFromDatabase} in database)`);
    });
};

/**
 * Creates 3 dynamic  attributes (one for each currently existing type)
 */
module.exports.prepareDynamicAttributes = function() {
    var dynamicAttributes = [];
    dbObjects.users.forEach(function(user){
        var userAttribute = {modelName: 'users', 
                             name_en: 'gender',
                             clientId: user.clientId,
                             type: 'picklist'};
        dynamicAttributes.push(userAttribute);
    });

    dbObjects.documents.forEach(function(document){
        var documentBoolAttribute = {modelName: 'documents', 
                                    name_en: 'is secret',
                                    clientId: document.clientId,
                                    type: 'boolean'};

        var documentTextAttribute = {modelName: 'documents', 
                                    name_en: 'content description',
                                    clientId: document.clientId,
                                    type: 'text'}; 

        dynamicAttributes.push(documentBoolAttribute);
        dynamicAttributes.push(documentTextAttribute);
    });
    return bulkInsert('dynamicattributes', dynamicAttributes);
};

/**
 * Creates 2 options (elements) for an attribute of type picklist;
 *      attribute.modelName: 'users',
 *      attribute.name_en: 'gender'
 */
module.exports.prepareDynamicAttributeOptions = function() {
    var dynamicAttributeOptions = [];
    dbObjects.dynamicattributes.forEach(function(attribute){
        if (attribute.type == 'picklist') {
            dynamicAttributeOptions.push({dynamicAttributeId: attribute._id, text_en: 'female', clientId: attribute.clientId});
            dynamicAttributeOptions.push({dynamicAttributeId: attribute._id, text_en: 'male', clientId: attribute.clientId});
        }
    });
    return bulkInsert('dynamicattributeoptions', dynamicAttributeOptions);
};

/**
 * Creates dummy example values
 */
module.exports.prepareDynamicAttributeValues = function() {
    var dynamicAttributeValues = [];
    dbObjects.dynamicattributes.forEach(function(attribute){

            if (attribute.modelName == 'users'){
                dbObjects.users.forEach(function(entity){
                   dynamicAttributeValues.push({entityId: entity._id, dynamicAttributeId: attribute._id, clientId: entity.clientId, value: 'female'}); 
                });
            }
            else{
                var value = {};
                  dbObjects.documents.forEach(function(entity){  
                    if (attribute.type == 'text'){
                        value = entity.name + 'some_value';
                    }
                    else{
                        value = false; 
                    }
                    dynamicAttributeValues.push({entityId: entity._id, dynamicAttributeId: attribute._id, clientId: entity.clientId, value: value});
                  });
            }
    })
    return bulkInsert('dynamicattributevalues', dynamicAttributeValues);
};
