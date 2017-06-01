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
 *  value
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
var constants = require('../utils/constants');

/**
 * Check whether the modelName given in the request is valid or not
 */
function validateModelName(req, res, next) {
    if (constants.dynamicAttributeTypes.indexOf(req.params.modelName) < 0) {
        return res.sendStatus(400);
    }
    next();
}

/**
 * Returns all dynamic attributes defined for the model MODELNAME as list
 */
router.get('/model/:modelName', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'r', 'base'), validateModelName, (req, res) => {
    var modelName = req.params.modelName;
    // TODO: Implement
});

/**
 * Returns a dynamic attribute with the given _id
 */
router.get('/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'r', 'base'), validateId, validateSameClientId('dynamicattributes'), (req, res) => {
    var dynamicAttributeId = req.params.id;
    // TODO: Implement
});

/**
 * Returns the concrete option with the given _id.
 */
router.get('/option/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'r', 'base'), validateId, validateSameClientId('dynamicattributeoptions'), (req, res) => {
    var dynamicAttributeOptionId = req.params.id;
    // TODO: Implement
});

/**
 * Returns a list of options for a dynamic attribute with the given _id. The type of the dynamic attribute must be picklist.
 */
router.get('/options/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'r', 'base'), validateId, validateSameClientId('dynamicattributes'), (req, res) => {
    var dynamicAttributeId = req.params.id;
    // TODO: Implement
});

/**
 * Returns all values of the dynamic attributes of an entity of a model MODELNAME with the given _id.
 */
router.get('/values/:modelName/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'r', 'base'), validateModelName, validateId, validateSameClientId(), (req, res) => {
    var modelName = req.params.modelName;
    var entityId = req.params.id;
    // TODO: Implement
});

/**
 * Returns a list of all possible option types (currently only text, boolean and picklist)
 */
router.get('/types', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'r', 'base'), (req, res) => {
    // TODO: Implement
});

/**
 * Creates a new dynamic attribute. Required properties are model, name_en and type.
 */
router.post('/', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'w', 'base'), (req, res) => {
    var dynamicAttribute = req.body;
    // TODO: Implement
});

/**
 * Creates a new option for a dynamic attribute of type picklist.
 * Required properties are dynamicattributeid and text_en. A value is optional.
 */
router.post('/option', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'w', 'base'), (req, res) => {
    var dynamicAttributeOption = req.body;
    // TODO: Implement
});

/**
 * Creates a new set of values for dynamic attributes for an entity of type MODELNAME and with the given _id.
 */
router.post('/values/:modelName/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'w', 'base'), validateModelName, validateId, validateSameClientId(), (req, res) => {
    var modelName = req.params.modelName;
    var entityId = req.params.id;
    var dynamicAttributeValues = req.body;
    // TODO: Implement
});

/**
 * Updates a dynamic attribute. Changing the type is not supported.
 * For this case the attribute needs to be deleted and a new one is to be created.
 * Also changing the model is not supported. Only the name_* properties can be updated.
 */
router.put('/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'w', 'base'), validateId, validateSameClientId('dynamicattributes'), (req, res) => {
    var dynamicAttributeId = req.params.id;
    var dynamicAttribute = req.body;
    // TODO: Implement
});

/**
 * Updates an option with the given _id for a dynamic attibute.
 * The dynamicattributeid of the option cannot be changed.
 */
router.put('/option/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'w', 'base'), validateId, validateSameClientId('dynamicattributeoptions'), (req, res) => {
    var dynamicAttributeOptionId = req.params.id;
    var dynamicAttributeOption = req.body;
    // TODO: Implement
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
});

/**
 * Deletes an option with the given _id of a dynamic attribute. 
 * Also deletes all existing dynamicattributevalues of the corresponding dynamic 
 * attribute where this option is the value.
 */
router.delete('/option/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'w', 'base'), validateId, validateSameClientId('dynamicattributeoptions'), (req, res) => {
    var dynamicAttributeOptionId = req.params.id;
    // TODO: Implement
});

/**
 * Deletes all dynamic attribute values for an entity of type MODELNAME and the given _id.
 */
router.delete('/option/:modelName/:id', auth('PERMISSION_ADMINISTRATION_SETTINGS_CLIENT_DYNAMICATTRIBUTES', 'w', 'base'), validateModelName, validateId, validateSameClientId(), (req, res) => {
    var modelName = req.params.modelName;
    var entityId = req.params.id;
    // TODO: Implement
});

module.exports = router;
