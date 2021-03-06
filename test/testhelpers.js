/**
 * This file provides functions for preparing test data for several tests.
 * @example require('testhelper').doLoginAndGetToken('admin', 'admin').then(function(token){ ... });
 */
var superTest = require('supertest');
var app = require('../app');
var bcryptjs = require('bcryptjs');
var assert = require('assert');
var hat = require('hat');
var fs = require('fs');
var path = require('path');
var localConfig = require('../config/localconfig.json'); // http://stackoverflow.com/a/14678694
var documentsHelper = require('../utils/documentsHelper');
var ch = require('../utils/calculationhelper');
var moduleConfig = require('../config/module-config.json');
var co = require('../utils/constants');
var Db = require("../utils/db").Db;

var th = module.exports;

th.waitForServer = async() => {
    return new Promise((resolve, reject) => {
        var counts = 100;
        function check() {
            counts = counts - 1;
            if (counts < 1) reject("Timeout waiting for server");
            if (app.server) {
                th.get = superTest(app.server).get;
                th.post = superTest(app.server).post;
                th.put = superTest(app.server).put;
                th.del = superTest(app.server).del;
                resolve();
            }
            else setTimeout(check, 100);
        }
        setTimeout(check, 100);
    });
}

th.dbObjects = {};

// Generate license key with hat, https://github.com/substack/node-hat
var generateLicenseKey = () => {
    return hat(1024, 32);
};

th.cleanDatabase = async () => {
    if (app.running) return;
    app.running = true;
    var dbprefix = Db.replaceQuotes(process.env.POSTGRESQL_TEST_DBPREFIX  || 'test');
    var portalDatabases = await Db.queryDirect("postgres", `SELECT * FROM pg_database WHERE datname like '${dbprefix}_%';`);
    for (var i = 0; i < portalDatabases.rowCount; i++) {
        await Db.queryDirect("postgres", `DROP DATABASE IF EXISTS ${Db.replaceQuotesAndRemoveSemicolon(portalDatabases.rows[i].datname)};`);
    }
    await app.init();
    await th.waitForServer(); // Auf Serverstart warten, dieser initialisiert die Datenbank
};

th.cleanTable = async(tablename, inportal, inclients) => {
    // Ignore errors where one wants to delete elements from a non existing database, see th.preparedynamicobjects()
    if (inclients) {
        try { await Db.query("client0", `DELETE FROM ${tablename};`); } catch(err) {}
        try { await Db.query("client1", `DELETE FROM ${tablename};`); } catch(err) {}
    }
    if (inportal) try { await Db.query(Db.PortalDatabaseName, `DELETE FROM ${tablename};`); } catch(err) {}
};

th.doLoginAndGetToken = async(username, password) => {
    return (await th.post("/api/login").send({ username: username, password: password })).body.token;
};

th.prepareClients = async() => {
    await th.cleanTable("clients", true, false);
    await Db.createClient("client0", "client0");
    await Db.createClient("client1", "client1");
};

th.prepareClientModules = async() => {
    await th.cleanTable("clientmodules", true, false);
    var modulenames = Object.keys(co.modules);
    for (var i = 0; i < modulenames.length; i++) {
        var modulename = modulenames[i];
        var mod = moduleConfig.modules[modulename];
        if (!mod.forclients) continue; // Ignore portal modules
        await Db.query(Db.PortalDatabaseName, `INSERT INTO clientmodules (clientname, modulename) VALUES ('client0', '${modulename}');`);
        await Db.query(Db.PortalDatabaseName, `INSERT INTO clientmodules (clientname, modulename) VALUES ('client1', '${modulename}');`);
    }
};


th.removeClientModule = async(clientname, modulename) => {
    await Db.query(Db.PortalDatabaseName, `DELETE FROM clientmodules WHERE clientname='${clientname}' AND modulename='${modulename}';`);
};

th.prepareUserGroups = async() => {
    await th.cleanTable("usergroups", true, true);
    await Db.insertDynamicObject(Db.PortalDatabaseName, "usergroups", { name: "portal_usergroup0" });
    await Db.insertDynamicObject("client0", "usergroups", { name: "client0_usergroup0" });
    await Db.insertDynamicObject("client0", "usergroups", { name: "client0_usergroup1" });
    await Db.insertDynamicObject("client1", "usergroups", { name: "client1_usergroup0" });
};

th.prepareUsers = async() => {
    // Delete user cache from auth middleware to force it to reconstruct itself
    require("../middlewares/auth").usercache = {};
    await th.cleanTable("users", true, true);
    await th.cleanTable("allusers", true, false);
    var hashedPassword = '$2a$10$mH67nsfTbmAFqhNo85Mz4.SuQ3kyZbiYslNdRDHhaSO8FbMuNH75S'; // Encrypted version of 'test'. Because bryptjs is very slow in tests.
    await Db.query(Db.PortalDatabaseName, `INSERT INTO users (name, label, password, usergroupname, isadmin) VALUES ('${Db.PortalDatabaseName}_usergroup0_user0', 'userlabel', '${hashedPassword}', '${Db.PortalDatabaseName}_usergroup0',false);`);
    await Db.query(Db.PortalDatabaseName, `INSERT INTO users (name, label, password, usergroupname, isadmin) VALUES ('${Db.PortalDatabaseName}_usergroup0_user1', 'userlabel', '${hashedPassword}', '${Db.PortalDatabaseName}_usergroup0',true);`);
    await Db.query("client0", `INSERT INTO users (name, label, password, usergroupname, isadmin) VALUES ('client0_usergroup0_user0', 'userlabel', '${hashedPassword}', 'client0_usergroup0',false);`);
    await Db.query("client0", `INSERT INTO users (name, label, password, usergroupname, isadmin) VALUES ('client0_usergroup0_user1', 'userlabel', '${hashedPassword}', 'client0_usergroup0',true);`);
    await Db.query(Db.PortalDatabaseName, `INSERT INTO allusers (name, password, clientname) VALUES ('${Db.PortalDatabaseName}_usergroup0_user0', '${hashedPassword}', '${Db.PortalDatabaseName}');`);
    await Db.query(Db.PortalDatabaseName, `INSERT INTO allusers (name, password, clientname) VALUES ('${Db.PortalDatabaseName}_usergroup0_user1', '${hashedPassword}', '${Db.PortalDatabaseName}');`);
    await Db.query(Db.PortalDatabaseName, `INSERT INTO allusers (name, password, clientname) VALUES ('client0_usergroup0_user0', '${hashedPassword}', 'client0');`);
    await Db.query(Db.PortalDatabaseName, `INSERT INTO allusers (name, password, clientname) VALUES ('client0_usergroup0_user1', '${hashedPassword}', 'client0');`);
};

/**
 * Creates default permissions with read / write for each user group for each permission key.
 * Can be deleted selectively within tests
 */
th.preparePermissions = async() => {
    await th.cleanTable("permissions", true, true);
    var permissionkeys = Object.keys(co.permissions);
    for (var i = 0; i < permissionkeys.length; i++) {
        var permission = co.permissions[permissionkeys[i]];
        await Db.query("client0", `INSERT INTO permissions (usergroupname, key, canwrite) VALUES('client0_usergroup0', '${permission}', true);`);
        await Db.query(Db.PortalDatabaseName, `INSERT INTO permissions (usergroupname, key, canwrite) VALUES('${Db.PortalDatabaseName}_usergroup0', '${permission}', true);`);
    }
};

