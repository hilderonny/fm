var pg = require("pg");
var localconfig = require('../config/localconfig.json');
var bcryptjs = require("bcryptjs");
var constants = require("./constants");
var fs = require("fs");
var moduleconfig = require('../config/module-config.json');
var path = require("path");
var JSZip = require("jszip");
var rimraf = require("rimraf");
var decompress = require("decompress");

var dbprefix = process.env.POSTGRESQL_TEST_DBPREFIX  || localconfig.dbprefix || 'arrange' ; 

var Db = {

    PortalDatabaseName: "portal",

    pools: {},
    isInitialized: false,

    /**
     * Performs a backup of all relevant databases each time the server starts into /backup/<timestamp>.zip
     */
    backup: async() => {
        // collect database names
        var databases = (await Db.queryDirect("postgres", `SELECT datname FROM pg_database WHERE datname like '${Db.replaceQuotes(dbprefix)}_%';`)).rows;
        if (databases.length < 1) return;
        console.log("CREATING BACKUP ...");
        var zip = new JSZip();
        // create backup directory
        var backupdir = path.join(__dirname, "../backup");
        var timestamp = Date.now().toString();
        var timestampdir = path.join(backupdir, timestamp);
        if (!fs.existsSync(backupdir)) fs.mkdirSync(backupdir);
        if (!fs.existsSync(timestampdir)) fs.mkdirSync(timestampdir);        
        // dump all relevant databases
        for (var i = 0; i < databases.length; i++) {
            var databasename = databases[i].datname;
            var tables = (await Db.queryDirect(databasename, "SELECT table_name FROM information_schema.tables WHERE table_schema='public';")).rows;
            var databasedir = path.join(timestampdir, databasename);
            if (!fs.existsSync(databasedir)) fs.mkdirSync(databasedir);        
            for (var j = 0; j < tables.length; j++) {
                var tablename = tables[j].table_name;
                var outputfile = path.join(databasedir, tablename);
                await Db.queryDirect(databasename, `COPY ${tablename} TO '${outputfile}';`);
                zip.file(path.join(databasename, tablename).replace(/\\/g, "/"), fs.readFileSync(outputfile));
            }
        }
        await new Promise((resolve, reject) => {
            var zipfilename = path.join(backupdir, `${timestamp}.zip`);
            zip.generateNodeStream({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } }).pipe(fs.createWriteStream(zipfilename)).on("finish", resolve);
        });
        rimraf.sync(timestampdir);
        console.log("BACKUP FINISHED.");
    },
    
    createClient: async(clientName, label, donotaddtoclientstableofportal) => {
        var clientDatabaseName = Db.replaceQuotesAndRemoveSemicolon(`${dbprefix}_${clientName}`);
        if ((await Db.queryDirect("postgres", `SELECT 1 FROM pg_database WHERE datname = '${clientDatabaseName}';`)).rowCount === 0) {
            await Db.queryDirect("postgres", `CREATE DATABASE ${clientDatabaseName};`);
        }
        if (!donotaddtoclientstableofportal) await Db.query(Db.PortalDatabaseName, `INSERT INTO clients (name, label) VALUES ('${Db.replaceQuotes(clientName)}', '${Db.replaceQuotes(label)}');`);
        // Prepare client's database
        await Db.createDefaultTables(clientName);
        await Db.createDefaultClientTables(clientName);
    },

    createDefaultClientTables: async(clientname) => {
        await Db.updateRecordTypesForDatabase(clientname, Db.getClientDataTypesFromConfig());
    },

    createDefaultPortalTables: async() => {
        await Db.query(Db.PortalDatabaseName, "DROP TABLE IF EXISTS allusers;");
        await Db.query(Db.PortalDatabaseName, "DROP TABLE IF EXISTS clientmodules;");
        await Db.query(Db.PortalDatabaseName, "CREATE TABLE allusers (name TEXT NOT NULL PRIMARY KEY, password TEXT, clientname TEXT NOT NULL);");
        await Db.query(Db.PortalDatabaseName, "CREATE TABLE clientmodules (clientname TEXT NOT NULL, modulename TEXT NOT NULL, PRIMARY KEY(clientname, modulename));");
        await Db.updateRecordTypesForDatabase(Db.PortalDatabaseName, Db.getPortalDataTypesFromConfig());
    },

    createDefaultTables: async(databaseName) => {
        await Db.query(databaseName, "DROP TABLE IF EXISTS datatypes;");
        await Db.query(databaseName, "DROP TABLE IF EXISTS datatypefields;");
        await Db.query(databaseName, "DROP TABLE IF EXISTS permissions;");
        await Db.query(databaseName, "CREATE TABLE datatypes (name TEXT NOT NULL PRIMARY KEY, label TEXT, plurallabel TEXT, icon TEXT, lists TEXT[], ispredefined BOOLEAN);");
        await Db.query(databaseName, "CREATE TABLE datatypefields (name TEXT, label TEXT, datatypename TEXT, fieldtype TEXT, istitle BOOLEAN, isrequired BOOLEAN, reference TEXT, formula TEXT, formulaindex NUMERIC, ispredefined BOOLEAN, isnullable BOOLEAN, PRIMARY KEY (name, datatypename));");
        await Db.query(databaseName, "CREATE TABLE permissions (usergroupname TEXT NOT NULL, key TEXT NOT NULL, canwrite BOOLEAN, PRIMARY KEY (usergroupname, key));");
    },

    createDatatype: async(databasename, datatypename, label, plurallabel, nameistitle, icon, lists, permissionkey, modulename, canhaverelations) => {
        var dtn = Db.replaceQuotesAndRemoveSemicolon(datatypename);
        if ((await Db.query(databasename, `SELECT 1 FROM datatypes WHERE name = '${dtn}';`)).rowCount > 0) return; // Already existing
        var labeltoinsert = label ? "'" + Db.replaceQuotes(label) + "'" : "null";
        var plurallabeltoinsert = plurallabel ? "'" + Db.replaceQuotes(plurallabel) + "'" : "null";
        var icontoinsert = icon ? "'" + Db.replaceQuotes(icon) + "'" : "null";
        var liststoinsert = lists ? "'{" + lists.map(li => `"${Db.replaceQuotes(li)}"`).join(",") + "}'" : "'{}'";
        var permissionkeytoinsert = permissionkey ? "'" + Db.replaceQuotes(permissionkey) + "'" : "null";
        var modulenametoinsert = modulename ? "'" + Db.replaceQuotes(modulename) + "'" : "null";
        await Db.query(databasename, `INSERT INTO datatypes (name, label, plurallabel, icon, lists, permissionkey, modulename, canhaverelations) VALUES ('${dtn}', ${labeltoinsert}, ${plurallabeltoinsert}, ${icontoinsert}, ${liststoinsert}, ${permissionkeytoinsert}, ${modulenametoinsert}, ${!!canhaverelations});`);
        // Drop an existing table. When a datatype is to be created then it should not exist before
        await Db.query(databasename, `DROP TABLE IF EXISTS ${dtn};`);
        await Db.query(databasename, `CREATE TABLE ${dtn} (name TEXT PRIMARY KEY);`);
        // Force update of cache in the next request
        delete Db.datatypes;
        await Db.createDatatypeField(databasename, datatypename, "name", "Name", constants.fieldtypes.text, nameistitle, true, true, null);
    },

    createDatatypeField: async(databasename, datatypename, fieldname, label, fieldtype, istitle, isrequired, doNotAddColumn, reference, formula, formulaindex, isnullable) => {
        var dtn = Db.replaceQuotesAndRemoveSemicolon(datatypename);
        var fn = Db.replaceQuotesAndRemoveSemicolon(fieldname);
        if ((await Db.query(databasename, `SELECT 1 FROM datatypefields WHERE datatypename = '${dtn}' AND name = '${fn}';`)).rowCount > 0) return; // Already existing
        var labeltoinsert = label ? "'" + Db.replaceQuotes(label) + "'" : "null";
        var referencetoinsert = reference ? "'" + Db.replaceQuotes(reference) + "'" : "null";
        var formulatoinsert = formula ? "'" + Db.replaceQuotes(JSON.stringify(formula)) + "'" : "null";
        var formulaindextoinsert = formulaindex ? parseInt(formulaindex) : 0;
        await Db.query(databasename, `INSERT INTO datatypefields (name, label, datatypename, fieldtype, istitle, isrequired, reference, formula, formulaindex, isnullable) VALUES ('${fn}', ${labeltoinsert}, '${dtn}', '${Db.replaceQuotes(fieldtype)}', ${!!istitle}, ${!!isrequired}, ${referencetoinsert}, ${formulatoinsert}, ${formulaindextoinsert}, ${!!isnullable});`);
        var columntype;
        switch(fieldtype) {
            case constants.fieldtypes.boolean: columntype = "BOOLEAN"; break;
            case constants.fieldtypes.datetime: columntype = "BIGINT"; break;
            case constants.fieldtypes.decimal: columntype = "NUMERIC"; break;
            case constants.fieldtypes.formula: columntype = "NUMERIC"; break;
            case constants.fieldtypes.reference: columntype = "TEXT"; break;
            case constants.fieldtypes.text: columntype = "TEXT"; break;
            default: throw new Error(`Unknown field type '${fieldtype}'`);
        }
        if (!doNotAddColumn) {
            // Drop an existing column to recreate it with possibly another datatype. When a datatype field is to be created then it should not exist before
            await Db.query(databasename, `ALTER TABLE ${dtn} DROP COLUMN IF EXISTS ${fn};`);
            await Db.query(databasename, `ALTER TABLE ${dtn} ADD COLUMN ${fn} ${Db.replaceQuotesAndRemoveSemicolon(columntype)};`);
        }
        // Force update of cache in the next request
        delete Db.datatypes;
    },
    
    deleteClient: async(clientname) => {
        var clientExists = (await Db.query(Db.PortalDatabaseName, `SELECT 1 FROM clients WHERE name = '${Db.replaceQuotes(clientname)}';`)).rowCount > 0;
        if (!clientExists) return false;
        var clientDatabaseName = `${dbprefix}_${clientname}`;
        await new Promise((resolve, reject) => {
            Db.getPool(clientDatabaseName).end(async() => {
                resolve();
            });
        });
        delete Db.pools[clientDatabaseName];
        await Db.queryDirect("postgres", `DROP DATABASE IF EXISTS ${Db.replaceQuotesAndRemoveSemicolon(clientDatabaseName)};`);
        await Db.query(Db.PortalDatabaseName, `DELETE FROM clients WHERE name = '${Db.replaceQuotes(clientname)}';`);
        await Db.query(Db.PortalDatabaseName, `DELETE FROM clientmodules WHERE clientname = '${Db.replaceQuotes(clientname)}';`);
        await Db.query(Db.PortalDatabaseName, `DELETE FROM clientsettings WHERE clientname = '${Db.replaceQuotes(clientname)}';`);
        // TODO: Also delete documents of client
        return true;
    },

    deleteDynamicObject: async(clientname, datatypename, elementname, filter) => {
        var filterstring = filter ? " AND " + Db.getFilterString(filter) : "";
        return Db.query(clientname, `DELETE FROM ${Db.replaceQuotesAndRemoveSemicolon(datatypename)} WHERE name='${Db.replaceQuotes(elementname)}'${filterstring};`);
    },

    deleteDynamicObjects: async(clientname, datatypename, filter) => {
        var filterstring = Db.getFilterString(filter);
        return Db.query(clientname, `DELETE FROM ${Db.replaceQuotesAndRemoveSemicolon(datatypename)} WHERE ${filterstring};`);
    },

    deleteRecordType: async(databasename, recordtypename) => {
        await Db.query(databasename, `DELETE FROM datatypefields WHERE datatypename = '${Db.replaceQuotes(recordtypename)}';`);
        await Db.query(databasename, `DELETE FROM datatypes WHERE name = '${Db.replaceQuotes(recordtypename)}';`);
        await Db.query(databasename, `DROP TABLE IF EXISTS ${Db.replaceQuotesAndRemoveSemicolon(recordtypename)};`);
        // Force update of cache in the next request
        delete Db.datatypes;
    },

    deleteRecordTypeField: async(databasename, recordtypename, fieldname) => {
        await Db.query(databasename, `DELETE FROM datatypefields WHERE name = '${Db.replaceQuotes(fieldname)}' and datatypename = '${Db.replaceQuotes(recordtypename)}';`);
        await Db.query(databasename, `ALTER TABLE ${Db.replaceQuotesAndRemoveSemicolon(recordtypename)} DROP COLUMN IF EXISTS ${Db.replaceQuotesAndRemoveSemicolon(fieldname)};`);
        // Force update of cache in the next request
        delete Db.datatypes;
    },

    getdatatypes: async(databaseNameWithoutPrefix) => {
        if (!Db.datatypes) {
            Db.datatypes = {};
            var clientnames = (await Db.query(Db.PortalDatabaseName, "SELECT name FROM clients;")).rows.map(c => c.name);
            clientnames.push(Db.PortalDatabaseName);
            for (var i = 0; i < clientnames.length; i++) {
                var clientname = clientnames[i];
                var clientdatatypes = {};
                Db.datatypes[clientname] = clientdatatypes;
                var datatypes = (await Db.query(clientname, `SELECT * FROM datatypes;`)).rows;
                datatypes.forEach(dt => {
                    dt.fields = {};
                    clientdatatypes[dt.name] = dt;
                });
                var fields = (await Db.query(clientname, `SELECT * FROM datatypefields;`)).rows;
                fields.forEach(f => clientdatatypes[f.datatypename].fields[f.name] = f);
            }
        }
        return Db.datatypes[databaseNameWithoutPrefix];
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
        var availablefieldnames = (await Db.query(clientname, `SELECT name FROM datatypefields WHERE datatypename = '${Db.replaceQuotes(datatypename)}';`)).rows.map(f => Db.replaceQuotesAndRemoveSemicolon(f.name));
        if (availablefieldnames.length < 1) return undefined; // No fields defined
        if ((typeof filterorname) === "string") {
            var result = await Db.query(clientname, `SELECT ${availablefieldnames.join(",")} FROM ${Db.replaceQuotesAndRemoveSemicolon(datatypename)} WHERE name='${Db.replaceQuotes(filterorname)}';`);
            return result.rowCount > 0 ? result.rows[0] : undefined;
        } else {
            var result = await Db.getDynamicObjects(clientname, datatypename, filterorname);
            return result.length > 0 ? result[0] : undefined;
        }
    },

    getDynamicObjects: async(clientname, datatypename, filter) => {
        var availablefieldnames = (await Db.query(clientname, `SELECT name FROM datatypefields WHERE datatypename = '${Db.replaceQuotes(datatypename)}';`)).rows.map(f => Db.replaceQuotesAndRemoveSemicolon(f.name));
        if (availablefieldnames.length < 1) return []; // No fields defined
        var filterstring = filter && Object.keys(filter).length > 0 ? " WHERE " + Db.getFilterString(filter) : "";
        return (await Db.query(clientname, `SELECT ${availablefieldnames.join(",")} FROM ${Db.replaceQuotesAndRemoveSemicolon(datatypename)}${filterstring};`)).rows;
    },

    getDynamicObjectsForNames: async(clientname, datatypename, names, filter) => {
        var namestofind = names.map((n) => `'${Db.replaceQuotes(n)}'`).join(",");
        var filterstring = filter ? " AND " + Db.getFilterString(filter) : "";
        return (await Db.query(clientname, `SELECT * FROM ${Db.replaceQuotesAndRemoveSemicolon(datatypename)} WHERE name IN (${namestofind})${filterstring};`)).rows;
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

    getFilterString(filter) {
        var filterlist = [];
        Object.keys(filter).forEach((k) => {
            var value = filter[k];
            k = Db.replaceQuotesAndRemoveSemicolon(k);
            try {
                var parsedvalue = JSON.parse(value); // Maybe there is an array?
                if (Array.isArray(parsedvalue)) {
                    // Handle "forIds"
                    filterlist.push(`${k} IN (${parsedvalue.map(v => `'${Db.replaceQuotes(v)}'`).join(",")})`);
                    return;
                }
            } catch(error) { } // Ignore parser errors
            var t = typeof(value);
            switch(t) {
                case "string": filterlist.push(`${k} LIKE '${Db.replaceQuotes(value)}'`); break;
                case "number": filterlist.push(`${k}=${value}`); break;
                case "boolean": filterlist.push(`${k}=${value}`); break;
                default: throw new Error(`Type ${t} cannot be used.`);
            }
        });
        return filterlist.join(" AND ");
    },

    getClientDataTypesFromConfig: () => {
        return [].concat.apply([], Object.keys(moduleconfig.modules).map(k => {
            var datatypes = moduleconfig.modules[k].clientdatatypes;
            if (datatypes && datatypes.length) datatypes.forEach(dt => dt.modulename = k);
            return datatypes;
        })).filter(a=>a);
    },

    getparentrelationstructure: async(clientname, recordtypename, entityname) => {
        var relationsquery = `
        WITH RECURSIVE get_path(datatype1name, name1, datatype2name, name2, depth) AS (
            (SELECT datatype1name, name1, datatype2name, name2, 0 FROM relations WHERE relationtypename = 'parentchild')
            UNION
            (SELECT relations.datatype1name, relations.name1, get_path.datatype2name, get_path.name2, get_path.depth + 1 FROM relations JOIN get_path on get_path.name1 = relations.name2 WHERE relationtypename = 'parentchild')
        )
        SELECT datatype1name, name1, depth FROM get_path WHERE datatype2name = '${Db.replaceQuotes(recordtypename)}' AND name2 = '${Db.replaceQuotes(entityname)}';
        `;
        return (await Db.query(clientname, relationsquery)).rows;
    },

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

    getPortalDataTypesFromConfig: () => {
        return [].concat.apply([], Object.keys(moduleconfig.modules).map(k => {
            var datatypes = moduleconfig.modules[k].portaldatatypes;
            if (datatypes && datatypes.length) datatypes.forEach(dt => dt.modulename = k);
            return datatypes;
        })).filter(a=>a); // See https://stackoverflow.com/a/10865042
    },

    init: async() => {
        if (Db.isInitialized) return;
        console.log(`Initializing database with prefix "${dbprefix}".`);
        Object.keys(Db.pools).forEach((k) => {
            Db.pools[k].end();
            delete Db.pools[k];
        });
        // Backup
        // await Db.backup();
        // Define type parsing, (SELECT typname, oid FROM pg_type order by typname)
        pg.types.setTypeParser(20, (val) => { return parseInt(val); }); // bigint / int8
        pg.types.setTypeParser(1700, (val) => { return parseFloat(val); }); // numeric
        // { // DANGEROUS! Enable this only if you know what you do!
        //     var portalDatabases = await Db.queryDirect("postgres", `SELECT * FROM pg_database WHERE datname like '${Db.replaceQuotes(dbprefix)}_%';`);
        //     for (var i = 0; i < portalDatabases.rowCount; i++) {
        //         await Db.queryDirect("postgres", `DROP DATABASE IF EXISTS ${Db.replaceQuotesAndRemoveSemicolon(portalDatabases.rows[i].datname)};`);
        //     }
        // }
        await Db.initPortalDatabase();
        await Db.updateRecordTypes();
        // Restore
        // await Db.restore(path.join(__dirname, "../backup/1522059308260.zip"), "arrange");
        // Prepare caches for better performance
        Db.isInitialized = true;
    },

    initPortalDatabase: async() => {
        var portalDatabaseName = `${dbprefix}_${Db.PortalDatabaseName}`;
        var recreateportaladmin = localconfig.recreatePortalAdmin;
        // Create portal database with tables clients and allusers when it does not exist
        if ((await Db.queryDirect("postgres", `SELECT 1 FROM pg_database WHERE datname = '${Db.replaceQuotes(portalDatabaseName)}';`)).rowCount === 0) {
            // Portal database doea not exist, maybe fresh installation
            recreateportaladmin = true; // We need this on new installations
            await Db.queryDirect("postgres", `CREATE DATABASE ${Db.replaceQuotesAndRemoveSemicolon(portalDatabaseName)};`);
            await Db.createDefaultTables(Db.PortalDatabaseName); // Create tables users, usergroups and permissions
            await Db.createDefaultPortalTables();
        }
        // When portal admin locked out, recreate it
        if (recreateportaladmin) {
            var adminUserGroupName = "admin";
            var adminUserName = "admin";
            var adminUserPassword = "admin";
            await Db.queryDirect(portalDatabaseName, `DELETE FROM permissions WHERE usergroupname = '${Db.replaceQuotes(adminUserGroupName)}';`);
            await Db.queryDirect(portalDatabaseName, `DELETE FROM allusers WHERE name = '${Db.replaceQuotes(adminUserName)}';`);
            await Db.queryDirect(portalDatabaseName, `DELETE FROM users WHERE usergroupname = '${Db.replaceQuotes(adminUserGroupName)}';`);
            await Db.queryDirect(portalDatabaseName, `DELETE FROM usergroups WHERE name = '${Db.replaceQuotes(adminUserGroupName)}';`);
            await Db.queryDirect(portalDatabaseName, `INSERT INTO usergroups (name, label) VALUES('${Db.replaceQuotes(adminUserGroupName)}', '${Db.replaceQuotes(adminUserGroupName)}');`);
            var hashedPassword = bcryptjs.hashSync(adminUserPassword);
            await Db.queryDirect(portalDatabaseName, `INSERT INTO allusers (name, password, clientname) VALUES('${Db.replaceQuotes(adminUserName)}', '${Db.replaceQuotes(hashedPassword)}', '${Db.replaceQuotes(Db.PortalDatabaseName)}');`);
            await Db.queryDirect(portalDatabaseName, `INSERT INTO users (name, password, usergroupname, isadmin) VALUES('${Db.replaceQuotes(adminUserName)}', '${Db.replaceQuotes(hashedPassword)}', '${Db.replaceQuotes(adminUserGroupName)}', true);`);
            localconfig.recreatePortalAdmin = false;
            fs.writeFileSync("./config/localconfig.json", JSON.stringify(localconfig, null, 4)); // Relative to main entry point
        }
    },

    insertDynamicObject: async(clientname, datatypename, element) => {
        var fields = (await Db.query(clientname, `SELECT * FROM datatypefields WHERE datatypename = '${Db.replaceQuotes(datatypename)}';`)).rows;
        var fieldMap = {};
        var keys = Object.keys(element);
        fields.forEach((field) => { 
            fieldMap[field.name] = field;
            if (field.isrequired && (keys.indexOf(field.name) < 0 || element[field.name] === undefined)) throw new Error(`Required field '${field.name}' is missing`);
        });
        var values = keys.map((k) => {
            var value = element[k];
            var field = fieldMap[k];
            if (!field) throw new Error(`Unknown field '${k}'`);
            var result;
            switch (field.fieldtype) {
                case constants.fieldtypes.boolean: if (value !== undefined && value !== null && typeof(value) !== "boolean") throw new Error(`Value type ${typeof(value)} not allowed for field type boolean`); result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.datetime: if (value !== undefined && value !== null && typeof(value) !== "number") throw new Error(`Value type ${typeof(value)} not allowed for field type datetime`); result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.decimal: if (value !== undefined && value !== null && typeof(value) !== "number") throw new Error(`Value type ${typeof(value)} not allowed for field type decimal`); result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.reference: result = (value === undefined || value === null) ? "null" : `'${Db.replaceQuotes(value)}'`; break;
                case constants.fieldtypes.text: result = (value === undefined || value === null) ? "null" : `'${Db.replaceQuotes(value)}'`; break;
                default: throw new Error(`Unknown field type '${field.fieldtype}'`);
            }
            return result;
        });
        var statement = `INSERT INTO ${Db.replaceQuotesAndRemoveSemicolon(datatypename)} (${keys.map(k => Db.replaceQuotesAndRemoveSemicolon(k)).join(',')}) VALUES (${values.join(',')}) ON CONFLICT DO NOTHING;`; // Ignore duplicate names. Can happen on startup when default values are (re-)inserted
        return Db.query(clientname, statement);
    },

    replaceQuotes: (str) => {
        return str && typeof(str) === "string" ? str.replace(/'/g, "''") : str;
    },

    replaceQuotesAndRemoveSemicolon: (str) => {
        return str && typeof(str) === "string" ? Db.replaceQuotes(str).replace(/;/g, "") : str;
    },

    restore: async(fullzipfilepath, backupdatabaseprefix) => {
        console.log(`Restoring databases from ${fullzipfilepath} ...`);
        var extractpath = fullzipfilepath.substring(0, fullzipfilepath.lastIndexOf("."));
        await decompress(fullzipfilepath, extractpath);
        var databasefoldernames = fs.readdirSync(extractpath);
        var existingdatabasenames = (await Db.queryDirect("postgres", `SELECT * FROM pg_database WHERE datname like '${Db.replaceQuotes(dbprefix)}_%';`)).rows.map(d => d.datname);
        for (var i = 0; i < databasefoldernames.length; i++) {
            var databasefoldername = databasefoldernames[i];
            var clientname = databasefoldername.substring(backupdatabaseprefix.length + 1);
            var databasefolder = path.join(extractpath, databasefoldername);
            var tablenames = fs.readdirSync(databasefolder);
            for (var j = 0; j < tablenames.length; j++) {
                var tablename = Db.replaceQuotesAndRemoveSemicolon(tablenames[j]);
                var filename = path.join(databasefolder, tablename);
                var databaseexists = existingdatabasenames.find(d => d === `${dbprefix}_${clientname}`);
                if (databaseexists) {
                    var tableexists = (await Db.query(clientname, `SELECT 1 FROM information_schema.tables WHERE table_name='${Db.replaceQuotes(tablename)}';`)).rowCount > 0;
                    if (tableexists) {
                        await Db.query(clientname, `DELETE FROM ${tablename};`);
                        await Db.query(clientname, `COPY ${tablename} FROM '${filename}';`);
                    }
                } else {
                    await Db.createClient(clientname, clientname, true); // The clients table is restored from the backup so do not add the new client here
                    await Db.query(clientname, `COPY ${tablename} FROM '${filename}';`);
                    existingdatabasenames.push(`${dbprefix}_${clientname}`);
                }
            }
            // Cleanup record types
            var existingtablenames = (await Db.query(clientname, "SELECT table_name FROM information_schema.tables WHERE table_schema='public';")).rows.map(r => r.table_name);
            var existingrecordtypenames = (await Db.query(clientname, `SELECT name FROM datatypes;`)).rows.map(rt => rt.name);
            for (var j = 0; j < existingrecordtypenames.length; j++) {
                var existingrecordtypename = existingrecordtypenames[j];
                if (existingtablenames.indexOf(existingrecordtypename) < 0) {
                    await Db.deleteRecordType(clientname, existingrecordtypename);
                }
            }
            
        }
        await new Promise((resolve, reject) => {
            rimraf(extractpath, resolve);
        });
        console.log(`Restoring finished.`);
    },
            
    query: async(databaseNameWithoutPrefix, query) => {
        return Db.queryDirect(`${dbprefix}_${databaseNameWithoutPrefix}`, query);
    },

    queryDirect: async(databasename, query) => {
        // console.log("\x1b[1:36m%s\x1b[0m", databasename + ": " + query); // Color: https://stackoverflow.com/a/41407246, http://bluesock.org/~willkg/dev/ansi.html
        var pool = Db.getPool(Db.replaceQuotesAndRemoveSemicolon(databasename)); // Sicher ist sicher
        var client = await pool.connect();
        var result = undefined;
        try {
            result = await client.query(query);
        } catch(error) {
            console.log("\x1b[1:31m%s\x1b[0m", error);
        } finally {
            client.release();
        }
        return result;
    },

    updateDynamicObject: async(clientname, datatypename, elementname, element, filter) => {
        var fieldMap = {};
        (await Db.query(clientname, `SELECT * FROM datatypefields WHERE datatypename = '${Db.replaceQuotes(datatypename)}';`)).rows.forEach(f => fieldMap[f.name] = f);
        var keys = Object.keys(element);
        var values = keys.map(k => {
            var value = element[k];
            var field = fieldMap[k];
            if (!field) throw new Error(`Unknown field '${k}'`);
            var result;
            switch (field.fieldtype) {
                case constants.fieldtypes.boolean: if (value !== undefined && value !== null && typeof(value) !== "boolean") throw new Error(`Value type ${typeof(value)} not allowed for field type boolean`); result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.datetime: if (value !== undefined && value !== null && typeof(value) !== "number") throw new Error(`Value type ${typeof(value)} not allowed for field type datetime`); result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.decimal: if (value !== undefined && value !== null && typeof(value) !== "number") throw new Error(`Value type ${typeof(value)} not allowed for field type decimal`); result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.reference: result = (value === undefined || value === null) ? "null" : `'${Db.replaceQuotes(value)}'`; break;
                case constants.fieldtypes.text: result = (value === undefined || value === null) ? "null" : `'${Db.replaceQuotes(value)}'`; break;
                case constants.fieldtypes.formula: return null; // Ignore formula updates, they are calculated
                default: throw new Error(`Unknown field type '${field.fieldtype}'`);
            }
            return `${k}=${result}`;
        }).filter(k => k !== null);
        var filterstring = filter ? " AND " + Db.getFilterString(filter) : "";
        var statement = `UPDATE ${Db.replaceQuotesAndRemoveSemicolon(datatypename)} SET ${values.join(',')} WHERE name='${Db.replaceQuotes(elementname)}'${filterstring};`;
        return Db.query(clientname, statement);
    },

    updateRecordTypeFieldsForDatabase: async(databasename, recordtype) => {
        if (!recordtype.fields) return;
        // Retrieve existing record type fields from database
        var recordtypefieldsfromdatabase = (await Db.query(databasename, `SELECT * FROM datatypefields WHERE datatypename='${Db.replaceQuotes(recordtype.name)}';`)).rows;
        // Update existing ones and insert new ones
        for (var i = 0; i < recordtype.fields.length; i++) {
            var field = recordtype.fields[i];
            var existingfield = recordtypefieldsfromdatabase.find(f => f.name === field.name);
            if (existingfield) {
                // Update existing, but type cannot be changed
                if (existingfield.fieldtype !== field.type) throw new Error(`Type of field '${recordtype.name}.${field.name}' cannot be changed from '${existingfield.fieldtype}' to '${field.type}'`);
                var labeltoupdate = field.label ? "'" + Db.replaceQuotes(field.label) + "'" : "null";
                var referencetoupdate = field.reference ? "'" + Db.replaceQuotes(field.reference) + "'" : "null";
                var formulatoupdate = field.formula ? "'" + Db.replaceQuotes(JSON.stringify(field.formula)) + "'" : "null";
                var formulaindextoupdate = field.formulaindex ? parseInt(field.formulaindex) : 0;
                var isnullabletoupdate = !!field.isnullable;
                var query = `UPDATE datatypefields SET label=${labeltoupdate}, istitle=${!!(recordtype.titlefield && (recordtype.titlefield === field.name))}, isrequired=${!!field.isrequired}, reference=${referencetoupdate}, formula=${formulatoupdate}, formulaindex=${formulaindextoupdate}, ispredefined = true, isnullable=${!!field.isnullable} WHERE datatypename='${Db.replaceQuotes(recordtype.name)}' AND name='${Db.replaceQuotes(field.name)}';`;
                await Db.query(databasename, query);
                // Force update of cache in the next request
                delete Db.datatypes;
                // Remove from existing ones for cleanup
                recordtypefieldsfromdatabase.splice(recordtypefieldsfromdatabase.indexOf(existingfield), 1);
            } else {
                // Insert new
                await Db.createDatatypeField(databasename, recordtype.name, field.name, field.label, field.type, recordtype.titlefield && (recordtype.titlefield === field.name), !!field.isrequired, false, field.reference, field.formula, field.formulaindex, field.isnullable);
            }
        }
        // Delete predefined record type fields which do not exist anymore
        var fieldstodelete = recordtypefieldsfromdatabase.filter(f => f.name !== "name" && f.ispredefined);
        for (var i = 0; i < fieldstodelete.length; i++) {
            Db.deleteRecordTypeField(databasename, recordtype.name, fieldstodelete[i].name);
        }
    },

    updateRecordTypesForDatabase: async(databasename, recordtypes) => {
        // Add relevant columns to datatypefields table
        // TODO: Remove when all portals have this change through, cannot be run from updateonstart, because this is triggered after db-init
        await Db.query(databasename, "ALTER TABLE datatypes ADD COLUMN IF NOT EXISTS lists TEXT[];");
        await Db.query(databasename, "ALTER TABLE datatypes ADD COLUMN IF NOT EXISTS ispredefined BOOLEAN;");
        await Db.query(databasename, "ALTER TABLE datatypes ADD COLUMN IF NOT EXISTS permissionkey TEXT;");
        await Db.query(databasename, "ALTER TABLE datatypes ADD COLUMN IF NOT EXISTS modulename TEXT;");
        await Db.query(databasename, "ALTER TABLE datatypes ADD COLUMN IF NOT EXISTS canhaverelations BOOLEAN;");
        await Db.query(databasename, "ALTER TABLE datatypefields ADD COLUMN IF NOT EXISTS formula TEXT;");
        await Db.query(databasename, "ALTER TABLE datatypefields ADD COLUMN IF NOT EXISTS formulaindex NUMERIC;");
        await Db.query(databasename, "ALTER TABLE datatypefields ADD COLUMN IF NOT EXISTS ispredefined BOOLEAN;");
        await Db.query(databasename, "ALTER TABLE datatypefields ADD COLUMN IF NOT EXISTS isnullable BOOLEAN;");
        // Retrieve existing record types from database
        var recordtypesfromdatabase = (await Db.query(databasename, `SELECT * FROM datatypes;`)).rows;
        // Update existing ones and insert new ones
        for (var i = 0; i < recordtypes.length; i++) {
            var recordtype = recordtypes[i];
            if (recordtypesfromdatabase.find(rt => rt.name === recordtype.name)) {
                // Update existing record type definition
                var labeltoupdate = recordtype.label ? "'" + Db.replaceQuotes(recordtype.label) + "'" : "null";
                var plurallabeltoupdate = recordtype.plurallabel ? "'" + Db.replaceQuotes(recordtype.plurallabel) + "'" : "null";
                var icontoupdate = recordtype.icon ? "'" + Db.replaceQuotes(recordtype.icon) + "'" : "null";
                var liststoupdate = recordtype.lists ? "'{" + recordtype.lists.map(li => `"${Db.replaceQuotes(li)}"`).join(",") + "}'" : "'{}'";
                var permissionkeytoupdate = recordtype.permissionkey ? "'" + Db.replaceQuotes(recordtype.permissionkey) + "'" : "null";
                var modulenametoupdate = recordtype.modulename ? "'" + Db.replaceQuotes(recordtype.modulename) + "'" : "null";
                var query = `UPDATE datatypes SET label = ${labeltoupdate}, plurallabel = ${plurallabeltoupdate}, icon = ${icontoupdate}, lists = ${liststoupdate}, ispredefined = true, permissionkey = ${permissionkeytoupdate}, modulename = ${modulenametoupdate}, canhaverelations = ${!!recordtype.canhaverelations} WHERE name = '${Db.replaceQuotes(recordtype.name)}';`;
                await Db.query(databasename, query);
                // Force update of cache in the next request
                delete Db.datatypes;
            } else {
                // Insert new definition
                await Db.createDatatype(databasename, recordtype.name, recordtype.label, recordtype.plurallabel, (!recordtype.titlefield) || (recordtype.titlefield === "name"), recordtype.icon, recordtype.lists, recordtype.permissionkey, recordtype.modulename);
            }
            // Handle record type fields
            await Db.updateRecordTypeFieldsForDatabase(databasename, recordtype);
            // Handle predefined values
            if (recordtype.values) for (var j = 0; j < recordtype.values.length; j++) {
                await Db.insertDynamicObject(databasename, recordtype.name, recordtype.values[j]); // Try to insert. When it already exists, nothing happens
            }
        }
    },

    /**
     * Updates all tables of all clients and of the portal regarding to possibly updated module-config settings
     */
    updateRecordTypes: async() => {
        // Collect client database names to process
        var clientnames = (await Db.query(Db.PortalDatabaseName, "SELECT name FROM clients;")).rows.map(r => r.name);
        // Process portal record types
        var portaldatatypes = Db.getPortalDataTypesFromConfig();
        await Db.updateRecordTypesForDatabase(Db.PortalDatabaseName, portaldatatypes);
        // Process client record types
        var clientdatatypes = Db.getClientDataTypesFromConfig();
        for (var i = 0; i < clientnames.length; i++) {
            await Db.updateRecordTypesForDatabase(clientnames[i], clientdatatypes);
        }
    }
    
}

module.exports.Db = Db;