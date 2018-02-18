/**
 * This file provides functions for preparing test data for several tests.
 * @example require('testhelper').doLoginAndGetToken('admin', 'admin').then(function(token){ ... });
 */
var superTest = require('supertest');
var server = require('../app');
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
var Db = require("../utils/db").Db;

var th = module.exports;

th.dbObjects = {};

th.bulkInsert = async(collectionName, docs) => {
    if (!th.dbObjects[collectionName]) {
        th.dbObjects[collectionName] = [];
    }
    th.dbObjects[collectionName] = th.dbObjects[collectionName].concat(docs);
    var res = await db.get(collectionName).bulkWrite(docs.map((doc) => { return {insertOne:{document:doc}} }));
    var docsToReturn = [];
    for (var i = 0; i < res.insertedCount; i++) {
        docs[i]._id = res.insertedIds[i];
        docsToReturn.push(docs[i]);
    }
    return docsToReturn;
};

// Generate license key with hat, https://github.com/substack/node-hat
var generateLicenseKey = () => {
    return hat(1024, 32);
};

th.cleanDatabase = async () => {
    await Db.init(true);
};

th.cleanTable = async(tablename, inportal, inclients) => {
    if (inclients) await Db.query("client0", `DELETE FROM ${tablename};`);
    if (inportal) await Db.query(Db.PortalDatabaseName, `DELETE FROM ${tablename};`);
};

