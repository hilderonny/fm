var co = require('../utils/constants');
var moduleConfig = require('../config/module-config.json');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;

module.exports.deleteAllDynamicAttributeValuesForEntity = async(clientname, id) => {
    await Db.deleteDynamicObjects(clientname, "dynamicattributevalues", { entityname: id });
};

/**
 * Erstellt ein dynamisches Attribut in der Datenbank. Das Attribut wird so, wie es
 * ist ohne weitere Prüfung in die Datenbank geschrieben.
 * Diese Funktion wird von der dynamicattributes-API und von der clientmodules-API
 * verwendet.
 * Wenn das Attribut einen identifier hat, wird es nur aktiviert, wenn es denn schon vorhanden ist
 * @returns Promise
 * dynamicAttribute {
 *  _id,
 *  clientId,
 *  modelName,
 *  name_en,
 *  name_de,
 *  name_...,
 *  identifier ?,
 *  type
 * }
 */
module.exports.createDynamicAttribute = async(da) => {
    var result = await Db.query(da.clientId, `SELECT 1 FROM dynamicattributes WHERE identifier='${da.identifier}';`);
    if (da.identifier && result.rowCount > 0) {
        await Db.query(da.clientId, `UPDATE dynamicattributes SET isinactive=false WHERE identifier='${da.identifier}';`);
        return result.rows[0];
    } else {
        var insertedDa = {
            name: uuidv4(),
            modelname: da.modelName,
            label: da.name_en,
            isinactive: false,
            dynamicattributetypename: da.type,
            identifier: da.identifier
        };
        await Db.insertDynamicObject(da.clientId, "dynamicattributes", insertedDa);
        return insertedDa;
    }
};

/**
 * OBSOLET
 */
module.exports.deactivateDynamicAttribute = (query) => {
    // return db.updateMany(co.collections.dynamicattributes.name, query, { isInactive: true });
};

/**
 * Vorgegebene DAs erstellen bzw. bei Vorhandensein reaktivieren
 */
module.exports.activateDynamicAttributesForClient = async(clientId, moduleName) => {
    var mod = moduleConfig.modules[moduleName];
    if (!mod.dynamicattributes) return;
    var allowedCollectionNames = Object.keys(co.collections);
    var dakeys = Object.keys(mod.dynamicattributes);
    for (var i = 0; i < dakeys.length; i++) {
        var collectionName = dakeys[i];
        var collection = mod.dynamicattributes[collectionName];
        for (var j = 0; j < collection.length; j++) {
            var attributeDefinition = collection[j];
            var attributeToCreate = {
                clientId: clientId,
                identifier: attributeDefinition.identifier,
                type: attributeDefinition.type,
                modelName: collectionName,
                isInactive: false
            };
            Object.keys(attributeDefinition).filter((k) => k.startsWith('name_')).forEach((k) => {
                attributeToCreate[k] = attributeDefinition[k];
            });
            if (attributeDefinition.type === co.dynamicAttributeTypes.picklist) {
                var createdAttribute = await module.exports.createDynamicAttribute(attributeToCreate);
                for (var k = 0; k < attributeDefinition.options.length; k++) {
                    var optionDefinition = attributeDefinition.options[k];
                    var optionToCreate = {
                        clientId: clientId,
                        dynamicAttributeId: createdAttribute.name,
                        value: optionDefinition.value
                    };
                    Object.keys(optionDefinition).filter((k) => k.startsWith('text_')).forEach((k) => {
                        optionToCreate[k] = optionDefinition[k];
                    });
                    await module.exports.createDynamicAttributeOption(optionToCreate);
                }
            } else {
                await module.exports.createDynamicAttribute(attributeToCreate);
            }
        }
    }
};

module.exports.deactivateDynamicAttributesForClient = async(clientId, moduleName) => {
    var mod = moduleConfig.modules[moduleName];
    if (!mod.dynamicattributes) return;
    var dakeys = Object.keys(mod.dynamicattributes);
    for (var i = 0; i < dakeys.length; i++) {
        var collectionName = dakeys[i];
        var collection = mod.dynamicattributes[collectionName];
        for (var j = 0; j < collection.length; j++) {
            var attributeDefinition = collection[j];
            await Db.query(clientId, `UPDATE dynamicattributes SET isinactive=true WHERE identifier='${attributeDefinition.identifier}';`);
        }
    }
};

/**
 * Erstellt eine Option für eine Pickliste.
 * Diese Funktion wird von der dynamicattributes-API und von der clientmodules-API
 * verwendet.
 * Wenn die Option ein value hat, wird sie nur dann erstellt, wenn sie nicht bereits vorhanden ist
 * @returns Promise
*/
module.exports.createDynamicAttributeOption = async(dao) => {
    if ((await Db.query(dao.clientId, `SELECT 1 FROM dynamicattributeoptions WHERE dynamicattributename='${dao.dynamicAttributeId}' AND value='${dao.identifier}';`)).rowCount < 1) {
        await Db.insertDynamicObject(dao.clientId, "dynamicattributeoptions", {
            name: uuidv4(),
            dynamicattributename: dao.dynamicAttributeId,
            label: dao.text_en,
            value: dao.value
        });
    }
    return dao;
};