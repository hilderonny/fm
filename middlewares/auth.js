/**
 * Middleware for routers which checks the user credentials and access permissions.
 * Used in routers as handler chain.
 * Sets:
 * req.user = Complete user database
 * req.user.permissions = List of all permissions of the user's usergroup
 * @param key Permission key
 * @param readWrite 'r' Read permission required, 'w' Write permission required
 * @param module Name of the module the API belongs to
 */
module.exports = function(key, readWrite, module) {
    // http://stackoverflow.com/a/12737295
    return (req, res, next) => {
        var user = req.user;
        // Check whether credentials are given
        if (!user || !user._id || !require('./validateId').validateId(user._id)) {
            return res.sendStatus(403);
        }
        // Check user against database
        req.db.get('users').findOne(user._id).then((userInDatabase) => {
            if (!userInDatabase) { // User not found
                return res.sendStatus(403);
            }
            req.user = userInDatabase;
            // TODO: Check whether module is available for the client of the user, ignore portal users
            if (userInDatabase.clientId && module) {
                req.db.get('clientmodules').findOne({ clientId: userInDatabase.clientId, module: module }).then(function(clientmodule) {
                    if (!clientmodule) { // Client has no access to the module
                        return res.sendStatus(403);
                    }
                    checkUser(userInDatabase, key, readWrite, req, res, next);
                });
            } else {
                checkUser(userInDatabase, key, readWrite, req, res, next);
            }
        });
    };
};

function checkUser(userInDatabase, key, readWrite, req, res, next) {
    // Check permission when not administrator
    if (!userInDatabase.isAdmin && key && readWrite) { // in menu API no key and no readwrite is given
        // Extract the permission for the requested permission key
        var permissionToFind = { userGroupId: userInDatabase.userGroupId, key: key };
        if (readWrite.indexOf('r') >= 0) {
            permissionToFind.canRead = true;
        }
        if (readWrite.indexOf('w') >= 0) {
            permissionToFind.canWrite = true;
        }
        req.db.get('permissions').findOne(permissionToFind).then((permission) => {
            if (!permission) { // User has no permission
                return res.sendStatus(403);
            }
            next();
        });
    } else {
        next();
    }
};