th.doLoginAndGetToken = async(username, password) => {
    return (await th.post("/api/login").send({ username: username, password: password })).body.token;
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

th.prepareClients = async() => {
    await th.cleanTable("clients", true, false);
    await Db.createClient("client0", "client0");
    await Db.createClient("client1", "client1");
};

th.prepareClientModules = async() => {
    await th.cleanTable("clientmodules", true, false);
    var modulenames = Object.keys(co.modules);
    for (var i = 0; i < modulenames.length; i++) {
        await Db.query(Db.PortalDatabaseName, `INSERT INTO clientmodules (clientname, modulename) VALUES ('client0', '${modulenames[i]}');`);
        await Db.query(Db.PortalDatabaseName, `INSERT INTO clientmodules (clientname, modulename) VALUES ('client1', '${modulenames[i]}');`);
    }
};

/**
 * Mandanteneinstellungen vorbereiten
 */
th.prepareClientSettings = () => {
    var clientSettings = [];
    th.dbObjects.clients.forEach((client) => {
        clientSettings.push({ clientId: client._id, logourl: 'http://' + client.name });
    });
    return th.bulkInsert('clientsettings', clientSettings);
};

/**
 * Removes the access to a module from the given client
 */
th.removeClientModule = async(clientname, modulename) => {
    await Db.query(Db.PortalDatabaseName, `DELETE FROM clientmodules WHERE clientname='${clientname}' AND modulename='${modulename}';`);
};

th.prepareUserGroups = async() => {
    await th.cleanTable("usergroups", true, true);
    await Db.insertDynamicObject(Db.PortalDatabaseName, "usergroups", { name: "portal_usergroup0" });
    await Db.insertDynamicObject("client0", "usergroups", { name: "client0_usergroup0" });
};

th.prepareUsers = async() => {
    await th.cleanTable("users", true, true);
    await th.cleanTable("allusers", true, false);
    var hashedPassword = '$2a$10$mH67nsfTbmAFqhNo85Mz4.SuQ3kyZbiYslNdRDHhaSO8FbMuNH75S'; // Encrypted version of 'test'. Because bryptjs is very slow in tests.
    await Db.query(Db.PortalDatabaseName, `INSERT INTO users (name, password, usergroupname, isadmin) VALUES ('${Db.PortalDatabaseName}_usergroup0_user0', '${hashedPassword}', '${Db.PortalDatabaseName}_usergroup0',false);`);
    await Db.query(Db.PortalDatabaseName, `INSERT INTO users (name, password, usergroupname, isadmin) VALUES ('${Db.PortalDatabaseName}_usergroup0_user1', '${hashedPassword}', '${Db.PortalDatabaseName}_usergroup0',true);`);
    await Db.query("client0", `INSERT INTO users (name, password, usergroupname, isadmin) VALUES ('client0_usergroup0_user0', '${hashedPassword}', 'client0_usergroup0',false);`);
    await Db.query("client0", `INSERT INTO users (name, password, usergroupname, isadmin) VALUES ('client0_usergroup0_user1', '${hashedPassword}', 'client0_usergroup0',true);`);
    await Db.query(Db.PortalDatabaseName, `INSERT INTO allusers (name, password, clientname) VALUES ('${Db.PortalDatabaseName}_usergroup0_user0', '${hashedPassword}', '${Db.PortalDatabaseName}');`);
    await Db.query(Db.PortalDatabaseName, `INSERT INTO allusers (name, password, clientname) VALUES ('${Db.PortalDatabaseName}_usergroup0_user1', '${hashedPassword}', '${Db.PortalDatabaseName}');`);
    await Db.query(Db.PortalDatabaseName, `INSERT INTO allusers (name, password, clientname) VALUES ('client0_usergroup0_user0', '${hashedPassword}', 'client0');`);
    await Db.query(Db.PortalDatabaseName, `INSERT INTO allusers (name, password, clientname) VALUES ('client0_usergroup0_user1', '${hashedPassword}', 'client0');`);
};

/**
 * Creates default permissions with read / write for each user group for each permission key.
 * Can be deleted selectively within tests
 */
th.preparePermissions = async() => {
    await th.cleanTable("permissions", true, true);
    var permissionkeys = Object.keys(co.permissions);
    for (var i = 0; i < permissionkeys.length; i++) {
        await Db.query("client0", `INSERT INTO permissions (usergroupname, key, canwrite) VALUES('client0_usergroup0', '${permissionkeys[i]}', true);`);
        await Db.query(Db.PortalDatabaseName, `INSERT INTO permissions (usergroupname, key, canwrite) VALUES('${Db.PortalDatabaseName}_usergroup0', '${permissionkeys[i]}', true);`);
    }
};

/**
 * Creates 3 business partners for each existing client plus for the portal (without client) and returns
 * a promise.
 * The names of the business partners have following schema: [IndexOfClient]_[IndexOfBusinessPartner].
 */
th.prepareBusinessPartners = () => {
    var businessPartners = [];
    th.dbObjects.clients.forEach((client) => {
        businessPartners.push({ name: client.name + '_0', clientId: client._id, industry: 'Industry 0', isJuristic: true, rolle: 'Role 0' });
        businessPartners.push({ name: client.name + '_1', clientId: client._id, industry: 'Industry 1', isJuristic: false, rolle: 'Role 1' });
    });
    businessPartners.push({ name: '_0', clientId: null, industry: 'Industry 2', isJuristic: false, rolle: 'Role 2' });
    return th.bulkInsert(co.collections.businesspartners.name, businessPartners);
};

th.preparePartnerAddresses = () => {
    var partnerAddresses = [];
    th.dbObjects.businesspartners.forEach((businessPartner) => {
        partnerAddresses.push({ addressee: businessPartner.name + '_0', partnerId: businessPartner._id, clientId: businessPartner.clientId, street: 'Street', postcode: '12345', city: 'City', type: 'Primaryaddress' });
        partnerAddresses.push({ addressee: businessPartner.name + '_1', partnerId: businessPartner._id, clientId: businessPartner.clientId, street: 'Another street', postcode: '34567', city: 'Another city', type: 'Postaddress' });
    });
    return th.bulkInsert(co.collections.partneraddresses.name, partnerAddresses);
};

th.preparePersons = () => {
    var persons = [];
    th.dbObjects.clients.forEach((client) => {
        persons.push({ firstname: 'First 0', lastname: client.name + '_0', description: 'Description 0', clientId: client._id });
        persons.push({ firstname: 'First 1', lastname: client.name + '_1', description: 'Description 1', clientId: client._id });
    });
    persons.push({ firstname: 'First 2', lastname: '_0', description: 'Description 2', clientId: null });
    return th.bulkInsert(co.collections.persons.name, persons);
};

th.preparePersonCommunications = () => {
    var communications = [];
    th.dbObjects.persons.forEach((person) => {
        communications.push({ contact: person.lastname + '_0', personId: person._id, clientId: person.clientId, medium: 'email', type: 'work' });
        communications.push({ contact: person.lastname + '_1', personId: person._id, clientId: person.clientId, medium: 'phone', type: 'other' });
    });
    return th.bulkInsert(co.collections.communications.name, communications);
};

th.prepareNotes = async() => {
    await th.cleanTable("notes", false, true);
    await Db.insertDynamicObject("client0", "notes", { name: "client0_note0", content: "content0" });
    await Db.insertDynamicObject("client0", "notes", { name: "client0_note1", content: "content1" });
};

th.removeReadPermission = async(clientname, usergroupname, permissionkey) => {
    await Db.query(clientname, `DELETE FROM permissions WHERE usergroupname='${usergroupname}' AND key='${permissionkey}';`);
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
    return db.get(co.collections.clients.name).findOne({name:th.defaults.client}).then(function(client) {
        var portals = [
            {name: 'p1', isActive: true, licenseKey: 'LicenseKey1', clientId: client._id},
            {name: 'p2', isActive: false, licenseKey: 'LicenseKey2', clientId: null} 
        ];
        return th.bulkInsert('portals', portals);
    });
};

/**
 * Creates 5 portal modules for each existing portal 
 * 
 */

th.preparePortalModules = () => {
    var portalModules = [];
    th.dbObjects.portals.forEach((portal) => {
        portalModules.push({portalId: portal._id, module: co.modules.base});
        portalModules.push({portalId: portal._id, module: co.modules.clients});
        portalModules.push({portalId: portal._id, module: co.modules.documents});
        portalModules.push({portalId: portal._id, module: co.modules.fmobjects});
        portalModules.push({portalId: portal._id, module: co.modules.portalbase});
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
    th.dbObjects.users.forEach((user) => {
        now.setHours(now.getHours() - 24);
        activities.push({
            date: now.toISOString(),
            clientId: user.clientId,
            createdByUserId: user._id,
            name: user.name + '_0',
            type: 'Gewährleistung'
        });
        now.setHours(now.getHours() + 25);
        activities.push({
            date: now.toISOString(),
            clientId: user.clientId,
            createdByUserId: user._id,
            isForAllUsers: true, // Für alle benutzer des Mandanten zugänglich
            name: user.name + '_1',
            type: 'Kundenbesuch'
        });
        now.setYear(now.getYear() + 1901);
        activities.push({
            date: now.toISOString(),
            clientId: user.clientId,
            createdByUserId: user._id,
            name: user.name + '_2',
            type: 'Wartung'
        });
    });
    return th.bulkInsert('activities', activities);
};

/**
 * Creates 2 markers for each user
 *  The name schema is [UserName]_[IndexOfMarkers]
 */
th.prepareMarkers = () => {
    var markers = [];
    th.dbObjects.users.forEach((user)=>{
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
    th.dbObjects.clients.forEach((client) => {
        fmObjects.push({ name: client.name + '_0', clientId: client._id, type: 'Projekt' });
        fmObjects.push({ name: client.name + '_1', clientId: client._id, type: 'Gebäude' });
    });
    return th.bulkInsert('fmobjects', fmObjects).then((insertedRootFmObjects) => {
        var level1FmObjects = [];
        insertedRootFmObjects.forEach((rootFmObject) => {
            level1FmObjects.push({ name: rootFmObject.name + '_0', clientId: rootFmObject.clientId, type: 'Etage', parentId: rootFmObject._id });
            level1FmObjects.push({ name: rootFmObject.name + '_1', clientId: rootFmObject.clientId, type: 'Raum', parentId: rootFmObject._id });
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
    th.dbObjects.clients.forEach((client) => {
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

/**
 * Creates a path and all of its parent paths if they do not exist
 */
th.createPath = (pathToCreate) => {
    try {
        fs.statSync(pathToCreate);
        return; // Her we come only when the path exists
    }
    catch (err) {
        // path does not exist, create it
        th.createPath(path.dirname(pathToCreate));
        fs.mkdirSync(pathToCreate);
    }
}

/**
 * Creates a file for the all existing documents in documents/[clientId]/documentId with the document's ID as content
 */
th.prepareDocumentFiles = () => {
    return new Promise((resolve, reject) => {
        th.dbObjects.documents.forEach((document) => {
            var filePath = documentsHelper.getDocumentPath(document._id);
            th.createPath(path.dirname(filePath));
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
    th.dbObjects.folders.forEach((folder) => {
        documents.push({ name: folder.name + '_0', clientId: folder.clientId, parentFolderId: folder._id });
        documents.push({ name: folder.name + '_1', clientId: folder.clientId, parentFolderId: folder._id });
    });
    // Documents in root folder
    th.dbObjects.clients.forEach((client) => {
        documents.push({ name: client.name + '_0', clientId: client._id });
        documents.push({ name: client.name + '_1', clientId: client._id });
    });
    return th.bulkInsert(co.collections.documents.name, documents);
};

/**
 * Create a relations
 */
th.prepareRelations = function() {
    // var relations = [];
    // var keys = Object.keys(th.dbObjects);
    // keys.forEach(function(key1) {
    //     keys.forEach(function(key2) {
    //         relations.push({ type1: key1, id1: th.dbObjects[key1][0]._id, type2: key2, id2: th.dbObjects[key2][0]._id });
    //     });
    // });
    // return th.bulkInsert(co.collections.relations.name, relations);
};

/**
 * Creates 3 documents for each folder
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

/**
 * Creates 3 dynamic  attributes (one for each currently existing type)
 */
th.prepareDynamicAttributes = function(collectionName) {
    var dynamicAttributes = [];
    var modelName = collectionName ? collectionName : co.collections.users.name;
    th.dbObjects.clients.forEach(function(client) {
        dynamicAttributes.push({ modelName: modelName, name_en: 'textattribute', clientId: client._id, type: 'text' });
        dynamicAttributes.push({ modelName: modelName, name_en: 'booleanattribute', clientId: client._id, type: 'boolean' });
        dynamicAttributes.push({ modelName: modelName, name_en: 'picklistattribute', clientId: client._id, type: 'picklist' });
    });
    dynamicAttributes.push({ modelName: modelName, name_en: 'textattribute', clientId: null, type: 'text' });
    dynamicAttributes.push({ modelName: modelName, name_en: 'booleanattribute', clientId: null, type: 'boolean' });
    dynamicAttributes.push({ modelName: modelName, name_en: 'picklistattribute', clientId: null, type: 'picklist' });
    return th.bulkInsert(co.collections.dynamicattributes.name, dynamicAttributes);
};

/**
 * Erstellt einen Satz vordefinierter DA's für einen Mandanten (Benutzer-collection)
 * @returns Promise
 */
th.preparePredefinedDynamicAttibutesForClient = async function(clientName) {
    var clientId = (await th.defaults.getClient())._id;
    var dynamicAttributes = [
        // Vordefinierte
        { modelName: co.collections.users.name, name_en: 'Gewicht', clientId: clientId, type: co.dynamicAttributeTypes.text, identifier: 'gewicht' },
        { modelName: co.collections.users.name, name_en: 'Geschlecht', clientId: clientId, type: co.dynamicAttributeTypes.picklist, identifier: 'geschlecht' },
        // Manuelle
        { modelName: co.collections.users.name, name_en: 'Größe', clientId: clientId, type: co.dynamicAttributeTypes.text },
        { modelName: co.collections.users.name, name_en: 'Haarfarbe', clientId: clientId, type: co.dynamicAttributeTypes.picklist }
    ];
    var daRes = await db.get(co.collections.dynamicattributes.name).bulkWrite(dynamicAttributes.map((e) => { return {insertOne:{document:e}} }));
    for (var i = 0; i < daRes.insertedCount; i++) {
        dynamicAttributes[i]._id = daRes.insertedIds[i];
    }
    var dynamicAttributeOptions = [
        { dynamicAttributeId: dynamicAttributes[1]._id, text_en: 'männlich', clientId: clientId, value: 'männlich' },
        { dynamicAttributeId: dynamicAttributes[1]._id, text_en: 'weiblich', clientId: clientId, value: 'weiblich' },
        { dynamicAttributeId: dynamicAttributes[3]._id, text_en: 'braun', clientId: clientId },
        { dynamicAttributeId: dynamicAttributes[3]._id, text_en: 'blond', clientId: clientId }
    ];
    dynamicAttributes[1].options = [ dynamicAttributeOptions[0], dynamicAttributeOptions[1] ];
    dynamicAttributes[3].options = [ dynamicAttributeOptions[2], dynamicAttributeOptions[3] ];
    var daoRes = await db.get(co.collections.dynamicattributeoptions.name).bulkWrite(dynamicAttributeOptions.map((e) => { return {insertOne:{document:e}} }));
    for (var i = 0; i < daoRes.insertedCount; i++) {
        dynamicAttributeOptions[i]._id = daoRes.insertedIds[i];
    }
    var user = await th.defaults.getUser();
    var dynamicAttributeValues = [
        { dynamicAttributeId: dynamicAttributes[0]._id, entityId: user._id, clientId: clientId, value: '60' },
        { dynamicAttributeId: dynamicAttributes[1]._id, entityId: user._id, clientId: clientId, value: dynamicAttributeOptions[1]._id },
        { dynamicAttributeId: dynamicAttributes[2]._id, entityId: user._id, clientId: clientId, value: '170' },
        { dynamicAttributeId: dynamicAttributes[3]._id, entityId: user._id, clientId: clientId, value: dynamicAttributeOptions[2]._id }
    ]
    await db.get(co.collections.dynamicattributevalues.name).bulkWrite(dynamicAttributeValues.map((e) => { return {insertOne:{document:e}} }));
    return Promise.resolve(dynamicAttributes);
};

/**
 * Creates 2 options (elements) for an attribute of type picklist;
 *      attribute.modelName: 'users',
 *      attribute.name_en: 'gender'
 */
th.prepareDynamicAttributeOptions = function() {
    var dynamicAttributeOptions = [];
    th.dbObjects.dynamicattributes.forEach(function(attribute){
        if (attribute.type === 'picklist') {
            dynamicAttributeOptions.push({dynamicAttributeId: attribute._id, text_en: 'female', clientId: attribute.clientId});
            dynamicAttributeOptions.push({dynamicAttributeId: attribute._id, text_en: 'male', clientId: attribute.clientId});
        }
    });
    return th.bulkInsert(co.collections.dynamicattributeoptions.name, dynamicAttributeOptions);
};

/**
 * Creates dummy example values
 */
th.prepareDynamicAttributeValues = function(collectionName) {
    var dynamicAttributeValues = [];
    var modelName = collectionName ? collectionName : co.collections.users.name;
    th.dbObjects.dynamicattributes.forEach(function(attribute) {
        th.dbObjects[modelName].forEach(function(entity) {
            if (modelName !== co.collections.clients.name) { // Sonderbehandlung bei Mandanten
                if (attribute.clientId === null && entity.clientId !== null) return;
                if (attribute.clientId !== null && entity.clientId === null) return;
                if ('' + attribute.clientId !== '' + entity.clientId) return;
            }
            var value;
            if (attribute.type === 'text') {
                value = 'text';
            } else if (attribute.type === 'boolean') {
                value = true;
            } else if (attribute.type === 'picklist') {
                value = th.dbObjects.dynamicattributeoptions.find((o) => o.dynamicAttributeId.toString() === attribute._id.toString())._id;
            }
            dynamicAttributeValues.push({dynamicAttributeId: attribute._id, entityId: entity._id, clientId: attribute.clientId, value: value });
        });
    });
    return th.bulkInsert(co.collections.dynamicattributevalues.name, dynamicAttributeValues);
};

th.createRelation = (entityType1, nameType1, entityType2, nameType2, insertIntoDatabase) => {
    var entity1;
    return db.get(entityType1).findOne({ name: nameType1 }).then((entity) => {
        entity1 = entity;
        return db.get(entityType2).findOne({ name: nameType2 });
    }).then((entity2) => {
        var relation = {
            type1: entityType1,
            type2: entityType2,
            id1: entity1._id,
            id2: entity2._id,
            clientId: entity1.clientId
        };
        if (insertIntoDatabase) {
            return db.get(co.collections.relations.name).insert(relation);
        } else {
            return Promise.resolve(relation);
        }
    });
};

th.createRelationsToActivity = (entityType, entity) => {
    return db.get(co.collections.activities.name).findOne({name:th.defaults.activity}).then(function(activity) {
        var relations = [
            { type1: entityType, id1: entity._id, type2: co.collections.activities.name, id2: activity._id, clientId: activity.clientId },
            { type1: co.collections.activities.name, id1: activity._id, type2: entityType, id2: entity._id, clientId: activity.clientId }
        ];
        return db.get(co.collections.relations.name).bulkWrite(relations.map((relation) => { return {insertOne:{document:relation}} }));
    }).then(function() {
        return Promise.resolve(entity); // In den nächsten then-Block weiter reichen
    });
};

th.createRelationsToBusinessPartner = (entityType, entity) => {
    return db.get(co.collections.businesspartners.name).findOne({name:th.defaults.businessPartner}).then(function(businessPartner) {
        var relations = [
            { type1: entityType, id1: entity._id, type2: co.collections.businesspartners.name, id2: businessPartner._id, clientId: businessPartner.clientId },
            { type1: co.collections.businesspartners.name, id1: businessPartner._id, type2: entityType, id2: entity._id, clientId: businessPartner.clientId }
        ];
        return db.get(co.collections.relations.name).bulkWrite(relations.map((relation) => { return {insertOne:{document:relation}} }));
    }).then(function() {
        return Promise.resolve(entity); // In den nächsten then-Block weiter reichen
    });
};

th.createRelationsToPerson = (entityType, entity) => {
    return db.get(co.collections.persons.name).findOne({lastname:th.defaults.person}).then(function(person) {
        var relations = [
            { type1: entityType, id1: entity._id, type2: co.collections.persons.name, id2: person._id, clientId: person.clientId },
            { type1: co.collections.persons.name, id1: person._id, type2: entityType, id2: entity._id, clientId: person.clientId }
        ];
        return db.get(co.collections.relations.name).bulkWrite(relations.map((relation) => { return {insertOne:{document:relation}} }));
    }).then(function() {
        return Promise.resolve(entity); // In den nächsten then-Block weiter reichen
    });
};

th.createRelationsToNote = (entityType, entity) => {
    return db.get(co.collections.notes.name).findOne({name:th.defaults.note}).then(function(note) {
        var relations = [
            { type1: entityType, id1: entity._id, type2: co.collections.notes.name, id2: note._id, clientId: note.clientId },
            { type1: co.collections.notes.name, id1: note._id, type2: entityType, id2: entity._id, clientId: note.clientId }
        ];
        return db.get(co.collections.relations.name).bulkWrite(relations.map((relation) => { return {insertOne:{document:relation}} }));
    }).then(function() {
        return Promise.resolve(entity); // In den nächsten then-Block weiter reichen
    });
};

th.createRelationsToUser = (entityType, entity) => {
    return db.get(co.collections.users.name).findOne({name:th.defaults.user}).then(function(user) {
        var relations = [
            { type1: entityType, id1: entity._id, type2: co.collections.users.name, id2: user._id, clientId: user.clientId },
            { type1: co.collections.users.name, id1: user._id, type2: entityType, id2: entity._id, clientId: user.clientId }
        ];
        return db.get(co.collections.relations.name).bulkWrite(relations.map((relation) => { return {insertOne:{document:relation}} }));
    }).then(function() {
        return Promise.resolve(entity); // In den nächsten then-Block weiter reichen
    });
};

th.getModuleForApi = function(api) {
    // Use only the first parts until the slash
    api = api.split('/')[0];
    for (var moduleName in moduleConfig.modules) {
        var m = moduleConfig.modules[moduleName];
        // API
        if (m.api && m.api.find((a) => a === api))  {
            return moduleName;
        }
    };
};

th.defaults = {
    activity: '1_0_0_0',
    businessPartner: '1_0',
    /**
     * Standardmandant '1'
     */
    client: '1',
    /**
     * Standardmandant '1' aus Datenbank auslesen und per Promise zurück geben
     */
    getClient: function(clientName) { return db.get(co.collections.clients.name).findOne({name:clientName || th.defaults.client}); },
    /**
     * Standardportal 'p1' aus Datenbank auslesen und per Promise zurück geben
     */
    getPortal: function() { return db.get(co.collections.portals.name).findOne({name:th.defaults.portal}); },
    /**
     * Standardbenutzer '1_0_0' aus Datenbank auslesen und per Promise zurück geben
     */
    getUser: function(userName) { return db.get(co.collections.users.name).findOne({name:userName || th.defaults.user}); },
    /**
     * Standardbenutzergruppe '1_0' aus Datenbank auslesen und per Promise zurück geben
     */
    getUserGroup: function() { return db.get(co.collections.usergroups.name).findOne({name:th.defaults.userGroup}); },
    /**
     * Anmeldung mit STandardbenutzer durchführen
     */
    login: function(username) { return th.doLoginAndGetToken(username, "test"); },
    otherClient: '0',
    /**
     * Benutzer eines anderen Mandanten
     */
    otherUser: '0_0_0',
    partnerAddress: '1_0_0',
    password: 'test',
    person: '1_0',
    personCommunication: '1_0_0',
    /**
     * Standardportal 'p1'
     */
    portal: 'p1',
    portalActivity: '_0_0_0',
    portalUser: '_0_0',
    portalAdminUser: '_0_ADMIN0',
    user: '1_0_0',
    userGroup: '1_0'
};

th.apiTests = {
    get: {
        defaultNegative: function(api, permissionkey) {
            it('responds without authentication with 403', async() => {
                return th.get(`/api/${api}`).expect(403);
            });
            it('responds without read permission with 403', async() => {
                // Remove the corresponding permission
                await th.removeReadPermission("client0", "client0_usergroup0", permissionkey);
                var token = await th.defaults.login("client0_usergroup0_user0");
                await th.get(`/api/${api}?token=${token}`).expect(403);
            });
            function checkForUser(user) {
                return async() => {
                    var moduleName = th.getModuleForApi(api);
                    await th.removeClientModule("client0", moduleName);
                    var token = await th.defaults.login("client0_usergroup0_user0");
                    return th.get(`/api/${api}?token=${token}`).expect(403);
                }
            }
            it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser("client0_usergroup0_user0"));
            it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser("client0_usergroup0_user1"));
        }
    },
    getForIds: {
        defaultNegative: function(api, permissionkey, collection, createTestObjects) {
            it('responds without authentication with 403', async() => {
                var testobjectids = (await createTestObjects("client0")).map(n => n._id);
                await th.get(`/api/${api}/forIds?ids=${testobjectids.join(',')}`).expect(403);
            });
            function checkForUser(user) {
                return async() => {
                    var moduleName = th.getModuleForApi(api);
                    await th.removeClientModule("client0", moduleName);
                    var testobjectids = (await createTestObjects("client0")).map(n => n._id);
                    var token = await th.defaults.login("client0_usergroup0_user0");
                    await th.get(`/api/${api}/forIds?ids=${testobjectids.join(',')}&token=${token}`).expect(403);
                }
            }
            it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser("client0_usergroup0_user0"));
            it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser("client0_usergroup0_user1"));
            it('responds with empty list when user has no read permission', async() => {
                await th.removeReadPermission("client0", "client0_usergroup0", permissionkey);
                var testobjectids = (await createTestObjects("client0")).map(n => n._id);
                var token = await th.defaults.login("client0_usergroup0_user0");
                var elements = (await th.get(`/api/${api}/forIds?ids=${testobjectids.join(',')}&token=${token}`).expect(200)).body;
                assert.equal(elements.length, 0);
            });
            it('responds with empty list when query parameter "ids" does not exist', async() => {
                var token = await th.defaults.login("client0_usergroup0_user0");
                var elements = (await th.get(`/api/${api}/forIds?token=${token}`).expect(200)).body;
                assert.equal(elements.length, 0);
            });
            it('returns only elements of correct ids when parameter "ids" contains invalid IDs', async() => {
                var testobjectids = (await createTestObjects("client0")).map(n => n._id);
                var expectedcount = testobjectids.length;
                testobjectids.push('invalidId');
                var token = await th.defaults.login("client0_usergroup0_user0");
                var elements = (await th.get(`/api/${api}/forIds?ids=${testobjectids.join(',')}&token=${token}`).expect(200)).body;
                assert.equal(elements.length, expectedcount);
                for (var i = 0; i < expectedcount; i++) {
                    assert.strictEqual(testobjectids[i], elements[i]._id);
                }
            });
        },
        clientDependentNegative: function(api, collection, createTestObjects) {
            it('returns only elements of the client of the logged in user when "ids" contains IDs of entities of another client', async() => {
                var testobjectidsclient0 = (await createTestObjects("client0")).map(n => n._id);
                var testobjectidsclient1 = (await createTestObjects("client1")).map(n => n._id);
                var allids = testobjectidsclient0.concat(testobjectidsclient1);
                var token = await th.defaults.login("client0_usergroup0_user0");
                var elements = (await th.get(`/api/${api}/forIds?ids=${allids.join(',')}&token=${token}`).expect(200)).body;
                assert.equal(elements.length, testobjectidsclient0.length);
                for (var i = 0; i < testobjectidsclient0.length; i++) {
                    assert.strictEqual(testobjectidsclient0[i], elements[i]._id);
                }
            });
        },
        defaultPositive: function(api, collection, createTestObjects) {
            it('returns a list of elements with all details for the given IDs', async() => {
                var testobjects = await createTestObjects("client0");
                var token = await th.defaults.login("client0_usergroup0_user0");
                var elementsFromApi = (await th.get(`/api/${api}/forIds?ids=${testobjects.map(n => n._id).join(',')}&token=${token}`).expect(200)).body;
                assert.equal(elementsFromApi.length, testobjects.length);
                for (var i = 0; i < testobjects.length; i++) {
                    var elementFromApi = elementsFromApi[i];
                    var elementFromDatabase = testobjects[i];
                    Object.keys(elementFromDatabase).forEach(function(key) {
                        assert.ok(elementFromApi[key] || elementFromApi[key] === null, `Key ${key} not returned by API.`); // Einige Werte können null sein
                        if (elementFromApi[key] === null) {
                            assert.ok(elementFromDatabase[key] === null);
                        } else {
                            assert.strictEqual(elementFromApi[key], elementFromDatabase[key]);
                        }
                    });
                }
            });
        }
    },
    getId: {
        defaultNegative: function(api, permission, datatypename) {
            var testObject = { name: "testobject" };
            it('responds without authentication with 403', async() => {
                await Db.insertDynamicObject("client0", datatypename, testObject);
                await th.get(`/api/${api}/${testObject.name}`).expect(403);
            });
            it('responds without read permission with 403', async() => {
                var insertedId;
                await th.removeReadPermission("client0", "client0_usergroup0", permission);
                await Db.insertDynamicObject("client0", datatypename, testObject);
                var token = await th.defaults.login("client0_usergroup0_user0");
                await th.get(`/api/${api}/${testObject.name}?token=${token}`).expect(403);
            });
            function checkForUser(user) {
                return async() => {
                    var moduleName = th.getModuleForApi(api);
                    await th.removeClientModule("client0", moduleName);
                    await Db.insertDynamicObject("client0", datatypename, testObject);
                    var token = await th.defaults.login("client0_usergroup0_user0");
                    await th.get(`/api/${api}/${testObject.name}?token=${token}`).expect(403);
                }
            }
            it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser("client0_usergroup0_user0"));
            it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser("client0_usergroup0_user1"));
            it('responds with not existing id with 404', async() => {
                // Here the validateSameClientId comes into the game and returns a 403 because the requested element is
                // in the same client as the logged in user (it is in no client but this is Krümelkackerei)
                await Db.insertDynamicObject("client0", datatypename, testObject);
                var token = await th.defaults.login("client0_usergroup0_user0");
                await th.get(`/api/${api}/999999999999999999999999?token=${token}`).expect(404);
            });
        },
        clientDependentNegative: function(api, datatypename) {
            var testObject = { name: "testobject" };
            it('responds with 404 when the object with the given ID does not belong to the client of the logged in user', async() => {
                await Db.insertDynamicObject("client1", datatypename, testObject);
                var token = await th.defaults.login("client0_usergroup0_user0");
                await th.get(`/api/${api}/${testObject.name}?token=${token}`).expect(404); // From validateSameClientId()
            });
        }
    },
    /**
     * Testfunktionen für POST - API Requests
     */
    post: {
        /**
         * Standard-Negativtests, die das Verhalten von falschen Aufrufen prüfen
         */
        defaultNegative: function(api, permission, createTestObject, ignoreSendObjectTest) {
            it('responds without authentication with 403', function() {
                return createTestObject().then(function(testObject) {
                    return th.post(`/api/${api}`).send(testObject).expect(403);
                });
            });
            if (permission) it('responds without write permission with 403', function() {
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
                    var moduleName = th.getModuleForApi(api);
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
            // Bei portalmanagement muss nix geschickt werden.
            if(!ignoreSendObjectTest) it('responds with 400 when not sending an object to insert', function() {
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    return th.post(`/api/${api}?token=${token}`).expect(400);
                });
            });
        },
        /**
         * Standardpositiv-Tests zum Prüfen, ob ein gesendetes Objekt auch
         * korrekt in der Datenbank ankommt und ob die Rückgabedaten stimmen.
         */
        defaultPositive: function(api, collection, createTestObject) {
            it('responds with the created element containing an _id field', function() {
                var testObject;
                return createTestObject().then(function(obj) {
                    testObject = obj;
                    return th.doLoginAndGetToken(th.defaults.user, th.defaults.password);
                }).then(function(token) {
                    return th.post(`/api/${api}?token=${token}`).send(testObject).expect(200);
                }).then(function(response) {
                    var objectFromApi = response.body;
                    assert.ok(objectFromApi._id);
                    Object.keys(testObject).forEach(function(key) {
                        assert.ok(objectFromApi[key]);
                        assert.strictEqual(objectFromApi[key].toString(), testObject[key].toString());
                    });
                    return db.get(collection).findOne(objectFromApi._id);
                }).then(function(objectFromDatabase) {
                    Object.keys(testObject).forEach(function(key) {
                        assert.ok(objectFromDatabase[key]);
                        assert.strictEqual(objectFromDatabase[key].toString(), testObject[key].toString());
                    });
                    return Promise.resolve();
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
                    var moduleName = th.getModuleForApi(api);
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
            it('responds with 400 when the object to insert only contains an _id', function() {
                var loginToken;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    loginToken = token;
                    return createTestObject();
                }).then(function(testObject) {
                    Object.keys(testObject).forEach(function(key) {
                        if (key === '_id') return;
                        delete testObject[key];
                    });
                    return th.put(`/api/${api}/${testObject._id}?token=${loginToken}`).send(testObject).expect(400);
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
                    return db.get(co.collections.clients.name).findOne({name:th.defaults.otherClient});
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
            it('responds with 400 when the object to insert only contains a clientId', function() {
                var loginToken;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    loginToken = token;
                    return createTestObject();
                }).then(function(testObject) {
                    Object.keys(testObject).forEach(function(key) {
                        if (key === 'clientId') return;
                        delete testObject[key];
                    });
                    return th.put(`/api/${api}/${testObject._id}?token=${loginToken}`).send(testObject).expect(400);
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
            if (permission) it('responds without write permission with 403', function() {
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
                    var moduleName = th.getModuleForApi(api);
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
        defaultPositive: function(api, collection, getId, skipRelations, skipDynamicAttributes) {
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
            if (!skipRelations) it('All relations, where the element is the source (type1, id1), are also deleted', function() {
                var loginToken, objectId;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    loginToken = token;
                    return getId();
                }).then(function(id) {
                    objectId = id;
                    return db.get(co.collections.relations.name).find({type1:collection,id1:objectId});
                }).then(function(relationsBefore) {
                    assert.notEqual(relationsBefore.length, 0, 'There are no relations set up to test. Have a look into the testHelpers.prepare... functions.');
                    return th.del(`/api/${api}/${objectId.toString()}?token=${loginToken}`).expect(204);
                }).then(function() {
                    return db.get(co.collections.relations.name).find({type1:collection,id1:objectId});
                }).then(function(relationsAfter) {
                    assert.strictEqual(relationsAfter.length, 0, 'There are still relations left');
                    return Promise.resolve();
                });
            });
            if (!skipRelations) it('All relations, where the element is the target (type2, id2), are also deleted', function() {
                var loginToken, objectId;
                return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                    loginToken = token;
                    return getId();
                }).then(function(id) {
                    objectId = id;
                    return db.get(co.collections.relations.name).find({type2:collection,id2:objectId});
                }).then(function(relationsBefore) {
                    assert.notEqual(relationsBefore.length, 0, 'There are no relations set up to test. Have a look into the testHelpers.prepare... functions.');
                    return th.del(`/api/${api}/${objectId.toString()}?token=${loginToken}`).expect(204);
                }).then(function() {
                    return db.get(co.collections.relations.name).find({type2:collection,id2:objectId});
                }).then(function(relationsAfter) {
                    assert.strictEqual(relationsAfter.length, 0, 'There are still relations left');
                    return Promise.resolve();
                });
            });
            if (!skipDynamicAttributes) it('Deletes all dynamic attribute values for the entity', async function() {
                var objectId = await getId();
                // DA's vorbereiten
                var entity = await db.get(collection).findOne(objectId);
                assert.ok(entity, 'Entity was not inserted into database');
                th.dbObjects[collection].push(entity); // Ist in der Regel nicht drin, wird aber von den folgenden Hilfsfunktionen verwendet
                await th.prepareDynamicAttributes(collection);
                await th.prepareDynamicAttributeOptions();
                await th.prepareDynamicAttributeValues(collection);
                var token = await th.defaults.login();
                await th.del(`/api/${api}/${objectId.toString()}?token=${token}`).expect(204);
                var dynamicAttributeValuesAfter = await db.get(co.collections.dynamicattributevalues.name).find({entityId:objectId});
                assert.strictEqual(dynamicAttributeValuesAfter.length, 0, 'There are still dynamic attribute values left');
            });
        }
    }
};


/**
 * Erstellt eine Liste von Dateien, die für eine gegebene Menge von Modulen existieren müssen.
 * Wird von app-packager und portalmanagement Tests verwendet.
 */
th.createFileList = (moduleNames) => {
    var fileList = [];
    fileList.push('config/module-config.json');
    if (!moduleNames || moduleNames.length < 1) {
        var moduleNames = Object.keys(moduleConfig.modules);
    }
    moduleNames.forEach((moduleName) => {
        var module = moduleConfig.modules[moduleName];
        if (module.api) module.api.forEach((apiFileName) => {
            fileList.push(`api/${apiFileName}.js`);
        });
        if (module.doc) module.doc.forEach((docEntry) => {
            fileList.push(`public/partial/Doc/${docEntry.docCard}.html`);
        });
        if (module.middlewares) module.middlewares.forEach((middlewareFileName) => {
            fileList.push(`middlewares/${middlewareFileName}.js`);
        });
        if (module.utils) module.utils.forEach((utilFileName) => {
            fileList.push(`utils/${utilFileName}.js`);
        });
        if (module.public) module.public.forEach((publicFileName) => {
            fileList.push(`public/${publicFileName}`);
        });
        if (module.root) module.root.forEach((rootFileName) => {
            fileList.push(`${rootFileName}`);
        });
        if (module.include) module.include.forEach((includeFileName) => {
            if (includeFileName.indexOf('node_modules/') === 0) return; // Ignore node modules
            fileList.push(`${includeFileName}`);
        });
        if (module.languages) module.languages.forEach((language) => {
            fileList.push(`public/lang/${moduleName}-${language}.json`);
        });
    });
    return fileList;
};