th.prepareBusinessPartners = async() => {
    await th.cleanTable("businesspartners", false, true);
    await Db.insertDynamicObject("client0", "businesspartners", { name: "client0_businesspartner0", label: "bp0", industry: "industry0", rolle: "rolle0", isjuristic: false });
    await Db.insertDynamicObject("client0", "businesspartners", { name: "client0_businesspartner1", label: "bp1", industry: "industry1", rolle: "rolle1", isjuristic: true });
    await Db.insertDynamicObject("client1", "businesspartners", { name: "client1_businesspartner0", label: "bp2", industry: "industry2", rolle: "rolle2", isjuristic: true });
};

th.preparePartnerAddresses = async() => {
    await th.cleanTable("partneraddresses", false, true);
    await Db.insertDynamicObject("client0", "partneraddresses", { name: "client0_partneraddress0", addressee: "addressee0", businesspartnername: "client0_businesspartner0", street: "street0", postcode: "postcode0", city: "city0", partneraddresstypename: "Primaryaddress" });
    await Db.insertDynamicObject("client0", "partneraddresses", { name: "client0_partneraddress1", addressee: "addressee1", businesspartnername: "client0_businesspartner1", street: "street1", postcode: "postcode1", city: "city1", partneraddresstypename: "Postaddress" });
};

th.preparePersons = async() => {
    await th.cleanTable("persons", false, true);
    await Db.insertDynamicObject("client0", "persons", { name: "client0_person0", firstname: "fn0", lastname: "ln0", description: "d0" });
    await Db.insertDynamicObject("client0", "persons", { name: "client0_person1", firstname: "fn1", lastname: "ln1", description: "d1" });
    await Db.insertDynamicObject("client1", "persons", { name: "client1_person0", firstname: "fn2", lastname: "ln2", description: "d2" });
};

th.prepareNotes = async() => {
    await th.cleanTable("notes", false, true);
    await Db.insertDynamicObject("client0", "notes", { name: "client0_note0", content: "content0" });
    await Db.insertDynamicObject("client0", "notes", { name: "client0_note1", content: "content1" });
};

th.removeReadPermission = async(clientname, usergroupname, permissionkey) => {
    await Db.query(clientname, `DELETE FROM permissions WHERE usergroupname='${usergroupname}' AND key='${permissionkey}';`);
};

th.removeWritePermission = async(clientname, usergroupname, permissionkey) => {
    await Db.query(clientname, `UPDATE permissions SET canwrite=false WHERE usergroupname='${usergroupname}' AND key='${permissionkey}';`);
};

th.preparePortals = async() => {
    await th.cleanTable("portals", true, false);
    var nowTicks = (new Date()).getTime();
    await Db.insertDynamicObject(Db.PortalDatabaseName, "portals", { name: "portal_portal0", label: "label", isactive: true, url: "url", comment: "comment", licensekey: "licensekey0", version: "1.0", lastnotification:nowTicks - 1000000 });
    await Db.insertDynamicObject(Db.PortalDatabaseName, "portals", { name: "portal_portal1", label: "label", isactive: false, url: "url", comment: "comment", licensekey: "licensekey1", version: "1.0", lastnotification:nowTicks - 2000000 });
};

th.preparePortalModules = async() => {
    await th.cleanTable("portalmodules", true, false);
    await Db.insertDynamicObject(Db.PortalDatabaseName, "portalmodules", { name: "portal_portalmodule0", portalname: "portal_portal0", modulename: co.modules.base });
    await Db.insertDynamicObject(Db.PortalDatabaseName, "portalmodules", { name: "portal_portalmodule1", portalname: "portal_portal0", modulename: co.modules.clients });
    await Db.insertDynamicObject(Db.PortalDatabaseName, "portalmodules", { name: "portal_portalmodule2", portalname: "portal_portal0", modulename: co.modules.documents });
    await Db.insertDynamicObject(Db.PortalDatabaseName, "portalmodules", { name: "portal_portalmodule3", portalname: "portal_portal0", modulename: co.modules.fmobjects });
    await Db.insertDynamicObject(Db.PortalDatabaseName, "portalmodules", { name: "portal_portalmodule4", portalname: "portal_portal0", modulename: co.modules.portalbase });
};

th.prepareActivities = async() => {
    await th.cleanTable("activities", false, true);
    var nowTicks = (new Date()).getTime();
    await Db.insertDynamicObject("client0", "activities", { name: "client0_activity0", date: nowTicks - 172800000, label: "client0_activity0", task: null, isdone: true, activitytypename: "ACTIVITIES_TYPE_NONE", comment: "comment", createdbyusername: "client0_usergroup0_user0", isforallusers: false });
    await Db.insertDynamicObject("client0", "activities", { name: "client0_activity1", date: nowTicks - 86400000, label: "client0_activity1", task: null, isdone: false, activitytypename: "ACTIVITIES_TYPE_WARRANTY", comment: "comment", createdbyusername: "client0_usergroup0_user0", isforallusers: false });
    await Db.insertDynamicObject("client0", "activities", { name: "client0_activity2", date: nowTicks + 86400000, label: "client0_activity2", task: null, isdone: false, activitytypename: "ACTIVITIES_TYPE_CALL_ON_CUSTOMERS", comment: "comment", createdbyusername: "client0_usergroup0_user1", isforallusers: true }); // Für alle Benutzer des Mandanten zugänglich aber von anderem Benutzer
    await Db.insertDynamicObject("client0", "activities", { name: "client0_activity3", date: nowTicks - 172800000, label: "client0_activity3", task: null, isdone: false, activitytypename: "ACTIVITIES_TYPE_MAINTENANCE", comment: "comment", createdbyusername: "client0_usergroup0_user0", isforallusers: false });
    await Db.insertDynamicObject("client0", "activities", { name: "client0_activity4", date: nowTicks + 6400000, label: "client0_activity4", task: null, isdone: false, activitytypename: "ACTIVITIES_TYPE_CALL_ON_CUSTOMERS", comment: "comment", createdbyusername: "client0_usergroup0_user1", isforallusers: false }); // Anderer Benutzer aber nicht öffentlich
};

th.prepareMarkers = async() => {
    await th.cleanTable("markers", false, true);
    await Db.insertDynamicObject("client0", "markers", { name: "client0_marker0", label: "label", lat: "lat", lon: "lon" });
    await Db.insertDynamicObject("client0", "markers", { name: "client0_marker1", label: "label", lat: "lat", lon: "lon" });
};

