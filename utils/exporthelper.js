var jszip = require('jszip');
var Db = require("./db").Db;
var dh = require("./documentsHelper");
var co = require("./constants");
var path = require("path");
var fs = require("fs");

var eh = {
    export: async (clientname, withdatatypes, withcontent, withfiles, prefix) => {
        console.log(clientname, withdatatypes, withcontent, withfiles, prefix);
        var zip = new jszip();

        if (withfiles) {
            var documents = (await Db.getDynamicObjects(clientname, co.collections.documents.name));
            documents.forEach(document => {
                var filepath = dh.getDocumentPath(clientname, document.name);
                var pathinzipfile = path.join(prefix, "files", document.name);
                console.log(filepath, pathinzipfile);
                if (!fs.existsSync(filepath)) return;
                zip.file(pathinzipfile, fs.readFileSync(filepath));
            });
        }

        return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
    }
}

module.exports = eh;