/**
 * CRUD API for attribute management
 * dynamicattribute {
 *  _id,
 *  clientId,
 *  modelName,
 *  name_en,
 *  name_de,
 *  name_...,
 *  type
 * }
 * dynamicattributeoption {
 *  _id,
 *  clientId,
 *  dynamicAttributeId,
 *  text_en,
 *  text_de,
 *  text_...,
 * }
 * dynamicattributevalue {
 *  _id,
 *  clientId,
 *  dynamicAttributeId,
 *  entityId,
 *  value
 * }
 */
var bcryptjs = require('bcryptjs');
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateId');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var apiHelper = require('../utils/apiHelper');
var dynamicAttributesHelper = require('../utils/dynamicAttributesHelper');
var co = require('../utils/constants');

/**
 * Check whether the modelName given in the request is valid or not
 */
function validateModelName(req, res, next) {
    if (!co.collections[req.params.modelName] || co.collections[req.params.modelName].canHaveAttributes == false) {
        return res.sendStatus(400);
    }
    next();
}

/**
 * Returns all dynamic attributes defined for the model MODELNAME as list
 */
router.get('/model/:modelName', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', co.modules.base), validateModelName, (req, res) => {
    var modelName = req.params.modelName;
    req.db.get(co.collections.dynamicattributes.name).find({modelName: modelName, clientId: req.user.clientId}).then(function(dynamicattributes){
        var onlyActive = dynamicattributes.filter((a) => !a.isInactive);
        res.send(onlyActive);
    });
});

/**
 * Returns the concrete option with the given _id.
 */
router.get('/option/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', co.modules.base), validateId, validateSameClientId(co.collections.dynamicattributeoptions.name), (req, res) => {
    req.db.get(co.collections.dynamicattributeoptions.name).aggregate([
        { $lookup: { // In Typen nachgucken, damit wir auch solche Werte bekommen, für die nix in der Datenbank steht
            from: co.collections.dynamicattributes.name,
            localField: 'dynamicAttributeId',
            foreignField: '_id',
            as: 'attribute'
        } },
        { $unwind: {
            path: '$attribute'
        } },
        { $match: {
            _id: monk.id(req.params.id),
            $or: [
                { 'attribute.isInactive': {'$exists':false} },
                { 'attribute.isInactive': false }
            ]
        } }
    ]).then(function(options) {
        if (options.length < 1) return res.sendStatus(404);
        res.send(options[0]);
    });
});

/**
 * Returns a list of options for a dynamic attribute with the given _id. The type of the dynamic attribute must be picklist.
 */
router.get('/options/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', co.modules.base), validateId, validateSameClientId('dynamicattributes'), (req, res) => {
    var dynamicAttributeId =  monk.id(req.params.id);
    req.db.get(co.collections.dynamicattributeoptions.name).aggregate([
        { $lookup: { // In Typen nachgucken, damit wir auch solche Werte bekommen, für die nix in der Datenbank steht
            from: co.collections.dynamicattributes.name,
            localField: 'dynamicAttributeId',
            foreignField: '_id',
            as: 'attribute'
        } },
        { $unwind: {
            path: '$attribute'
        } },
        { $match: {
            dynamicAttributeId: monk.id(dynamicAttributeId),
            $or: [
                { 'attribute.isInactive': {'$exists':false} },
                { 'attribute.isInactive': false }
            ]
        } }
    ]).then(function(options) {
        if (options.length < 1) return res.sendStatus(404);
        res.send(options);
    });
});

/**
 * Returns all values of the dynamic attributes of an entity of a model MODELNAME with the given _id.
 */