th.prepareFmObjects = async() => {
    // await th.cleanTable("fmobjects", false, true);
    // await Db.insertDynamicObject("client0", "fmobjects", { name: "client0_fmobject0", parentfmobjectname: null, label: "label0", fmobjecttypename: "FMOBJECTS_TYPE_PROJECT", previewimagedocumentname: null, areatypename: null, f: 0, bgf: 0, areausagestatename: null, nrf: 0, nuf: 0, tf: 0, vf: 0 });
    // await Db.insertDynamicObject("client0", "fmobjects", { name: "client0_fmobject1", parentfmobjectname: null, label: "label1", fmobjecttypename: "FMOBJECTS_TYPE_PROPERTY", previewimagedocumentname: null, areatypename: null, f: 0, bgf: 0, areausagestatename: null, nrf: 0, nuf: 0, tf: 0, vf: 0 });
    // await Db.insertDynamicObject("client0", "fmobjects", { name: "client0_fmobject00", parentfmobjectname: "client0_fmobject0", label: "label00", fmobjecttypename: "FMOBJECTS_TYPE_BUILDING", previewimagedocumentname: "client0_document01", areatypename: "Büroarbeit", f: 10, bgf: 50, areausagestatename: "Eigengenutzt", nrf: 30, nuf: 5, tf: 3, vf: 2 });
    // await Db.insertDynamicObject("client0", "fmobjects", { name: "client0_fmobject000", parentfmobjectname: "client0_fmobject00", label: "label000", fmobjecttypename: "FMOBJECTS_TYPE_AREA", previewimagedocumentname: null, areatypename: null, f: 0, bgf: 0, areausagestatename: null, nrf: 0, nuf: 0, tf: 0, vf: 0 });
    // await Db.insertDynamicObject("client0", "fmobjects", { name: "client0_fmobject01", parentfmobjectname: "client0_fmobject0", label: "label01", fmobjecttypename: "FMOBJECTS_TYPE_LEVEL", previewimagedocumentname: null, areatypename: null, f: 0, bgf: 0, areausagestatename: null, nrf: 0, nuf: 0, tf: 0, vf: 0 });
    // await Db.insertDynamicObject("client1", "fmobjects", { name: "client1_fmobject0", parentfmobjectname: null, label: "label0", fmobjecttypename: "FMOBJECTS_TYPE_PROJECT", previewimagedocumentname: null, areatypename: null, f: 0, bgf: 0, areausagestatename: null, nrf: 0, nuf: 0, tf: 0, vf: 0 });
};

th.prepareFolders = async() => {
    await th.cleanTable("folders", false, true);
    await Db.insertDynamicObject("client0", "folders", { name: "client0_folder0", label: "folder0" });
    await Db.insertDynamicObject("client0", "folders", { name: "client0_folder1", label: "folder1" });
    await Db.insertDynamicObject("client0", "folders", { name: "client0_folder00", label: "folder00" });
    await Db.insertDynamicObject("client0", "folders", { name: "client0_folder01", label: "folder01" });
    await Db.insertDynamicObject("client0", "folders", { name: "client0_folder000", label: "folder000" });
    await Db.insertDynamicObject("client0", "folders", { name: "client0_folder2"});
    await Db.insertDynamicObject("client1", "folders", { name: "client1_folder0", label: "folder0" });
   
    // Relations between folders
    await th.createRelation("folders", "client0_folder0", "folders", "client0_folder00", "parentchild");
    await th.createRelation("folders", "client0_folder0", "folders", "client0_folder01", "parentchild");
    await th.createRelation("folders", "client0_folder00", "folders", "client0_folder000", "parentchild");
   
};

th.createPath = (pathToCreate) => {
    try {
        fs.statSync(pathToCreate);
        return; // Her we come only when the path exists
    }
    catch (err) {
        // path does not exist, create it
        th.createPath(path.dirname(pathToCreate));
        fs.mkdirSync(pathToCreate);
    }
}

th.prepareDocumentFiles = () => {
    var ids = [ "client0_document0", "client0_document00", "client0_document01", "client0_document000" ];
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        var filePath = documentsHelper.getDocumentPath("client0", id);
        th.createPath(path.dirname(filePath));
        fs.writeFileSync(filePath, id);
    }
};

th.removeDocumentFiles = () => {
    var filePath = documentsHelper.getDocumentPath("client0", "");
    try {
        fs.readdirSync(filePath).forEach((f) => fs.unlinkSync(path.join(filePath, f)) );
    } catch (err) {
        console.log(err); // Ignore errors, cleanup is done in next run (hope so)
    }
};

th.prepareAreas = async() => {
    // Cleaning
    await th.cleanTable("areatypes", false, true);
    await th.cleanTable("areas", false, true);
    await th.cleanTable("relations", false, true);
    // Area types
    await Db.insertDynamicObject("client0", "areatypes", { name: "client0_areatype1", number: "N1", label: "One" });
    await Db.insertDynamicObject("client0", "areatypes", { name: "client0_areatype11", number: "N11", label: "OneOne" });
    await Db.insertDynamicObject("client0", "areatypes", { name: "client0_areatype12", number: "N12", label: "OneTwo" });
    await Db.insertDynamicObject("client0", "areatypes", { name: "client0_areatype111", number: "N111", label: "OneOneOne" });
    await Db.insertDynamicObject("client0", "areatypes", { name: "client0_areatype112", number: "N112", label: "OneOneTwo" });
    await Db.insertDynamicObject("client1", "areatypes", { name: "client1_areatype1", number: "N1", label: "One" });
    // Usage states
    await Db.insertDynamicObject("client0", "areausagestates", { name: "client0_areausagestate1", label: "UsageState1" });
    await Db.insertDynamicObject("client0", "areausagestates", { name: "client0_areausagestate2", label: "UsageState2" });
    await Db.insertDynamicObject("client0", "areausagestates", { name: "client0_areausagestate3", label: "UsageState3" });
    // Relations between area types
    await th.createRelation("areatypes", "client0_areatype1", "areatypes", "client0_areatype11", "parentchild");
    await th.createRelation("areatypes", "client0_areatype1", "areatypes", "client0_areatype12", "parentchild");
    await th.createRelation("areatypes", "client0_areatype11", "areatypes", "client0_areatype111", "parentchild");
    await th.createRelation("areatypes", "client0_areatype11", "areatypes", "client0_areatype112", "parentchild");
    // Areas
    await Db.insertDynamicObject("client0", "areas", { name: "client0_area01", areacategoryname: "FMOBJECTS_CATEGORY_NUF", f: 10, label: "Area01", areausagestatename: "client0_areausagestate1" });
    await Db.insertDynamicObject("client0", "areas", { name: "client0_area02", areacategoryname: "FMOBJECTS_CATEGORY_NUF", f: 20, label: "Area02", areausagestatename: "client0_areausagestate2" });
    await Db.insertDynamicObject("client0", "areas", { name: "client0_area03", areacategoryname: "FMOBJECTS_CATEGORY_NUF", f: 30, label: "Area03", areausagestatename: "client0_areausagestate1" });
    await Db.insertDynamicObject("client0", "areas", { name: "client0_area04", areacategoryname: "FMOBJECTS_CATEGORY_TF", f: 40, label: "Area04", areausagestatename: "client0_areausagestate2" });
    await Db.insertDynamicObject("client0", "areas", { name: "client0_area05", areacategoryname: "FMOBJECTS_CATEGORY_VF", f: 50, label: "Area05", areausagestatename: "client0_areausagestate1" });
    await Db.insertDynamicObject("client0", "areas", { name: "client0_area1", areatypename: "client0_areatype1", f: 200, label: "Area1", areausagestatename: "client0_areausagestate2" });
    await Db.insertDynamicObject("client0", "areas", { name: "client0_area11", areatypename: "client0_areatype11", f: 210, label: "Area11", areausagestatename: "client0_areausagestate1" });
    await Db.insertDynamicObject("client0", "areas", { name: "client0_area12", areatypename: "client0_areatype12", f: 220, label: "Area12", areausagestatename: "client0_areausagestate2" });
    await Db.insertDynamicObject("client0", "areas", { name: "client0_area111", areatypename: "client0_areatype111", f: 211, label: "Area111", areausagestatename: "client0_areausagestate1" });
    await Db.insertDynamicObject("client0", "areas", { name: "client0_area112", areatypename: "client0_areatype112", f: 212, label: "Area112", areausagestatename: "client0_areausagestate2" });
    await Db.insertDynamicObject("client1", "areas", { name: "client1_area01", areacategoryname: "FMOBJECTS_CATEGORY_NUF", f: 10, label: "Area01", areausagestatename: "client0_areausagestate1" });
    // Rooms
    await Db.insertDynamicObject("client0", "rooms", { name: "client0_room0", label: "Room0" });
    await Db.insertDynamicObject("client0", "rooms", { name: "client0_room1", label: "Room1" });
    await Db.insertDynamicObject("client1", "rooms", { name: "client1_room0", label: "Room0" });
    // Levels
    await Db.insertDynamicObject("client0", "levels", { name: "client0_level0", label: "Level0" });
    await Db.insertDynamicObject("client1", "levels", { name: "client1_level0", label: "Level0" });
    // Relations between areas, rooms, levels
    await th.createRelation("levels", "client0_level0", "rooms", "client0_room0", "parentchild");
    await th.createRelation("levels", "client0_level0", "rooms", "client0_room1", "parentchild");
    await th.createRelation("rooms", "client0_room0", "areas", "client0_area01", "parentchild");
    await th.createRelation("rooms", "client0_room0", "areas", "client0_area02", "parentchild");
    await th.createRelation("rooms", "client0_room1", "areas", "client0_area03", "parentchild");
    await th.createRelation("rooms", "client0_room1", "areas", "client0_area04", "parentchild");
    await th.createRelation("rooms", "client0_room1", "areas", "client0_area05", "parentchild");
    await th.createRelation("levels", "client1_level0", "rooms", "client1_room0", "parentchild");
    await th.createRelation("rooms", "client1_room0", "areas", "client1_area01", "parentchild");
    await th.createRelation("rooms", "client0_room0", "areas", "client0_area1", "parentchild");
    await th.createRelation("rooms", "client0_room0", "areas", "client0_area11", "parentchild");
    await th.createRelation("rooms", "client0_room1", "areas", "client0_area12", "parentchild");
    await th.createRelation("rooms", "client0_room1", "areas", "client0_area111", "parentchild");
    await th.createRelation("rooms", "client0_room1", "areas", "client0_area112", "parentchild");
    // Trigger calculation
    await ch.calculateformula("client0", "areatypes", "client0_areatype1");
    await ch.calculateformula("client0", "areatypes", "client0_areatype11");
    await ch.calculateformula("client0", "areatypes", "client0_areatype12");
    await ch.calculateformula("client0", "areatypes", "client0_areatype111");
    await ch.calculateformula("client0", "areatypes", "client0_areatype112");
    await ch.calculateentityandparentsrecursively("client0", "areas", "client0_area01");
    await ch.calculateentityandparentsrecursively("client0", "areas", "client0_area02");
    await ch.calculateentityandparentsrecursively("client0", "areas", "client0_area03");
    await ch.calculateentityandparentsrecursively("client0", "areas", "client0_area04");
    await ch.calculateentityandparentsrecursively("client0", "areas", "client0_area05");
    await ch.calculateentityandparentsrecursively("client1", "areas", "client1_area01");
}

