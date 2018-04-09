var Db = require("./db").Db;
var co = require("./constants");
var ch = require("./calculationhelper");
var uuidv4 = require("uuid").v4;

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
    console.log("UPDATE FINISHED.");
};