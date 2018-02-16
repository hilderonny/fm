var mongodb = require("../middlewares/db");
var localconfig = require("../config/localconfig.json");
var Db = require("../utils/db").Db;
var constants  = require("./constants");

async function migrateactivities() {
    var activities = await mongodb.get(constants.collections.activities.name).find();
    console.log(activities);
    for (var i = 0; i < activities.length; i++) {
        var activity = activities[i];
        var clientname = activity.clientId ? activity.clientId.toString : "formerportal";
        await Db.insertDynamicObject(clientname, "activities", {
            name: activity._id.toString(),
            date: new Date(activity.date).getTime(),
            label: activity.name,
            task: activity.task,
            isdone: activity.isDone,
            activitytypename: activity.type,
            comment: activity.comment,
            createdbyusername: activity.createdByUserId.toString(),
            isforallusers: activity.isForAllUsers
        });
    }
}

async function migratebusinesspartners() {} // Tabellen NICHT anlegen, wurde bereits von migrateclients erledigt

async function migrateclientmodules() {}

async function migrateclients() {
    console.log("Preparing clients ...");
    var clients = await mongodb.get(constants.collections.clients.name).find();
    for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        console.log(`Preparing client "${client.name}" ...`);
        await Db.createClient(client._id.toString(), client.name);
    }
    // Create separate client for former portal
    console.log("Preparing former portal ...");
    await Db.createClient("formerportal", "ehemals Portal");
}

async function migrateclientsettings() {
    console.log("Migrating clientsettings ...");
    var clientsettings = await mongodb.get(constants.collections.clientsettings.name).find();
    for (var i = 0; i < clientsettings.length; i++) {
        var clientsetting = clientsettings[i];
        await Db.insertDynamicObject(Db.PortalDatabaseName, "clientsettings", {
            name: clientsetting._id.toString(),
            logourl: clientsetting.logourl,
            clientname: clientsetting.clientId.toString()
        });
    }
}

async function migratecommunications() {} // Tabellen NICHT anlegen, wurde bereits von migrateclients erledigt

async function migratedocuments() {} // Tabellen NICHT anlegen, wurde bereits von migrateclients erledigt

async function migratedynamicattributeoptions() {} // Tabellen NICHT anlegen, wurde bereits von migrateclients erledigt

async function migratedynamicattributes() {} // Tabellen NICHT anlegen, wurde bereits von migrateclients erledigt

async function migratedynamicattributevalues() {} // Tabellen NICHT anlegen, wurde bereits von migrateclients erledigt

async function migratefmobjects() {} // Tabellen NICHT anlegen, wurde bereits von migrateclients erledigt

async function migratefolders() {} // Tabellen NICHT anlegen, wurde bereits von migrateclients erledigt

async function migratemarkers() {} // Tabellen NICHT anlegen, wurde bereits von migrateclients erledigt

async function migratenotes() {} // Tabellen NICHT anlegen, wurde bereits von migrateclients erledigt

async function migratepartneraddresses() {} // Tabellen NICHT anlegen, wurde bereits von migrateclients erledigt

async function migratepermissions() {} // Tabellen NICHT anlegen, wurde bereits von migrateclients erledigt

async function migratepersons() {} // Tabellen NICHT anlegen, wurde bereits von migrateclients erledigt

async function migrateportalmodules() {
    console.log("Migrating portalmodules ...");
    var portalmodules = await mongodb.get(constants.collections.portalmodules.name).find();
    for (var i = 0; i < portalmodules.length; i++) {
        var portalmodule = portalmodules[i];
        await Db.insertDynamicObject(Db.PortalDatabaseName, "portalmodules", {
            name: portalmodule._id.toString(),
            portalname: portalmodule.portalId.toString(),
            modulename: portalmodule.module
        });
    }
}

async function migrateportals() {
    console.log("Migrating portals ...");
    var portals = await mongodb.get(constants.collections.portals.name).find();
    for (var i = 0; i < portals.length; i++) {
        var portal = portals[i];
        await Db.insertDynamicObject(Db.PortalDatabaseName, "portals", {
            name: portal._id.toString(),
            label: portal.name,
            isactive: portal.isActive,
            url: portal.url,
            comment: portal.comment,
            licensekey: portal.licenseKey,
            version: portal.version,
            lastnotification: portal.lastNotification
        });
    }
}

async function migraterelations() {}

async function migrateusergroups() {}

async function migrateusers() {}

module.exports.copydatabasefrommongodbtopostgresql = async() => {
    console.log(`Migrating database from ${localconfig.dbName} to ${localconfig.dbhost}/${localconfig.dbprefix} ...`);
    await Db.createDefaultPortalTables();
    // License server stuff
    await migrateportals();
    await migrateportalmodules();
    // Portal stuff
    await migrateclients();
    await migrateclientsettings();
    await migrateclientmodules();
    // Client stuff
    await migrateusergroups();
    await migrateusers();
    await migratepermissions();
    await migrateactivities();
    await migratebusinesspartners();
    await migratepersons();
    await migratepartneraddresses();
    await migratecommunications();
    await migratedynamicattributes();
    await migratedynamicattributeoptions();
    await migratedynamicattributevalues();
    await migratefmobjects();
    await migratefolders();
    await migratedocuments();
    await migratemarkers();
    await migratenotes();
    await migraterelations();
    console.log("Migration done.");
}