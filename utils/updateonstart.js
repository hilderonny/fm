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
        // Verzeichnisse und Dokumente per Relationen verknüpfen
        var folderswithparents = (await Db.query(clientname, "SELECT * FROM folders WHERE NOT parentfoldername IS NULL;")).rows;
        for (var j = 0; j < folderswithparents.length; j++) {
            var document = folderswithparents[j];
            var relation = { name: uuidv4(), datatype1name: "folders", name1: document.parentfoldername, datatype2name: "folders", name2: document.name, relationtypename: "parentchild" };
            await Db.insertDynamicObject(clientname, "relations", relation);
            await Db.updateDynamicObject(clientname, "folders", document.name, { parentfoldername: null });
        }
        var documentswithparents = (await Db.query(clientname, "SELECT * FROM documents WHERE NOT parentfoldername IS NULL;")).rows;
        for (var j = 0; j < documentswithparents.length; j++) {
            var document = documentswithparents[j];
            var relation = { name: uuidv4(), datatype1name: "folders", name1: document.parentfoldername, datatype2name: "documents", name2: document.name, relationtypename: "parentchild" };
            await Db.insertDynamicObject(clientname, "relations", relation);
            await Db.updateDynamicObject(clientname, "documents", document.name, { parentfoldername: null });
        }
    }
    console.log("UPDATE FINISHED.");
};