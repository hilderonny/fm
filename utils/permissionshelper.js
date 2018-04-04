var Db = require("./db").Db;
var ch = require('./configHelper');

var ph = {
    getpermissionsforuser: async(user) => {
        var clientname = user.clientname;
        var permissionKeysForClient = await ch.getAvailablePermissionKeysForClient(clientname);
        // Bei Administratoren werden alle Permissions einfach zurück gegeben
        if (user.isadmin) {
            var adminPermissions = permissionKeysForClient.map((permissionKey) => {
                return { key:permissionKey, canRead:true, canWrite:true, clientId:clientname, userGroupId: user.usergroupname };
            });
            return adminPermissions;
        } else {
            var permissions = (await Db.query(clientname, `SELECT * FROM permissions WHERE usergroupname = '${Db.replaceQuotes(user.usergroupname)}' AND key IN (${permissionKeysForClient.map((k) => `'${Db.replaceQuotes(k)}'`).join(',')});`)).rows;
            var mappedPermissions = permissions.map((p) => { return {
                key: p.key,
                canRead: true,
                canWrite: p.canwrite,
                clientId:clientname,
                userGroupId: user.usergroupname
            }});
            return mappedPermissions;
        }
    }
}

module.exports = ph;