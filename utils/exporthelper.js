var jszip = require('jszip');
var Db = require("./db").Db;
var dh = require("./documentsHelper");
var co = require("./constants");
var path = require("path");
var fs = require("fs");

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
    }
}

module.exports = eh;