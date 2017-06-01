var localConfig = require('../config/localconfig.json');

/**
 * Middleware for routers which checks the user credentials and access permissions.
 * Used in routers as handler chain.
 * Sets:
 * req.user = Complete user database
 * req.user.permissions = List of all permissions of the user's usergroup
 * @param permissionKey Permission key
 * @param readWrite 'r' Read permission required, 'w' Write permission required
 * @param module Name of the module the API belongs to
 */
module.exports = function(permissionKey, readWrite, moduleName) {
    // http://stackoverflow.com/a/12737295
    return (req, res, next) => {
        var user = req.user;
        // Check whether credentials are given
        if (!user || !user._id || !require('./validateId').validateId(user._id)) {
            return res.sendStatus(403);
        }
        // Check whether token time is older than server start
        if(localConfig.startTime > user.tokenTime) {
            return res.sendStatus(205); // Force the client to reload the entire page
        }
        module.exports.canAccess(user._id, permissionKey, readWrite, moduleName, req.db).then(function(userInDatabase) {
            if (!userInDatabase) { // User not found
                return res.sendStatus(403);
            }
            req.user = userInDatabase;
            next();
        });
    };
};

/**
 * Hilfsfunktion zum prüfen, ob ein Benutzer bestimmte Zugriffsrechte hat. Wird für Verknüpfungen
 * direkt verwendet, da dort auth() nicht als Middleware eingesetzt werden kann.
 * Das Promise liefert im resolve als Parameter den Benutzer aus der Datenbank und true oder false.
 * Direkter Aufruf: require('auth').canAccess(...);
 */
module.exports.canAccess = function(userId, permissionKey, readWrite, moduleName, db) {
    return new Promise(function(resolve, reject) {
        // Check user against database
        db.get('users').findOne(userId).then((userInDatabase) => {
            if (!userInDatabase) { // User not found
                return resolve(false);
            }
            // Check whether module is available for the client of the user, ignore portal users
            if (userInDatabase.clientId && moduleName) {
                db.get('clientmodules').findOne({ clientId: userInDatabase.clientId, module: moduleName }).then(function(clientmodule) {
                    // Ignore check for portal users
                    if (userInDatabase.clientId !== null && !clientmodule) { // Client has no access to the module
                        return resolve(false);
                    }
                    return checkUser(userInDatabase, permissionKey, readWrite, db);
                }).then(function(userHasAccess) {
                    if (!userHasAccess) {
                        return resolve(false);
                    }
                    return resolve(userInDatabase);
                });
            } else {
                checkUser(userInDatabase, permissionKey, readWrite, db).then(function(userHasAccess) {
                    if (!userHasAccess) {
                        return resolve(false);
                    }
                    return resolve(userInDatabase);
                });
            }
        });
    });
};

function checkUser(userInDatabase, permissionKey, readWrite, db) {
    return new Promise(function(resolve, reject) {
        // Check permission when not administrator
        if (!userInDatabase.isAdmin && permissionKey && readWrite) { // in menu API no key and no readwrite is given
            // Extract the permission for the requested permission key
            var permissionToFind = { userGroupId: userInDatabase.userGroupId, key: permissionKey };
            if (readWrite.indexOf('r') >= 0) {
                permissionToFind.canRead = true;
            }
            if (readWrite.indexOf('w') >= 0) {
                permissionToFind.canWrite = true;
            }
            db.get('permissions').findOne(permissionToFind).then((permission) => {
                if (!permission) { // User has no permission
                    resolve(false);
                }
                resolve(true);
            });
        } else {
            resolve(true);
        }
    });
};