router.get('/values/:modelName/:id', auth(false, false, co.modules.base), validateId, validateSameClientId(), (req, res) => {
    var entityId = monk.id(req.params.id);
    req.db.get(co.collections.dynamicattributes.name).aggregate([
        { $lookup: { // In Typen nachgucken, damit wir auch solche Werte bekommen, für die nix in der Datenbank steht
            from: co.collections.dynamicattributevalues.name,
            localField: '_id',
            foreignField: 'dynamicAttributeId',
            as: 'valueInstance'
        } },
        { $lookup: { // Eventuelle Optionen für Picklisten suchen
            from: co.collections.dynamicattributeoptions.name,
            localField: '_id',
            foreignField: 'dynamicAttributeId',
            as: 'options'
        } },
        { $project: { // Erst mal Felder filtern und Werte suchen
            _id: 0,
            type: '$$ROOT', // Der Typ steckt im Feld type drin, anders geht das nicht mit project, siehe https://stackoverflow.com/questions/19431773/include-all-existing-fields-and-add-new-fields-to-document
            valueInstance: { $filter: {
                input: '$valueInstance',
                as: 'dav',
                cond: { $eq: [ '$$dav.entityId', entityId ] } // Nur Werte für die korrekte Entität suchen
            } }
        } },
        { $unwind: { // Es sollte nur einen Wert geben, diesen extrahieren.
            path: '$valueInstance',
            preserveNullAndEmptyArrays: true // Falls es keinen Wert gibt, null zurück geben
        } },
        { $addFields: { // Den Wert direkt als Attribut zurück geben
            value: { $ifNull: [ '$valueInstance.value', null ] },
            options: '$type.options'
        } },
        { $match: { // Nur Attribute des zugehörigen Modells
            'type.modelName': req.params.modelName,
            'type.clientId': req.user.clientId,
            $or: [
                { 'type.isInactive': {'$exists':false} }, // Nur Werte von aktiven DAs
                { 'type.isInactive': false }
            ]
        } },
        { $project: { // Das temporäre Wertefeld brauchen wir nicht mehr
            'options.clientId': 0,
            'options.dynamicAttributeId': 0,
            //'type.clientId': 0,
            'type.modelName': 0,
            'type.valueInstance': 0,
            'type.options': 0,
            valueInstance: 0
        } }
    ]).then(function(valuesForEntity) {
        res.send(valuesForEntity);
    });
});

/**
 * Returns a list of all possible data models which can have dynamic attributes
 */
router.get('/models', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', co.modules.base), (req, res) => {
    var models = [];
    Object.keys(co.collections).forEach((key) => {
        var collection = co.collections[key];
        if (collection.canHaveAttributes) models.push(collection);
    });
    res.send(models);
});

/**
 * Returns a dynamic attribute with the given _id
 */
router.get('/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', co.modules.base), validateId, validateSameClientId(co.collections.dynamicattributes.name), (req, res) => {
    var dynamicAttributeId = req.params.id;
    req.db.get(co.collections.dynamicattributes.name).findOne(dynamicAttributeId).then(function(dynamicattribute){
        if (dynamicattribute.isInactive) {
            return res.sendStatus(404);
        }
        res.send(dynamicattribute);
    });
});

/**
 * Creates a new option for a dynamic attribute of type picklist.
 * Required properties are dynamicattributeid and text_en. 
 */
router.post('/option', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), (req, res) => {
    var dynamicAttributeOption = req.body;

    if(!dynamicAttributeOption || !dynamicAttributeOption.dynamicAttributeId || !dynamicAttributeOption.text_en || !validateId.validateId(dynamicAttributeOption.dynamicAttributeId)) {
        return res.sendStatus(400);
    }
    //Options are allowed only for Attributes of type picklist
    dynamicAttributeOption.dynamicAttributeId = monk.id(dynamicAttributeOption.dynamicAttributeId);
    req.db.get(co.collections.dynamicattributes.name).findOne(dynamicAttributeOption.dynamicAttributeId).then(function(dynamicAttribute){
        if (!dynamicAttribute) return Promise.reject();
        if (dynamicAttribute.type != co.dynamicAttributeTypes.picklist) return Promise.reject();
        delete dynamicAttributeOption.value; // Kann nicht per API gesetzt werden
        dynamicAttributeOption.clientId = req.user.clientId; 
        return dynamicAttributesHelper.createDynamicAttributeOption(dynamicAttributeOption);
    }).then(function(inserteddynamicAttributeOption) {
        res.send(inserteddynamicAttributeOption); 
    }, function() {
        res.sendStatus(400);
    });
});

/**
 * Creates a new set of values for dynamic attributes for an entity of type MODELNAME and with the given _id.
 */
