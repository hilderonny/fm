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
var uuidv4 = require("uuid").v4;

var dbprefix = process.env.POSTGRESQL_TEST_DBPREFIX  || localconfig.dbprefix || 'arrange' ; 

var debugdbquery = false; // Set this to true to print out all queries in the console

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
            if (!fs.existsSync(databasedir)) {
                fs.mkdirSync(databasedir);
                fs.chmodSync(databasedir, 0777); // Needed for postgres COPY TO
            }
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
        await Db.query(databaseName, "CREATE TABLE datatypes (name TEXT NOT NULL PRIMARY KEY, label TEXT, plurallabel TEXT, icon TEXT, lists TEXT[], ispredefined BOOLEAN, permissionkey TEXT, modulename TEXT, canhaverelations BOOLEAN, candefinename BOOLEAN, titlefield TEXT, ismanuallyupdated BOOLEAN);");
        await Db.query(databaseName, "CREATE TABLE datatypefields (name TEXT, label TEXT, datatypename TEXT, fieldtype TEXT, isrequired BOOLEAN, reference TEXT, formula TEXT, formulaindex NUMERIC, ispredefined BOOLEAN, isnullable BOOLEAN, ishidden BOOLEAN, ismanuallyupdated BOOLEAN, rows NUMERIC, PRIMARY KEY (name, datatypename));");
        await Db.query(databaseName, "CREATE TABLE permissions (usergroupname TEXT NOT NULL, key TEXT NOT NULL, canwrite BOOLEAN, PRIMARY KEY (usergroupname, key));");
    },

    createDatatype: async(databasename, datatypename, label, plurallabel, titlefield, icon, lists, permissionkey, modulename, canhaverelations, candefinename) => {
        if (!datatypename.match(/^[a-z]*$/)) throw new Error("The datatype name must only contain lowercase letters!");
        if (["undefined", "boolean"].indexOf(typeof(canhaverelations)) < 0) throw new Error("canhaverelations must be a boolean!");
        if (["undefined", "boolean"].indexOf(typeof(candefinename)) < 0) throw new Error("candefinename must be a boolean!");
        if (lists && !Array.isArray(lists)) throw new Error("lists must be an array!");
        var dtn = Db.replaceQuotesAndRemoveSemicolon(datatypename);
        if ((await Db.query(databasename, `SELECT 1 FROM datatypes WHERE name = '${dtn}';`)).rowCount > 0) return; // Already existing
        var labeltoinsert = label ? "'" + Db.replaceQuotes(label) + "'" : "''";
        var plurallabeltoinsert = plurallabel ? "'" + Db.replaceQuotes(plurallabel) + "'" : "''";
        var icontoinsert = icon ? "'" + Db.replaceQuotes(icon) + "'" : "''";
        var liststoinsert = lists ? "'{" + lists.map(li => `"${Db.replaceQuotes(li)}"`).join(",") + "}'" : "'{}'";
        var permissionkeytoinsert = permissionkey ? "'" + Db.replaceQuotes(permissionkey) + "'" : "''";
        var modulenametoinsert = modulename ? "'" + Db.replaceQuotes(modulename) + "'" : "null";
        var titlefieldtoinsert = titlefield ? "'" + Db.replaceQuotes(titlefield) + "'" : "'name'";
        await Db.query(databasename, `INSERT INTO datatypes (name, label, plurallabel, icon, lists, permissionkey, modulename, canhaverelations, candefinename, titlefield, ismanuallyupdated, ispredefined) VALUES ('${dtn}', ${labeltoinsert}, ${plurallabeltoinsert}, ${icontoinsert}, ${liststoinsert}, ${permissionkeytoinsert}, ${modulenametoinsert}, ${!!canhaverelations}, ${!!candefinename}, ${titlefieldtoinsert}, false, false);`);
        // Drop an existing table. When a datatype is to be created then it should not exist before
        await Db.query(databasename, `DROP TABLE IF EXISTS ${dtn};`);
        await Db.query(databasename, `CREATE TABLE ${dtn} (name TEXT PRIMARY KEY);`);
        // Force update of cache in the next request
        delete Db.datatypes;
        await Db.createDatatypeField(databasename, datatypename, "name", "Name", constants.fieldtypes.text, true, true, undefined, undefined, undefined, false, false, true, false, undefined);
    },

    createDatatypeField: async(databasename, datatypename, fieldname, label, fieldtype, isrequired, doNotAddColumn, reference, formula, formulaindex, isnullable, ishidden, ispredefined, ignoremissingreference, rows) => {
        if (["undefined", "boolean"].indexOf(typeof(isrequired)) < 0) throw new Error("isrequired must be a boolean!");
        if (["undefined", "boolean"].indexOf(typeof(isnullable)) < 0) throw new Error("isnullable must be a boolean!");
        if (["undefined", "boolean"].indexOf(typeof(ishidden)) < 0) throw new Error("ishidden must be a boolean!");
        if (["undefined", "number"].indexOf(typeof(formulaindex)) < 0) throw new Error("formulaindex must be an int!");
        if (["undefined", "number"].indexOf(typeof(rows)) < 0) throw new Error("rows must be an int!");
        var dtn = Db.replaceQuotesAndRemoveSemicolon(datatypename);
        var fn = Db.replaceQuotesAndRemoveSemicolon(fieldname);
        if ((await Db.query(databasename, `SELECT 1 FROM datatypefields WHERE datatypename = '${dtn}' AND name = '${fn}';`)).rowCount > 0) return; // Already existing
        if (!ignoremissingreference && fieldtype === constants.fieldtypes.reference) { // On startup there can be missing references but this is okay
            var referencedatatype = (await Db.getdatatypes(databasename))[reference];
            if (!referencedatatype) throw new Error(`Referenced datatype "${reference}" does not exist!`);
        }
        if (fieldtype === constants.fieldtypes.formula && !Db.isformulavalid(formula)) throw new Error("Formula is invalid!");
        var labeltoinsert = label ? "'" + Db.replaceQuotes(label) + "'" : "null";
        var referencetoinsert = reference ? "'" + Db.replaceQuotes(reference) + "'" : "null";
        var formulatoinsert = formula ? "'" + Db.replaceQuotes(JSON.stringify(formula)) + "'" : "null";
        var formulaindextoinsert = formulaindex ? parseInt(formulaindex) : 0;
        var rowstoinsert = rows ? parseInt(rows) : 0;
        await Db.query(databasename, `INSERT INTO datatypefields (name, label, datatypename, fieldtype, isrequired, reference, formula, formulaindex, isnullable, ishidden, ispredefined, ismanuallyupdated, rows) VALUES ('${fn}', ${labeltoinsert}, '${dtn}', '${Db.replaceQuotes(fieldtype)}', ${!!isrequired}, ${referencetoinsert}, ${formulatoinsert}, ${formulaindextoinsert}, true, ${!!ishidden}, ${!!ispredefined}, false, ${rowstoinsert});`);
        var columntype;
        switch(fieldtype) {
            case constants.fieldtypes.boolean: columntype = "BOOLEAN"; break;
            case constants.fieldtypes.datetime: columntype = "BIGINT"; break;
            case constants.fieldtypes.decimal: columntype = "NUMERIC"; break;
            case constants.fieldtypes.formula: columntype = "TEXT"; break;
            case constants.fieldtypes.password: columntype = "TEXT"; break;
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

    // Convinient way to generate names for entities.
    createName: () => {
        return uuidv4().replace(/-/g, "");
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
        await Db.query(Db.PortalDatabaseName, `DELETE FROM allusers WHERE clientname = '${Db.replaceQuotes(clientname)}';`);
        // Also delete documents of client
        var documentpath = path.join(__dirname, '..', localconfig.documentspath ? localconfig.documentspath : 'documents');
        rimraf.sync(path.join(documentpath, clientname));
        // And remove all users of the client from the user cache
        var usercache = require("../middlewares/auth").usercache;
        Object.values(usercache).forEach(u => {
            if (u.clientname === clientname) delete usercache[u.name];
        });
        return true;
    },

    deleteDynamicObject: async(clientname, datatypename, elementname, filter) => {
        // Special handling of users
        if (datatypename === 'users') {
            await Db.query(Db.PortalDatabaseName, `DELETE FROM allusers WHERE name='${Db.replaceQuotes(elementname)}';`);
            delete require("../middlewares/auth").usercache[elementname]; // Remove the user from the cache
        }
        var filterstring = filter ? " AND " + Db.getFilterString(filter) : "";
        return Db.query(clientname, `DELETE FROM ${Db.replaceQuotesAndRemoveSemicolon(datatypename)} WHERE name='${Db.replaceQuotes(elementname)}'${filterstring};`);
    },

    deleteDynamicObjects: async(clientname, datatypename, filter) => {
        var filterstring = Db.getFilterString(filter);
        return Db.query(clientname, `DELETE FROM ${Db.replaceQuotesAndRemoveSemicolon(datatypename)} WHERE ${filterstring};`);
    },

    deleteRecordType: async(databasename, recordtypename) => {
        var rtn = Db.replaceQuotes(recordtypename);
        await Db.query(databasename, `DELETE FROM relations WHERE datatype1name = '${rtn}' OR datatype2name = '${rtn}';`);
        await Db.query(databasename, `DELETE FROM datatypefields WHERE datatypename = '${rtn}';`);
        await Db.query(databasename, `DELETE FROM datatypes WHERE name = '${rtn}';`);
        await Db.query(databasename, `DROP TABLE IF EXISTS ${Db.replaceQuotesAndRemoveSemicolon(recordtypename)};`);
        // Force update of cache in the next request
        delete Db.datatypes;
    },

    deleteRecordTypeField: async(databasename, recordtypename, fieldname, donotdropcolumn) => {
        await Db.query(databasename, `DELETE FROM datatypefields WHERE name = '${Db.replaceQuotes(fieldname)}' and datatypename = '${Db.replaceQuotes(recordtypename)}';`);
        // Columns must not be dropped automatically. They need to be removed in utils/updateonstart.js
        if (!donotdropcolumn) await Db.query(databasename, `ALTER TABLE ${Db.replaceQuotesAndRemoveSemicolon(recordtypename)} DROP COLUMN IF EXISTS ${Db.replaceQuotesAndRemoveSemicolon(fieldname)};`);
        // Force update of cache in the next request
        delete Db.datatypes;
    },

    getdatatypes: async(databaseNameWithoutPrefix) => {
        if (!Db.datatypes || !Db.datatypes[databaseNameWithoutPrefix]) {
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
                fields.forEach(f => {
                    var datatype = clientdatatypes[f.datatypename];
                    datatype.fields[f.name] = f;
                });
            }
        }
        return Db.datatypes[databaseNameWithoutPrefix];
    },

    getDynamicObject: async(clientname, datatypename, filterorname) => {
        var availablefieldnames = (await Db.query(clientname, `SELECT name FROM datatypefields WHERE datatypename = '${Db.replaceQuotes(datatypename)}' AND NOT fieldtype = 'password';`)).rows.map(f => Db.replaceQuotesAndRemoveSemicolon(f.name));
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
        var availablefieldnames = (await Db.query(clientname, `SELECT name FROM datatypefields WHERE datatypename = '${Db.replaceQuotes(datatypename)}' AND NOT fieldtype = 'password';`)).rows.map(f => Db.replaceQuotesAndRemoveSemicolon(f.name));
        if (availablefieldnames.length < 1) return []; // No fields defined
        var filterstring = filter && Object.keys(filter).length > 0 ? " WHERE " + Db.getFilterString(filter) : "";
        return (await Db.query(clientname, `SELECT ${availablefieldnames.join(",")} FROM ${Db.replaceQuotesAndRemoveSemicolon(datatypename)}${filterstring};`)).rows;
    },

    getDynamicObjectsForNames: async(clientname, datatypename, names, filter) => {
        var namestofind = names.map((n) => `'${Db.replaceQuotes(n)}'`).join(",");
        var filterstring = filter ? " AND " + Db.getFilterString(filter) : "";
        return (await Db.query(clientname, `SELECT * FROM ${Db.replaceQuotesAndRemoveSemicolon(datatypename)} WHERE name IN (${namestofind})${filterstring};`)).rows;
    },

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
            (SELECT datatype1name, name1, datatype2name, name2, 0 FROM relations WHERE relationtypename = 'parentchild' AND NOT datatype1name IS NULL AND NOT name1 IS NULL)
            UNION
            (SELECT relations.datatype1name, relations.name1, get_path.datatype2name, get_path.name2, get_path.depth + 1 FROM relations JOIN get_path on get_path.name1 = relations.name2 WHERE relationtypename = 'parentchild' AND get_path.depth < 64)
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

    gettextupdateset: (name, value) => {
        if (value === undefined || value === null) return `${name}=null`;
        return `${name}='${Db.replaceQuotes(value)}'`;
    },

    init: async() => {
        if (Db.isInitialized) return;
        console.log(`Initializing database with prefix "${dbprefix}".`);
        Object.keys(Db.pools).forEach((k) => {
            Db.pools[k].end();
            delete Db.pools[k];
        });
        // Backup
        await Db.backup();
        // Define type parsing, (SELECT typname, oid FROM pg_type order by typname)
        pg.types.setTypeParser(20, (val) => { return parseInt(val); }); // bigint / int8
        pg.types.setTypeParser(1700, (val) => { return parseFloat(val); }); // numeric
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
        // Filter out fields which do not exist. Can happen on client imports when the imported table contains unknown columns
        // Also ignore formulas, they are calculated after import
        keys = keys.filter(k => fieldMap[k] && fieldMap[k].fieldtype !== constants.fieldtypes.formula);
        var values = keys.map((k) => {
            var value = element[k];
            var field = fieldMap[k];
            var result;
            switch (field.fieldtype) {
                case constants.fieldtypes.boolean: if (value !== undefined && value !== null && typeof(value) !== "boolean") throw new Error(`Value type ${typeof(value)} not allowed for field type boolean`); result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.datetime: if (value !== undefined && value !== null && typeof(value) !== "number") throw new Error(`Value type ${typeof(value)} not allowed for field type datetime`); result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.decimal: if (value !== undefined && value !== null && typeof(value) !== "number") throw new Error(`Value type ${typeof(value)} not allowed for field type decimal`); result = (value === undefined || value === null) ? "null" : value; break;
                case constants.fieldtypes.password: result = (value === undefined || value === null) ? "null" : `'${Db.replaceQuotes(bcryptjs.hashSync(value))}'`; break;
                case constants.fieldtypes.reference: result = (value === undefined || value === null) ? "null" : `'${Db.replaceQuotes(value)}'`; break;
                case constants.fieldtypes.text: result = (value === undefined || value === null) ? "null" : `'${Db.replaceQuotes(value)}'`; break;
                default: throw new Error(`Unknown field type '${field.fieldtype}'`);
            }
            return result;
        });
        // Special handling of users
        if (datatypename === 'users') {
            await Db.query(Db.PortalDatabaseName, `INSERT INTO allusers (name, password, clientname) VALUES ('${Db.replaceQuotes(element.name)}', '${Db.replaceQuotes(bcryptjs.hashSync(element.password || ""))}', '${Db.replaceQuotes(clientname)}');`);
        }
        var statement = `INSERT INTO ${Db.replaceQuotesAndRemoveSemicolon(datatypename)} (${keys.map(k => Db.replaceQuotesAndRemoveSemicolon(k)).join(',')}) VALUES (${values.join(',')}) ON CONFLICT DO NOTHING;`; // Ignore duplicate names. Can happen on startup when default values are (re-)inserted
        return Db.query(clientname, statement);
    },

    isformulavalid: (formula) => {
        var keys = Object.keys(formula);
        if (
            typeof(formula) === "object" &&
            keys.length === 1 &&
            Object.keys(constants.formulatypes).indexOf(keys[0]) >= 0 &&
            (
                (keys.indexOf("childsum") === 0 && formula.childsum && typeof(formula.childsum) === "string") ||
                (keys.indexOf("ifthenelse") === 0 && Array.isArray(formula.ifthenelse) && formula.ifthenelse.length === 4 && typeof(formula.ifthenelse[0]) === "string" && typeof(formula.ifthenelse[2]) === "string") ||
                (keys.indexOf("sum") === 0 && Array.isArray(formula.sum) && formula.sum.filter(f => typeof(f) === "string").length === formula.sum.length) ||
                (keys.indexOf("concat") === 0 && Array.isArray(formula.concat))
            )
        ) return true;
        return false;
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
        if (debugdbquery) console.log("\x1b[1:36m%s\x1b[0m", databasename + ": " + query); // Color: https://stackoverflow.com/a/41407246, http://bluesock.org/~willkg/dev/ansi.html
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
                case constants.fieldtypes.password: if (value === undefined || value === null || value === "") return null; result = `'${Db.replaceQuotes(bcryptjs.hashSync(value))}'`; break; // Passwords cannot be made empty
                case constants.fieldtypes.reference: result = (value === undefined || value === null) ? "null" : `'${Db.replaceQuotes(value)}'`; break;
                case constants.fieldtypes.text: result = (value === undefined || value === null) ? "null" : `'${Db.replaceQuotes(value)}'`; break;
                default: throw new Error(`Unknown field type '${field.fieldtype}'`);
            }
            return `${k}=${result}`;
        }).filter(k => k !== null);
        if (values.length < 1) return; // Nothing left to update
        var filterstring = filter ? " AND " + Db.getFilterString(filter) : "";
        // Special handling of passwords for users
        if (datatypename === 'users' && element.password && element.password.length) {
            await Db.query(Db.PortalDatabaseName, `UPDATE allusers SET password = '${Db.replaceQuotes(bcryptjs.hashSync(element.password))}' WHERE name = '${Db.replaceQuotes(elementname)}';`);
        }
        // Special handle users and remove it from user cache to force it to be refetched from database
        if (datatypename === 'users') {
            delete require("../middlewares/auth").usercache[elementname];
        }
        var statement = `UPDATE ${Db.replaceQuotesAndRemoveSemicolon(datatypename)} SET ${values.join(',')} WHERE name='${Db.replaceQuotes(elementname)}'${filterstring};`;
        return Db.query(clientname, statement);
    },

    updateRecordTypeFieldsForDatabase: async(databasename, datatype) => {
        if (!datatype.fields) return;
        // Retrieve existing record type fields from database
        var fieldsfromdatabase = (await Db.query(databasename, `SELECT * FROM datatypefields WHERE datatypename='${Db.replaceQuotes(datatype.name)}';`)).rows;
        // Update existing ones and insert new ones
        for (var i = 0; i < datatype.fields.length; i++) {
            var field = datatype.fields[i];
            var existingfield = fieldsfromdatabase.find(f => f.name === field.name);
            if (existingfield) {
                var additional = "";
                // Update existing, but type cannot be changed (except password fields)
                if (existingfield.fieldtype !== field.type) {
                    if (
                        (existingfield.fieldtype === 'text' && field.type === 'password') || // Conversion from text to password is possible
                        (existingfield.fieldtype === 'formula' && field.type === 'decimal') // Conversion from formula to manual numeric input also possible
                    ) {
                        additional = `, fieldtype='${Db.replaceQuotes(field.type)}'`;
                    } else {
                        throw new Error(`Type of field '${datatype.name}.${field.name}' cannot be changed from '${existingfield.fieldtype}' to '${field.type}'`);
                    }
                }
                var updateset = [];
                var keys = Object.keys(field);
                if (!existingfield.ismanuallyupdated && keys.indexOf("label") >= 0) updateset.push(`label='${Db.replaceQuotes(field.label)}'`);
                if (keys.indexOf("isrequired") >= 0) updateset.push(`isrequired=${!!field.isrequired}`);
                if (keys.indexOf("reference") >= 0) updateset.push(`reference='${Db.replaceQuotes(field.reference)}'`);
                if (keys.indexOf("formula") >= 0) updateset.push(`formula='${Db.replaceQuotes(JSON.stringify(field.formula))}'`);
                if (keys.indexOf("formulaindex") >= 0) updateset.push(`formulaindex=${parseInt(field.formulaindex)}`);
                updateset.push(`ispredefined=true`);
                if (keys.indexOf("isnullable") >= 0) updateset.push(`isnullable=${!!field.isnullable}`);
                if (keys.indexOf("ishidden") >= 0) updateset.push(`ishidden=${!!field.ishidden}`);
                if (keys.indexOf("rows") >= 0) updateset.push(`rows=${parseInt(field.rows)}`);
                if (updateset.length < 1) return;
                var query = `UPDATE datatypefields SET ${updateset.join(",")} ${additional} WHERE datatypename='${Db.replaceQuotes(datatype.name)}' AND name='${Db.replaceQuotes(field.name)}';`;
                await Db.query(databasename, query);
                // Force update of cache in the next request
                delete Db.datatypes;
                // Remove from existing ones for cleanup
                fieldsfromdatabase.splice(fieldsfromdatabase.indexOf(existingfield), 1);
            } else {
                // Insert new
                await Db.createDatatypeField(databasename, datatype.name, field.name, field.label, field.type, !!field.isrequired, false, field.reference, field.formula, field.formulaindex, field.isnullable, field.ishidden, true, true, field.rows);
            }
        }
        // Delete predefined record type fields which do not exist anymore
        var fieldstodelete = fieldsfromdatabase.filter(f => f.name !== "name" && f.ispredefined);
        for (var i = 0; i < fieldstodelete.length; i++) {
            Db.deleteRecordTypeField(databasename, datatype.name, fieldstodelete[i].name, true);
        }
    },

    updaterecordtype: async(clientname, recordtypename, recordtype) => {
        var updateset = [];
        var keys = Object.keys(recordtype);
        if (recordtype.label !== null && ["undefined", "string"].indexOf(typeof(recordtype.label)) < 0) throw new Error("label must be a string!");
        if (recordtype.plurallabel !== null && ["undefined", "string"].indexOf(typeof(recordtype.plurallabel)) < 0) throw new Error("plurallabel must be a string!");
        if (recordtype.titlefield !== null && ["undefined", "string"].indexOf(typeof(recordtype.titlefield)) < 0) throw new Error("titlefield must be a string!");
        if (typeof(recordtype.lists) !== "undefined" && (!Array.isArray(recordtype.lists) || recordtype.lists.find(l => typeof(l) !== "string"))) throw new Error("lists must be an array of strings!");
        if (recordtype.icon !== null && ["undefined", "string"].indexOf(typeof(recordtype.icon)) < 0) throw new Error("icon must be a string!");
        if (recordtype.permissionkey !== null && ["undefined", "string"].indexOf(typeof(recordtype.permissionkey)) < 0) throw new Error("permissionkey must be a string!");
        if (["undefined", "boolean"].indexOf(typeof(recordtype.canhaverelations)) < 0) throw new Error("canhaverelations must be a boolean!");
        if (["undefined", "boolean"].indexOf(typeof(recordtype.candefinename)) < 0) throw new Error("candefinename must be a boolean!");
        if (["undefined", "boolean"].indexOf(typeof(recordtype.ishidden)) < 0) throw new Error("ishidden must be a boolean!");
        if (keys.indexOf("label") >= 0) updateset.push(Db.gettextupdateset("label", recordtype.label));
        if (keys.indexOf("plurallabel") >= 0) updateset.push(Db.gettextupdateset("plurallabel", recordtype.plurallabel));
        if (keys.indexOf("titlefield") >= 0) {
            if (!(await Db.getdatatypes(clientname))[recordtypename].fields[recordtype.titlefield]) throw new Error("titlefield must refer to an existing field!");
            updateset.push(Db.gettextupdateset("titlefield", recordtype.titlefield));
        }
        if (keys.indexOf("lists") >= 0) updateset.push(`lists='{${recordtype.lists.map(li => `"${Db.replaceQuotes(li)}"`).join(",")}}'`);
        if (keys.indexOf("icon") >= 0) updateset.push(Db.gettextupdateset("icon", recordtype.icon));
        if (keys.indexOf("permissionkey") >= 0) updateset.push(Db.gettextupdateset("permissionkey", recordtype.permissionkey));
        if (keys.indexOf("canhaverelations") >= 0) updateset.push(`canhaverelations=${!!recordtype.canhaverelations}`);
        if (keys.indexOf("candefinename") >= 0) updateset.push(`candefinename=${!!recordtype.candefinename}`);
        if (updateset.length < 1) return;
        var query = `UPDATE datatypes SET ${updateset.join(",")}, ismanuallyupdated=true WHERE name = '${Db.replaceQuotes(recordtypename)}';`;
        await Db.query(clientname, query);
        delete Db.datatypes;
    },

    updaterecordtypefield: async(clientname, datatypename, fieldname, field) => {
        if (!field) throw new Error("No field to update!");
        var existingdatatype = (await Db.getdatatypes(clientname))[datatypename];
        if (!existingdatatype) throw new Error("Datatype does not exist");
        var existingfield = existingdatatype.fields[fieldname];
        if (!existingfield) throw new Error("Field does not exist");
        if (field.label !== null && ["undefined", "string"].indexOf(typeof(field.label)) < 0) throw new Error("label must be a string!");
        if (field.ishidden !== null && ["undefined", "boolean"].indexOf(typeof(field.ishidden)) < 0) throw new Error("ishidden must be a boolean!");
        if (field.formulaindex !== null && ["undefined", "number"].indexOf(typeof(field.formulaindex)) < 0) throw new Error("formulaindex must be an int!");
        if (field.rows !== null && ["undefined", "number"].indexOf(typeof(field.rows)) < 0) throw new Error("rows must be an int!");
        if (existingfield.fieldtype === constants.fieldtypes.formula && field.formula && !Db.isformulavalid(field.formula)) throw new Error("Formula is invalid!");
        var updateset = [];
        var keys = Object.keys(field);
        if (keys.indexOf("label") >= 0) updateset.push(`label='${Db.replaceQuotes(field.label)}'`);
        if (keys.indexOf("formula") >= 0) updateset.push(`formula='${Db.replaceQuotes(JSON.stringify(field.formula))}'`);
        if (keys.indexOf("formulaindex") >= 0) updateset.push(`formulaindex=${parseInt(field.formulaindex ? field.formulaindex : 0)}`);
        if (keys.indexOf("ishidden") >= 0) updateset.push(`ishidden=${!!field.ishidden}`);
        if (keys.indexOf("rows") >= 0) updateset.push(`rows=${parseInt(field.rows ? field.rows : 0)}`);
        if (updateset.length < 1) return;
        var query = `UPDATE datatypefields SET ${updateset.join(",")}, ismanuallyupdated=true WHERE datatypename='${Db.replaceQuotes(datatypename)}' AND name='${Db.replaceQuotes(fieldname)}';`;
        await Db.query(clientname, query);
        delete Db.datatypes;
    },

    updateRecordTypesForDatabase: async(databasename, recordtypes) => {
        // Add relevant columns to datatypefields table
        // TODO: Remove when all portals have this change through, cannot be run from updateonstart, because this is triggered after db-init
        await Db.query(databasename, "ALTER TABLE datatypes ADD COLUMN IF NOT EXISTS lists TEXT[];");
        await Db.query(databasename, "ALTER TABLE datatypes ADD COLUMN IF NOT EXISTS ispredefined BOOLEAN;");
        await Db.query(databasename, "ALTER TABLE datatypes ADD COLUMN IF NOT EXISTS permissionkey TEXT;");
        await Db.query(databasename, "ALTER TABLE datatypes ADD COLUMN IF NOT EXISTS modulename TEXT;");
        await Db.query(databasename, "ALTER TABLE datatypes ADD COLUMN IF NOT EXISTS canhaverelations BOOLEAN;");
        await Db.query(databasename, "ALTER TABLE datatypes ADD COLUMN IF NOT EXISTS candefinename BOOLEAN;");
        await Db.query(databasename, "ALTER TABLE datatypes ADD COLUMN IF NOT EXISTS titlefield TEXT;");
        await Db.query(databasename, "ALTER TABLE datatypes ADD COLUMN IF NOT EXISTS ismanuallyupdated BOOLEAN;");
        await Db.query(databasename, "ALTER TABLE datatypefields ADD COLUMN IF NOT EXISTS formula TEXT;");
        await Db.query(databasename, "ALTER TABLE datatypefields ADD COLUMN IF NOT EXISTS formulaindex NUMERIC;");
        await Db.query(databasename, "ALTER TABLE datatypefields ADD COLUMN IF NOT EXISTS ispredefined BOOLEAN;");
        await Db.query(databasename, "ALTER TABLE datatypefields ADD COLUMN IF NOT EXISTS isnullable BOOLEAN;");
        await Db.query(databasename, "ALTER TABLE datatypefields ADD COLUMN IF NOT EXISTS ishidden BOOLEAN;");
        await Db.query(databasename, "ALTER TABLE datatypefields ADD COLUMN IF NOT EXISTS ismanuallyupdated BOOLEAN;");
        await Db.query(databasename, "ALTER TABLE datatypefields ADD COLUMN IF NOT EXISTS rows NUMERIC;");
        // Retrieve existing record types from database
        var recordtypesfromdatabase = (await Db.query(databasename, `SELECT * FROM datatypes;`)).rows;
        // Update existing ones and insert new ones
        for (var i = 0; i < recordtypes.length; i++) {
            var recordtype = recordtypes[i];
            var recordtypefromdatabase = recordtypesfromdatabase.find(rt => rt.name === recordtype.name);
            var keys = Object.keys(recordtype);
            if (recordtypefromdatabase) {
                // Update existing record type definition
                var updateset = [];
                if (keys.indexOf("label") >= 0 && !recordtypefromdatabase.ismanuallyupdated) updateset.push(`label=${recordtype.label ? "'" + Db.replaceQuotes(recordtype.label) + "'" : "null"}`);
                if (keys.indexOf("plurallabel") >= 0 && !recordtypefromdatabase.ismanuallyupdated) updateset.push(`plurallabel=${recordtype.plurallabel ? "'" + Db.replaceQuotes(recordtype.plurallabel) + "'" : "null"}`);
                if (keys.indexOf("icon") >= 0 && !recordtypefromdatabase.ismanuallyupdated) updateset.push(`icon=${recordtype.icon ? "'" + Db.replaceQuotes(recordtype.icon) + "'" : "null"}`);
                if (keys.indexOf("") >= 0) updateset.push(`lists=${recordtype.lists ? "'{" + recordtype.lists.map(li => `"${Db.replaceQuotes(li)}"`).join(",") + "}'" : "'{}'"}`);
                updateset.push(`ispredefined=true`);
                if (keys.indexOf("permissionkey") >= 0) updateset.push(`permissionkey=${recordtype.permissionkey ? "'" + Db.replaceQuotes(recordtype.permissionkey) + "'" : "null"}`);
                if (keys.indexOf("canhaverelations") >= 0) updateset.push(`canhaverelations=${!!recordtype.canhaverelations}`);
                if (keys.indexOf("candefinename") >= 0) updateset.push(`candefinename=${!!recordtype.candefinename}`);
                if (keys.indexOf("titlefield") >= 0 && !recordtypefromdatabase.ismanuallyupdated) updateset.push(`titlefield=${recordtype.titlefield ? "'" + Db.replaceQuotes(recordtype.titlefield) + "'" : "null"}`);
                if (keys.indexOf("lists") >= 0) updateset.push(`lists='{${recordtype.lists.map(li => `"${Db.replaceQuotes(li)}"`).join(",")}}'`);
                var query = `UPDATE datatypes SET ${updateset.join(",")} WHERE name = '${Db.replaceQuotes(recordtype.name)}';`;
                await Db.query(databasename, query);
                // Force update of cache in the next request
                delete Db.datatypes;
            } else {
                // Insert new definition
                await Db.createDatatype(databasename, recordtype.name, recordtype.label, recordtype.plurallabel, recordtype.titlefield, recordtype.icon, recordtype.lists, recordtype.permissionkey, recordtype.modulename, recordtype.canhaverelations, recordtype.candefinename);
            }
            // Handle record type fields
            await Db.updateRecordTypeFieldsForDatabase(databasename, recordtype);
            // Handle predefined values
            if (recordtype.values) for (var j = 0; j < recordtype.values.length; j++) {
                var value = recordtype.values[j];
                var existingentity = await Db.getDynamicObject(databasename, recordtype.name, value.name);
                if (existingentity) {
                    await Db.updateDynamicObject(databasename, recordtype.name, value.name, value); // Update existing elements
                } else {
                    await Db.insertDynamicObject(databasename, recordtype.name, recordtype.values[j]); // Try to insert. When it already exists, nothing happens
                }
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