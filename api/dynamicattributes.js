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
var validateId = require('../middlewares/validateid');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var apiHelper = require('../utils/apiHelper');
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
router.get('/model/:modelName', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', 'base'), validateModelName, (req, res) => {
    var modelName = req.params.modelName;
    req.db.get(co.collections.dynamicattributes.name).find({modelName: modelName}).then(function(dynamicattributes){
        res.send(dynamicattributes);
    });
});

/**
 * Returns the concrete option with the given _id.
 */
router.get('/option/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', 'base'), validateId, validateSameClientId('dynamicattributeoptions'), (req, res) => {
    var dynamicAttributeOptionId = monk.id(req.params.id);
    console.log("GET/option");
    req.db.get('dynamicattributeoptions').findOne(dynamicAttributeOptionId).then(function(attributeOption){
        res.send(attributeOption);
    });
});

/**
 * Returns a list of options for a dynamic attribute with the given _id. The type of the dynamic attribute must be picklist.
 */
router.get('/options/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', 'base'), validateId, validateSameClientId('dynamicattributes'), (req, res) => {
    var dynamicAttributeId =  monk.id(req.params.id);
    req.db.get('dynamicattributeoptions').find({dynamicAttributeId: dynamicAttributeId}).then(function(attributeOptions){
        res.send(attributeOptions);
    });
});

/**
 * Returns all values of the dynamic attributes of an entity of a model MODELNAME with the given _id.
 */
router.get('/values/:modelName/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', 'base'), validateId, validateSameClientId(), (req, res) => {
    var entityId = monk.id(req.params.id);
  /*
    req.db.get(co.collections.dynamicattributevalues.name).aggregate([
        { $lookup: { // https://docs.mongodb.com/manual/reference/operator/aggregation/lookup/
            from: co.collections.dynamicattributes.name,
            localField: 'dynamicAttributeId',
            foreignField: '_id',
            as: 'type'
        } },
        { $unwind: '$type' }, // https://docs.mongodb.com/manual/reference/operator/aggregation/unwind/
        { $lookup: {
            from: co.collections.dynamicattributeoptions.name,
            localField: 'type._id',
            foreignField: 'dynamicAttributeId',
            as: 'options'
        } },
        { $match: { // Find only relevant elements
            entityId: entityId
        } }*/
    req.db.get(co.collections.dynamicattributes.name).aggregate([
        { $lookup: { // In Typen nachgucken, damit wir auch solche Werte bekommen, für die nix in der Datenbank steht
            from: co.collections.dynamicattributevalues.name,
            localField: '_id',
            foreignField: 'dynamicAttributeId',
            as: 'valueInstance'
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
            value: { $ifNull: [ '$valueInstance.value', null ] }
        } },
        { $lookup: { // Eventuelle Optionen für Picklisten suchen
            from: co.collections.dynamicattributeoptions.name,
            localField: '_id',
            foreignField: 'dynamicAttributeId',
            as: 'options'
        } },
        { $project: { // Das temporäre Wertefeld brauchen wir nicht mehr
            'type.valueInstance': 0
        } }
    ]).then(function(valuesForEntity) {
        res.send(valuesForEntity);
    });
});

/**
 * Returns a list of all possible option types (currently only text, boolean and picklist)
 */
router.get('/types', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', 'base'), (req, res) => {
     //res.send(co.dynamicAttributeTypes.map(function(k) { return co.dynamicAttributeTypes[k]; } ));
    //res.send(co.dynamicAttributeTypes.map((k) => co.dynamicAttributeTypes[k]));
    res.send(Object.keys(co.dynamicAttributeTypes));
});

/**
 * Returns a list of all possible data models which can have dynamic attributes (currently only...)
 */
router.get('/models', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', 'base'), (req, res) => {
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
router.get('/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', 'base'), validateId, validateSameClientId('dynamicattributes'), (req, res) => {
    var dynamicAttributeId = req.params.id;
    req.db.get('dynamicattributes').findOne(dynamicAttributeId).then(function(dynamicattribute){
        // Database element is available here in every case, because validateSameClientId already checked for existence
        res.send(dynamicattribute);
    });
});

/**
 * Returns a dynamic attribute with the given _id
 */