th.prepareDocuments = async() => {
    await th.cleanTable("documents", false, true);
    await Db.insertDynamicObject("client0", "documents", { name: "client0_document0", label: "document0", type: "image/gif", isshared: false });
    await Db.insertDynamicObject("client0", "documents", { name: "client0_document00", label: "document00", type: "type", isshared: false });
    await Db.insertDynamicObject("client0", "documents", { name: "client0_document01", label: "document01", type: "image/png", isshared: false });
    await Db.insertDynamicObject("client0", "documents", { name: "client0_document000", label: "document000", type: "type", isshared: true });
    await Db.insertDynamicObject("client0", "documents", { name: "client0_document2", label: "documentWithoutContent", type: "type", isshared: false });
    // Relations between folders and documents
    await th.createRelation("folders", "client0_folder0", "documents", "client0_document00", "parentchild");
    await th.createRelation("folders", "client0_folder0", "documents", "client0_document01", "parentchild");
    await th.createRelation("folders", "client0_folder00", "documents", "client0_document000", "parentchild");
};

th.preparedatatypes = async() => {
    await Db.createDatatype("client0", "clientnulldatatypenull", "label0", "plurallabel0", "text0", "icon0", ["list0"], co.permissions.BIM_FMOBJECT, co.modules.fmobjects, true, true);
    await Db.createDatatype("client0", "clientnulldatatypeone", "label1", "plurallabel1", "name", "icon1", ["list1"], co.permissions.OFFICE_ACTIVITY, co.modules.documents, true, false);
    await Db.createDatatype("client0", "clientnulldatatypetwo", "label2", "plurallabel2", "name", "icon2", ["list0", "list1"], co.permissions.BIM_AREAS, co.modules.notes, false, false);
    await Db.createDatatype("client0", "clientnulldatatypethree", "label3", "plurallabel3", "name", "icon3", ["list2"], co.permissions.BIM_FMOBJECT, co.modules.fmobjects, false, false); // datatype without elements
    await Db.createDatatype("client1", "clientonedatatypenull", "label0", "plurallabel0", "name", "icon0", ["list0"], co.permissions.BIM_FMOBJECT, co.modules.fmobjects, true, true);
};

th.preparedatatypefields = async() => {
    await Db.createDatatypeField("client0", "clientnulldatatypenull", "boolean0", "Boolean0", co.fieldtypes.boolean, true, false, undefined, undefined, undefined, false); // Required, not nullable
    await Db.createDatatypeField("client0", "clientnulldatatypenull", "datetime0", "DateTime0", co.fieldtypes.datetime, false, false, undefined, undefined, undefined, true);
    await Db.createDatatypeField("client0", "clientnulldatatypenull", "decimal0", "Decimal0", co.fieldtypes.decimal, false, false, undefined, undefined, undefined, true);
    await Db.createDatatypeField("client0", "clientnulldatatypenull", "formula0", "Formula0", co.fieldtypes.formula, false, false, undefined, { childsum : "decimal0" }, 0, true);
    await Db.createDatatypeField("client0", "clientnulldatatypenull", "formula1", "Formula1", co.fieldtypes.formula, false, false, undefined, { sum : ["formula0", "decimal0"] }, 1, true);
    await Db.createDatatypeField("client0", "clientnulldatatypenull", "password0", "Password0", co.fieldtypes.password, false, false, undefined, undefined, undefined, true);
    await Db.createDatatypeField("client0", "clientnulldatatypenull", "reference0", "Reference0", co.fieldtypes.reference, false, false, "users", undefined, undefined, true);
    await Db.createDatatypeField("client0", "clientnulldatatypenull", "text0", "Text0", co.fieldtypes.text, false, false, undefined, undefined, undefined, true, false, false);
    await Db.createDatatypeField("client0", "clientnulldatatypenull", "text1", "Text1", co.fieldtypes.text, false, false, undefined, undefined, undefined, true, false, false, false, 5);
    await Db.createDatatypeField("client0", "clientnulldatatypenull", "icon", "Icon-URL", co.fieldtypes.text, false, false, undefined, undefined, undefined, true, false, false);
    await Db.createDatatypeField("client0", "clientnulldatatypeone", "datatypeonefield", "Text0", co.fieldtypes.text, false, false, undefined, undefined, undefined, true);
    await Db.createDatatypeField("client1", "clientonedatatypenull", "boolean0", "Boolean0", co.fieldtypes.boolean, false, false, undefined, undefined, undefined, true); // Required, not nullable
    await Db.createDatatypeField("client1", "clientonedatatypenull", "clientonetextnull", "Text0", co.fieldtypes.text, false, false, undefined, undefined, undefined, true);
};

