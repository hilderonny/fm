var mongodb = require("../middlewares/db");
var localconfig = require("../config/localconfig.json");
var Db = require("../utils/db").Db;
var constants  = require("./constants");
var mc = require('../config/module-config.json'); // http://stackoverflow.com/a/14678694
var path = require("path");
var dh = require("./documentsHelper");
var fs = require("fs");

function getclientname(obj) {
    return obj.clientId ? obj.clientId.toString() : Db.PortalDatabaseName;
}

async function migrateforclients(collectionname, migratorfunc, singleelementhandler) {
    console.log(`Migrating ${collectionname} ...`);
    var originalelements = await mongodb.get(collectionname).find();
    for (var i = 0; i < originalelements.length; i++) {
        var originalelement = originalelements[i];
        var clientname = getclientname(originalelement);
        var mappedelement = migratorfunc(originalelement);
        if (mappedelement) {
            try {
                await Db.insertDynamicObject(clientname, collectionname, mappedelement);
            } catch(err) {
                await Db.query(clientname, `DELETE FROM ${Db.replaceQuotesAndRemoveSemicolon(collectionname)} WHERE name='${Db.replaceQuotes(mappedelement.name)}';`);
                await Db.insertDynamicObject(clientname, collectionname, mappedelement);
            }
        }
        if (singleelementhandler) singleelementhandler(originalelement, mappedelement); // For documents
    }
}

async function migrateforportal(collectionname, migratorfunc) {
    console.log(`Migrating ${collectionname} ...`);
    await Db.query(Db.PortalDatabaseName, `DELETE FROM ${Db.replaceQuotesAndRemoveSemicolon(collectionname)};`);
    var originalelements = await mongodb.get(collectionname).find();
    for (var i = 0; i < originalelements.length; i++) {
        var originalelement = originalelements[i];
        var mappedelement = migratorfunc(originalelement);
        if (mappedelement) await Db.insertDynamicObject(Db.PortalDatabaseName, collectionname, mappedelement);
    }
}

async function migrateactivities() {
    await migrateforclients(constants.collections.activities.name, (orig) => {
        return {
            name: orig._id.toString(),
            date: new Date(orig.date).getTime(),
            label: orig.name,
            task: orig.task,
            isdone: !!orig.isDone,
            activitytypename: orig.type,
            comment: orig.comment,
            createdbyusername: orig.createdByUserId.toString(),
            isforallusers: !!orig.isForAllUsers
        };
    });
}

async function migratebusinesspartners() {
    await migrateforclients(constants.collections.businesspartners.name, (orig) => {
        return {
            name: orig._id.toString(),
            label: orig.name,
            industry: orig.industry,
            rolle: orig.rolle,
            isjuristic: !!orig.isJuristic
        };
    });
}

async function migrateclientmodules() {
    console.log("Migrating clientmodules ...");
    await Db.query(Db.PortalDatabaseName, "DELETE FROM clientmodules;");
    var migrateclientmodules = await mongodb.get(constants.collections.clientmodules.name).find();
    for (var i = 0; i < migrateclientmodules.length; i++) {
        var clientmodule = migrateclientmodules[i];
        if (!mc.modules[clientmodule.module].forclients) continue;
        await Db.query(Db.PortalDatabaseName, `INSERT INTO clientmodules (clientname, modulename) VALUES('${Db.replaceQuotes(getclientname(clientmodule))}', '${Db.replaceQuotes(clientmodule.module)}');`);
    }
}

async function migrateclients() {
    console.log("Preparing clients ...");
    var clients = await mongodb.get(constants.collections.clients.name).find();
    for (var i = 0; i < clients.length; i++) {
        var client = clients[i];
        console.log(`Preparing client "${client.name}" ...`);
        await Db.deleteClient(client._id.toString());
        await Db.createClient(client._id.toString(), client.name);
    }
}

async function migrateclientsettings() {
    await migrateforportal(constants.collections.clientsettings.name, (orig) => {
        return {
            name: orig._id.toString(),
            logourl: orig.logourl,
            clientname: getclientname(orig)
        };
    });
}

async function migratecommunications() {
    await migrateforclients(constants.collections.communications.name, (orig) => {
        return {
            name: orig._id.toString(),
            contact: orig.contact,
            personname: orig.personId.toString(),
            communicationtypename: orig.medium + orig.type
        };
    });
}

async function migratedocuments() {
    await migrateforclients(constants.collections.documents.name, (orig) => {
        return {
            name: orig._id.toString(),
            label: orig.name,
            parentfoldername: orig.parentFolderId ? orig.parentFolderId.toString() : null,
            type: orig.type,
            isshared: !!orig.isShared
        };
    }, (original, mapped) => {
        var clientname = original.clientId ? original.clientId.toString() : Db.PortalDatabaseName;
        var fromPath = path.join(__dirname, '..', localconfig.documentspath ? localconfig.documentspath : 'documents', mapped.name);
        if (!fs.existsSync(fromPath)) return; // File does not exist
        var toPath = dh.getDocumentPath(clientname, mapped.name);
        dh.createPath(path.dirname(toPath));
        fs.writeFileSync(toPath, fs.readFileSync(fromPath)); // copyFileSync erst ab Node 8.5.0
    });
}

async function migratedynamicattributeoptions() {
    await migrateforclients(constants.collections.dynamicattributeoptions.name, (orig) => {
        return {
            name: orig._id.toString(),
            dynamicattributename: orig.dynamicAttributeId.toString(),
            label: orig.text_de ? orig.text_de : orig.text_en,
            value: orig.value
        };
    });
}

