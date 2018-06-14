var localConfig = require('../config/localconfig.json');
var Db = require("../utils/db").Db;
var co = require("../utils/constants");
var mc = require("../config/module-config.json");

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
};

/**
 * username: (user from database) + {
 *      permissions (object with effective permissions as fieldnames and "r" or "w" as value),
 *      modules (object with modulenames as key available to the client of the user)
 * }
 */
module.exports.usercache = {};

/**
 * Retreive an user from the cache. Loads the user from the database when it is not in the cache.
 * When the user does not exist, null is returned
 * @param {String} username Name of the user to fetch
 */
async function getCachedUser(username) {
    var cacheduser = module.exports.usercache[username];
    if (cacheduser) return cacheduser;
    // User does not exist in cache, retrieve it from the database
    var queryresult = await Db.query(Db.PortalDatabaseName, `SELECT * FROM allusers WHERE name='${Db.replaceQuotes(username)}';`);
    if (queryresult.rowCount < 1) return null;
    var userfromalluserstable = queryresult.rows[0];
    var clientname = userfromalluserstable.clientname ? userfromalluserstable.clientname : Db.PortalDatabaseName;
    var userfromdatabase = await Db.getDynamicObject(clientname, "users", userfromalluserstable.name);
    if (!userfromdatabase) return null;
    // Check modules available to the client of the user
    var usermodulenames = {};
    // Distinguish between portal modules and client modules
    if (clientname !== Db.PortalDatabaseName) {
        (await Db.query(Db.PortalDatabaseName, `SELECT modulename FROM clientmodules WHERE clientname='${Db.replaceQuotes(userfromalluserstable.clientname)}';`)).rows.forEach(r => {
            usermodulenames[r.modulename] = true;
        });
    } else {
        // For portals fetch the available modules from the config
        Object.keys(mc.modules).forEach(m => {
            if (mc.modules[m].forportal) usermodulenames[m] = true;
        });
    }
    // When user is not admin, fetch permissions from database
    var result = userfromdatabase;
    // Define clientname for easy access in APIs
    result.clientname = clientname;
    result.permissions = {};
    result.modules = usermodulenames;
    if (!userfromdatabase.isadmin) {
        // User is not admin
        (await Db.query(clientname, `SELECT * FROM permissions WHERE usergroupname='${Db.replaceQuotes(userfromdatabase.usergroupname)}';`)).rows.forEach(p => {
            result.permissions[p.key] = p.canwrite ? "w" : "r";
        });
    } else {
        // User is admin
        // Collect all possible permissions from datatypes
        var allpermissions = [];
        var datatypes = await Db.getdatatypes(clientname);
        Object.values(datatypes).forEach(dt => {
            if (dt.permissionkey && usermodulenames[dt.modulename]) allpermissions.push(dt.permissionkey);
        });
        // Add constant permission keys
        Object.keys(co.permissions).forEach(p => allpermissions.push(p));
        // Define write permissions for user result
        allpermissions.forEach(p => {
            result.permissions[p] = "w"; // Admins can write in every case
        });
    }
    module.exports.usercache[username] = result;
    return result;
}

/**
 * Hilfsfunktion zum prüfen, ob ein Benutzer bestimmte Zugriffsrechte hat. Wird für Verknüpfungen
 * direkt verwendet, da dort auth() nicht als Middleware eingesetzt werden kann.
 * Das Promise liefert im resolve als Parameter den Benutzer aus der Datenbank und true oder false.
 * Direkter Aufruf: require('auth').canAccess(...);
 */
module.exports.canAccess = async(username, permissionKey, readWrite, moduleName, datatypename) => {
    var user = await getCachedUser(username);
    if (!user) return false;
    var permissionToCheck = permissionKey;
    var moduleNameToCheck = moduleName;
    // When datatypename is given, check permission for this datatype, when it is available to the user
    if (datatypename) {
        var datatype = (await Db.getdatatypes(user.clientname))[datatypename];
        if (!datatype) return false;
        permissionToCheck = datatype.permissionkey;
        moduleNameToCheck = datatype.modulename;
    }
    // Check whether the module is available to the user
    if (moduleNameToCheck && !user.modules[moduleNameToCheck]) return false;
    // When no permission key is defined, user has access in any case
    if (!permissionToCheck) return user;
    // Simply check whether the user has the requested permission.
    var permission = user.permissions[permissionToCheck];
    if (!permission || (readWrite.indexOf('w') >= 0 && permission !== "w")) return false;
    // All good here, user has access
    return user;

    // // Check user against database
    // var userresult = await Db.query(Db.PortalDatabaseName, `SELECT * FROM allusers WHERE name='${Db.replaceQuotes(username)}';`);
    // var userInAllUsers = userresult.rowCount > 0 ? userresult.rows[0] : undefined;
    // if (!userInAllUsers) return false;
    // var userInDatabase = await Db.getDynamicObject(userInAllUsers.clientname ? userInAllUsers.clientname : Db.PortalDatabaseName, "users", userInAllUsers.name);
    // userInDatabase.clientname = userInAllUsers.clientname; // Relevant for APIs
    // if (datatypename) { // Dynamic APIS do not provide permission keys directly but through datatypenames
    //     var datatype = (await Db.getdatatypes(userInAllUsers.clientname))[datatypename];
    //     if (!datatype) return false;
    //     permissionKey = datatype.permissionkey; // Use this one!
    //     moduleName = datatype.modulename; // Use this one!
    // }
    // // Check whether module is available for the client of the user, ignore portal users
    // if (userInAllUsers.clientname && userInAllUsers.clientname !== Db.PortalDatabaseName && moduleName) {
    //     var clientmoduleresult = await Db.query(Db.PortalDatabaseName, `SELECT * FROM clientmodules WHERE clientname='${Db.replaceQuotes(userInAllUsers.clientname)}' AND modulename='${Db.replaceQuotes(moduleName)}';`);
    //     if (clientmoduleresult.rowCount < 1) return false;
    //     var userHasAccess = await checkUser(userInAllUsers.clientname, userInDatabase, permissionKey, readWrite);
    //     if (!userHasAccess) return false;
    //     return userInDatabase;
    // } else {
    //     var userHasAccess = await checkUser(userInAllUsers.clientname, userInDatabase, permissionKey, readWrite);
    //     if (!userHasAccess) return false;
    //     return userInDatabase;
    // }
};

// async function checkUser(clientname, userInDatabase, permissionKey, readWrite) {
//     // Check permission when not administrator
//     if (!userInDatabase.isadmin && permissionKey && readWrite) { // in menu API no key and no readwrite is given
//         // Extract the permission for the requested permission key
//         var writecondition = readWrite.indexOf('w') >= 0 ? " AND canwrite=true" : "";
//         var permissionresult = await Db.query(clientname, `SELECT * FROM permissions WHERE usergroupname='${Db.replaceQuotes(userInDatabase.usergroupname)}' AND key='${Db.replaceQuotes(permissionKey)}'${writecondition};`);
//         return permissionresult.rowCount > 0;
//     } else {
//         return true;
//     }
// };