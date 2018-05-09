var Db = require("./db").Db;
var co = require("./constants");
var ch = require("./calculationhelper");
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
        // 09.05.2018: Kommunikationswege von Personen auf Beziehungen umstellen
        var datatypes = await Db.getdatatypes(clientname);
        var communicationsexisting = (await Db.query(clientname, "SELECT 1 FROM information_schema.tables WHERE table_name='communications';")).rowCount > 0;
        if (communicationsexisting) {
            var communications = await Db.getDynamicObjects(clientname, "communications");
            for (var j = 0; j < communications.length; j++) {
                var comm = communications[j];
                if (comm.contact.indexOf("@") > 0) { // Geht nicht anders, der Kommunikationstyp war verloren gegangen
                    // E-Mails
                    var emailcontact = {
                        name: Db.createName(),
                        address: comm.contact,
                        emailcontacttypename: "work" // Geht nicht anders, der Kommunikationstyp war verloren gegangen
                    };
                    await Db.insertDynamicObject(clientname, "emailcontacts", emailcontact);
                    var relation = {
                        name: Db.createName(),
                        datatype1name: co.collections.persons.name,
                        name1: comm.personname,
                        datatype2name: "emailcontacts",
                        name2: emailcontact.name,
                        relationtypename: "parentchild"
                    };
                    await Db.insertDynamicObject(clientname, co.collections.relations.name, relation);
                } else {
                    // Telefon
                    var phonecontact = {
                        name: Db.createName(),
                        number: comm.contact,
                        phonecontacttypename: "work"
                    };
                    await Db.insertDynamicObject(clientname, "phonecontacts", phonecontact);
                    var relation = {
                        name: Db.createName(),
                        datatype1name: co.collections.persons.name,
                        name1: comm.personname,
                        datatype2name: "phonecontacts",
                        name2: phonecontact.name,
                        relationtypename: "parentchild"
                    };
                    await Db.insertDynamicObject(clientname, co.collections.relations.name, relation);
                }
            }
            await Db.query(clientname, "DELETE FROM communications;");
        }
    }
    console.log("UPDATE FINISHED.");
};