router.get('/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', 'base'), validateId, validateSameClientId('dynamicattributes'), (req, res) => {
    var dynamicAttributeId = req.params.id;
    req.db.get('dynamicattributes').findOne(dynamicAttributeId).then(function(dynamicattribute){
        // Database element is available here in every case, because validateSameClientId already checked for existence
        res.send(dynamicattribute);
    });
});

/**
 * Creates a new dynamic attribute. Required properties are modelName, name_en and type.
 */
router.post('/', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', 'base'), (req, res) => {
    var dynamicAttribute = req.body;
    if (!dynamicAttribute || !dynamicAttribute.type || !dynamicAttribute.modelName || !dynamicAttribute.name_en) {
        return res.sendStatus(400);
    }
    // Ids are generated automatically
    delete dynamicAttribute._id; 
    dynamicAttribute.clientId = req.user.clientId; 

     req.db.insert('dynamicattributes', dynamicAttribute).then(function(insertedDynamicAttribute){
         //console.log(insertedDynamicAttribute);

         req.db.get(dynamicAttribute.modelName).find({clientId: req.user.clientId}).then(function(allEntities){
            allEntities.forEach(function(entity){
                var emptyValue = {entityId: entity._id, 
                                  clientId: req.user.clientId,
                                  dynamicAttributeId: insertedDynamicAttribute._id,
                                  value: null,
                                  modelName: dynamicAttribute.modelName};
                    req.db.insert('dynamicattributevalues', emptyValue);
            });
         });
         return res.send(insertedDynamicAttribute);
     });
});

/**
 * Creates a new option for a dynamic attribute of type picklist.
 * Required properties are dynamicattributeid and text_en. 
 */
router.post('/option', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', 'base'), (req, res) => {
    var dynamicAttributeOption = req.body;

    if(!dynamicAttributeOption || !dynamicAttributeOption.dynamicAttributeId || !dynamicAttributeOption.text_en || !validateId.validateId(dynamicAttributeOption.dynamicAttributeId)) {
        console.log('missing data');
        return res.sendStatus(400);
    }
    //Options are allowed only for Attributes of type picklist
    req.db.get('dynamicattributes').findOne({_id: dynamicAttributeOption.dynamicAttributeId}).then(function(dynamicAttribute){
        if(dynamicAttribute.type != 'DYNAMICATTRIBUTES_TYPE_PICKLIST'){
            console.log('attribute type is not picklist');
            console.log(dynamicAttribute.type);
            return res.sendStatus(400);
        }else{
            delete dynamicAttributeOption._id; // Ids are generated automatically
            dynamicAttributeOption.dynamicAttributeId = monk.id(dynamicAttributeOption.dynamicAttributeId);
            dynamicAttributeOption.clientId = req.user.clientId; 
            req.db.insert('dynamicattributeoptions', dynamicAttributeOption).then(function(inserteddynamicAttributeOption){
                return res.send(inserteddynamicAttributeOption); 
            });
        }
    });
});

/**
 * Creates a new set of values for dynamic attributes for an entity of type MODELNAME and with the given _id.
 */
router.post('/values/:modelName/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', 'base'), validateModelName, validateId, validateSameClientId(), (req, res) => {
    var modelName = req.params.modelName;
    var entity;
    var dynamicAttributeValues = req.body;
    req.db.get(modelName).findOne(req.params.id).then((e) => {
        if (!e) return Promise.reject();
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
        return req.db.get(co.collections.dynamicattributevalues.name).bulkWrite(bulkData);
    }).then((bulkResult) => {
        res.sendStatus(200);
    }).catch((error) => {
        res.sendStatus(400);
    });
});

/**
 * Updates a dynamic attribute. Changing the type is not supported.
 * For this case the attribute needs to be deleted and a new one is to be created.
 * Also changing the model is not supported. Only the name_* properties can be updated.
 */
router.put('/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', 'base'), validateId, validateSameClientId('dynamicattributes'), (req, res) => {
    var dynamicAttributeId = monk.id(req.params.id);
    var dynamicAttribute = req.body;

    delete dynamicAttribute._id;
    delete dynamicAttribute.modelname;
    delete dynamicAttribute.type;

    if(Object.keys(dynamicAttribute).length < 1){
        return res.sendStatus(400);
    }

    req.db.update('dynamicattributes', dynamicAttributeId, { $set: dynamicAttribute }).then((UpdatedAttribute) => {
        return res.send(UpdatedAttribute);
    }); 

});

