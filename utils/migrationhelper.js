var mongodb = require("../middlewares/db");
var localconfig = require("../config/localconfig.json");
var Db = require("../utils/db").Db;
var constants  = require("./constants");

async function migrateforclients(collectionname, migratorfunc, singleelementhandler) {
    console.log(`Migrating ${collectionname} ...`);
    var originalelements = await mongodb.get(collectionname).find();
    for (var i = 0; i < originalelements.length; i++) {
        var originalelement = originalelements[i];
        var clientname = originalelement.clientId ? originalelement.clientId.toString() : "formerportal";
        var mappedelement = migratorfunc(originalelement);
        if (mappedelement) {
            try {
                await Db.insertDynamicObject(clientname, collectionname, mappedelement);
            } catch(err) {
                await Db.query(clientname, `DELETE FROM ${collectionname} WHERE name='${mappedelement.name}';`);
                await Db.insertDynamicObject(clientname, collectionname, mappedelement);
            }
        }
        if (singleelementhandler) singleelementhandler(originalelement, mappedelement); // For documents
    }
}

async function migrateforportal(collectionname, migratorfunc) {
    console.log(`Migrating ${collectionname} ...`);
    await Db.query(Db.PortalDatabaseName, `DELETE FROM ${collectionname};`);
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
    await migrateforportal(constants.collections.clientmodules.name, (orig) => {
        return {
            name: orig._id.toString(),
            clientname: orig.clientId.toString(),
            modulename: orig.module
        };
    });
}

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
    await migrateforportal(constants.collections.clientsettings.name, (orig) => {
        return {
            name: orig._id.toString(),
            logourl: orig.logourl,
            clientname: orig.clientId.toString()
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
        // TODO: Move files
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
            areacategoryname: orig.category,
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
    var permissionmap = {
        ADMINISTRATION_CLIENT: 'clients',
        ADMINISTRATION_SETTINGS: undefined,
        ADMINISTRATION_USER: 'users',
        ADMINISTRATION_USERGROUP: 'usergroups',
        BIM_AREAS: 'fmobjects',
        BIM_FMOBJECT: 'fmobjects',
        CORE_RELATIONS: 'relations',
        CRM_BUSINESSPARTNERS: 'businesspartners',
        CRM_PERSONS: 'persons',
        LICENSESERVER_PORTAL: 'portals',
        OFFICE_ACTIVITY: 'activities',
        OFFICE_DOCUMENT: 'documents',
        OFFICE_NOTE: 'notes',
        SETTINGS_CLIENT: 'clientsettings',
        SETTINGS_CLIENT_DYNAMICATTRIBUTES: undefined,
        SETTINGS_PORTAL: undefined,
        SETTINGS_USER: undefined
    }
    await migrateforclients(constants.collections.permissions.name, (orig) => {
        var datatypename = permissionmap[orig.key];
        return datatypename ? {
            name: orig._id.toString(),
            usergroupname: orig.userGroupId.toString(),
            canwrite: !!orig.canWrite,
            datatypename: permissionmap[orig.key]
        } : undefined;
    });
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
            name: orig._id.toString()
        };
    });
}

async function migrateusers() {
    console.log("Migrating users ...");
    var originalusers = await mongodb.get(constants.collections.users.name).find();
    for (var i = 0; i < originalusers.length; i++) {
        var originaluser = originalusers[i];
        var clientname = originaluser.clientId ? originaluser.clientId.toString() : "formerportal";
        var mappedalluser = {
            name: originaluser.name,
            password: originaluser.pass,
            clientname: clientname
        };
        var mappeduser = {
            name: originaluser.name,
            password: originaluser.pass,
            usergroupname: originaluser.userGroupId.toString(),
            isadmin: !!originaluser.isAdmin
        };
        try { // Maybe double names due to corrupt databases
            await Db.insertDynamicObject(Db.PortalDatabaseName, "allusers", mappedalluser);
            await Db.insertDynamicObject(clientname, "users", mappeduser);
        } catch(err) {
            console.log(err);
        }
    }
}

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