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
        'clients',
        'relations',
        'documents',
        'fmobjects',
        'folders',
        'permissions',
        'portals',
        'portalmodules',
        'usergroups',
        'users'
    ].map((key) => db.get(key).drop());
    return Promise.all(promises); // Wait for all drop Promises to complete
};

/**
 * Performs a login with the given credentials and returns a promise with the token as result
 */
module.exports.doLoginAndGetToken = (username, password) => {
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
 * Performs a login as admin/admin and returns a promise with the token as result
 */
module.exports.doAdminLoginAndGetToken = () => {
    return module.exports.doLoginAndGetToken('admin', 'test'); // The password is fixed set to 'test' in prepareUsers() below.
};

/**
 * Creates 3 clients and returns a promise without parameters.
 */
module.exports.prepareClients = () => {
    return bulkInsert('clients', [
        { name: '0' },
        { name: '1' },
        { name: '2' }
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
        userGroups.push({ name: client.name + '_2', clientId: client._id });
    });
    // Add user groups for portal
    userGroups.push({ name: '_0', clientId: null });
    userGroups.push({ name: '_1', clientId: null });
    userGroups.push({ name: '_2', clientId: null });
    userGroups.push({ name: 'admin', clientId: null });
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
        users.push({ name: userGroup.name + '_1', pass: hashedPassword, clientId: userGroup.clientId, userGroupId: userGroup._id });
        users.push({ name: userGroup.name + '_2', pass: hashedPassword, clientId: userGroup.clientId, userGroupId: userGroup._id });
        users.push({ name: userGroup.name + '_ADMIN0', pass: hashedPassword, clientId: userGroup.clientId, userGroupId: userGroup._id, isAdmin: true }); // Administrator
    });
    users.push({ name: 'admin', pass: hashedPassword, clientId: null, userGroupId: dbObjects.usergroups[dbObjects.usergroups.length - 1]._id, isAdmin: true }); // Administrator
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
        permissions.push({ key: 'PERMISSION_ADMINISTRATION_PERMISSION', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        permissions.push({ key: 'PERMISSION_ADMINISTRATION_USER', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        permissions.push({ key: 'PERMISSION_ADMINISTRATION_USERGROUP', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        permissions.push({ key: 'PERMISSION_BIM_FMOBJECT', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        permissions.push({ key: 'PERMISSION_OFFICE_ACTIVITY', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        permissions.push({ key: 'PERMISSION_OFFICE_DOCUMENT', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
        permissions.push({ key: 'PERMISSION_LICENSESERVER_PORTAL', userGroupId: userGroup._id, clientId: userGroup.clientId, canRead: true, canWrite: true });
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
 * Creates 3 portals
 * Two active and one not
 * 
 */

module.exports.preparePortals = () => {
    var portals = [{name: 'p1', isActive: true, licenseKey: 'LicenseKey1'},
                   {name: 'p2', isActive: true, licenseKey: 'LicenseKey2'},
                   {name: 'p3', isActive: false, licenseKey: 'LicenseKey3'}];
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
            createdByUserId: user._id.toString(),
            name: user.name + '_0',
            type: 'Gewährleistung'
        });
        now.setHours(now.getHours() + 25);
        activities.push({
            date: now.toISOString(),
            clientId: user.clientId,
            createdByUserId: user._id.toString(),
            name: user.name + '_1',
            type: 'Kundenbesuch'
        });
        now.setYear(now.getYear() + 1901);
        activities.push({
            date: now.toISOString(),
            clientId: user.clientId,
            createdByUserId: user._id.toString(),
            name: user.name + '_2',
            type: 'Wartung'
        });
    });
    return bulkInsert('activities', activities);
};

/**
 * Creates 3 FM objects for each client
 * The name schema is [ClientName]_[IndexOfFmObject]
 * All are in the top level
 */
module.exports.prepareFmObjects = () => {
    var fmObjects = [];
    dbObjects.clients.forEach((client) => {
        fmObjects.push({ name: client.name + '_0', clientId: client._id, type: 'Projekt' });
        fmObjects.push({ name: client.name + '_1', clientId: client._id, type: 'Liegenschaft' });
        fmObjects.push({ name: client.name + '_2', clientId: client._id, type: 'Gebäude' });
    });
    return bulkInsert('fmobjects', fmObjects);
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
        rootFolders.push({ name: client.name + '_2', clientId: client._id });
    });
    // Add folder to portal
    rootFolders.push({ name: 'portalfolder', clientId: null });
    return bulkInsert('folders', rootFolders).then((insertedRootFolders) => {
        var level1Folders = [];
        insertedRootFolders.forEach((insertedRootFolder) => {
            level1Folders.push({ name: insertedRootFolder.name + '_0', clientId: insertedRootFolder.clientId, parentFolderId: insertedRootFolder._id });
            level1Folders.push({ name: insertedRootFolder.name + '_1', clientId: insertedRootFolder.clientId, parentFolderId: insertedRootFolder._id });
            level1Folders.push({ name: insertedRootFolder.name + '_2', clientId: insertedRootFolder.clientId, parentFolderId: insertedRootFolder._id });
        });
        return bulkInsert('folders', level1Folders).then((insertedLevel1Folders) => {
            var level2Folders = [];
            insertedLevel1Folders.forEach((insertedLevel1Folder) => {
                level2Folders.push({ name: insertedLevel1Folder.name + '_0', clientId: insertedLevel1Folder.clientId, parentFolderId: insertedLevel1Folder._id });
                level2Folders.push({ name: insertedLevel1Folder.name + '_1', clientId: insertedLevel1Folder.clientId, parentFolderId: insertedLevel1Folder._id });
                level2Folders.push({ name: insertedLevel1Folder.name + '_2', clientId: insertedLevel1Folder.clientId, parentFolderId: insertedLevel1Folder._id });
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
 * Calculates the path where a document is stored and returns it.
 */
var getDocumentPath = (document) => {
    return path.join(
        __dirname, 
        '/../',
        localConfig.documentspath,
        document.clientId !== null ? document.clientId.toString() : '',
        document._id.toString()
    );
};
module.exports.getDocumentPath = getDocumentPath;

/**
 * Creates a file for the all existing documents in documents/[clientId]/documentId with the document's ID as content
 */
module.exports.prepareDocumentFiles = () => {
    return new Promise((resolve, reject) => {
        dbObjects.documents.forEach((document) => {
            var filePath = getDocumentPath(document);
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
                var filePath = getDocumentPath(document);
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
 * Creates 3 documents for each folder and additionally 3 documents for each client in the root folder
 * The name schema is
 * [FolderName]_[IndexOfDocument]
 * [ClientName]_[IndexOfDocument]
 */
module.exports.prepareDocuments = () => {
    var documents = [];
    dbObjects.folders.forEach((folder) => {
        documents.push({ name: folder.name + '_0', clientId: folder.clientId, parentFolderId: folder._id });
        documents.push({ name: folder.name + '_1', clientId: folder.clientId, parentFolderId: folder._id });
        documents.push({ name: folder.name + '_2', clientId: folder.clientId, parentFolderId: folder._id });
    });
    // Documents in root folder
    dbObjects.clients.forEach((client) => {
        documents.push({ name: client.name + '_0', clientId: client._id });
        documents.push({ name: client.name + '_1', clientId: client._id });
        documents.push({ name: client.name + '_2', clientId: client._id });
    });
    return bulkInsert('documents', documents);
};

/**
 * Create a relation to each activity for each document in the database.
 */
module.exports.prepareRelations = () => {
    var relations = [];
    dbObjects.documents.forEach((document) => {
        dbObjects.activities.forEach((activity) => {
            relations.push({ type1: 'documents', id1: document._id, type2: 'activities', id2: activity._id });
        });
    });
    return bulkInsert('relations', relations);
};

/**
 * Creates something ??? TODO
 */
module.exports.prepareSettingSets = () => {
    return new Promise((resolve, reject) => { resolve(); });
}

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
