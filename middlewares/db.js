/**
 * Middleware that opens a database connection and provides it as req.db in the request.
 */
var localConfig = require('../config/localconfig.json');
var moduleConfig = require('../config/module-config.json');

var dbFile = process.env.MONGO_TEST_DB  || localConfig.dbName || 'db' ; 
var monkDb = require('monk')('localhost/' + dbFile);
var bcryptjs = require('bcryptjs');
var fs = require('fs');
var co = require('../utils/constants');


var db = {
    /**
     * Handler chain element for express app. Use it with app.use(db.handler).
     */
    handler: (req, res, next) => {
        req.db = db;
        next();
    },
    /**
     * Initializes the database by creating an admin user when he does not exist.
     * Returns a promise.
     */
    init: () => {
        // Ignore database update in tests
        if (process.env.NODE_ENV === 'test') return Promise.resolve();
        // Create admin user, when defined in localconfig
        var localConfig = JSON.parse(fs.readFileSync('./config/localconfig.json').toString());
        if (!localConfig.recreatePortalAdmin) return Promise.resolve();
        localConfig.recreatePortalAdmin = false;
        fs.writeFileSync('./config/localconfig.json', JSON.stringify(localConfig, null, 4));
        var users = monkDb.get('users');
        var userGroups = monkDb.get('usergroups');
        return users.remove({name:'admin'}).then(() => {
            return userGroups.insert({ name: 'admin', clientId: null });
        }).then((existingAdminUserGroup) => {
            return users.insert({ 
                name: 'admin',
                pass: bcryptjs.hashSync('admin'),
                clientId: null, // null means that the user is a portal user
                userGroupId: existingAdminUserGroup._id
            });
        }).then((existingAdminUser) => {
            return monkDb.get('permissions').bulkWrite([
                { insertOne: { document: { key:co.permissions.ADMINISTRATION_CLIENT, canRead:true, canWrite:true, userGroupId:existingAdminUser.userGroupId, clientId:existingAdminUser.clientId  } } },
                { insertOne: { document: { key:co.permissions.ADMINISTRATION_SETTINGS, canRead:true, canWrite:true, userGroupId:existingAdminUser.userGroupId, clientId:existingAdminUser.clientId  } } }, // TODO: Remove
                { insertOne: { document: { key:co.permissions.ADMINISTRATION_USER, canRead:true, canWrite:true, userGroupId:existingAdminUser.userGroupId, clientId:existingAdminUser.clientId  } } },
                { insertOne: { document: { key:co.permissions.ADMINISTRATION_USERGROUP, canRead:true, canWrite:true, userGroupId:existingAdminUser.userGroupId, clientId:existingAdminUser.clientId  } } },
                { insertOne: { document: { key:co.permissions.SETTINGS_PORTAL, canRead:true, canWrite:true, userGroupId:existingAdminUser.userGroupId, clientId:existingAdminUser.clientId  } } },
                { insertOne: { document: { key:co.permissions.SETTINGS_USER, canRead:true, canWrite:true, userGroupId:existingAdminUser.userGroupId, clientId:existingAdminUser.clientId  } } }
            ]);
        });
    },
    /**
     * Forwarding to monk.get() for referencing collections in the database. E.g. req.db.get('users').find(...);
     */
    get: monkDb.get,
    /**
     * Weiterleitung an monk für Event-Handling
     */
    on: function(type, listener) {
        monkDb.on(type, listener);
    },
    /**
     * Inserts an object into a given collection. Fires the "insert" event with the collection and the inserted
     * element on completion: db.on('insert', (collection, result) => { ... });.
     * Usage: req.db.insert('users', { name: 'user1'} ).then(...);
     * @param {String} collection Name of the collection to insert the object
     * @param {Object} element Object to insert into the collection
     * @return Promise with the inserted element
     */
    insert: (collection, element) => {
        return monkDb.get(collection).insert(element).then((res) => {
            monkDb.emit('insert', collection, res); // db (Manager) is of type EventEmitter, see https://nodejs.org/api/events.html
            return Promise.resolve(res);
        });
    },
    /**
     * Updates an object in a given collection. Fires the "update" event with the collection and the updated
     * element on completion: db.on('update', (collection, result) => { ... });.
     * Only the first found element gets updated.
     * Usage: req.db.update('users', { name: 'oldUserName' }, { name: 'newUserName'} ).then(...);
     * @param {String} collection Name of the collection to insert the object
     * @param {Object} query Query for finding the relevant element to update. Can be an object for matching or a String or an ID.
     * @param {Object} update Object with attributes to be updated for the element
     * @return Promise with the updated element
     */
    update: (collection, query, update) => {
        return monkDb.get(collection).findOneAndUpdate(query, update).then((res) => {
            monkDb.emit('update', collection, res);
            return Promise.resolve(res);
        });
    },
    /**
     * Updates all objects matching the query
     */
    updateMany: (collection, query, update) => {
        return monkDb.get(collection).update(query, { $set: update }, { multi: true }).then((res) => {
            monkDb.emit('update', collection, res);
            return Promise.resolve(res);
        });
    },
    /**
     * Removes an object from a given collection. Fires the "remove" event with the collection and the query
     * on completion: db.on('remove', (collection, query) => { ... });.
     * All elements matching the given filter are removed.
     * Please keep the relations between objects in mind!
     * Usage: req.db.remove('users', { name: 'user1' } ).then(...);
     * @param {String} collection Name of the collection to insert the object
     * @param {Object} query Query for finding the relevant element to remove. Can be an object for matching or a String or an ID.
     * @return Promise with the deletion result. Normally not used further.
     */
    remove: (collection, query, resultFilter) => {
        return monkDb.get(collection).find(query, resultFilter).then((existing) => {
            return monkDb.get(collection).remove(query).then((res) => {
                monkDb.emit('remove', collection, existing); // Send original deleted objects to event receiver
                return Promise.resolve(res); // Return deletion result to caller
            });
        });
    }
};

module.exports = db;