th.preparedynamicobjects = async() => {
    await Db.query("client0", "DELETE FROM clientnulldatatypenull");
    await Db.query("client0", "DELETE FROM clientnulldatatypeone");
    await Db.query("client0", "DELETE FROM clientnulldatatypetwo");
    await Db.query("client1", "DELETE FROM clientonedatatypenull");
    await Db.insertDynamicObject("client0", "clientnulldatatypenull", { name: "clientnulldatatypenullentity0", boolean0: true, datetime0: 123, decimal0: 234.567, reference0: "client0_usergroup0_user0", text0: "C0D0E0", icon: "clientnulldatatypenullentity0_customicon.png" });
    await Db.insertDynamicObject("client0", "clientnulldatatypenull", { name: "clientnulldatatypenullentity1", boolean0: true, decimal0: 111, text0: "C0D0E1" });
    await Db.insertDynamicObject("client0", "clientnulldatatypenull", { name: "clientnulldatatypenullentity2", boolean0: true, decimal0: 345.789, text0: "C0D0E2" });
    await Db.insertDynamicObject("client0", "clientnulldatatypenull", { name: "clientnulldatatypenullentity3", boolean0: true, text0: "C0D0E3", icon: "clientnulldatatypenullentity3_customicon.png" });
    await Db.insertDynamicObject("client0", "clientnulldatatypenull", { name: "clientnulldatatypenullentity4", boolean0: true, text0: "C0D0E4" });
    await Db.insertDynamicObject("client0", "clientnulldatatypenull", { name: "clientnulldatatypenullentity5", boolean0: true, text0: "C0D0E5" });
    await Db.insertDynamicObject("client0", "clientnulldatatypenull", { name: "clientnulldatatypenullentity6", boolean0: true, text0: "C0D0E6" });
    await Db.insertDynamicObject("client0", "clientnulldatatypenull", { name: "clientnulldatatypenullentity7", boolean0: true, decimal0: 100, text0: "C0D0E7" });
    await Db.insertDynamicObject("client0", "clientnulldatatypeone", { name: "clientnulldatatypeoneentity0" });
    await Db.insertDynamicObject("client0", "clientnulldatatypetwo", { name: "clientnulldatatypetwoentity0" });
    await Db.insertDynamicObject("client0", "clientnulldatatypetwo", { name: "clientnulldatatypetwoentity1" });
    await Db.insertDynamicObject("client0", "clientnulldatatypetwo", { name: "clientnulldatatypetwoentity2" }); // Another root element
    await Db.insertDynamicObject("client1", "clientonedatatypenull", { name: "clientonedatatypenullentity0" });
};

th.preparerelations = async() => {
    // Only for client0
    await th.cleanTable("relations", false, true);
    await th.createRelation("clientnulldatatypenull", "clientnulldatatypenullentity0", "clientnulldatatypeone", "clientnulldatatypeoneentity0", "parentchild");
    await th.createRelation("clientnulldatatypenull", "clientnulldatatypenullentity0", "clientnulldatatypenull", "clientnulldatatypenullentity1", "dependency");
    await th.createRelation("clientnulldatatypenull", "clientnulldatatypenullentity0", "clientnulldatatypenull", "clientnulldatatypenullentity2", "parentchild");
    await th.createRelation("clientnulldatatypenull", "clientnulldatatypenullentity0", "clientnulldatatypetwo", "clientnulldatatypetwoentity0", "parentchild");
    await th.createRelation("clientnulldatatypenull", "clientnulldatatypenullentity0", "clientnulldatatypenull", "clientnulldatatypenullentity3", "parentchild");
    await th.createRelation("clientnulldatatypenull", "clientnulldatatypenullentity2", "clientnulldatatypenull", "clientnulldatatypenullentity4", "parentchild");
    await th.createRelation("clientnulldatatypetwo", "clientnulldatatypetwoentity0", "clientnulldatatypetwo", "clientnulldatatypetwoentity1", "parentchild");
    await th.createRelation("clientnulldatatypetwo", "clientnulldatatypetwoentity0", "clientnulldatatypenull", "clientnulldatatypenullentity5", "parentchild");
    await th.createRelation("clientnulldatatypenull", "clientnulldatatypenullentity5", "clientnulldatatypenull", "clientnulldatatypenullentity6", "parentchild");
};

th.prepareRelations = async() => {
    var map = {
        activities:"client0_activity0",
        businesspartners:"client0_businesspartner0",
        clients:"client0",
        communications:"client0_communication0",
        documents:"client0_document0",
        // fmobjects:"client0_fmobject0",
        folders:"client0_folder0",
        markers:"client0_marker0",
        notes:"client0_note0",
        partneraddresses:"client0_partneraddress0",
        persons:"client0_person0",
        portalmodules:"portalmodule0",
        portals:"portal0",
        usergroups:"client0_usergroup0",
        users:"client0_usergroup0_user0"
    }
    await th.cleanTable("relations", false, true);
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) {
        var datatypename = keys[i];
        var name = map[datatypename];
        await th.createRelation(datatypename, name, datatypename, name, null);
    }
};

th.prepareDynamicAttributes = async(clientname, datatypename, entityname) => {
    await th.cleanTable(co.collections.dynamicattributes.name, false, true);
    await th.cleanTable(co.collections.dynamicattributeoptions.name, false, true);
    await th.cleanTable(co.collections.dynamicattributevalues.name, false, true);
    await Db.insertDynamicObject(clientname, "dynamicattributes", { name: "da0", modelname: datatypename, label: "textattribute", dynamicattributetypename: "text", isinactive: false });
    await Db.insertDynamicObject(clientname, "dynamicattributes", { name: "da1", modelname: datatypename, label: "booleanattribute", dynamicattributetypename: "boolean", isinactive: false });
    await Db.insertDynamicObject(clientname, "dynamicattributes", { name: "da2", modelname: datatypename, label: "picklistattribute", dynamicattributetypename: "picklist", isinactive: false });
    await Db.insertDynamicObject(clientname, "dynamicattributeoptions", { name: "da2o0", dynamicattributename: "da2", label: "Weiblich", value: "w" });
    await Db.insertDynamicObject(clientname, "dynamicattributeoptions", { name: "da2o1", dynamicattributename: "da2", label: "Männlich", value: "m" });
    await Db.insertDynamicObject(clientname, "dynamicattributevalues", { name: "da0v", entityname: entityname, dynamicattributename: "da0", value: "Text" });
    await Db.insertDynamicObject(clientname, "dynamicattributevalues", { name: "da1v", entityname: entityname, dynamicattributename: "da1", value: true });
    await Db.insertDynamicObject(clientname, "dynamicattributevalues", { name: "da2v", entityname: entityname, dynamicattributename: "da2", value: "m" });
};

