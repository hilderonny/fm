var localConfig = require('../config/localconfig.json');
var Db = require("../utils/db").Db;

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
    return async(req, res, next) => {
        var user = req.user;
        // Check whether credentials are given
        if (!user || !user.name) {
            return res.sendStatus(403);
        }
        // Check whether token time is older than server start
        if(localConfig.startTime > user.tokenTime) {
            return res.sendStatus(205); // Force the client to reload the entire page
        }
        var userInDatabase = await module.exports.canAccess(user.name, permissionKey, readWrite, moduleName);
        if (!userInDatabase) { // User not found
            return res.sendStatus(403);
        }
        req.user = userInDatabase;
        next();
    };
};

module.exports.dynamic = function(datatypeparametername, readwrite) {
    return async(req, res, next) => {
        var user = req.user;
        // Check whether credentials are given
        if (!user || !user.name) return res.sendStatus(403);
        // Check whether token time is older than server start
        if(localConfig.startTime > user.tokenTime) return res.sendStatus(205); // Force the client to reload the entire page
        var datatypename = req.params[datatypeparametername];
        if (!datatypename) return res.sendStatus(400);
        var userInDatabase = await module.exports.canAccess(user.name, null, readwrite, null, datatypename);
        if (!userInDatabase) return res.sendStatus(403); // User not found or has no access
        req.user = userInDatabase;
        next();
    };
},

/**
 * Hilfsfunktion zum prüfen, ob ein Benutzer bestimmte Zugriffsrechte hat. Wird für Verknüpfungen
 * direkt verwendet, da dort auth() nicht als Middleware eingesetzt werden kann.
 * Das Promise liefert im resolve als Parameter den Benutzer aus der Datenbank und true oder false.
 * Direkter Aufruf: require('auth').canAccess(...);
 */
module.exports.canAccess = async(username, permissionKey, readWrite, moduleName, datatypename) => {
    // Check user against database
    var userresult = await Db.query(Db.PortalDatabaseName, `SELECT * FROM allusers WHERE name='${Db.replaceQuotes(username)}';`);
    var userInAllUsers = userresult.rowCount > 0 ? userresult.rows[0] : undefined;
    if (!userInAllUsers) return false;
    var userInDatabase = await Db.getDynamicObject(userInAllUsers.clientname ? userInAllUsers.clientname : Db.PortalDatabaseName, "users", userInAllUsers.name);
    userInDatabase.clientname = userInAllUsers.clientname; // Relevant for APIs
    if (datatypename) { // Dynamic APIS do not provide permission keys directly but through datatypenames
        var datatype = await Db.getDataType(userInAllUsers.clientname, datatypename);
        if (!datatype) return false;
        permissionKey = datatype.permissionkey; // Use this one!
        moduleName = datatype.modulename; // Use this one!
    }
    // Check whether module is available for the client of the user, ignore portal users
    if (userInAllUsers.clientname && userInAllUsers.clientname !== Db.PortalDatabaseName && moduleName) {
        var clientmoduleresult = await Db.query(Db.PortalDatabaseName, `SELECT * FROM clientmodules WHERE clientname='${Db.replaceQuotes(userInAllUsers.clientname)}' AND modulename='${Db.replaceQuotes(moduleName)}';`);
        if (clientmoduleresult.rowCount < 1) return false;
        var userHasAccess = await checkUser(userInAllUsers.clientname, userInDatabase, permissionKey, readWrite);
        if (!userHasAccess) return false;
        return userInDatabase;
    } else {
        var userHasAccess = await checkUser(userInAllUsers.clientname, userInDatabase, permissionKey, readWrite);
        if (!userHasAccess) return false;
        return userInDatabase;
    }
};

async function checkUser(clientname, userInDatabase, permissionKey, readWrite) {
    // Check permission when not administrator
    if (!userInDatabase.isadmin && permissionKey && readWrite) { // in menu API no key and no readwrite is given
        // Extract the permission for the requested permission key
        var writecondition = readWrite.indexOf('w') >= 0 ? " AND canwrite=true" : "";
        var permissionresult = await Db.query(clientname, `SELECT * FROM permissions WHERE usergroupname='${Db.replaceQuotes(userInDatabase.usergroupname)}' AND key='${Db.replaceQuotes(permissionKey)}'${writecondition};`);
        return permissionresult.rowCount > 0;
    } else {
        return true;
    }
};