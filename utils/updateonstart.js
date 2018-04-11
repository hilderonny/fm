var Db = require("./db").Db;
var co = require("./constants");
var ch = require("./calculationhelper");
var uuidv4 = require("uuid").v4;
var rimraf = require("rimraf");
var lc = require('../config/localconfig.json');
var path = require("path");
var fs = require("fs");

/**
 * Update scripts which are run at system startup, when the localconfig flag "applyupdates" is set to true
 */
module.exports = async() => {
    console.log("UPDATING ON START ...");
    var clients = (await Db.query(Db.PortalDatabaseName, "SELECT name FROM clients;")).rows;
    for (var i = 0; i < clients.length; i++) {
        var clientname = clients[i].name;
        // Seitdem die Kategorien Labels haben, tauchten diese doppelt auf. Die ohne Labels müssen raus
        await Db.query(clientname, "DELETE FROM areacategories WHERE LABEL IS null;");
    }
    // Benutzer aus allusers löschen, für die es keine Mandanten mehr gibt
    var clientnames = clients.map(c => `'${Db.replaceQuotes(c.name)}'`);
    if (clientnames.length > 0) await Db.query(Db.PortalDatabaseName, `DELETE FROM allusers WHERE clientname NOT IN (${clientnames.join(",")});`);
    // Verzeichnisse von Mandanten löschen, die es nicht mehr gibt
    var documentpath = path.join(__dirname, '..', lc.documentspath ? lc.documentspath : 'documents');
    var clientfoldernames = fs.readdirSync(documentpath).filter(fn => !clients.find(c => c.name === fn));
    clientfoldernames.forEach(fn => { rimraf.sync(path.join(documentpath, fn)); });

    console.log("UPDATE FINISHED.");
};