th.preparePredefinedDynamicAttibutesForClient = async (clientname) => {
    await th.cleanTable(co.collections.dynamicattributes.name, false, true);
    await th.cleanTable(co.collections.dynamicattributeoptions.name, false, true);
    await th.cleanTable(co.collections.dynamicattributevalues.name, false, true);
    var dynamicAttributes = [
        // Vordefinierte
        { name: clientname + "_da0", modelname: co.collections.users.name, label: 'Gewicht', dynamicattributetypename: co.dynamicAttributeTypes.text, identifier: 'gewicht', isinactive: false },
        { name: clientname + "_da1", modelname: co.collections.users.name, label: 'Geschlecht', dynamicattributetypename: co.dynamicAttributeTypes.picklist, identifier: 'geschlecht', isinactive: false },
        // Manuelle
        { name: clientname + "_da2", modelname: co.collections.users.name, label: 'Größe', dynamicattributetypename: co.dynamicAttributeTypes.text, isinactive: true },
        { name: clientname + "_da3", modelname: co.collections.users.name, label: 'Haarfarbe', dynamicattributetypename: co.dynamicAttributeTypes.picklist, isinactive: false }
    ];
    for (var i = 0; i < dynamicAttributes.length; i++) {
        await Db.insertDynamicObject(clientname, "dynamicattributes", dynamicAttributes[i]);
    }
    var dynamicAttributeOptions = [
        { name: clientname + "_dao0", dynamicattributename: clientname + "_da1", label: 'männlich', value: 'm' },
        { name: clientname + "_dao1", dynamicattributename: clientname + "_da1", label: 'weiblich', value: 'w' },
        { name: clientname + "_dao2", dynamicattributename: clientname + "_da3", label: 'braun' },
        { name: clientname + "_dao3", dynamicattributename: clientname + "_da3", label: 'blond' }
    ];
    for (var i = 0; i < dynamicAttributeOptions.length; i++) {
        await Db.insertDynamicObject(clientname, "dynamicattributeoptions", dynamicAttributeOptions[i]);
    }
    var dynamicAttributeValues = [
        { name: clientname + "_dav0", dynamicattributename: clientname + "_da0", entityname: "client0_usergroup0_user0", value: '60' },
        { name: clientname + "_dav1", dynamicattributename: clientname + "_da1", entityname: "client0_usergroup0_user0", value: clientname + "_dao1" },
        { name: clientname + "_dav2", dynamicattributename: clientname + "_da2", entityname: "client0_usergroup0_user0", value: '170' },
        { name: clientname + "_dav3", dynamicattributename: clientname + "_da3", entityname: "client0_usergroup0_user0", value: clientname + "_dao2" }
    ];
    for (var i = 0; i < dynamicAttributeValues.length; i++) {
        await Db.insertDynamicObject(clientname, "dynamicattributevalues", dynamicAttributeValues[i]);
    }
};

th.createRelation = async(datatype1name, name1, datatype2name, name2, relationtypename) => {
    await Db.insertDynamicObject("client0", "relations", { name: `client0_${datatype1name}_${name1}_${datatype2name}_${name2}`, datatype1name: datatype1name, name1: name1, datatype2name: datatype2name, name2: name2, relationtypename : relationtypename });
};

th.getModuleForApi = (api) => {
    // Use only the first parts until the slash
    api = api.split('/')[0];
    for (var moduleName in moduleConfig.modules) {
        var m = moduleConfig.modules[moduleName];
        // API
        if (m.api && m.api.find((a) => a === api))  {
            return moduleName;
        }
    };
};

th.defaults = {
    login: function(username) { return th.doLoginAndGetToken(username, "test"); },
};

