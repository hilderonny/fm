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
router.get('/model/:modelName', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'r', 'base'), validateModelName, (req, res) => {
    var modelName = req.params.modelName;
    req.db.get(co.collections.dynamicattributes.name).find({modelName: modelName}).then(function(dynamicattributes){
        res.send(dynamicattributes);
    });
});

/**
 * Returns a dynamic attribute with the given _id
 */
router.get('/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'r', 'base'), validateId, validateSameClientId('dynamicattributes'), (req, res) => {
    var dynamicAttributeId = req.params.id;
    req.db.get('dynamicattributes').findOne(dynamicAttributeId).then(function(dynamicattribute){
        // Database element is available here in every case, because validateSameClientId already checked for existence
        res.send(dynamicattribute);
    });
});

/**
 * Returns the concrete option with the given _id.
 */
router.get('/option/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'r', 'base'), validateId, validateSameClientId('dynamicattributeoptions'), (req, res) => {
    var dynamicAttributeOptionId = req.params.id;
    req.db.get('dynamicattributeoptions').findOne(dynamicAttributeOptionId).then(function(attributeOption){
        res.send(attributeOption);
    });
});

/**
 * Returns a list of options for a dynamic attribute with the given _id. The type of the dynamic attribute must be picklist.
 */
router.get('/options/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'r', 'base'), validateId, validateSameClientId('dynamicattributes'), (req, res) => {
    var dynamicAttributeId = req.params.id;
    req.db.get('dynamicattributeoptions').find({dynamicAttributeId: dynamicAttributeId}).then(function(attributeOptions){
        res.send(attributeOptions);
    });
});

/**
 * Returns all values of the dynamic attributes of an entity of a model MODELNAME with the given _id.
 */
router.get('/values/:modelName/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'r', 'base'), validateModelName, validateId, validateSameClientId(), (req, res) => {
    var modelName = req.params.modelName;
    var entityId = req.params.id;
    // TODO: fix implementation
    req.db.get(modelName).findOne(entityId).then(function(entityFromDB){
        req.db.get('dynamicattributevalues').find({entityId: entityFromDB._id}).then(function(attribureValues){
            var dynamicattribureValues = attribureValues.body;
            var Values = [];
            console.log('GET/values method');
            //console.log(dynamicattribureValues);
            if(dynamicattribureValues){
                dynamicattribureValues.forEach(function(attributeValue){
                    req.db.get('dynamicattributes').findOne({dynamicAttributeId: attributeValue.dynamicAttributeId}).then(function(dynamicAttribute){
                    var arrayElement;
                        arrayElement["value"] = attributeValue.value;
                        arrayElement["type"] = dynamicAttribute.type; 
                        arrayElement["name_en"] = dynamicAttribute.name_en;
                        Values.push(arrayElement);
                    }).then(function(){return res.send(Values);});
                });
            }
            else{
              Values.push(13);
              return  res.send(Values);
            }
            
        });
    });
});

/**
 * Returns a list of all possible option types (currently only text, boolean and picklist)
 */
router.get('/types', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'r', 'base'), (req, res) => {
     //res.send(co.dynamicAttributeTypes.map(function(k) { return co.dynamicAttributeTypes[k]; } ));
    //res.send(co.dynamicAttributeTypes.map((k) => co.dynamicAttributeTypes[k]));
    res.send(Object.keys(co.dynamicAttributeTypes));
});

/**
 * Returns a list of all possible data models which can have dynamic attributes (currently only...)
 */
router.get('/models', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'r', 'base'), (req, res) => {
    /*var models = [];
    co.collections.forEach(function(collectionItem){
        if(collectionItem.canHaveAttributes){
            var modelObject = {name: collectionItem.name, icon: collectionItem.icon, title: 'some title'};
            models.push(modelObject);
        }
    });*/
    var models = [
        {name: 'users', icon: 'User', title: 'Users'}, //TODO add translation key for title attribute 
        {name: 'usergroups', icon: 'User Group Man Man', title: 'User groups'},
        {name: 'folders', icon: 'Document', title: 'Documents'}
    ];
   return  res.sendStatus(200);
});

/**
 * Creates a new dynamic attribute. Required properties are modelName, name_en and type.
 */
router.post('/', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'w', 'base'), (req, res) => {
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
                if(dynamicAttribute.type != 'DYNAMICATTRIBUTES_TYPE_PICKLIST'){
                    req.db.insert('dynamicattributevalues', emptyValue);
                }
            });
         });
         return res.send(insertedDynamicAttribute);
     });
});

/**
 * Creates a new option for a dynamic attribute of type picklist.
 * Required properties are dynamicattributeid and text_en. 
 */