/**
 * Updates an option with the given _id for a dynamic attibute.
 * The dynamicattributeid of the option cannot be changed.
 */
router.put('/option/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', 'base'), validateId, validateSameClientId('dynamicattributeoptions'), (req, res) => {
    var dynamicAttributeOptionId = monk.id(req.params.id);
    var dynamicAttributeOption = req.body;

    // Dynamic attribute option is available here in every case, because validateSameClientId already checked for existence
    delete dynamicAttributeOption.dynamicAttributeId;
    delete dynamicAttributeOption.clientId; //clientId should not be changed
    req.db.update('dynamicattributeoptions', dynamicAttributeOptionId, { $set: dynamicAttributeOption }).then((updatedAttributeValue) => {
        return res.send(updatedAttributeValue);
    }); 
});

/**
 * Deletes a dynmic attribute with the given _id.
 * All existing dynamicattributevalues which exist for the attribute are also deleted.
 * When the dynamic attribute is of type picklist, all of its options are also deleted.
 */
router.delete('/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', 'base'), validateId, validateSameClientId('dynamicattributes'), (req, res) => {
    var dynamicAttributeId = req.params.id;
    // TODO: check implementation
    req.db.get('dynamicattributes').findOne(dynamicAttributeId).then(function(existingAttributeFromDB){
        if(existingAttributeFromDB.type == 'picklist'){
            //delete options
            req.db.remove('dynamicattributeoptions', {dynamicAttributeId: dynamicAttributeId}).then(function(result){
                //delete actual attribure
                req.db.remove('dynamicattributes', {_id: dynamicAttributeId}).then(function(result){
                   return res.sendStatus(204);
                });
            });
        }
        else{
            //delete attribute values
            req.db.remove('dynamicattributevalues', {dynamicAttributeId: dynamicAttributeId}).then(function(result){
                //delete actual attribure
                req.db.remove('dynamicattributes', {_id: dynamicAttributeId}).then(function(result){
                   return res.sendStatus(204);
                });
            });
        }
    });
});

/**
 * Deletes an option with the given _id of a dynamic attribute. 
 * Also deletes all existing dynamicattributevalues of the corresponding dynamic 
 * attribute where this option is the value.
 */
router.delete('/option/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', 'base'), validateId, validateSameClientId('dynamicattributeoptions'), (req, res) => {
    console.log("DEL / option");
    var dynamicAttributeOptionId = monk.id(req.params.id);
    // Database element is available here in every case, because validateSameClientId already checked for existence
    req.db.get('dynamicattributeoptions').findOne({_id: dynamicAttributeOptionId}).then(function(attributeOption){
        var dynamicAttributeId = monk.id(attributeOption.dynamicAttributeId);
        req.db.get('dynamicattributes').findOne({_id: dynamicAttributeId}).then(function(dynamicAttribute){
            //TODO check if option is assigned as a value to DA of type picklist; if so, set value to null
            req.db.get('dynamicattributevalues').find({dynamicAttributeId: dynamicAttributeId}).then(function(attribureValue){
                 console.log(attribureValue);  
                if(attribureValue.value != dynamicAttributeOptionId){
                    //safe to delete option because it is not set as value
                    req.db.remove('dynamicattributeoptions', {_id: dynamicAttributeOptionId}).then(function(result){
                        return res.sendStatus(204);
                    });
                }else{
                    //option cannot be deleted yet because it is still used as a value for exsting picklist attribute
                    //TODO: create toast to inform the user
                    console.log('Option cannot be deleted yet!');    
                    return res.sendStatus(400);
                }
            });
        });
    });
});

/**
 * Deletes all dynamic attribute values for an entity of type MODELNAME and the given _id.
 */
router.delete('/values/:modelName/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', 'base'), validateModelName, validateId, validateSameClientId(), (req, res) => {
    var modelName = req.params.modelName;
    var entityId = req.params.id;
    //TODO: check if following syntax deletes multiple values
    req.db.remove('dynamicattributevalues', {entityId: entityId}).then(function(result){
        return res.sendStatus(204);
    });
});

module.exports = router;
