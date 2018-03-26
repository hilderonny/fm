var Db = require("./db").Db;
var co = require("./constants");
var ch = require("./calculationhelper");
var uuidv4 = require("uuid").v4;

/**
 * Update scripts which are run at system startup, when the localconfig flag "applymigration" is set to true
 */
module.exports = async() => {
    var areaTypeCategories = {
        "Wohnen und Aufenthalt" : "FMOBJECTS_CATEGORY_NUF",
        "Büroarbeit" : "FMOBJECTS_CATEGORY_NUF",
        "Produktion, Hand- und Maschinenarbeit, Experimente" : "FMOBJECTS_CATEGORY_NUF",
        "Lagern, Verteilen und Verkaufen" : "FMOBJECTS_CATEGORY_NUF",
        "Bildung, Unterricht und Kultur" : "FMOBJECTS_CATEGORY_NUF",
        "Heilen und Pflegen" : "FMOBJECTS_CATEGORY_NUF",
        "Sonstige Nutzung" : "FMOBJECTS_CATEGORY_NUF",
        "Technische Anlagen" : "FMOBJECTS_CATEGORY_TF",
        "Verkehrserschließung und -sicherung" : "FMOBJECTS_CATEGORY_VF",
    };
    var newdatatypenames = ['projects', 'properties', 'buildings', 'levels', 'rooms', 'areas', 'inventories'];
    var newdatatypenamesjoin = newdatatypenames.map(tn => `'${tn}'`).join(",");
    var typedatabases = {
        "FMOBJECTS_TYPE_PROJECT" : "projects",
        "FMOBJECTS_TYPE_PROPERTY" : "properties",
        "FMOBJECTS_TYPE_BUILDING" : "buildings",
        "FMOBJECTS_TYPE_LEVEL" : "levels",
        "FMOBJECTS_TYPE_ROOM" : "rooms",
        "FMOBJECTS_TYPE_AREA" : "areas",
        "FMOBJECTS_TYPE_INVENTORY" : "inventories"
    }
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
        await Db.query(clientname, `DELETE FROM relations WHERE relationtypename='parentchild' AND (datatype1name IN (${newdatatypenamesjoin}) OR datatype2name IN (${newdatatypenamesjoin}));`);
        await Db.query(clientname, `DELETE FROM dynamicattributes WHERE modelname IN (${newdatatypenamesjoin});`);
        await Db.query(clientname, `DELETE FROM dynamicattributeoptions WHERE dynamicattributeoptions.dynamicattributename IN (SELECT dynamicattributes.name FROM dynamicattributes WHERE dynamicattributes.modelname IN (${newdatatypenamesjoin}));`);
        await Db.query(clientname, `DELETE FROM dynamicattributevalues WHERE dynamicattributevalues.dynamicattributename IN (SELECT dynamicattributes.name FROM dynamicattributes WHERE dynamicattributes.modelname IN (${newdatatypenamesjoin}));`);
        // add dynamic attributes of fmobjects to all new datatypes
        var das = (await Db.query(clientname, `SELECT * FROM dynamicattributes WHERE modelname = 'fmobjects';`)).rows;
        var daos = (await Db.query(clientname, `SELECT daos.* FROM dynamicattributeoptions daos JOIN dynamicattributes das ON das.name = daos.dynamicattributename WHERE das.modelname = 'fmobjects';`)).rows;
        for (var j = 0; j < newdatatypenames.length; j++) {
            var newmodelname = newdatatypenames[j];
            // attributes
            for (var k = 0; k < das.length; k++) {
                var da = das[k];
                var newdaname = `${da.name}-${newmodelname}`;
                await Db.insertDynamicObject(clientname, co.collections.dynamicattributes.name, { name: newdaname, modelname: newmodelname, label: da.label, isinactive: da.isinactive, dynamicattributetypename: da.dynamicattributetypename, identifier: da.identifier });
            }
            // options
            for (var k = 0; k < daos.length; k++) {
                var dao = daos[k];
                var newdaname = `${dao.dynamicattributename}-${newmodelname}`;
                var newdaoname = `${dao.name}-${newmodelname}`;
                await Db.insertDynamicObject(clientname, co.collections.dynamicattributeoptions.name, { name: newdaoname, dynamicattributename: newdaname, label: dao.label, value: dao.value });
            }
        }
        // Handle each FM object
        var fmobjects = await Db.getDynamicObjects(clientname, co.collections.fmobjects.name);
        for (var j = 0; j < fmobjects.length; j++) {
            var fmo = fmobjects[j];
            var newdatabasename = null;
            switch (fmo.fmobjecttypename) {
                case "FMOBJECTS_TYPE_PROJECT":
                    newdatabasename = "projects";
                    await Db.insertDynamicObject(clientname, newdatabasename, { name:fmo.name, label: fmo.label, previewimagedocumentname: fmo.previewimagedocumentname });
                    break;
                case "FMOBJECTS_TYPE_PROPERTY": 
                    newdatabasename = "properties";
                    await Db.insertDynamicObject(clientname, newdatabasename, { name:fmo.name, label: fmo.label, previewimagedocumentname: fmo.previewimagedocumentname });
                    break;
                case "FMOBJECTS_TYPE_BUILDING":
                    newdatabasename = "buildings";
                    await Db.insertDynamicObject(clientname, newdatabasename, { name:fmo.name, label: fmo.label, previewimagedocumentname: fmo.previewimagedocumentname });
                    break;
                case "FMOBJECTS_TYPE_LEVEL": 
                    newdatabasename = "levels";
                    await Db.insertDynamicObject(clientname, newdatabasename, { name:fmo.name, label: fmo.label, previewimagedocumentname: fmo.previewimagedocumentname });
                    break;
                case "FMOBJECTS_TYPE_ROOM": 
                    newdatabasename = "rooms";
                    await Db.insertDynamicObject(clientname, newdatabasename, { name:fmo.name, label: fmo.label, previewimagedocumentname: fmo.previewimagedocumentname });
                    break;
                case "FMOBJECTS_TYPE_AREA": 
                    newdatabasename = "areas";
                    await Db.insertDynamicObject(clientname, newdatabasename, { name:fmo.name, label: fmo.label, previewimagedocumentname: fmo.previewimagedocumentname, areacategoryname: areaTypeCategories[fmo.areatypename], areatypename: fmo.areatypename, areausagestatename: fmo.areausagestatename, f: fmo.f });
                    break;
                case "FMOBJECTS_TYPE_INVENTORY": 
                    newdatabasename = "inventories";
                    await Db.insertDynamicObject(clientname, newdatabasename, { name:fmo.name, label: fmo.label, previewimagedocumentname: fmo.previewimagedocumentname });
                    break;
                default: console.log(`Cannot migrate unknown FM object type "${fmo.fmobjecttypename}"`); break;
            }
            if (!newdatabasename) continue; // unknown FM type
            // update existing relations
            await Db.query(clientname, `UPDATE relations SET datatype1name='${newdatabasename}' WHERE name1='${fmo.name}' AND datatype1name='fmobjects';`);
            await Db.query(clientname, `UPDATE relations SET datatype2name='${newdatabasename}' WHERE name2='${fmo.name}' AND datatype2name='fmobjects';`);
            // create parent-child-relations
            if (fmo.parentfmobjectname) {
                var parentdatatypename = typedatabases[fmobjects.find(f => f.name === fmo.parentfmobjectname).fmobjecttypename];
                await Db.insertDynamicObject(clientname, "relations", { name: uuidv4(), relationtypename: 'parentchild', datatype1name: parentdatatypename, name1: fmo.parentfmobjectname, datatype2name: newdatabasename, name2: fmo.name });
            }
            // Switch dynamic attribute values to new DAs
            var davs = (await Db.query(clientname, `SELECT davs.*, daos.name daoname FROM dynamicattributevalues davs JOIN dynamicattributes das ON das.name = davs.dynamicattributename LEFT JOIN dynamicattributeoptions daos ON daos.name = davs.value WHERE davs.entityname = '${fmo.name}' AND das.modelname = 'fmobjects';`)).rows;
            for (var k = 0; k < davs.length; k++) {
                var dav = davs[k];
                var newdaname = `${dav.dynamicattributename}-${newdatabasename}`;
                var newdaoname = `${dav.value}-${newdatabasename}`;
                var newdavname = `${dav.name}-${newdatabasename}`;
                await Db.insertDynamicObject(clientname, co.collections.dynamicattributevalues.name, { name: newdavname, entityname: dav.entityname, dynamicattributename: newdaname, value: dav.daoname ? newdaoname : dav.value });
            }
        }
    }
    console.log("UPDATE FINISHED.");
};