router.post('/values/:modelName/:id', auth(false, false, co.modules.base), validateModelName, validateId, validateSameClientId(), (req, res) => {
    var modelName = req.params.modelName;
    var entity;
    var dynamicAttributeValues = req.body;
    req.db.get(co.collections.clients.name).findOne(req.user.clientId).then((client) => {
        if (dynamicAttributeValues.find((dav) => !validateId.validateId(dav.daId))) return Promise.reject();; // Mindestens ein Wert hat eine ungültige Attribut-Id
        return req.db.get(co.collections.dynamicattributes.name).find({ 
            clientId: req.user.clientId,
            _id: { $in: dynamicAttributeValues.map((dav) => dav.daId) },
            $or: [
                { isInactive: {'$exists':false} },
                { isInactive: false }
            ]
        });
    }).then((dynamicAttributes) => {
        var attributeIds = dynamicAttributes.map((da) => da._id.toString());
        if (dynamicAttributeValues.find((dav) => attributeIds.indexOf(dav.daId) < 0)) return Promise.reject();; // Mindestens ein Wert hat eine nicht existierende oder nicht dem Mandanten zugehörige Attribut-Id oder das Attribut ist inaktiv
        return req.db.get(modelName).findOne(req.params.id);
    }).then((e) => {
        entity = e;
        return req.db.remove(co.collections.dynamicattributevalues.name, {entityId: entity._id});
    }).then(() => {
        // Jetzt einfach neue values anlegen
        var bulkData = dynamicAttributeValues.map((dav) => { return { 
            insertOne: { document: {
                dynamicAttributeId: monk.id(dav.daId),
                entityId: entity._id,
                clientId: entity.clientId,
                value: dav.type === co.dynamicAttributeTypes.picklist && dav.value !== null ? monk.id(dav.value) : dav.value
            } }
        }});
        if (bulkData.length < 1) {
            return Promise.resolve({insertedIds:[]});// Wenn keine DAs definiert wurden, sind auch keine hier.
        } 
        return req.db.get(co.collections.dynamicattributevalues.name).bulkWrite(bulkData); 
    }).then((bulkResult) => {
        res.send(Object.keys(bulkResult.insertedIds).map((key) => bulkResult.insertedIds[key]));
    }).catch((error) => {
        res.sendStatus(400);
    });
});

/**
 * Creates a new dynamic attribute. Required properties are modelName, name_en and type.
 */
router.post('/', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), function(req, res) {
    var dynamicAttribute = req.body;
    if (!dynamicAttribute || !dynamicAttribute.type || !co.dynamicAttributeTypes[dynamicAttribute.type] || !dynamicAttribute.modelName || !co.collections[dynamicAttribute.modelName] || !dynamicAttribute.name_en) {
        return res.sendStatus(400);
    }
    dynamicAttribute.clientId = req.user.clientId; 
    delete dynamicAttribute.identifier; // Erzeugen von vorgegebenen Attributen per API ist nicht erlaubt
    dynamicAttributesHelper.createDynamicAttribute(dynamicAttribute).then((insertedDynamicAttribute) => {
        res.send(insertedDynamicAttribute);
    });
});

/**
 * Updates an option with the given _id for a dynamic attibute.
 * The dynamicattributeid of the option cannot be changed.
 */
router.put('/option/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), validateId, validateSameClientId(co.collections.dynamicattributeoptions.name), (req, res) => {
    var dynamicAttributeOption = req.body;
    var daoId = monk.id(req.params.id);
    delete dynamicAttributeOption._id;
    delete dynamicAttributeOption.dynamicAttributeId;
    delete dynamicAttributeOption.clientId; //clientId should not be changed

    if(Object.keys(dynamicAttributeOption).length < 1){
        return res.sendStatus(400);
    }

    req.db.get(co.collections.dynamicattributeoptions.name).findOne(daoId).then((existingOption) => {
        req.db.get(co.collections.dynamicattributes.name).findOne({
            _id: existingOption.dynamicAttributeId,
            $or: [
                { isInactive: {'$exists':false} },
                { isInactive: false }
            ]
        }).then((existingAttribute) => {
            if (!existingAttribute) return res.sendStatus(404);
            req.db.update(co.collections.dynamicattributeoptions.name, daoId, { $set: dynamicAttributeOption }).then((updatedAttributeOption) => {
                res.send(updatedAttributeOption);
            }); 
        });
    });

});