th.apiTests = {
    get: {
        defaultNegative: function(api, permissionkey, client, usergroup, user, adminuser) {
            it('responds without authentication with 403', async() => {
                return th.get(`/api/${api}`).expect(403);
            });
            if (permissionkey) it('responds without read permission with 403', async() => {
                // Remove the corresponding permission
                await th.removeReadPermission(client ? client : "client0", usergroup ? usergroup : "client0_usergroup0", permissionkey);
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                await th.get(`/api/${api}?token=${token}`).expect(403);
            });
            function checkForUser(user) {
                return async() => {
                    var moduleName = th.getModuleForApi(api);
                    await th.removeClientModule(client ? client : "client0", moduleName);
                    var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                    return th.get(`/api/${api}?token=${token}`).expect(403);
                }
            }
            if (!client || client !== Db.PortalDatabaseName) it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser(user ? user : "client0_usergroup0_user0"));
            if (!client || client !== Db.PortalDatabaseName) it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser(adminuser ? adminuser : "client0_usergroup0_user1"));
        }
    },
    getForIds: {
        defaultNegative: function(api, permissionkey, collection, createTestObjects, client, usergroup, user, adminuser) {
            it('responds without authentication with 403', async() => {
                var testobjectids = (await createTestObjects(client ? client : "client0")).map(n => n._id);
                await th.get(`/api/${api}/forIds?ids=${testobjectids.join(',')}`).expect(403);
            });
            function checkForUser(user) {
                return async() => {
                    var moduleName = th.getModuleForApi(api);
                    await th.removeClientModule(client ? client : "client0", moduleName);
                    var testobjectids = (await createTestObjects(client ? client : "client0")).map(n => n._id);
                    var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                    await th.get(`/api/${api}/forIds?ids=${testobjectids.join(',')}&token=${token}`).expect(403);
                }
            }
            if (!client || client !== Db.PortalDatabaseName) it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser(user ? user : "client0_usergroup0_user0"));
            if (!client || client !== Db.PortalDatabaseName) it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser(adminuser ? adminuser : "client0_usergroup0_user1"));
            if (permissionkey) it('responds with empty list when user has no read permission', async() => {
                await th.removeReadPermission(client ? client : "client0", usergroup ? usergroup : "client0_usergroup0", permissionkey);
                var testobjectids = (await createTestObjects(client ? client : "client0")).map(n => n._id);
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                var elements = (await th.get(`/api/${api}/forIds?ids=${testobjectids.join(',')}&token=${token}`).expect(200)).body;
                assert.equal(elements.length, 0);
            });
            it('responds with empty list when query parameter "ids" does not exist', async() => {
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                var elements = (await th.get(`/api/${api}/forIds?token=${token}`).expect(200)).body;
                assert.equal(elements.length, 0);
            });
            it('returns only elements of correct ids when parameter "ids" contains invalid IDs', async() => {
                var testobjectids = (await createTestObjects(client ? client : "client0")).map(n => n._id);
                var expectedcount = testobjectids.length;
                testobjectids.push('invalidId');
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                var elements = (await th.get(`/api/${api}/forIds?ids=${testobjectids.join(',')}&token=${token}`).expect(200)).body;
                assert.equal(elements.length, expectedcount);
                for (var i = 0; i < expectedcount; i++) {
                    assert.strictEqual(testobjectids[i], elements[i]._id);
                }
            });
        },
        clientDependentNegative: function(api, collection, createTestObjects, client, usergroup, user) {
            it('returns only elements of the client of the logged in user when "ids" contains IDs of entities of another client', async() => {
                var testobjectidsclient0 = (await createTestObjects(client ? client : "client0")).map(n => n._id);
                var testobjectidsclient1 = (await createTestObjects("client1")).map(n => n._id);
                var allids = testobjectidsclient0.concat(testobjectidsclient1);
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                var elements = (await th.get(`/api/${api}/forIds?ids=${allids.join(',')}&token=${token}`).expect(200)).body;
                assert.equal(elements.length, testobjectidsclient0.length);
                for (var i = 0; i < testobjectidsclient0.length; i++) {
                    assert.strictEqual(testobjectidsclient0[i], elements[i]._id);
                }
            });
        },
        defaultPositive: function(api, collection, createTestObjects, client, usergroup, user) {
            it('returns a list of elements with all details for the given IDs', async() => {
                var testobjects = await createTestObjects(client ? client : "client0");
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                var elementsFromApi = (await th.get(`/api/${api}/forIds?ids=${testobjects.map(n => n._id).join(',')}&token=${token}`).expect(200)).body;
                assert.equal(elementsFromApi.length, testobjects.length);
                for (var i = 0; i < testobjects.length; i++) {
                    var elementFromApi = elementsFromApi[i];
                    var elementFromDatabase = testobjects[i];
                    Object.keys(elementFromDatabase).forEach(function(key) {
                        assert.ok(typeof(elementFromApi[key]) !== "undefined" || elementFromApi[key] === null, `Key ${key} not returned by API.`); // Einige Werte können null sein
                        if (elementFromApi[key] === null) {
                            assert.ok(elementFromDatabase[key] === null);
                        } else {
                            assert.strictEqual(elementFromApi[key], elementFromDatabase[key]);
                        }
                    });
                }
            });
        }
    },
    getId: {
        defaultNegative: function(api, permission, datatypename, client, usergroup, user, adminuser, ignoreNotExistingId, testObject) {
            if (!testObject) testObject = { name: "testobject" };
            it('responds without authentication with 403', async() => {
                await Db.insertDynamicObject(client ? client : "client0", datatypename, testObject);
                await th.get(`/api/${api}/${testObject.name}`).expect(403);
            });
            if (permission) it('responds without read permission with 403', async() => {
                await th.removeReadPermission(client ? client : "client0", usergroup ? usergroup : "client0_usergroup0", permission);
                await Db.insertDynamicObject(client ? client : "client0", datatypename, testObject);
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                await th.get(`/api/${api}/${testObject.name}?token=${token}`).expect(403);
            });
            function checkForUser(user) {
                return async() => {
                    var moduleName = th.getModuleForApi(api);
                    await th.removeClientModule(client ? client : "client0", moduleName);
                    await Db.insertDynamicObject(client ? client : "client0", datatypename, testObject);
                    var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                    await th.get(`/api/${api}/${testObject.name}?token=${token}`).expect(403);
                }
            }
            if (!client || client !== Db.PortalDatabaseName) it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser(user ? user : "client0_usergroup0_user0"));
            if (!client || client !== Db.PortalDatabaseName) it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser(adminuser ? adminuser : "client0_usergroup0_user1"));
            if (!ignoreNotExistingId) it('responds with not existing id with 404', async() => {
                await Db.insertDynamicObject(client ? client : "client0", datatypename, testObject);
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                await th.get(`/api/${api}/999999999999999999999999?token=${token}`).expect(404);
            });
        },
        clientDependentNegative: function(api, datatypename, client, usergroup, user, testObject) {
            if (!testObject) testObject = { name: "testobject" };
            it('responds with 404 when the object with the given ID does not belong to the client of the logged in user', async() => {
                await Db.insertDynamicObject("client1", datatypename, testObject);
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                await th.get(`/api/${api}/${testObject.name}?token=${token}`).expect(404);
            });
        }
    },
    /**
     * Testfunktionen für POST - API Requests
     */
    post: {
        /**
         * Standard-Negativtests, die das Verhalten von falschen Aufrufen prüfen
         */
        defaultNegative: function(api, permission, createTestObject, ignoreSendObjectTest, client, usergroup, user, adminuser) {
            it('responds without authentication with 403', async() => {
                var testObject = createTestObject();
                await th.post(`/api/${api}`).send(testObject).expect(403);
            });
            if (permission) it('responds without write permission with 403', async() => {
                var testObject = createTestObject();
                await th.removeWritePermission(client ? client : "client0", usergroup ? usergroup : "client0_usergroup0", permission);
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                await th.post(`/api/${api}?token=${token}`).send(testObject).expect(403);
            });
            function checkForUser(user) {
                return async() => {
                    var moduleName = th.getModuleForApi(api);
                    await th.removeClientModule(client ? client : "client0", moduleName);
                    var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                    var testObject = createTestObject();
                    await th.post(`/api/${api}?token=${token}`).send(testObject).expect(403);
                }
            }
            if (!client || client !== Db.PortalDatabaseName) it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser(user ? user : "client0_usergroup0_user0"));
            if (!client || client !== Db.PortalDatabaseName) it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser(adminuser ? adminuser : "client0_usergroup0_user1"));
            // Bei portalmanagement muss nix geschickt werden.
            if(!ignoreSendObjectTest) it('responds with 400 when not sending an object to insert', async() => {
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                await th.post(`/api/${api}?token=${token}`).expect(400);
            });
        },
        /**
         * Standardpositiv-Tests zum Prüfen, ob ein gesendetes Objekt auch
         * korrekt in der Datenbank ankommt und ob die Rückgabedaten stimmen.
         */
        defaultPositive: function(api, datatypename, createTestObject, mapFunction, client, usergroup, user) {
            it('responds with the created element containing an _id field', async() => {
                var testObject = await createTestObject();
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                var objectFromApi = (await th.post(`/api/${api}?token=${token}`).send(testObject).expect(200)).body;
                assert.ok(objectFromApi._id);
                Object.keys(testObject).forEach(function(key) {
                    assert.ok(typeof(objectFromApi[key]) !== "undefined", `Key ${key} is missing`);
                    assert.strictEqual(objectFromApi[key], testObject[key], `Key ${key} differs`);
                });
                var objectFromDatabase = mapFunction([await Db.getDynamicObject(client ? client : "client0", datatypename, objectFromApi._id)], client ? client : "client0")[0];
                Object.keys(testObject).forEach(function(key) {
                    assert.ok(typeof(objectFromDatabase[key]) !== "undefined", `Key ${key} is missing`);
                    assert.strictEqual(objectFromDatabase[key], testObject[key], `Key ${key} differs`);
                });
            });
        }
    },
    put: {
        defaultNegative: function(api, permission, createTestObject, client, usergroup, user, adminuser, withoutid) {
            it('responds without authentication with 403', async() => {
                var testObject = await createTestObject(client ? client : "client0");
                await th.put(`/api/${api}${withoutid ? "" : `/${testObject._id}`}`).send(testObject).expect(403);
            });
            if (permission) it('responds without write permission with 403', async() => {
                var testObject = await createTestObject(client ? client : "client0");
                await th.removeWritePermission(client ? client : "client0", usergroup ? usergroup : "client0_usergroup0", permission);
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                await th.put(`/api/${api}${withoutid ? "" : `/${testObject._id}`}?token=${token}`).send(testObject).expect(403);
            });
            function checkForUser(user) {
                return async() => {
                    var moduleName = th.getModuleForApi(api);
                    await th.removeClientModule(client ? client : "client0", moduleName);
                    var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                    var testObject = await createTestObject(client ? client : "client0");
                    await th.put(`/api/${api}${withoutid ? "" : `/${testObject._id}`}?token=${token}`).send(testObject).expect(403);
                }
            }
            if (!client || client !== Db.PortalDatabaseName) it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser(user ? user : "client0_usergroup0_user0"));
            if (!client || client !== Db.PortalDatabaseName) it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser(adminuser ? adminuser : "client0_usergroup0_user1"));
            it('responds with 400 when not sending an object to update', async() => {
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                var testObject = await createTestObject(client ? client : "client0");
                await th.put(`/api/${api}${withoutid ? "" : `/${testObject._id}`}?token=${token}`).expect(400);
            });
            if (!withoutid) it('responds with 404 when the name is invalid', async() => {
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                var testObject = await createTestObject(client ? client : "client0");
                await th.put(`/api/${api}/invalidId?token=${token}`).send(testObject).expect(404);
            });
            if (!withoutid) it('does not update the name when it was sent', async() => {
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                var testObject = await createTestObject(client ? client : "client0");
                var originalId = testObject._id;
                testObject._id = "newId";
                await th.put(`/api/${api}/${originalId}?token=${token}`).send(testObject).expect(200);
                await th.get(`/api/${api}/newId?token=${token}`).expect(404);
            });
        },
        clientDependentNegative: function(api, createTestObject, client, usergroup, user) {
            it('responds with 404 when the object to update does not belong to client of the logged in user', async() => {
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                var testObject = await createTestObject("client1");
                await th.put(`/api/${api}/${testObject._id}?token=${token}`).send(testObject).expect(404);
            });
            it('does not update the clientId when it was sent', async() => {
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                var testObject = await createTestObject(client ? client : "client0");
                var originalClientId = testObject.clientId;
                testObject.clientId = "newClientId";
                await th.put(`/api/${api}/${testObject._id}?token=${token}`).send(testObject).expect(200);
                var elementFromApi = (await th.get(`/api/${api}/${testObject._id}?token=${token}`).expect(200)).body;
                assert.strictEqual(elementFromApi.clientId, originalClientId);
            });
        }
    },
    delete: {
        defaultNegative: function(api, permission, getId, client, usergroup, user, adminuser) {
            it('responds without authentication with 403', async() => {
                var id = await getId(client ? client : "client0");
                await th.del(`/api/${api}/${id}`).expect(403);
            });
            if (permission) it('responds without write permission with 403', async() => {
                var id = await getId(client ? client : "client0");
                await th.removeWritePermission(client ? client : "client0", usergroup ? usergroup : "client0_usergroup0", permission);
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                await th.del(`/api/${api}/${id}?token=${token}`).expect(403);
            });
            function checkForUser(user) {
                return async() => {
                    var moduleName = th.getModuleForApi(api);
                    await th.removeClientModule(client ? client : "client0", moduleName);
                    var token = await th.defaults.login(user);
                    var id = await getId(client ? client : "client0");
                    await th.del(`/api/${api}/${id}?token=${token}`).expect(403);
                }
            }
            if (!client || client !== Db.PortalDatabaseName) it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', checkForUser(user ? user : "client0_usergroup0_user0"));
            if (!client || client !== Db.PortalDatabaseName) it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', checkForUser(adminuser ? adminuser : "client0_usergroup0_user1"));
            it('responds with 404 when the _id is invalid', async() => {
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                var id = await getId(client ? client : "client0");
                await th.del(`/api/${api}/invalidId?token=${token}`).expect(404);
            });
        },
        clientDependentNegative: function(api, getId, client, usergroup, user) {
            it('responds with 404 when the object to delete does not belong to client of the logged in user', async() => {
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                var id = await getId("client1");
                await th.del(`/api/${api}/${id}?token=${token}`).expect(404);
            });
        },
        defaultPositive: function(api, datatypename, getId, skipRelations, skipDynamicAttributes, client, usergroup, user) {
            it('deletes the object and return 204', async() => {
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                var id = await getId(client ? client : "client0");
                await th.del(`/api/${api}/${id}?token=${token}`).expect(204);
                var elementFromDatabase = await Db.getDynamicObject(client ? client : "client0", datatypename, id);
                assert.ok(!elementFromDatabase);
            });
            if (!skipRelations) it('All relations, where the element is the source (type1, id1), are also deleted', async() => {
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                var id = await getId(client ? client : "client0");
                await th.del(`/api/${api}/${id}?token=${token}`).expect(204);
                var relations = await Db.getDynamicObjects(client ? client : "client0", "relations", { datatype1name: datatypename, name1: id });
                assert.strictEqual(relations.length, 0);
            });
            if (!skipRelations) it('All relations, where the element is the target (type2, id2), are also deleted', async() => {
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                var id = await getId(client ? client : "client0");
                await th.del(`/api/${api}/${id}?token=${token}`).expect(204);
                var relations = await Db.getDynamicObjects(client ? client : "client0", "relations", { datatype2name: datatypename, name2: id });
                assert.strictEqual(relations.length, 0);
            });
            if (!skipDynamicAttributes) it('Deletes all dynamic attribute values for the entity', async() => {
                var id = await getId(client ? client : "client0");
                await th.prepareDynamicAttributes(client ? client : "client0", datatypename);
                var token = await th.defaults.login(user ? user : "client0_usergroup0_user0");
                await th.del(`/api/${api}/${id}?token=${token}`).expect(204);
                var dynamicAttributeValuesAfter = await Db.getDynamicObjects(client ? client : "client0", "dynamicattributevalues", { entityname: id });
                assert.strictEqual(dynamicAttributeValuesAfter.length, 0);
            });
        }
    }
};

