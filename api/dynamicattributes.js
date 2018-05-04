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
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateSameClientId = require('../middlewares/validateSameClientId');
var apiHelper = require('../utils/apiHelper');
var dynamicAttributesHelper = require('../utils/dynamicAttributesHelper');
var co = require('../utils/constants');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;

/**
 * Check whether the modelName given in the request is valid or not
 */
function validateModelName(req, res, next) {
    if (!co.collections[req.params.modelName] || co.collections[req.params.modelName].canHaveAttributes == false) {
        return res.sendStatus(400);
    }
    next();
}

function mapDynamicAttributeFields(da, clientname) {
    return {
        _id: da.name,
        clientId: clientname,
        name_en: da.label,
        name_de: da.label,
        type: da.dynamicattributetypename,
        identifier: da.identifier,
        modelName: da.modelname,
        isInactive: da.isinactive
    }
}

function mapDynamicAttributeOptionField(dao, clientname) {
    return {
        _id: dao.name,
        clientId: clientname,
        dynamicAttributeId: dao.dynamicattributename,
        text_en: dao.label,
        text_de: dao.label,
        value: dao.value
    }    
}

/**
 * Returns all dynamic attributes defined for the model MODELNAME as list
 */
router.get('/model/:modelName', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', co.modules.base), async(req, res) => {
    var modelname = req.params.modelName;
    var dynamicattributes = await Db.getDynamicObjects(req.user.clientname, co.collections.dynamicattributes.name, {modelname: modelname });
    res.send(dynamicattributes.map(da => { return mapDynamicAttributeFields(da, req.user.clientname); }));
});

/**
 * Returns the concrete option with the given _id.
 */
router.get('/option/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', co.modules.base), validateSameClientId(co.collections.dynamicattributeoptions.name), async(req, res) => {
    var option = await Db.getDynamicObject(req.user.clientname, co.collections.dynamicattributeoptions.name, req.params.id);
    if (!option) return res.sendStatus(404);
    res.send(mapDynamicAttributeOptionField(option, req.user.clientname));
});

/**
 * Returns a list of options for a dynamic attribute with the given _id. The type of the dynamic attribute must be picklist.
 */
router.get('/options/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', co.modules.base), validateSameClientId(co.collections.dynamicattributes.name), async(req, res) => {
    var options = await Db.getDynamicObjects(req.user.clientname, co.collections.dynamicattributeoptions.name, { dynamicattributename: req.params.id });
    res.send(options.map(option => { return mapDynamicAttributeOptionField(option, req.user.clientname); }));
});

/**
 * Returns all values of the dynamic attributes of an entity of a model MODELNAME with the given _id.
 * {
 *  type: {
 *      name_en,
 *      name_de,
 *      type
 *  },
 *  value,
 *  options: [
 *      {
 *          _id,
 *          text_en,
 *          text_de
 *      }
 *  ]
 * }
 */
router.get('/values/:modelName/:id', auth(false, false, co.modules.base), validateSameClientId(), async(req, res) => {
    var modelname = Db.replaceQuotesAndRemoveSemicolon(req.params.modelName);
    // https://dba.stackexchange.com/a/72139, https://dba.stackexchange.com/a/69658/145998
    var query = `
    SELECT
        b.type::jsonb,
        json_agg(b.options) AS options,
        (CASE WHEN b.type::jsonb->>'type' = 'boolean' THEN dav.value ELSE '"' || dav.value || '"' END)::json AS value
    FROM (
        SELECT
            a.*,
            CASE WHEN a.dynamicattributetypename = 'picklist' THEN (SELECT row_to_json(dao_) FROM (SELECT dao.name AS _id, dao.label AS text_de, dao.label AS text_en) AS dao_) ELSE NULL END AS options
        FROM (
            SELECT
                ${modelname}.name AS entityname,
                da.name AS dynamicattributename,
                da.dynamicattributetypename,
                (SELECT row_to_json(da_) FROM (SELECT da.name AS _id, da.label AS name_en, da.label AS name_de, da.dynamicattributetypename AS type) AS da_) AS type
            FROM dynamicattributes da, ${modelname}
            WHERE (da.isinactive IS NULL OR da.isinactive = false)
            AND da.modelname = '${modelname}'
        ) a
        LEFT JOIN dynamicattributeoptions dao ON dao.dynamicattributename = a.dynamicattributename
    ) b
    LEFT JOIN dynamicattributevalues dav ON dav.dynamicattributename = b.dynamicattributename AND dav.entityname = b.entityname
    WHERE b.entityname = '${Db.replaceQuotes(req.params.id)}'
    GROUP BY b.type::jsonb, dav.value
    ORDER BY type::jsonb->>'name_en'
    `;
    var values = (await Db.query(req.user.clientname, query)).rows;
    res.send(values); // Kein mapping, das kommt schon richtig aus der Datenbank
});

