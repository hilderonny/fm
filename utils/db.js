var pg = require("pg");
var localconfig = require('../config/localconfig.json');
var bcryptjs = require("bcryptjs");
var constants = require("./constants");
var fs = require("fs");
var moduleconfig = require('../config/module-config.json');

var dbprefix = process.env.POSTGRESQL_TEST_DBPREFIX  || localconfig.dbprefix || 'arrange' ; 

var Db = {

    PortalDatabaseName: "portal",

    pools: {},
    isInitialized: false,

    init: async(dropDatabase) => {
        if (!dropDatabase && Db.isInitialized) return;
        Object.keys(Db.pools).forEach((k) => {
            Db.pools[k].end();
            delete Db.pools[k];
        });
        // Define type parsing, (SELECT typname, oid FROM pg_type order by typname)
        pg.types.setTypeParser(20, (val) => { return parseInt(val); }); // bigint / int8
        pg.types.setTypeParser(1700, (val) => { return parseFloat(val); }); // numeric
        if (dropDatabase) {
            var portalDatabases = await Db.queryDirect("postgres", `SELECT * FROM pg_database WHERE datname like '${dbprefix}_%';`);
            for (var i = 0; i < portalDatabases.rowCount; i++) {
                await Db.queryDirect("postgres", `DROP DATABASE IF EXISTS ${portalDatabases.rows[i].datname};`);
            }
        }
        await Db.initPortalDatabase();
        Db.isInitialized = true;
    },

    // canWrite: async(clientname, username, datatypename) => {
    //     var result = await Db.query(clientname, `SELECT 1 FROM users LEFT JOIN permissions ON permissions.usergroup = users.usergroup WHERE users.name = '${username}' AND (users.isadmin = true OR (permissions.datatype = '${datatypename}' AND permissions.canwrite = true));`);
    //     return result.rowCount > 0;
    // },
    
    createClient: async(clientName, label) => {
        var clientDatabaseName = `${dbprefix}_${clientName}`;
        await Db.queryDirect("postgres", `CREATE DATABASE ${clientDatabaseName};`);
        await Db.query(Db.PortalDatabaseName, `INSERT INTO clients (name, label) VALUES ('${clientName}', '${label}');`);
        // Prepare client's database
        await Db.createDefaultTables(clientName);
        await Db.createDefaultClientTables(clientName);
    },

    createDefaultClientTables: async(clientname) => {
        var modulenames = Object.keys(moduleconfig.modules);
        for (var i = 0; i < modulenames.length; i++) {
            await Db.createDefaultClientTablesForModule(clientname, modulenames[i]);
        }
    },

    createDefaultClientTablesForModule: async(clientname, modulename) => {
        var clientdatatypes = moduleconfig.modules[modulename].clientdatatypes;
        if (!clientdatatypes) return;
        for (var i = 0; i < clientdatatypes.length; i++) {
            var clientdatatype = clientdatatypes[i];
            await Db.createDatatype(clientname, clientdatatype.name, clientdatatype.label, clientdatatype.plurallabel, clientdatatype.titlefield === "name", clientdatatype.icon);
            if (clientdatatype.fields) for (var j = 0; j < clientdatatype.fields.length; j++) {
                var field = clientdatatype.fields[j];
                await Db.createDatatypeField(clientname, clientdatatype.name, field.name, field.label, field.type, clientdatatype.titlefield === field.name, field.isrequired, false, field.reference);
            }
            if (clientdatatype.values) for (var j = 0; j < clientdatatype.values.length; j++) {
                await Db.insertDynamicObject(clientname, clientdatatype.name, clientdatatype.values[j]);
            }
        }
    },

    createDefaultPortalTables: async() => {
        await Db.query(Db.PortalDatabaseName, "CREATE TABLE allusers (name TEXT NOT NULL PRIMARY KEY, password TEXT, clientname TEXT NOT NULL);");
        await Db.query(Db.PortalDatabaseName, "CREATE TABLE clientmodules (clientname TEXT NOT NULL, modulename TEXT NOT NULL, PRIMARY KEY(clientname, modulename));");
        var modulenames = Object.keys(moduleconfig.modules);
        var alldatatypes = [];
        modulenames.forEach(mn => { // Portale bekommen für die Migration alle Module freigeschaltet
            if (moduleconfig.modules[mn].portaldatatypes) moduleconfig.modules[mn].portaldatatypes.forEach(pdt => {if(!alldatatypes.find(a => a.name === pdt.name)) alldatatypes.push(pdt)});
            if (moduleconfig.modules[mn].clientdatatypes) moduleconfig.modules[mn].clientdatatypes.forEach(cdt => {if(!alldatatypes.find(a => a.name === cdt.name)) alldatatypes.push(cdt)});
        })
        for (var i = 0; i < alldatatypes.length; i++) {
            var datatype = alldatatypes[i];
            await Db.createDatatype(Db.PortalDatabaseName, datatype.name, datatype.label, datatype.plurallabel, datatype.titlefield === "name", datatype.icon);
            if (datatype.fields) for (var k = 0; k < datatype.fields.length; k++) {
                var field = datatype.fields[k];
                await Db.createDatatypeField(Db.PortalDatabaseName, datatype.name, field.name, field.label, field.type, datatype.titlefield === field.name, field.isrequired, false, field.reference);
            }
            if (datatype.values) for (var k = 0; k < datatype.values.length; k++) {
                await Db.insertDynamicObject(Db.PortalDatabaseName, datatype.name, datatype.values[k]);
            }
        }
    },

    createDefaultTables: async(databaseName) => {
        await Db.query(databaseName, "CREATE TABLE datatypes (name TEXT NOT NULL PRIMARY KEY, label TEXT, plurallabel TEXT, icon TEXT);");
        await Db.query(databaseName, "CREATE TABLE datatypefields (name TEXT, label TEXT, datatypename TEXT, fieldtype TEXT, istitle BOOLEAN, isrequired BOOLEAN, reference TEXT, PRIMARY KEY (name, datatypename));");
        await Db.query(databaseName, "CREATE TABLE permissions (usergroupname TEXT NOT NULL, key TEXT NOT NULL, canwrite BOOLEAN, PRIMARY KEY (usergroupname, key));");
    },

    createDatatype: async(databaseNameWithoutPrefix, datatypename, label, plurallabel, nameistitle, icon) => {
        if ((await Db.query(databaseNameWithoutPrefix, `SELECT 1 FROM datatypes WHERE name = '${datatypename}';`)).rowCount > 0) return; // Already existing
        var labeltoinsert = label ? "'" + label + "'" : "null";
        var plurallabeltoinsert = plurallabel ? "'" + plurallabel + "'" : "null";
        var icontoinsert = icon ? "'" + icon + "'" : "null";
        await Db.query(databaseNameWithoutPrefix, "INSERT INTO datatypes (name, label, plurallabel, icon) VALUES ('" + datatypename + "', " + labeltoinsert + ", " + plurallabeltoinsert + ", " + icontoinsert + ");");
        await Db.query(databaseNameWithoutPrefix, `CREATE TABLE ${datatypename} (name TEXT PRIMARY KEY);`);
        await Db.createDatatypeField(databaseNameWithoutPrefix, datatypename, "name", "Name", constants.fieldtypes.text, nameistitle, true, true, null);
    },

    createDatatypeField: async(databaseNameWithoutPrefix, datatypename, fieldname, label, fieldtype, istitle, isrequired, doNotAddColumn, reference) => {
        if ((await Db.query(databaseNameWithoutPrefix, `SELECT 1 FROM datatypefields WHERE datatypename = '${datatypename}' AND name = '${fieldname}';`)).rowCount > 0) return; // Already existing
        var labeltoinsert = label ? "'" + label + "'" : "null";
        var referencetoinsert = reference ? "'" + reference + "'" : "null";
        await Db.query(databaseNameWithoutPrefix, "INSERT INTO datatypefields (name, label, datatypename, fieldtype, istitle, isrequired, reference) VALUES ('" + fieldname + "', " + labeltoinsert + ", '" + datatypename + "', '" + fieldtype + "', " + !!istitle + ", " + !!isrequired + ", " + referencetoinsert + ")");
        var columntype;
        switch(fieldtype) {
            case constants.fieldtypes.boolean: columntype = "BOOLEAN"; break;
            case constants.fieldtypes.datetime: columntype = "BIGINT"; break;
            case constants.fieldtypes.decimal: columntype = "NUMERIC"; break;
            case constants.fieldtypes.reference: columntype = "TEXT"; break;
            case constants.fieldtypes.text: columntype = "TEXT"; break;
            default: throw new Error(`Unknown field type '${fieldtype}'`);
        }
        if (!doNotAddColumn) await Db.query(databaseNameWithoutPrefix, `ALTER TABLE ${datatypename} ADD COLUMN ${fieldname} ${columntype};`);
    },
    
    deleteClient: async(clientname) => {
        var clientExists = (await Db.query(Db.PortalDatabaseName, `SELECT 1 FROM clients WHERE name = '${clientname}';`)).rowCount > 0;
        if (!clientExists) return false;
        var clientDatabaseName = `${dbprefix}_${clientname}`;
        await new Promise((resolve, reject) => {
            Db.getPool(clientDatabaseName).end(async() => {
                resolve();
            });
        });
        delete Db.pools[clientDatabaseName];
        await Db.queryDirect("postgres", `DROP DATABASE IF EXISTS ${clientDatabaseName};`);
        await Db.query(Db.PortalDatabaseName, `DELETE FROM clients WHERE name = '${clientname}';`);
        await Db.query(Db.PortalDatabaseName, `DELETE FROM clientmodules WHERE clientname = '${clientname}';`);
        await Db.query(Db.PortalDatabaseName, `DELETE FROM clientsettings WHERE clientname = '${clientname}';`);
        // TODO: Also delete documents of client
        return true;
    },

    // createPermission: async(userGroupName, clientName, datatype, canwrite) => {
    //     await Db.query(clientName, `INSERT INTO permissions (usergroup, datatype, canwrite) VALUES ('${userGroupName}', '${datatype}', ${canwrite}) ON CONFLICT (usergroup, datatype) DO UPDATE SET canwrite = ${canwrite};`);
    // },

    deleteDynamicObject: async(clientname, datatypename, elementname, filter) => {
        var filterstring = "";
        if (filter) {
            var filterlist = [];
            Object.keys(filter).forEach((k) => {
                var value = filter[k];
                filterlist.push(`${k}=${typeof(value) === 'string' ? "'" + value + "'" : value}`);
            });
            filterstring = " AND " + filterlist.join(" AND ");
        }
        return Db.query(clientname, `DELETE FROM ${datatypename} WHERE name='${elementname}'${filterstring};`);
    },

    deleteDynamicObjects: async(clientname, datatypename, filter) => {
        var filterlist = [];
        Object.keys(filter).forEach((k) => {
            var value = filter[k];
            filterlist.push(`${k}=${typeof(value) === 'string' ? "'" + value + "'" : value}`);
        });
        return Db.query(clientname, `DELETE FROM ${datatypename} WHERE ${filterlist.join(" AND ")};`);
    },

    // deletePermission: async(userGroupName, clientName, datatype) => {
    //     await Db.query(clientName, `DELETE FROM permissions WHERE usergroup = '${userGroupName}' AND datatype = '${datatype}';`);
    // },

    // getDataType: async(databaseNameWithoutPrefix, datatypename) => {
    //     var result = await Db.query(databaseNameWithoutPrefix, `SELECT * FROM datatypes WHERE name = '${datatypename}';`);
    //     return result.rowCount > 0 ? result.rows[0] : undefined;
    // },

    getDataTypeFields: async(databaseNameWithoutPrefix, datatypename) => {
        return (await Db.query(databaseNameWithoutPrefix, `SELECT * FROM datatypefields WHERE datatypename='${datatypename}' ORDER BY name;`)).rows;
    },

    // getDynamicObjectForEdit: async(clientname, username, datatypename, name) => {
    //     var obj = await Db.query(clientname, `SELECT * FROM ${datatypename} WHERE name = '${name}';`);
    //     if (obj.rowCount < 1) return undefined;
    //     var datatype = (await Db.query(clientname, `SELECT label FROM datatypes WHERE name = '${datatypename}';`)).rows[0];
    //     // Permission
    //     var canwrite = await Db.canWrite(clientname, username, datatypename);
    //     // Name field will not be returned because it is not changeable
    //     var fields = (await Db.query(clientname, `SELECT name, label, fieldtype, isrequired, reference FROM datatypefields WHERE datatype = '${datatypename}' AND NOT name = 'name' ORDER BY label;`)).rows;
    //     var titlefield = fields.find((f) => f.istitle);
    //     if (!titlefield) titlefield = "name";
    //     var result = { datatype: datatype, fields: fields, canwrite: canwrite, label:obj.rows[0][titlefield], obj: obj.rows[0] };
    //     // Check references
    //     var referencefields = fields.filter((f) => f.fieldtype === fieldtypes.reference && f.reference);
    //     for (var i = 0; i < referencefields.length; i++) {
    //         var rf = referencefields[i];
    //         result.obj[rf.name] = {
    //             value: result.obj[rf.name],
    //             options: await Db.getDynamicObjectsForSelect(clientname, rf.reference)
    //         };
    //     }
    //     return result;
    // },

    getDynamicObject: async(clientname, datatypename, filterorname) => {
        if ((typeof filterorname) === "string") {
            var result = await Db.query(clientname, `SELECT * FROM ${datatypename} WHERE name='${filterorname}';`);
            return result.rowCount > 0 ? result.rows[0] : undefined;
        } else {
            var result = await Db.getDynamicObjects(clientname, datatypename, filterorname);
            return result.length > 0 ? result[0] : undefined;
        }
    },

    getDynamicObjects: async(clientname, datatypename, filter) => {
        var filterstring = "";
        if (filter) {
            var filterlist = [];
            Object.keys(filter).forEach((k) => {
                var value = filter[k];
                filterlist.push(`${k}=${typeof(value) === 'string' ? "'" + value + "'" : value}`);
            });
            filterstring = " WHERE " + filterlist.join(" AND ");
        }
        return (await Db.query(clientname, `SELECT * FROM ${datatypename}${filterstring};`)).rows;
    },

    getDynamicObjectsForNames: async(clientname, datatypename, names, filter) => {
        var namestofind = names.map((n) => `'${n}'`).join(",");
        var filterstring = "";
        if (filter) {
            var filterlist = [];
            Object.keys(filter).forEach((k) => {
                var value = filter[k];
                filterlist.push(`${k}=${typeof(value) === 'string' ? "'" + value + "'" : value}`);
            });
            filterstring = " AND " + filterlist.join(" AND ");
        }
        return (await Db.query(clientname, `SELECT * FROM ${datatypename} WHERE name IN (${namestofind})${filterstring};`)).rows;
    },

    // getDynamicObjectsForList: async(clientname, username, datatypename) => {
    //     // Get icon
    //     var datatype = (await Db.query(clientname, `SELECT label, plurallabel, icon FROM datatypes WHERE name = '${datatypename}';`)).rows[0];
    //     // Get title field
    //     var titleresult = await Db.query(clientname, `SELECT name FROM datatypefields WHERE datatype = '${datatypename}' AND istitle = true ORDER BY name;`);
    //     var titlefield = titleresult.rowCount > 0 ? titleresult.rows[0].name : 'name';
    //     // Get object list
    //     var objects = (await Db.query(clientname, `SELECT name, ${titlefield} as firstline FROM ${datatypename} ORDER BY ${titlefield};`)).rows;
    //     // Permission
    //     var canwrite = await Db.canWrite(clientname, username, datatypename);
    //     return {
    //         datatype: datatype,
    //         objects: objects,
    //         canwrite: canwrite
    //     };
    // },

    // getDynamicObjectsForSelect: async(clientname, datatype) => {
    //     // Get title field
    //     var titleresult = await Db.query(clientname, `SELECT name FROM datatypefields WHERE datatype = '${datatype}' AND istitle = true ORDER BY name;`);
    //     var titlefield = titleresult.rowCount > 0 ? titleresult.rows[0].name : 'name';
    //     // Get object list
    //     var objects = (await Db.query(clientname, `SELECT name, ${titlefield} as label FROM ${datatype} ORDER BY ${titlefield};`)).rows;
    //     var list = objects.map((o) => { return {
    //         name: o.name,
    //         label: o.label
    //     }});
    //     return list;
    // },

    // getEmptyDynamicObject: async(clientname, username, datatypename) => {
    //     var datatype = (await Db.query(clientname, `SELECT label FROM datatypes WHERE name = '${datatypename}';`)).rows[0];
    //     var fields = (await Db.query(clientname, `SELECT name, label, fieldtype, isrequired, reference FROM datatypefields WHERE datatype = '${datatypename}' ORDER BY label;`)).rows;
    //     // Permission
    //     var canwrite = await Db.canWrite(clientname, username, datatypename);
    //     var result = { datatype: datatype, canwrite: canwrite, fields: fields, obj: {} };
    //     // Check references
    //     var referencefields = fields.filter((f) => f.fieldtype === fieldtypes.reference && f.reference);
    //     for (var i = 0; i < referencefields.length; i++) {
    //         var rf = referencefields[i];
    //         result.obj[rf.name] = {
    //             value: result.obj[rf.name],
    //             options: await Db.getDynamicObjectsForSelect(clientname, rf.reference)
    //         };
    //     }
    //     return result;
    // },

    getPool: (databasename) => {
        var pool = Db.pools[databasename];
        if (!pool) {
            pool = new pg.Pool({
                host: localconfig.dbhost,
                port: localconfig.dbport,
                database: databasename,
                user: localconfig.dbuser,
                password: localconfig.dbpassword
            });
            Db.pools[databasename] = pool;
        }
        return pool;
    },

    initPortalDatabase: async() => {
        var portalDatabaseName = `${dbprefix}_${Db.PortalDatabaseName}`;
        // Create portal database with tables clients and allusers when it does not exist
        if ((await Db.queryDirect("postgres", `SELECT 1 FROM pg_database WHERE datname = '${portalDatabaseName}';`)).rowCount === 0) {
            await Db.queryDirect("postgres", `CREATE DATABASE ${portalDatabaseName};`);
            await Db.createDefaultTables(Db.PortalDatabaseName); // Create tables users, usergroups and permissions
            await Db.createDefaultPortalTables();
        }
        // When portal admin locked out, recreate it
        if (localconfig.recreatePortalAdmin) {
            var adminUserGroupName = "admin";
            var adminUserName = "admin";
            var adminUserPassword = "admin";
            await Db.queryDirect(portalDatabaseName, `DELETE FROM permissions WHERE usergroupname = '${adminUserGroupName}';`);
            await Db.queryDirect(portalDatabaseName, `DELETE FROM allusers WHERE name = '${adminUserName}';`);
            await Db.queryDirect(portalDatabaseName, `DELETE FROM users WHERE usergroupname = '${adminUserGroupName}';`);
            await Db.queryDirect(portalDatabaseName, `DELETE FROM usergroups WHERE name = '${adminUserGroupName}';`);
            await Db.queryDirect(portalDatabaseName, `INSERT INTO usergroups (name, label) VALUES('${adminUserGroupName}', '${adminUserGroupName}');`);
            var hashedPassword = bcryptjs.hashSync(adminUserPassword);
            await Db.queryDirect(portalDatabaseName, `INSERT INTO allusers (name, password, clientname) VALUES('${adminUserName}', '${hashedPassword}', '${Db.PortalDatabaseName}');`);
            await Db.queryDirect(portalDatabaseName, `INSERT INTO users (name, password, usergroupname, isadmin) VALUES('${adminUserName}', '${hashedPassword}', '${adminUserGroupName}', true);`);
            localconfig.recreatePortalAdmin = false;
            fs.writeFileSync("./config/localconfig.json", JSON.stringify(localconfig, null, 4)); // Relative to main entry point
        }
    },

    insertDynamicObject: async(clientname, datatypename, element) => {
        var fields = await Db.getDataTypeFields(clientname, datatypename);
        var fieldMap = {};
        var keys = Object.keys(element);
        fields.forEach((f) => { 
            fieldMap[f.name] = f;
            if (f.isrequired && (keys.indexOf(f.name) < 0 || element[f.name] === undefined)) throw new Error(`Required field '${f.name}' is missing`);
        });
        var values = keys.map((k) => {
            var value = element[k];
            var field = fieldMap[k];
            if (!field) throw new Error(`Unknown field '${k}'`);
            var result;
            switch (field.fieldtype) {
                case constants.fieldtypes.boolean: result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.datetime: result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.decimal: result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.reference: result = (value === undefined || value === null) ? "null" : `'${value}'`; break;
                case constants.fieldtypes.text: result = (value === undefined || value === null) ? "null" : `'${value}'`; break;
                default: throw new Error(`Unknown field type '${field.fieldtype}'`);
            }
            return result;
        });
        var statement = `INSERT INTO ${datatypename} (${keys.join(',')}) VALUES (${values.join(',')});`;
        return Db.query(clientname, statement);
    },

    // loginUser: async(username, password) => {
    //     var result = await Db.query(Db.PortalDatabaseName, `SELECT password, clientname FROM allusers WHERE name = '${username}';`);
    //     if (result.rowCount < 1) return undefined;
    //     var user = result.rows[0];
    //     if (!compareSync(password, user.password)) return undefined;
    //     return {
    //         username: username,
    //         clientname: user.clientname
    //     };
    // },
        
    query: async(databaseNameWithoutPrefix, query) => {
        return Db.queryDirect(`${dbprefix}_${databaseNameWithoutPrefix}`, query);
    },

    queryDirect: async(databasename, query) => {
        // console.log("\x1b[1:36m%s\x1b[0m", databasename + ": " + query); // Color: https://stackoverflow.com/a/41407246, http://bluesock.org/~willkg/dev/ansi.html
        var pool = Db.getPool(databasename);
        var client = await pool.connect();
        var result = undefined;
        try {
            result = await client.query(query);
        } finally {
            client.release();
        }
        return result;
    },

    updateDynamicObject: async(clientname, datatypename, elementname, element, filter) => {
        var fields = await Db.getDataTypeFields(clientname, datatypename);
        var fieldMap = {};
        fields.forEach((f) => { fieldMap[f.name] = f; });
        var keys = Object.keys(element);
        var values = keys.map((k) => {
            var value = element[k];
            var field = fieldMap[k];
            if (!field) throw new Error(`Unknown field '${k}'`);
            var result;
            switch (field.fieldtype) {
                case constants.fieldtypes.boolean: result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.datetime: result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.decimal: result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.reference: result = (value === undefined || value === null) ? "null" : `'${value}'`; break;
                case constants.fieldtypes.text: result = (value === undefined || value === null) ? "null" : `'${value}'`; break;
                default: throw new Error(`Unknown field type '${field.fieldtype}'`);
            }
            return `${k}=${result}`;
        });
        var filterstring = "";
        if (filter) {
            var filterlist = [];
            Object.keys(filter).forEach((k) => {
                var value = filter[k];
                filterlist.push(`${k}=${typeof(value) === 'string' ? "'" + value + "'" : value}`);
            });
            filterstring = " AND " + filterlist.join(" AND ");
        }
        var statement = `UPDATE ${datatypename} SET ${values.join(',')} WHERE name='${elementname}'${filterstring};`;
        return Db.query(clientname, statement);
    }
    
}

module.exports.Db = Db;