/**
 * Updates a dynamic attribute. Changing the type is not supported.
 * For this case the attribute needs to be deleted and a new one is to be created.
 * Also changing the model is not supported. Only the name_* properties can be updated.
 */
router.put('/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), validateId, validateSameClientId(co.collections.dynamicattributes.name), (req, res) => {
    var dynamicAttributeId = monk.id(req.params.id);
    var dynamicAttribute = req.body;

    delete dynamicAttribute._id;
    delete dynamicAttribute.modelName;
    delete dynamicAttribute.type;
    delete dynamicAttribute.clientId;
    delete dynamicAttribute.identifier; //non-deletable dynamic attributes should not be generated by the user

    if(Object.keys(dynamicAttribute).length < 1){
        return res.sendStatus(400);
    }

    req.db.get(co.collections.dynamicattributes.name).findOne({
        _id: dynamicAttributeId,
        $or: [
            { isInactive: {'$exists':false} },
            { isInactive: false }
        ]
    }).then((existing) => {
        if (!existing) return res.sendStatus(404);
        req.db.update(co.collections.dynamicattributes.name, dynamicAttributeId, { $set: dynamicAttribute }).then((UpdatedAttribute) => {
            return res.send(UpdatedAttribute);
        }); 
    });

});

/**
 * Deletes an option with the given _id of a dynamic attribute. 
 * Also deletes all existing dynamicattributevalues of the corresponding dynamic 
 * attribute where this option is the value.
 */
router.delete('/option/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), validateId, validateSameClientId(co.collections.dynamicattributeoptions.name), function (req, res) {
    var id = monk.id(req.params.id);
    req.db.get(co.collections.dynamicattributeoptions.name).findOne(id).then((existingOption) => {
        if (existingOption.value) return res.sendStatus(405);
        req.db.get(co.collections.dynamicattributes.name).findOne(existingOption.dynamicAttributeId).then((attribute) => {
            if (attribute.isInactive) return res.sendStatus(404);
            req.db.remove(co.collections.dynamicattributeoptions.name, id).then(() => {
                return req.db.remove(co.collections.dynamicattributevalues.name, {value:id});
            }).then(() => {
                res.sendStatus(204);
            });
        });
    });
});

/**
 * Deletes all dynamic attribute values for an entity of type MODELNAME and the given _id.
 */
router.delete('/values/:modelName/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), validateModelName, validateId, validateSameClientId(), (req, res) => {
    var modelName = req.params.modelName;
    var entityId = req.params.id;
    req.db.remove(co.collections.dynamicattributevalues.name, {entityId: monk.id(entityId)}).then(function(result){
        return res.sendStatus(204);
    });
});

/**
 * Deletes a dynmic attribute with the given _id.
 * All existing dynamicattributevalues which exist for the attribute are also deleted.
 * When the dynamic attribute is of type picklist, all of its options are also deleted.
 */
router.delete('/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), validateId, validateSameClientId(co.collections.dynamicattributes.name), function(req, res) {
    var dynamicAttributeId = monk.id(req.params.id);
    req.db.get(co.collections.dynamicattributes.name).findOne({
        _id: dynamicAttributeId,
        $or: [
            { isInactive: {'$exists':false} },
            { isInactive: false }
        ]
    }).then((existingAttribute) => {
        if (!existingAttribute) return res.sendStatus(404);
        if (existingAttribute.identifier) return res.sendStatus(405);
        req.db.remove(co.collections.dynamicattributes.name, {_id: dynamicAttributeId}).then(() => {
            return req.db.remove(co.collections.dynamicattributeoptions.name, {dynamicAttributeId: dynamicAttributeId});
        }).then(() => {
            return req.db.remove(co.collections.dynamicattributevalues.name, {dynamicAttributeId: dynamicAttributeId});
        }).then(() => {
            res.sendStatus(204);
        });
    });
});

module.exports = router;