/**
 * Returns a list of all possible data models which can have dynamic attributes
 */
router.get('/models', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', co.modules.base), async(req, res) => {
    var models = Object.keys(co.collections).map(k => co.collections[k]).filter(c => c.canHaveAttributes);
    res.send(models);
});

/**
 * Returns a dynamic attribute with the given _id
 */
router.get('/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'r', co.modules.base), validateSameClientId(co.collections.dynamicattributes.name), async(req, res) => {
    var da = await Db.getDynamicObject(req.user.clientname, co.collections.dynamicattributes.name, req.params.id);
    if (!da) return res.sendStatus(404);
    res.send(mapDynamicAttributeFields(da, req.user.clientname));
});

/**
 * Creates a new option for a dynamic attribute of type picklist.
 * Required properties are dynamicattributeid and text_en. 
 */
router.post('/option', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), async(req, res) => {
    var dynamicAttributeOption = req.body;
    if(!dynamicAttributeOption || !dynamicAttributeOption.dynamicAttributeId || !dynamicAttributeOption.text_en) return res.sendStatus(400);
    var attribute = await Db.getDynamicObject(req.user.clientname, co.collections.dynamicattributes.name, { name: dynamicAttributeOption.dynamicAttributeId, dynamicattributetypename: 'picklist' });
    if (!attribute) return res.sendStatus(400);
    delete dynamicAttributeOption.value; // Darf per API nicht gesetzt werden
    var createdoption = await dynamicAttributesHelper.createDynamicAttributeOption(dynamicAttributeOption, req.user.clientname);
    dynamicAttributeOption._id = createdoption.name;
    res.send(dynamicAttributeOption);
});

/**
 * Creates a new set of values for dynamic attributes for an entity of type MODELNAME and with the given _id.
 */
router.post('/values/:modelName/:id', auth(false, false, co.modules.base), validateModelName, validateSameClientId(), async(req, res) => {
    var clientname = req.user.clientname;
    var modelName = req.params.modelName;
    var entity = await Db.getDynamicObject(clientname, modelName, req.params.id);
    if (!entity) return res.sendStatus(400);
    var dynamicAttributeValues = req.body;
    if (!Array.isArray(dynamicAttributeValues)) return res.sendStatus(400); 
    if (dynamicAttributeValues.find(v => !v.dynamicAttributeId)) return res.sendStatus(400);
    var dynamicattributenames = dynamicAttributeValues.map(dav => `'${Db.replaceQuotes(dav.dynamicAttributeId)}'`);
    var dynamicattributes = dynamicattributenames.length > 0 ? (await Db.query(clientname, `SELECT * FROM dynamicattributes WHERE name IN (${dynamicattributenames.join(",")});`)).rows : [];
    if (dynamicattributes.length !== dynamicAttributeValues.length) return res.sendStatus(400); // Some attributes do not exist or multiply defined in body
    var valuestoinsert = dynamicAttributeValues.map(dav => { return {
        name: uuidv4().replace(/-/g, ""),
        entityname: entity.name,
        dynamicattributename: dav.dynamicAttributeId,
        value: dav.value
    }});
    for (var i = 0; i < valuestoinsert.length; i++) {
        await Db.deleteDynamicObjects(clientname, co.collections.dynamicattributevalues.name, { entityname: entity.name, dynamicattributename: valuestoinsert[i].dynamicattributename });
        await Db.insertDynamicObject(clientname, co.collections.dynamicattributevalues.name, valuestoinsert[i]);
    }
    res.send(valuestoinsert.map(v => { return {
        _id: v.name,
        entityId: v.entityname,
        clientId: clientname,
        value: v.value,
        dynamicAttributeId: v.dynamicattributename
    }}));
});

/**
 * Creates a new dynamic attribute. Required properties are modelName, name_en and type.
 */
router.post('/', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), async(req, res) => {
    var clientname = req.user.clientname;
    var dynamicAttribute = req.body;
    if (!dynamicAttribute || !dynamicAttribute.type || !co.dynamicAttributeTypes[dynamicAttribute.type] || !dynamicAttribute.modelName || !co.collections[dynamicAttribute.modelName] || !co.collections[dynamicAttribute.modelName].canHaveAttributes || !dynamicAttribute.name_en) return res.sendStatus(400);
    var attributetoinsert = {
        name: uuidv4().replace(/-/g, ""),
        modelname: dynamicAttribute.modelName,
        label: dynamicAttribute.name_de ? dynamicAttribute.name_de: dynamicAttribute.name_en,
        isinactive: !!dynamicAttribute.isInactive, // Convert undefined to false
        dynamicattributetypename: dynamicAttribute.type,
        identifier: null// no identifier for manually created attributes!
    }
    await Db.insertDynamicObject(clientname, co.collections.dynamicattributes.name, attributetoinsert);
    dynamicAttribute._id = attributetoinsert.name;
    res.send(dynamicAttribute);
});

