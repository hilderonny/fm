var Db = require("./db").Db;
var co = require("./constants");
var ch = require("./calculationhelper");
var rimraf = require("rimraf");
var lc = require('../config/localconfig.json');
var path = require("path");
var fs = require("fs");


async function deleteOldDatatypes(){    
    var recordtypes=["communicationmediums", "communications","communicationtypes","fmobjects","fmobjecttypes"];
    for(type=0; type<recordtypes.length; type++){
        //first delete the recordtype from portal
        await Db.deleteRecordType(Db.PortalDatabaseName, recordtypes[type]);
        //Then delete it from all clients
        var clientsresult = (await Db.query(Db.PortalDatabaseName, `SELECT * FROM clients;`)).rows;
        for(i=0; i<clientsresult.length; i++ )
        {
            await Db.deleteRecordType(clientsresult[i].name, recordtypes[type]);
        }        
    }
}

/**
 * Update scripts which are run at system startup, when the localconfig flag "applyupdates" is set to true
 */
module.exports = async() => {
    console.log("UPDATING ON START ...");
    await deleteOldDatatypes();    
    console.log("UPDATE FINISHED.");
};