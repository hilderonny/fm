/**
 * UNIT Tests for middlewares/db
 */
var assert = require('assert');
var testHelpers = require('../testhelpers');
var db = require('../../middlewares/db');
var localConfig = require('../../config/localconfig.json');
var fs = require('fs');
var monk = require('monk');

/**
 * Entfernt die Datenbank aus dem Cache und bindet sie neu ein und führt init() aus.
 * Damit können die Umgebungsvariablen angepasst und die Reaktion der Datenbank darauf getestet werden.
 * Liefert das Promise der init()-Methode zurück.
 * https://gist.github.com/adam-lynch/11037907
 */
function reInitializeDatabase() {
    delete require.cache[require.resolve('../../middlewares/db')];
    db = require('../../middlewares/db');
    return db.init();
}

describe('MIDDLEWARE db', function() {

    describe('handler()', function() {

        it('appends the database to the request and calls the next function', function() {
            return new Promise(function(resolve, reject) {
                var req = {}, res = {};
                // Directly call the handler function providing req, res and next
                db.handler(req, res, function() {
                    // Check whether the req contains a db field with the middleware
                    assert.ok(req.db, 'Database was not appended to request');
                    assert.strictEqual(req.db, db, 'Database on request is another instance');
                    resolve();
                });
            });
        });
    });

    describe('init()', function() {

        // Umgebungsvariablen sichern und nach dem Test wiederherstellen, da diese während der Tests verändert werden
        var origEnv,origLocalConfig;
        beforeEach(function() {
            origEnv = JSON.stringify(process.env);
            origLocalConfig = JSON.parse(fs.readFileSync('./config/localconfig.json'));
            return reInitializeDatabase(); // Datenbank vor jedem Test auf Standard zurück stellen
        });
        afterEach(function() {
            fs.writeFileSync('./config/localconfig.json', JSON.stringify(origLocalConfig, null, 4));
            process.env = JSON.parse(origEnv);
        })

        it('uses the database set in localconfig variable dbName when environment variable MONGO_TEST_DB is not set', function() {
            // Set the database name in localconfig to "testConfigDb"
            var testDbName = 'testConfigDb';
            var testCollectionName = 'testCollection';
            var directlyInsertedObject;
            localConfig.dbName = testDbName;
            // Create a database element directly via monk in database "testConfigDb"
            var localMonkDb = require('monk')('localhost/' + testDbName);
            return localMonkDb.get(testCollectionName).drop().then(function() {
                var objectForDirectInsertion = { name: 'Dingensbummens' };
                return localMonkDb.get(testCollectionName).insert(objectForDirectInsertion);
            }).then(function(obj) {
                directlyInsertedObject = obj;
                // Remove environment variable MONGO_TEST_DB
                delete process.env.MONGO_TEST_DB;
                // Reinitialize database
                return reInitializeDatabase();
            }).then(function() {
                // Obtain the created element with middleware
                return db.get(testCollectionName).findOne(directlyInsertedObject._id);
            }).then(function(objectFromDatabase) {
                // Compare the datasets
                assert.equal(objectFromDatabase._id.toString(), directlyInsertedObject._id.toString());
                assert.equal(objectFromDatabase.name, directlyInsertedObject.name);
                return Promise.resolve();
            });
        });

        it('uses the default database file "db" when environment variable MONGO_TEST_DB and localconfig variable dbName were not set', function() {
            // Remove database name from localconfig
            var testCollectionName = 'testCollectionDingens';
            var directlyInsertedObject;
            delete localConfig.dbName;
            // Create a database element directly via monk in default database "db"
            var localMonkDb = require('monk')('localhost/db');
            return localMonkDb.get(testCollectionName).drop().then(function() {
                var objectForDirectInsertion = { name: 'Hurtighurtig' };
                return localMonkDb.get(testCollectionName).insert(objectForDirectInsertion);
            }).then(function(obj) {
                directlyInsertedObject = obj;
                // Remove environment variable MONGO_TEST_DB
                delete process.env.MONGO_TEST_DB;
                // Reinitialize database
                return reInitializeDatabase();
            }).then(function() {
                // Obtain the created element with middleware
                return db.get(testCollectionName).findOne(directlyInsertedObject._id);
            }).then(function(objectFromDatabase) {
                // Compare the datasets
                assert.strictEqual(objectFromDatabase._id.toString(), directlyInsertedObject._id.toString());
                assert.strictEqual(objectFromDatabase.name, directlyInsertedObject.name);
                return Promise.resolve();
            });
        });

        it('does not update the localConfig and does not create an admin when the environment variable NODE_ENV is set to "test"', function() {
            // Set the recreatePortalAdmin flag to true in localConfig
            localConfig.recreatePortalAdmin = true;
            fs.writeFileSync('./config/localconfig.json', JSON.stringify(localConfig, null, 4));
            // Obtain a possibly existing admin user from the database
            var existingAdminUser;
            return db.get('users').findOne({name:'admin'}).then(function(user) {
                existingAdminUser = user;
                // Set NODE_ENV to "test"
                process.env.NODE_ENV = 'test';
                // Reinitialize database
                return reInitializeDatabase();
            }).then(function() {
                // Check whether the localconfig is left unchanged
                var updatedConfig = JSON.parse(fs.readFileSync('./config/localconfig.json'));
                assert.ok(updatedConfig.recreatePortalAdmin);
                return db.get('users').findOne({name:'admin'});
            }).then(function(newAdminUser) {
                // Check whether admin was updated or created
                if (existingAdminUser) {
                    assert.strictEqual(newAdminUser._id.toString(), existingAdminUser._id.toString());
                } else {
                    assert.ok(!newAdminUser);
                }
                return Promise.resolve();
            });
        });

        it('does not create an admin when the environment variable NODE_ENV is not set to "test" and when recreatePortalAdmin is set to false in localconfig.json', function() {
            // Set the recreatePortalAdmin flag to true in localConfig
            localConfig.recreatePortalAdmin = false;
            fs.writeFileSync('./config/localconfig.json', JSON.stringify(localConfig, null, 4));
            // Obtain a possibly existing admin user from the database
            var existingAdminUser;
            return db.get('users').findOne({name:'admin'}).then(function(user) {
                existingAdminUser = user;
                // Set NODE_ENV to "production"
                process.env.NODE_ENV = 'production';
                // Reinitialize database
                return reInitializeDatabase();
            }).then(function() {
                return db.get('users').findOne({name:'admin'});
            }).then(function(newAdminUser) {
                // Check whether admin was updated or created
                if (existingAdminUser) {
                    assert.strictEqual(newAdminUser._id.toString(), existingAdminUser._id.toString());
                } else {
                    assert.ok(!newAdminUser);
                }
                return Promise.resolve();
            });
        });

        it('recreates an admin user when recreatePortalAdmin is set to true and no admin user exists', function() {
            // Set the recreatePortalAdmin flag to true in localConfig
            localConfig.recreatePortalAdmin = true;
            fs.writeFileSync('./config/localconfig.json', JSON.stringify(localConfig, null, 4));
            // Delete a possibly existing admin user from the database
            return db.get('users').remove({name:'admin'}).then(function() {
                // Set NODE_ENV to "production"
                process.env.NODE_ENV = 'production';
                // Reinitialize database
                return reInitializeDatabase();
            }).then(function() {
                // Check whether recreatePortalAdmin was automagically set to false in localconfig.json
                var updatedConfig = JSON.parse(fs.readFileSync('./config/localconfig.json'));
                assert.ok(!updatedConfig.recreatePortalAdmin);
                return db.get('users').findOne({name:'admin'});
            }).then(function(newAdminUser) {
                assert.ok(newAdminUser);
                assert.ok(!newAdminUser.isAdmin);
                assert.equal(newAdminUser.clientId, null);
                return db.get('usergroups').findOne(newAdminUser.userGroupId);
            }).then(function(newUserGroup) {
                // Check whether a new admin usergroup was created
                assert.ok(newUserGroup);
                assert.strictEqual(newUserGroup.name, 'admin');
                return db.get('permissions').find({$query:{userGroupId:newUserGroup._id},$orderby:{key:1}});
            }).then(function(permissions) {
                // Check permissions
                assert.equal(permissions.length, 6);
                var permissionNames = [
                    'PERMISSION_ADMINISTRATION_CLIENT',
                    'PERMISSION_ADMINISTRATION_SETTING',
                    'PERMISSION_ADMINISTRATION_USER',
                    'PERMISSION_ADMINISTRATION_USERGROUP',
                    'PERMISSION_SETTINGS_PORTAL',
                    'PERMISSION_SETTINGS_USER'
                ];
                for (var i in permissionNames) {
                    var permission = permissions[i];
                    var permissionName = permissionNames[i];
                    assert.strictEqual(permission.key, permissionName);
                    assert.ok(permission.canRead);
                    assert.ok(permission.canWrite);
                }
                return Promise.resolve();
            });
        });

        it('recreates an admin user when recreatePortalAdmin is set to true and an admin user exists', function() {
            // Set the recreatePortalAdmin flag to true in localConfig
            localConfig.recreatePortalAdmin = true;
            fs.writeFileSync('./config/localconfig.json', JSON.stringify(localConfig, null, 4));
            // Obtain a possibly existing admin user from the database or create one
            var existingAdminUser;
            return db.get('users').findOne({name:'admin'}).then(function(user) {
                if (user) {
                    return Promise.resolve(user);
                } else {
                    return db.get('users').insert({name:'admin',userGroupId:monk.id()});
                }
            }).then(function(user) {
                existingAdminUser = user;
                // Set NODE_ENV to "production"
                process.env.NODE_ENV = 'production';
                // Reinitialize database
                return reInitializeDatabase();
            }).then(function() {
                // Check whether recreatePortalAdmin was automagically set to false in localconfig.json
                var updatedConfig = JSON.parse(fs.readFileSync('./config/localconfig.json'));
                assert.ok(!updatedConfig.recreatePortalAdmin);
                return db.get('users').findOne({name:'admin'});
            }).then(function(newAdminUser) {
                // Check whether admin was updated
                assert.notEqual(newAdminUser._id.toString(), existingAdminUser._id.toString());
                assert.notEqual(newAdminUser.userGroupId.toString(), existingAdminUser.userGroupId.toString());
                assert.ok(!newAdminUser.isAdmin);
                assert.equal(newAdminUser.clientId, null);
                return db.get('usergroups').findOne(newAdminUser.userGroupId);
            }).then(function(newUserGroup) {
                // Check whether a new admin usergroup was created
                assert.ok(newUserGroup);
                assert.strictEqual(newUserGroup.name, 'admin');
                return db.get('permissions').find({$query:{userGroupId:newUserGroup._id},$orderby:{key:1}});
            }).then(function(permissions) {
                // Check permissions
                assert.equal(permissions.length, 6);
                var permissionNames = [
                    'PERMISSION_ADMINISTRATION_CLIENT',
                    'PERMISSION_ADMINISTRATION_SETTING',
                    'PERMISSION_ADMINISTRATION_USER',
                    'PERMISSION_ADMINISTRATION_USERGROUP',
                    'PERMISSION_SETTINGS_PORTAL',
                    'PERMISSION_SETTINGS_USER'
                ];
                for (var i in permissionNames) {
                    var permission = permissions[i];
                    var permissionName = permissionNames[i];
                    assert.strictEqual(permission.key, permissionName);
                    assert.ok(permission.canRead);
                    assert.ok(permission.canWrite);
                }
                return Promise.resolve();
            });
        });
    });

    describe('insert()', function() {

        var testCollectionName = 'testCollection';
    
        beforeEach(() => {
            return db.get(testCollectionName).drop();
        });

        it('emits the event "insert" with inserted data', function() {
            var receivedCollectionName, receivedElement;
            // Register a listener for the insert event
            db.on('insert', function(collectionName, insertedElement) {
                receivedCollectionName = collectionName;
                receivedElement = insertedElement;
            });
            // Insert some data
            return db.insert(testCollectionName, {wurst:'husten'}).then(function(newElement) {
                // Check the listener for retreiving the inserted data including an _id
                assert.strictEqual(receivedCollectionName, testCollectionName);
                assert.ok(receivedElement._id);
                assert.strictEqual(receivedElement.wurst, 'husten');
                return Promise.resolve();
            });
        });

    });

    describe('update()', function() {

        var testCollectionName = 'testCollection';
    
        beforeEach(() => {
            return db.get(testCollectionName).drop();
        });

        it('emits the event "update" with updated data', function() {
            var receivedCollectionName, receivedElement;
            // Register a listener for the update event
            db.on('update', function(collectionName, updatedElement) {
                receivedCollectionName = collectionName;
                receivedElement = updatedElement;
            });
            // Insert some data
            return db.insert(testCollectionName, {wurst:'husten'}).then(function(newElement) {
                // Update the data
                return db.update(testCollectionName, { wurst:'husten' }, { wurst:'schnupfen', wo:'kopp' } )
            }).then(function() {
                // Check the listener for retreiving the updated data
                assert.strictEqual(receivedCollectionName, testCollectionName);
                assert.strictEqual(receivedElement.wurst, 'schnupfen');
                assert.strictEqual(receivedElement.wo, 'kopp');
                return Promise.resolve();
            });
        });

    });

    describe('remove()', function() {

        var testCollectionName = 'testCollection';
    
        beforeEach(() => {
            return db.get(testCollectionName).drop();
        });

        it('emits the event "remove" with removed data', function() {
            var receivedCollectionName, receivedElements, testElement;
            // Register a listener for the update event
            db.on('remove', function(collectionName, removedElements) {
                receivedCollectionName = collectionName;
                receivedElements = removedElements;
            });
            // Insert some data
            return db.insert(testCollectionName, {wurst:'husten'}).then(function(newElement) {
                testElement = newElement;
                // Delete the data
                return db.remove(testCollectionName, testElement._id);
            }).then(function() {
                // Check the listener for retreiving the updated data
                assert.strictEqual(receivedCollectionName, testCollectionName);
                assert.strictEqual(receivedElements[0]._id.toString(), testElement._id.toString());
                assert.strictEqual(receivedElements[0].wurst, testElement.wurst);
                return Promise.resolve();
            });
        });

    });

});
