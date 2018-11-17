var Db = require("./db").Db;
var co = require("./constants");
var ch = require("./calculationhelper");
var rimraf = require("rimraf");
var lc = require('../config/localconfig.json');
var path = require("path");
var fs = require("fs");


async function deleteBelagartenfromRaumbuch(){    
    /**get all clients
     * remove the relation between raumbauch app and flooringeditor view
     */
        var clientsresult = (await Db.query(Db.PortalDatabaseName, `SELECT * FROM clients;`)).rows;
        for(i=0; i<clientsresult.length; i++ )
        {
            await Db.query(clientsresult[i].name, "DELETE FROM relations WHERE name = 'raumbuchflooringeditor';");
        }       
}



/**
 * Update scripts which are run at system startup, when the localconfig flag "applyupdates" is set to true
 */
module.exports = async() => {
    console.log("UPDATING ON START ...");

    await deleteBelagartenfromRaumbuch();
     
    console.log("UPDATE FINISHED.");
};