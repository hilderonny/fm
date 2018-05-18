var jszip = require('jszip');
var Db = require("./db").Db;
var dh = require("./documentsHelper");
var co = require("./constants");
var ch = require("./calculationhelper");
var path = require("path");
var fs = require("fs");
var unzip = require('unzip2');
var through = require('through');

async function getJsonFromEntry(entry) {
    return new Promise((resolve, reject) => {
        var content = "";
        // See https://github.com/substack/stream-handbook
        entry.pipe(through((data) => {
            content += data.toString();
        }, () => {
            var json = JSON.parse(content);
            resolve(json);
        }));
    });
}

// // Not using default handling becasue it could be incompatible and names could be read only
// async function pushElementToDatabase(clientname, tablename, element) {
//     var query = `INSERT INTO ${Db.replaceQuotesAndRemoveSemicolon(tablename)} (${Object.keys(element).map(Db.replaceQuotes).join(",")}) VALUES ( (${Object.values(element).map(Db.replaceQuotes).join(",")});`;
//     console.log(clientname, query);
// }

var eh = {
    export: async (clientname, withdatatypes, withcontent, withfiles, prefix) => {
        var zip = new jszip();

        if (withdatatypes) {
            var datatypes = (await Db.query(clientname, "SELECT * FROM datatypes;")).rows;
            zip.file(path.join(prefix, "datatypes"), JSON.stringify(datatypes));
            var datatypefields = (await Db.query(clientname, "SELECT * FROM datatypefields;")).rows;
            zip.file(path.join(prefix, "datatypefields"), JSON.stringify(datatypefields));
        }

        if (withcontent) {
            var datatypes = (await Db.query(clientname, "SELECT * FROM datatypes;")).rows;
            for (var i = 0; i < datatypes.length; i++) {
                var name = Db.replaceQuotesAndRemoveSemicolon(datatypes[i].name);
                var content = (await Db.query(clientname, `SELECT * FROM ${name};`)).rows;
                zip.file(path.join(prefix, "content", name), JSON.stringify(content));
            }
        }

        if (withfiles) {
            var documents = (await Db.getDynamicObjects(clientname, co.collections.documents.name));
            for (var i = 0; i < documents.length; i++) {
                var document = documents[i];
                var filepath = dh.getDocumentPath(clientname, document.name);
                var pathinzipfile = path.join(prefix, "files", document.name);
                if (!fs.existsSync(filepath)) continue;
                zip.file(pathinzipfile, fs.readFileSync(filepath));
            }
        }

        return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
    },

    import: async (zipfile, label) => {
        var clientname = Db.createName();
        var datatypes, datatypefields, contents = {};
        var promises = [];
        // Create client in every case
        var client = await Db.createClient(clientname, label);
        promises.push(new Promise((resolve, reject) => {
            var filePath = path.join(__dirname, '/../', zipfile.path);
            var parser = unzip.Parse();
            fs.createReadStream(filePath)
                .pipe(parser)
                .on('entry', async (entry) => {
                    var pathparts = entry.path.split("\\");
                    if (pathparts.length < 2) entry.autodrain(); // Ignore errornous content
                    if (pathparts.length === 2 && pathparts[1] === "datatypes") {
                        promises.push(getJsonFromEntry(entry).then((json) => { datatypes = json; }));
                    } else if (pathparts.length === 2 && pathparts[1] === "datatypefields") {
                        promises.push(getJsonFromEntry(entry).then((json) => { datatypefields = json; }));
                    } else if (pathparts.length === 3 && pathparts[1] === "content") {
                        promises.push(getJsonFromEntry(entry).then((json) => { contents[pathparts[2]] = json; }));
                    } else if (pathparts.length === 3 && pathparts[1] === "files") {
                        var documentname = pathparts[2];
                        var documentPath = dh.getDocumentPath(clientname, documentname);
                        dh.createPath(path.dirname(documentPath));
                        entry.pipe(fs.createWriteStream(documentPath));
                    } else {
                        entry.autodrain();
                    }
                }).on('error', (error) => {
                    throw new Error(error);
                }).on('close', function () {
                    // Delete uploaded file
                    fs.unlinkSync(filePath);
                    // Erst antworten, wenn alles ausgepackt ist
                    resolve();
                });
        }));
        await Promise.all(promises);
        for (var i = 0; i < datatypes.length; i++) {
            var datatype = datatypes[i];
            await Db.createDatatype(clientname, datatype.name, datatype.label, datatype.plurallabel, datatype.titlefield, datatype.icon, datatype.lists, datatype.permissionkey, datatype.modulename, datatype.canhaverelations, datatype.candefinename);
        }
        for (var i = 0; i < datatypefields.length; i++) {
            var datatypefield = datatypefields[i];
            if (datatypefield.name) continue; // Name field is created by Db.createDatatype() automatically
            await Db.createDatatypeField(clientname, datatypefield.datatypename, datatypefield.name, datatypefield.label, datatypefield.fieldtype, datatypefield.isrequired, false, datatypefield.reference, datatypefield.formula, datatypefield.formulaindex, datatypefield.isnullable, datatypefield.ishidden, datatypefield.ispredefined, datatypefield.ignoremissingreference, datatypefield.rows);
        }
        var tablenames = Object.keys(contents);
        for (var i = 0; i < tablenames.length; i++) {
            var tablename = tablenames[i];
            if (tablename === co.collections.users.name) continue; // Users are handled in a special way below
            var tablecontent = contents[tablename];
            for (var j = 0; j < tablecontent.length; j++) {
                await Db.insertDynamicObject(clientname, tablename, tablecontent[j]);
            }
        }
        // Handle users and put them into allusers. Delete them from the users table when they exist in allusers (in another client)
        var users = contents.users;
        if (users) {
            var usernamesinallusers = (await Db.query(Db.PortalDatabaseName, "SELECT name FROM allusers;")).rows.map(r => r.name);
            for (var i = 0; i < users.length; i++) {
                var user = users[i];
                if (usernamesinallusers.indexOf(user.name) < 0) {
                    // Insert the user, it will automatically get into the allusers table
                    await Db.insertDynamicObject(clientname, co.collections.users, user);
                }
            }
        }
        // trigger calculation of formulas
        await ch.recalculateallforclient(clientname);
        return clientname;
    }
}

module.exports = eh;