router.post('/option', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'w', 'base'), (req, res) => {
    var dynamicAttributeOption = req.body;

    if(!dynamicAttributeOption || !dynamicAttributeOption.dynamicAttributeId || !dynamicAttributeOption.text_en) {
        return res.sendStatus(400);
    }
    //Options are allowed only for Attributes of type picklist
    req.db.get('dynamicattributes').findOne({_id: dynamicAttributeOption.dynamicAttributeId}).then(function(dynamicAttribute){
        if(dynamicAttribute.type != 'picklist'){
            console.log('attribute type is not picklist');
            return res.sendStatus(400);
        }
    });

    delete dynamicAttributeOption._id; // Ids are generated automatically
    delete dynamicAttributeOption.dynamicAttributeId;
    dynamicAttributeOption.clientId = req.user.clientId; 
    req.db.insert('dynamicattributeoptions', dynamicAttributeOption).then(function(inserteddynamicAttributeOption){
        return res.send(inserteddynamicAttributeOption); 
    });
});

/**
 * Creates a new set of values for dynamic attributes for an entity of type MODELNAME and with the given _id.
 */
router.post('/values/:modelName/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'w', 'base'), validateModelName, validateId, validateSameClientId(), (req, res) => {
    var modelName = req.params.modelName;
    var entityId = req.params.id;
    var dynamicAttributeValues = req.body;
    // TODO: check implementation
   /* req.db.get(modelName).findOne(entityId).then(function(existingEntityFromDB){
        if(!existingEntityFromDB){
            return res.sendStatus(403); 
        }
        else{
            req.db.update(modelName, entityId, { $set: dynamicAttributeValues }).then((EntityWithInsertedAttributes) => {
                return res.send(EntityWithInsertedAttributes);
            });
        }
    });*/

    // alternative implementation ///////
    if(!dynamicAttributeValues) {
        return res.sendStatus(400);
    }

    dynamicAttributeValues.forEach(function(value){
        value.clientId = req.user.clientId;
        delete value._id;
        if(!value.dynamicAttributeId){
             return res.sendStatus(400);
        }
    });

    req.db.insert('dynamicattributevalues', dynamicAttributeValues).then(function(inserteddAttributeValue){
        return res.send(inserteddAttributeValue); 
    });

});

/**
 * Updates a dynamic attribute. Changing the type is not supported.
 * For this case the attribute needs to be deleted and a new one is to be created.
 * Also changing the model is not supported. Only the name_* properties can be updated.
 */
router.put('/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'w', 'base'), validateId, validateSameClientId('dynamicattributes'), (req, res) => {
    var dynamicAttributeId = req.params.id;
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
router.put('/option/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'w', 'base'), validateId, validateSameClientId('dynamicattributeoptions'), (req, res) => {
    var dynamicAttributeOptionId = req.params.id;
    var dynamicAttributeOption = req.body;

    // Dynamic attribute option is available here in every case, because validateSameClientId already checked for existence

    delete dynamicAttributeOption.dynamicAttributeId;
    delete dynamicAttributeOption.clientId; //clientId should not be changed
    req.db.update('dynamicattributeoptions', dynamicAttributeOptionId, { $set: dynamicAttributeOption }).then((updatedAttributeValue) => {
        return res.send(updatedAttributeValue);
    }); 
});

/**
 * Updates a value set for an entity of the type MODELNAME and the given _id. 
 */
router.put('/values/:modelName/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'w', 'base'), validateModelName, validateId, validateSameClientId(), (req, res) => {
    var modelName = req.params.modelName;
    var entityId = req.params.id;
    var dynamicAttributeValues = req.body;
    // TODO: Implement
});

/**
 * Deletes a dynmic attribute with the given _id.
 * All existing dynamicattributevalues which exist for the attribute are also deleted.
 * When the dynamic attribute is of type picklist, all of its options are also deleted.
 */
router.delete('/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'w', 'base'), validateId, validateSameClientId('dynamicattributes'), (req, res) => {
    var dynamicAttributeId = req.params.id;
    // TODO: Implement
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
router.delete('/option/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'w', 'base'), validateId, validateSameClientId('dynamicattributeoptions'), (req, res) => {
    var dynamicAttributeOptionId = req.params.id;
    // Database element is available here in every case, because validateSameClientId already checked for existence
    req.db.get('dynamicattributeoptions').findOne({_id: dynamicAttributeOptionId}).then(function(attributeOption){
        var dynamicAttributeId = attributeOption.dynamicAttributeId;
        req.db.get('dynamicattributes').findOne({_id: dynamicAttributeId}).then(function(dynamicAttribute){
            //delete values for corresponding attribure option
            req.db.remove('dynamicattributevalues', {_id: dynamicAttributeOptionId}).then(function(result){
                //delete option itself
                req.db.remove('dynamicattributeoptions', {_id: dynamicAttributeOptionId}).then(function(result){
                    return res.sendStatus(204);
                });
            });
        });
    });
});

/**
 * Deletes all dynamic attribute values for an entity of type MODELNAME and the given _id.
 */
router.delete('/values/:modelName/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'w', 'base'), validateModelName, validateId, validateSameClientId(), (req, res) => {
    var modelName = req.params.modelName;
    var entityId = req.params.id;
    //TODO: check if following syntax deletes multiple values
    req.db.remove('dynamicattributevalues', {entityId: entityId}).then(function(result){
        return res.sendStatus(204);
    });
});

module.exports = router;
