var db = require('../middlewares/db');
var co = require('../utils/constants');
var moduleConfig = require('../config/module-config.json');
var Db = require("../utils/db").Db;

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
module.exports.createDynamicAttribute = (dynamicAttribute) => {
    delete dynamicAttribute._id; // Ids are generated automatically
    dynamicAttribute.isInactive = false;
    if (dynamicAttribute.identifier) {
        var matchQuery = { 
            clientId: dynamicAttribute.clientId,
            identifier: dynamicAttribute.identifier
        };
        return db.get(co.collections.dynamicattributes.name).findOne(matchQuery).then((existingAttribute) => {
            if (existingAttribute) {
                existingAttribute.isInactive = false;
                return db.update(co.collections.dynamicattributes.name, existingAttribute._id, existingAttribute);
            } else {
                return db.insert(co.collections.dynamicattributes.name, dynamicAttribute);
            }
        });
    } else {
        return db.insert(co.collections.dynamicattributes.name, dynamicAttribute);
    }
};

/**
 * Deaktiviert für einen Mandanten ein dynamisches Attribut, welches bestimmten Kriterien entspricht.
 * @returns Promise
 */
module.exports.deactivateDynamicAttribute = (query) => {
    return db.updateMany(co.collections.dynamicattributes.name, query, { isInactive: true });
};

/**
 * Vorgegebene DAs erstellen bzw. bei Vorhandensein reaktivieren
 */
module.exports.activateDynamicAttributesForClient = (clientId, moduleName) => {
    var mod = moduleConfig.modules[moduleName];
    if (!mod.dynamicattributes) return Promise.resolve();
    var promises = [];
    var allowedCollectionNames = Object.keys(co.collections);
    Object.keys(mod.dynamicattributes).forEach((collectionName) => {
        mod.dynamicattributes[collectionName].forEach((attributeDefinition) => {
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
                promises.push(module.exports.createDynamicAttribute(attributeToCreate).then((createdAttribute) => {
                    var optionPromises = [];
                    attributeDefinition.options.forEach((optionDefinition) => {
                        var optionToCreate = {
                            clientId: clientId,
                            dynamicAttributeId: createdAttribute._id,
                            value: optionDefinition.value
                        };
                        Object.keys(optionDefinition).filter((k) => k.startsWith('text_')).forEach((k) => {
                            optionToCreate[k] = optionDefinition[k];
                        });
                        optionPromises.push(module.exports.createDynamicAttributeOption(optionToCreate));
                    });
                    return Promise.all(optionPromises);
                }));
            } else {
                promises.push(module.exports.createDynamicAttribute(attributeToCreate));
            }
        });
    });
    return Promise.all(promises);
};

module.exports.deactivateDynamicAttributesForClient = (clientId, moduleName) => {
    var mod = moduleConfig.modules[moduleName];
    if (!mod.dynamicattributes) return Promise.resolve();
    var promises = [];
    Object.keys(mod.dynamicattributes).forEach((collectionName) => {
        mod.dynamicattributes[collectionName].forEach((attributeDefinition) => {
            var matchQuery = { 
                clientId: clientId,
                identifier: attributeDefinition.identifier
            };
            promises.push(module.exports.deactivateDynamicAttribute(matchQuery));
        });
    });
    return Promise.all(promises);
};

/**
 * Erstellt eine Option für eine Pickliste.
 * Diese Funktion wird von der dynamicattributes-API und von der clientmodules-API
 * verwendet.
 * Wenn die Option ein value hat, wird sie nur dann erstellt, wenn sie nicht bereits vorhanden ist
 * @returns Promise
*/
module.exports.createDynamicAttributeOption = (dynamicAttributeOption) => {
    delete dynamicAttributeOption._id; // Ids are generated automatically
    if (dynamicAttributeOption.value) {
        var matchQuery = {
            clientId: dynamicAttributeOption.clientId,
            value: dynamicAttributeOption.value
        };
        return db.get(co.collections.dynamicattributeoptions.name).findOne(matchQuery).then((existingOption) => {
            if (existingOption) {
                return Promise.resolve(existingOption);
            } else {
                return db.insert(co.collections.dynamicattributeoptions.name, dynamicAttributeOption);
            }
        });
    } else {
        return db.insert(co.collections.dynamicattributeoptions.name, dynamicAttributeOption);
    }
};