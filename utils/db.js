var pg = require("pg");
var localconfig = require('../config/localconfig.json');
var bcryptjs = require("bcryptjs");
var constants = require("./constants");
var fs = require("fs");
var moduleconfig = require('../config/module-config.json');
var path = require("path");
var JSZip = require("jszip");
var rimraf = require("rimraf");

var dbprefix = process.env.POSTGRESQL_TEST_DBPREFIX  || localconfig.dbprefix || 'arrange' ; 

var Db = {

    PortalDatabaseName: "portal",

    pools: {},
    isInitialized: false,

    init: async() => {
        if (Db.isInitialized) return;
        await Db.backup();
        Object.keys(Db.pools).forEach((k) => {
            Db.pools[k].end();
            delete Db.pools[k];
        });
        // Define type parsing, (SELECT typname, oid FROM pg_type order by typname)
        pg.types.setTypeParser(20, (val) => { return parseInt(val); }); // bigint / int8
        pg.types.setTypeParser(1700, (val) => { return parseFloat(val); }); // numeric
        // if (false /*dropDatabase*/) { // DANGEROUS! Enable this only if you know what you do!
        //     var portalDatabases = await Db.queryDirect("postgres", `SELECT * FROM pg_database WHERE datname like '${Db.replaceQuotes(dbprefix)}_%';`);
        //     for (var i = 0; i < portalDatabases.rowCount; i++) {
        //         await Db.queryDirect("postgres", `DROP DATABASE IF EXISTS ${Db.replaceQuotesAndRemoveSemicolon(portalDatabases.rows[i].datname)};`);
        //     }
        // }
        await Db.initPortalDatabase();
        await Db.updateRecordTypes();
        Db.isInitialized = true;
    },

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
                zip.file(path.join(databasename, tablename), fs.readFileSync(outputfile));
            }
        }
        await new Promise((resolve, reject) => {
            var zipfilename = path.join(backupdir, `${timestamp}.zip`);
            zip.generateNodeStream({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } }).pipe(fs.createWriteStream(zipfilename)).on("finish", resolve);
        });
        rimraf.sync(timestampdir);
        console.log("BACKUP FINISHED.");
    },
    
    createClient: async(clientName, label) => {
        var clientDatabaseName = `${dbprefix}_${clientName}`;
        await Db.queryDirect("postgres", `CREATE DATABASE ${Db.replaceQuotesAndRemoveSemicolon(clientDatabaseName)};`);
        await Db.query(Db.PortalDatabaseName, `INSERT INTO clients (name, label) VALUES ('${Db.replaceQuotes(clientName)}', '${Db.replaceQuotes(label)}');`);
        // Prepare client's database
        await Db.createDefaultTables(clientName);
        await Db.createDefaultClientTables(clientName);
    },

    createDefaultClientTables: async(clientname) => {
        await Db.updateRecordTypesForDatabase(clientname, Db.getClientDataTypesFromConfig());
    },

    createDefaultPortalTables: async() => {
        await Db.query(Db.PortalDatabaseName, "CREATE TABLE allusers (name TEXT NOT NULL PRIMARY KEY, password TEXT, clientname TEXT NOT NULL);");
        await Db.query(Db.PortalDatabaseName, "CREATE TABLE clientmodules (clientname TEXT NOT NULL, modulename TEXT NOT NULL, PRIMARY KEY(clientname, modulename));");
        await Db.updateRecordTypesForDatabase(Db.PortalDatabaseName, Db.getPortalDataTypesFromConfig());
    },

    createDefaultTables: async(databaseName) => {
        await Db.query(databaseName, "CREATE TABLE datatypes (name TEXT NOT NULL PRIMARY KEY, label TEXT, plurallabel TEXT, icon TEXT, lists TEXT[], predefined BOOLEAN);");
        await Db.query(databaseName, "CREATE TABLE datatypefields (name TEXT, label TEXT, datatypename TEXT, fieldtype TEXT, istitle BOOLEAN, isrequired BOOLEAN, reference TEXT, formula TEXT, formulaindex NUMERIC, predefined BOOLEAN, PRIMARY KEY (name, datatypename));");
        await Db.query(databaseName, "CREATE TABLE permissions (usergroupname TEXT NOT NULL, key TEXT NOT NULL, canwrite BOOLEAN, PRIMARY KEY (usergroupname, key));");
    },

    createDatatype: async(databaseNameWithoutPrefix, datatypename, label, plurallabel, nameistitle, icon, lists) => {
        if ((await Db.query(databaseNameWithoutPrefix, `SELECT 1 FROM datatypes WHERE name = '${Db.replaceQuotes(datatypename)}';`)).rowCount > 0) return; // Already existing
        var labeltoinsert = label ? "'" + Db.replaceQuotes(label) + "'" : "null";
        var plurallabeltoinsert = plurallabel ? "'" + Db.replaceQuotes(plurallabel) + "'" : "null";
        var icontoinsert = icon ? "'" + Db.replaceQuotes(icon) + "'" : "null";
        var liststoinsert = lists ? "'{" + lists.map(li => `"${Db.replaceQuotes(li)}"`).join(",") + "}'" : "'{}'";
        await Db.query(databaseNameWithoutPrefix, `INSERT INTO datatypes (name, label, plurallabel, icon, lists) VALUES ('${Db.replaceQuotes(datatypename)}', ${labeltoinsert}, ${plurallabeltoinsert}, ${icontoinsert}, ${liststoinsert});`);
        await Db.query(databaseNameWithoutPrefix, `CREATE TABLE ${Db.replaceQuotesAndRemoveSemicolon(datatypename)} (name TEXT PRIMARY KEY);`);
        await Db.createDatatypeField(databaseNameWithoutPrefix, datatypename, "name", "Name", constants.fieldtypes.text, nameistitle, true, true, null);
    },

    createDatatypeField: async(databaseNameWithoutPrefix, datatypename, fieldname, label, fieldtype, istitle, isrequired, doNotAddColumn, reference, formula, formulaindex) => {
        if ((await Db.query(databaseNameWithoutPrefix, `SELECT 1 FROM datatypefields WHERE datatypename = '${Db.replaceQuotes(datatypename)}' AND name = '${Db.replaceQuotes(fieldname)}';`)).rowCount > 0) return; // Already existing
        var labeltoinsert = label ? "'" + Db.replaceQuotes(label) + "'" : "null";
        var referencetoinsert = reference ? "'" + Db.replaceQuotes(reference) + "'" : "null";
        var formulatoinsert = formula ? "'" + Db.replaceQuotes(JSON.stringify(formula)) + "'" : "null";
        var formulaindextoinsert = formulaindex ? parseInt(formulaindex) : 0;
        await Db.query(databaseNameWithoutPrefix, `INSERT INTO datatypefields (name, label, datatypename, fieldtype, istitle, isrequired, reference, formula, formulaindex) VALUES ('${Db.replaceQuotes(fieldname)}', ${labeltoinsert}, '${Db.replaceQuotes(datatypename)}', '${Db.replaceQuotes(fieldtype)}', ${!!istitle}, ${!!isrequired}, ${referencetoinsert}, ${formulatoinsert}, ${formulaindextoinsert});`);
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
        if (!doNotAddColumn) await Db.query(databaseNameWithoutPrefix, `ALTER TABLE ${Db.replaceQuotesAndRemoveSemicolon(datatypename)} ADD COLUMN ${Db.replaceQuotesAndRemoveSemicolon(fieldname)} ${Db.replaceQuotesAndRemoveSemicolon(columntype)};`);
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

    getDataTypes: async(databaseNameWithoutPrefix) => {
        return (await Db.query(databaseNameWithoutPrefix, `SELECT * FROM datatypes;`)).rows;
    },

    getDataTypeFields: async(databaseNameWithoutPrefix, datatypename) => {
        return (await Db.query(databaseNameWithoutPrefix, `SELECT * FROM datatypefields WHERE datatypename='${Db.replaceQuotes(datatypename)}' ORDER BY name;`)).rows;
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
            var result = await Db.query(clientname, `SELECT * FROM ${Db.replaceQuotesAndRemoveSemicolon(datatypename)} WHERE name='${Db.replaceQuotes(filterorname)}';`);
            return result.rowCount > 0 ? result.rows[0] : undefined;
        } else {
            var result = await Db.getDynamicObjects(clientname, datatypename, filterorname);
            return result.length > 0 ? result[0] : undefined;
        }
    },

    getDynamicObjects: async(clientname, datatypename, filter) => {
        var filterstring = filter ? " WHERE " + Db.getFilterString(filter) : "";
        return (await Db.query(clientname, `SELECT * FROM ${Db.replaceQuotesAndRemoveSemicolon(datatypename)}${filterstring};`)).rows;
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
            var t = typeof(value);
            switch(t) {
                case "string": value = "'" + Db.replaceQuotes(value) + "'"; break;
                case "number": break;
                case "boolean": break;
                default: throw new Error(`Type ${t} cannot be used.`);
            }
            filterlist.push(`${k}=${value}`);
        });
        return filterlist.join(" AND ");
    },

    getClientDataTypesFromConfig: () => {
        return [].concat.apply([], Object.keys(moduleconfig.modules).map(k => moduleconfig.modules[k].clientdatatypes)).filter(a=>a);
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
        return [].concat.apply([], Object.keys(moduleconfig.modules).map(k => moduleconfig.modules[k].portaldatatypes)).filter(a=>a); // See https://stackoverflow.com/a/10865042
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
            
    query: async(databaseNameWithoutPrefix, query) => {
        return Db.queryDirect(`${dbprefix}_${databaseNameWithoutPrefix}`, query);
    },

    queryDirect: async(databasename, query) => {
        console.log("\x1b[1:36m%s\x1b[0m", databasename + ": " + query); // Color: https://stackoverflow.com/a/41407246, http://bluesock.org/~willkg/dev/ansi.html
        var pool = Db.getPool(Db.replaceQuotesAndRemoveSemicolon(databasename)); // Sicher ist sicher
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
                case constants.fieldtypes.boolean: if (value !== undefined && value !== null && typeof(value) !== "boolean") throw new Error(`Value type ${typeof(value)} not allowed for field type boolean`); result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.datetime: if (value !== undefined && value !== null && typeof(value) !== "number") throw new Error(`Value type ${typeof(value)} not allowed for field type datetime`); result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.decimal: if (value !== undefined && value !== null && typeof(value) !== "number") throw new Error(`Value type ${typeof(value)} not allowed for field type decimal`); result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.reference: result = (value === undefined || value === null) ? "null" : `'${Db.replaceQuotes(value)}'`; break;
                case constants.fieldtypes.text: result = (value === undefined || value === null) ? "null" : `'${Db.replaceQuotes(value)}'`; break;
                default: throw new Error(`Unknown field type '${field.fieldtype}'`);
            }
            return `${k}=${result}`;
        });
        var filterstring = filter ? " AND " + Db.getFilterString(filter) : "";
        var statement = `UPDATE ${Db.replaceQuotesAndRemoveSemicolon(datatypename)} SET ${values.join(',')} WHERE name='${Db.replaceQuotes(elementname)}'${filterstring};`;
        return Db.query(clientname, statement);
    },

    updateRecordTypeFieldsForDatabase: async(databasename, recordtype) => {
        if (!recordtype.fields) return;
        // Retrieve existing record type fields from database
        var recordtypefieldsfromdatabase = await Db.getDataTypeFields(databasename, recordtype.name);
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
                var query = `UPDATE datatypefields SET label=${labeltoupdate}, istitle=${!!(recordtype.titlefield && (recordtype.titlefield === field.name))}, isrequired=${!!field.required}, reference=${referencetoupdate}, formula=${formulatoupdate}, formulaindex=${formulaindextoupdate}, predefined = true WHERE datatypename='${Db.replaceQuotes(recordtype.name)}' AND name='${Db.replaceQuotes(field.name)}';`;
                await Db.query(databasename, query);
            } else {
                // Insert new
                await Db.createDatatypeField(databasename, recordtype.name, field.name, field.label, field.type, recordtype.titlefield && (recordtype.titlefield === field.name), !!field.required, false, field.reference, field.formula, field.formulaindex);
            }
        }
    },

    updateRecordTypesForDatabase: async(databasename, recordtypes) => {
        // Add relevant columns to datatypefields table
        // TODO: Remove when all portals have this change through, cannot be run from updateonstart, because this is triggered after db-init
        await Db.query(databasename, "ALTER TABLE datatypes ADD COLUMN IF NOT EXISTS lists TEXT[];");
        await Db.query(databasename, "ALTER TABLE datatypes ADD COLUMN IF NOT EXISTS predefined BOOLEAN;");
        await Db.query(databasename, "ALTER TABLE datatypefields ADD COLUMN IF NOT EXISTS formula TEXT;");
        await Db.query(databasename, "ALTER TABLE datatypefields ADD COLUMN IF NOT EXISTS formulaindex NUMERIC;");
        await Db.query(databasename, "ALTER TABLE datatypefields ADD COLUMN IF NOT EXISTS predefined BOOLEAN;");
        // Retrieve existing record types from database
        var recordtypesfromdatabase = await Db.getDataTypes(databasename);
        // Update existing ones and insert new ones
        for (var i = 0; i < recordtypes.length; i++) {
            var recordtype = recordtypes[i];
            if (recordtypesfromdatabase.find(rt => rt.name === recordtype.name)) {
                // Update existing record type definition
                var labeltoupdate = recordtype.label ? "'" + Db.replaceQuotes(recordtype.label) + "'" : "null";
                var plurallabeltoupdate = recordtype.plurallabel ? "'" + Db.replaceQuotes(recordtype.plurallabel) + "'" : "null";
                var icontoupdate = recordtype.icon ? "'" + Db.replaceQuotes(recordtype.icon) + "'" : "null";
                var liststoupdate = recordtype.lists ? "'{" + recordtype.lists.map(li => `"${Db.replaceQuotes(li)}"`).join(",") + "}'" : "'{}'";
                var query = `UPDATE datatypes SET label = ${labeltoupdate}, plurallabel = ${plurallabeltoupdate}, icon = ${icontoupdate}, lists = ${liststoupdate}, predefined = true WHERE name = '${Db.replaceQuotes(recordtype.name)}';`;
                await Db.query(databasename, query);
            } else {
                // Insert new definition
                await Db.createDatatype(databasename, recordtype.name, recordtype.label, recordtype.plurallabel, (!recordtype.titlefield) || (recordtype.titlefield === "name"), recordtype.icon, recordtype.lists);
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