var Db = require("./utils/db").Db;
var co = require("./utils/constants");

/**
 * Update scripts which are run at system startup, when the localconfig flag "applymigration" is set to true
 */
module.exports = async() => {
    console.log("UPDATING ON START ...");
    var clients = (await Db.query(Db.PortalDatabaseName, "SELECT name FROM clients;")).rows;
    console.log("Migrating FM objects ...");
    for (var i = 0; i < clients.length; i++) {
        var clientname = clients[i].name;
        await Db.query(clientname, "DELETE FROM projects;");
        await Db.query(clientname, "DELETE FROM properties;");
        await Db.query(clientname, "DELETE FROM buildings;");
        await Db.query(clientname, "DELETE FROM levels;");
        await Db.query(clientname, "DELETE FROM rooms;");
        await Db.query(clientname, "DELETE FROM areas;");
        var fmobjects = await Db.getDynamicObjects(clientname, co.collections.fmobjects.name);
        for (var j = 0; j < fmobjects.length; j++) {
            var fmo = fmobjects[j];
            switch (fmo.fmobjecttypename) {
                case "FMOBJECTS_TYPE_PROJECT": 
                    break;
                case "FMOBJECTS_TYPE_PROPERTY": 
                    break;
                case "FMOBJECTS_TYPE_BUILDING": 
                    break;
                case "FMOBJECTS_TYPE_LEVEL": 
                    break;
                case "FMOBJECTS_TYPE_ROOM": 
                    break;
                case "FMOBJECTS_TYPE_AREA": 
                    break;
                case "FMOBJECTS_TYPE_INVENTORY": 
                    break;
                default: console.log(`Cannot migrate unknow FM object type "${fmo.fmobjecttypename}"`); break;
            }
        }
    }
};