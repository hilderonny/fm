var Db = require("./db").Db;
var co = require("./constants");
var ch = require("./calculationhelper");
var rimraf = require("rimraf");
var lc = require('../config/localconfig.json');
var path = require("path");
var fs = require("fs");

async function convertClientsettingsToClients() {
    // Check for clientsettings table
    // Get logos out of clientsetting
    // Put logos into clients
    // Delete clientsettings table
    var tables = (await Db.queryDirect("arrange_portal", "SELECT table_name FROM information_schema.tables WHERE table_schema='public';")).rows;
    var picked = tables.find(o => o.table_name === 'clientsettings');
    if(picked)  {
        var query = `UPDATE clients SET logourl=clientsettings.logourl FROM clientsettings WHERE clients.name = clientsettings.clientname`;
        await Db.queryDirect("arrange_portal", query);
        await Db.queryDirect("arrange_portal", "DROP TABLE clientsettings;");
    }   
}

/**Remove client settings from each clients
 * by removing if from the views and relations 
 */
async function deleteClientsettingsfromClients(){
    var clientsresult = (await Db.query(Db.PortalDatabaseName, `SELECT * FROM clients;`)).rows;
    for(i=0; i<clientsresult.length; i++ )
    {
        Db.query(clientsresult[i].name, "DELETE FROM views WHERE name = 'mandanteneinstellungen';");
        Db.query(clientsresult[i].name, "DELETE FROM relations WHERE name = 'einstellungenmandanteneinstellungen';");
    }
}

/**
 * Update scripts which are run at system startup, when the localconfig flag "applyupdates" is set to true
 */
module.exports = async() => {
    console.log("UPDATING ON START ...");
    await convertClientsettingsToClients();
    await deleteClientsettingsfromClients();
    console.log("UPDATE FINISHED.");
};