/**
 * Erstellt eine Liste von Dateien, die für eine gegebene Menge von Modulen existieren müssen.
 * Wird von app-packager und portalmanagement Tests verwendet.
 */
th.createFileList = (moduleNames) => {
    var fileList = [];
    fileList.push('config/module-config.json');
    if (!moduleNames || moduleNames.length < 1) {
        var moduleNames = Object.keys(moduleConfig.modules);
    }
    moduleNames.forEach((moduleName) => {
        var module = moduleConfig.modules[moduleName];
        if (module.api) module.api.forEach((apiFileName) => {
            fileList.push(`api/${apiFileName}.js`);
        });
        if (module.doc) module.doc.forEach((docEntry) => {
            fileList.push(`public/partial/Doc/${docEntry.docCard}.html`);
        });
        if (module.middlewares) module.middlewares.forEach((middlewareFileName) => {
            fileList.push(`middlewares/${middlewareFileName}.js`);
        });
        if (module.utils) module.utils.forEach((utilFileName) => {
            fileList.push(`utils/${utilFileName}.js`);
        });
        if (module.public) module.public.forEach((publicFileName) => {
            fileList.push(`public/${publicFileName}`);
        });
        if (module.root) module.root.forEach((rootFileName) => {
            fileList.push(`${rootFileName}`);
        });
        if (module.include) module.include.forEach((includeFileName) => {
            if (includeFileName.indexOf('node_modules/') === 0) return; // Ignore node modules
            fileList.push(`${includeFileName}`);
        });
        if (module.languages) module.languages.forEach((language) => {
            fileList.push(`public/lang/${moduleName}-${language}.json`);
        });
    });
    return fileList;
};
