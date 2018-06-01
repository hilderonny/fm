var Db = require("./db").Db;
var co = require("./constants");
var ch = require("./calculationhelper");
var rimraf = require("rimraf");
var lc = require('../config/localconfig.json');
var path = require("path");
var fs = require("fs");

// 31.05.2018: AVTFM-158 - Erweiterung von Flächenarten
async function convertareatypes(clientname) {
    var areanamemap = {
        "Wohnen und Aufenthalt": "nf1",
        "Büroarbeit": "nf2",
        "Produktion, Hand- und Maschinenarbeit, Experimente": "nf3",
        "Lagern, Verteilen und Verkaufen": "nf4",
        "Bildung, Unterricht und Kultur": "nf5",
        "Heilen und Pflegen": "nf6",
        "Sonstige Nutzung": "nf7",
        "Technische Anlagen": "tf8",
        "Verkehrserschließung und -sicherung": "vf9"
    };
    // Verweise suchen
    var relevantfields = (await Db.query(clientname, `SELECT * FROM datatypefields WHERE fieldtype='reference' AND reference='areatypes';`)).rows;
    var names = Object.keys(areanamemap);
    for (var i = 0; i < names.length; i++) {
        var oldname = names[i];
        var newname = areanamemap[oldname];
        // Verknüpfungen
        await Db.query(clientname, `UPDATE relations SET name1='${newname}' WHERE datatype1name='areatypes' AND name1='${oldname}';`);
        await Db.query(clientname, `UPDATE relations SET name2='${newname}' WHERE datatype2name='areatypes' AND name2='${oldname}';`);
        // Verweise
        for (var j = 0; j < relevantfields.length; j++) {
            var field = relevantfields[j];
            await Db.query(clientname, `UPDATE ${field.datatypename} SET ${field.name}='${newname}' WHERE ${field.name}='${oldname}';`);
        }
    }
    // Alten Mist löschen, wenn möglich (wenn es die areatypes Tabelle nicht gibt: egal)
    try {
        await Db.query(clientname, `DELETE FROM areatypes WHERE name IN (${names.map(n => `'${n}'`).join(",")})`);
    } catch(error) {}
    // Formeln berechnen lassen
    await ch.recalculateforupdateddatatype(clientname, "areatypes");
    // Titelfeld noch umbiegen
    await Db.query(clientname, "UPDATE datatypes SET titlefield='displayname' WHERE name='areatypes';");
}

// 31.05.2018: AVTFM-158 - Erweiterung von Flächenarten
async function convertareacategories(clientname) {
    var categorynamemap = {
        "Nutzungsfläche": "FMOBJECTS_CATEGORY_NUF",
        "Technikfläche": "FMOBJECTS_CATEGORY_TF",
        "Verkehrsfläche": "FMOBJECTS_CATEGORY_VF"
    };
    // Verweise suchen
    var relevantfields = (await Db.query(clientname, `SELECT * FROM datatypefields WHERE fieldtype='reference' AND reference='areacategories';`)).rows;
    var names = Object.keys(categorynamemap);
    for (var i = 0; i < names.length; i++) {
        var oldname = names[i];
        var newname = categorynamemap[oldname];
        // Verknüpfungen
        await Db.query(clientname, `UPDATE relations SET name1='${newname}' WHERE datatype1name='areacategories' AND name1='${oldname}';`);
        await Db.query(clientname, `UPDATE relations SET name2='${newname}' WHERE datatype2name='areacategories' AND name2='${oldname}';`);
        // Verweise
        for (var j = 0; j < relevantfields.length; j++) {
            var field = relevantfields[j];
            await Db.query(clientname, `UPDATE ${field.datatypename} SET ${field.name}='${newname}' WHERE ${field.name}='${oldname}';`);
        }
    }
    // Alten Mist löschen, wenn möglich (wenn es die areacategories Tabelle nicht gibt: egal)
    try {
        await Db.query(clientname, `DELETE FROM areacategories WHERE name IN (${names.map(n => `'${n}'`).join(",")})`);
    } catch(error) {}
    // Formeln berechnen lassen
    await ch.recalculateforupdateddatatype(clientname, "areacategories");
}

/**
 * Update scripts which are run at system startup, when the localconfig flag "applyupdates" is set to true
 */
module.exports = async() => {
    console.log("UPDATING ON START ...");
    var clients = (await Db.query(Db.PortalDatabaseName, "SELECT name FROM clients;")).rows;
    for (var i = 0; i < clients.length; i++) {
        var clientname = clients[i].name;
        convertareatypes(clientname);
        convertareacategories(clientname);
    }
    convertareatypes(Db.PortalDatabaseName);
    convertareacategories(Db.PortalDatabaseName);
    console.log("UPDATE FINISHED.");
};