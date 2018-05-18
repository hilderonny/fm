var jszip = require('jszip');
var Db = require("./db").Db;
var dh = require("./documentsHelper");
var co = require("./constants");
var path = require("path");
var fs = require("fs");
var unzip = require('unzip2');

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

    import: async (zipfile, label, withdatatypes, withcontent, withfiles) => {
        return new Promise((resolve, reject) => {
            var filePath = path.join(__dirname, '/../', zipfile.path);
            var parser = unzip.Parse();
            fs.createReadStream(filePath)
                .pipe(parser)
                .on('entry', (entry) => {
                    var pathparts = entry.path.split("\\");
                    if (pathparts.length < 2) throw new Error("Missing root path: " + entry.path);
                    if (withdatatypes && pathparts.length === 2 && pathparts[1] === "datatypes") {
                        console.log("Handling datatypes");
                    }
                    if (withdatatypes && pathparts.length === 2 && pathparts[1] === "datatypefields") {
                        console.log("Handling datatypefields");
                    }
                    if (withcontent && pathparts.length === 3 && pathparts[1] === "content") {
                        console.log("Handling datatype " + pathparts[2]);
                    }
                    if (withfiles && pathparts.length === 3 && pathparts[1] === "files") {
                        console.log("Handling file " + pathparts[2]);
                    }
                    entry.autodrain();
                    //     var fullPath = path.join(__dirname, '/../', extractPath, entry.path);
                    //     createPath(path.dirname(fullPath));
                    //     entry.pipe(fs.createWriteStream(fullPath));
                })
                .on('error', (error) => {
                    throw new Error(error);
                }).on('close', function () {
                    // Delete uploaded file
                    fs.unlinkSync(filePath);
                    // Erst antworten, wenn alles ausgepackt ist
                    resolve();
                });
        });
    }
}

module.exports = eh;