/**
 * Updates an option with the given _id for a dynamic attibute.
 * The dynamicattributeid of the option cannot be changed.
 */
router.put('/option/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), validateSameClientId(co.collections.dynamicattributeoptions.name), async(req, res) => {
    var clientname = req.user.clientname;
    var dynamicAttributeOption = req.body;
    var attribute = await Db.getDynamicObject(clientname, co.collections.dynamicattributes.name, dynamicAttributeOption.dynamicAttributeId);
    if (!attribute) return res.sendStatus(404);
    delete dynamicAttributeOption._id;
    delete dynamicAttributeOption.dynamicAttributeId;
    delete dynamicAttributeOption.clientId; //clientId should not be changed
    if(Object.keys(dynamicAttributeOption).length < 1) return res.sendStatus(400);
    var updateset = { }
    if (dynamicAttributeOption.text_en) updateset.label = dynamicAttributeOption.text_en;
    if (dynamicAttributeOption.text_de) updateset.label = dynamicAttributeOption.text_de;
    if (dynamicAttributeOption.value) updateset.value = dynamicAttributeOption.value;
    await Db.updateDynamicObject(clientname, co.collections.dynamicattributeoptions.name, req.params.id, updateset);
    res.send(dynamicAttributeOption);
});

/**
 * Updates a dynamic attribute. Changing the type is not supported.
 * For this case the attribute needs to be deleted and a new one is to be created.
 * Also changing the model is not supported. Only the name_* properties can be updated.
 */
router.put('/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), validateSameClientId(co.collections.dynamicattributes.name), async(req, res) => {
    var clientname = req.user.clientname;
    var dynamicAttribute = req.body;
    delete dynamicAttribute._id;
    delete dynamicAttribute.modelName;
    delete dynamicAttribute.type;
    delete dynamicAttribute.clientId;
    delete dynamicAttribute.identifier;
    if(Object.keys(dynamicAttribute).length < 1) return res.sendStatus(400);
    var updateset = { }
    if (dynamicAttribute.name_en) updateset.label = dynamicAttribute.name_en;
    if (dynamicAttribute.name_de) updateset.label = dynamicAttribute.name_de;
    await Db.updateDynamicObject(clientname, co.collections.dynamicattributes.name, req.params.id, updateset);
    res.send(dynamicAttribute);
});

/**
 * Deletes an option with the given _id of a dynamic attribute. 
 * Also deletes all existing dynamicattributevalues of the corresponding dynamic 
 * attribute where this option is the value.
 */
router.delete('/option/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), validateSameClientId(co.collections.dynamicattributeoptions.name), async(req, res) => {
    var clientname = req.user.clientname;
    var existing = await Db.getDynamicObject(clientname, co.collections.dynamicattributeoptions.name, req.params.id);
    if (existing.value) return res.sendStatus(405);
    await Db.deleteDynamicObject(clientname, co.collections.dynamicattributeoptions.name, req.params.id);
    await Db.deleteDynamicObjects(clientname, co.collections.dynamicattributevalues.name, { value: req.params.id });
    res.sendStatus(204);
});

/**
 * Deletes all dynamic attribute values for an entity of type MODELNAME and the given _id.
 */
router.delete('/values/:modelName/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), validateSameClientId(), async(req, res) => {
    await Db.deleteDynamicObjects(req.user.clientname, co.collections.dynamicattributevalues.name, { entityname: req.params.id });
    return res.sendStatus(204);
});

/**
 * Deletes a dynamic attribute with the given _id.
 * All existing dynamicattributevalues which exist for the attribute are also deleted.
 * When the dynamic attribute is of type picklist, all of its options are also deleted.
 */
router.delete('/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), validateSameClientId(co.collections.dynamicattributes.name), async(req, res) => {
    var clientname = req.user.clientname;
    var existing = await Db.getDynamicObject(clientname, co.collections.dynamicattributes.name, req.params.id);
    if (existing.identifier) return res.sendStatus(405);
    await Db.deleteDynamicObject(clientname, co.collections.dynamicattributes.name, req.params.id);
    await Db.deleteDynamicObjects(clientname, co.collections.dynamicattributeoptions.name, { dynamicattributename: req.params.id });
    await Db.deleteDynamicObjects(clientname, co.collections.dynamicattributevalues.name, { dynamicattributename: req.params.id });
    res.sendStatus(204);
});

module.exports = router;