async function migratedynamicattributes() {
    await migrateforclients(constants.collections.dynamicattributes.name, (orig) => {
        return {
            name: orig._id.toString(),
            modelname: orig.modelName,
            label: orig.name_de ? orig.name_de : orig.name_en,
            dynamicattributetypename: orig.type,
            identifier: orig.identifier
        };
    });
}

async function migratedynamicattributevalues() {
    await migrateforclients(constants.collections.dynamicattributevalues.name, (orig) => {
        return {
            name: orig._id.toString(),
            entityname: orig.entityId.toString(),
            dynamicattributename: orig.dynamicAttributeId.toString(),
            value: orig.value
        };
    });
}

async function migratefmobjects() {
    await migrateforclients(constants.collections.fmobjects.name, (orig) => {
        return {
            name: orig._id.toString(),
            label: orig.name,
            fmobjecttypename: orig.type,
            parentfmobjectname: orig.parentId ? orig.parentId.toString() : null,
            previewimagedocumentname: orig.previewImageId ? orig.previewImageId.toString() : null,
            areatypename: orig.areatype,
            f: orig.f,
            bgf: orig.nbgf,
            areausagestatename: orig.usagestate,
            nrf: orig.nrf,
            nuf: orig.nuf,
            tf: orig.tf,
            vf: orig.vf
        };
    });
}

async function migratefolders() {
    await migrateforclients(constants.collections.folders.name, (orig) => {
        return {
            name: orig._id.toString(),
            label: orig.name,
            parentfoldername: orig.parentFolderId ? orig.parentFolderId.toString() : null
        };
    });
}

async function migratemarkers() {
    await migrateforclients(constants.collections.markers.name, (orig) => {
        return {
            name: orig._id.toString(),
            label: orig.name,
            lat: orig.lat,
            lon: orig.lng
        };
    });
}

async function migratenotes() {
    await migrateforclients(constants.collections.notes.name, (orig) => {
        return {
            name: orig._id.toString(),
            content: orig.content
        };
    });
}

async function migratepartneraddresses() {
    await migrateforclients(constants.collections.partneraddresses.name, (orig) => {
        return {
            name: orig._id.toString(),
            addressee: orig.addressee,
            businesspartnername: orig.partnerId.toString(),
            street: orig.street,
            postcode: orig.postcode,
            city: orig.city,
            partneraddresstypename: orig.type
        };
    });
}

async function migratepermissions() {
    var originalelements = await mongodb.get(constants.collections.permissions.name).find();
    for (var i = 0; i < originalelements.length; i++) {
        var orig = originalelements[i];
        var clientname = getclientname(orig);
        try {
            await Db.query(clientname, `INSERT INTO permissions (usergroupname, key, canwrite) VALUES('${orig.userGroupId.toString()}', '${orig.key}', ${!!orig.canWrite})`);
        } catch(err) {
            await Db.query(clientname, `UPDATE permissions SET canwrite = ${!!orig.canWrite} WHERE usergroupname = '${orig.userGroupId.toString()}' AND key = '${orig.key}'`);
        }
    }
}

async function migratepersons() {
    await migrateforclients(constants.collections.persons.name, (orig) => {
        return {
            name: orig._id.toString(),
            firstname: orig.firstname,
            lastname: orig.lastname,
            description: orig.description
        };
    });
}

async function migrateportalmodules() {
    console.log("Migrating portalmodules ...");
    await Db.query(Db.PortalDatabaseName, "DELETE FROM portalmodules;");
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
    await Db.query(Db.PortalDatabaseName, "DELETE FROM portals;");
    var portals = await mongodb.get(constants.collections.portals.name).find();
    for (var i = 0; i < portals.length; i++) {
        var portal = portals[i];
        await Db.insertDynamicObject(Db.PortalDatabaseName, "portals", {
            name: portal._id.toString(),
            label: portal.name,
            isactive: !!portal.isActive,
            url: portal.url,
            comment: portal.comment,
            licensekey: portal.licenseKey,
            version: portal.version,
            lastnotification: portal.lastNotification
        });
    }
}

async function migraterelations() {
    await migrateforclients(constants.collections.relations.name, (orig) => {
        return {
            name: orig._id.toString(),
            datatype1name: orig.type1,
            name1: orig.id1.toString(),
            datatype2name: orig.type2,
            name2: orig.id2.toString()
        };
    });
}

async function migrateusergroups() {
    await migrateforclients(constants.collections.usergroups.name, (orig) => {
        return {
            name: orig._id.toString(),
            label: orig.name
        };
    });
}

async function migrateusers() {
    console.log("Migrating users ...");
    var usernames = {};
    await Db.query(Db.PortalDatabaseName, "DELETE FROM allusers;");
    var originalusers = await mongodb.get(constants.collections.users.name).find();
    for (var i = 0; i < originalusers.length; i++) {
        var originaluser = originalusers[i];
        var clientname = getclientname(originaluser);
        var username = (usernames[originaluser.name]) ? clientname + "_" + originaluser.name : originaluser.name;
        usernames[username] = true;
        var mappeduser = {
            name: username,
            label: username,
            password: originaluser.pass,
            usergroupname: originaluser.userGroupId.toString(),
            isadmin: !!originaluser.isAdmin
        };
        try { // Maybe double names due to corrupt databases
            await Db.query(Db.PortalDatabaseName, `INSERT INTO allusers (name, password, clientname) VALUES('${Db.replaceQuotes(username)}','${Db.replaceQuotes(originaluser.pass)}','${Db.replaceQuotes(clientname)}');`);
            await Db.insertDynamicObject(clientname, "users", mappeduser);
        } catch(err) {
            console.log(err);
        }
    }
}

module.exports.copydatabasefrommongodbtopostgresql = async() => {
    console.log(`Migrating database from ${localconfig.dbName} to ${localconfig.dbhost}/${localconfig.dbprefix} ...`);
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

migratepermissions();