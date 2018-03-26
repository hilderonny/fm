var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateSameClientId = require('../middlewares/validateSameClientId');
var apiHelper = require('../utils/apiHelper');
var co = require('../utils/constants');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;
var ph = require('../utils/permissionshelper');


// Get a list of all children of the given entity
router.get("/children/:recordtypename/:entityname", auth(false, false, co.modules.base), async(req, res) => {
    var clientname = req.user.clientname;
    var recordtypename = req.params.recordtypename;
    var entityname = req.params.entityname;
    var permissions = await ph.getpermissionsforuser(req.user);
    var relevantrelations = (await Db.query(clientname, `SELECT r.datatype2name, r.name2, dtp.permissionkey, dtc.icon FROM relations r JOIN datatypes dtp ON dtp.name = r.datatype1name JOIN datatypes dtc ON dtc.name = r.datatype2name WHERE r.relationtypename = 'parentchild' AND r.datatype1name = '${Db.replaceQuotes(recordtypename)}' AND r.name1 = '${Db.replaceQuotes(entityname)}';`)).rows;
    var children = [];
    for (var i = 0; i < relevantrelations.length; i++) {
        var rr = relevantrelations[i];
        if (!permissions.find(p => p.key === rr.permissionkey && p.canRead)) continue; // No permission to access specific datatype entities
        var child = await Db.getDynamicObject(clientname, rr.datatype2name, rr.name2);
        if (child) {
            child._datatypename = rr.datatype2name;
            child._icon = rr.icon;
            children.push(child);
        }
    }
    res.send(children);
});

// Get path of all parents of an object as array (root first) for breadcrumbs
router.get("/parentpath/:recordtypename/:entityname", auth.dynamic("recordtypename", "r"), async(req, res) => {
    var clientname = req.user.clientname;
    try {
        var relationsquery = `
        WITH RECURSIVE get_path(datatype1name, name1, datatype2name, name2, depth) AS (
            (SELECT datatype1name, name1, datatype2name, name2, 0 FROM relations WHERE relationtypename = 'parentchild')
            UNION
            (SELECT relations.datatype1name, relations.name1, get_path.datatype2name, get_path.name2, get_path.depth + 1 FROM relations JOIN get_path on get_path.name1 = relations.name2 WHERE relationtypename = 'parentchild')
        )
        SELECT datatype1name, name1, depth FROM get_path WHERE datatype2name = '${Db.replaceQuotes(req.params.recordtypename)}' AND name2 = '${Db.replaceQuotes(req.params.entityname)}';
        `;
        var relations = (await Db.query(clientname, relationsquery)).rows;
        var labelquery = relations.map(r => `SELECT label, ${r.depth} AS depth FROM ${Db.replaceQuotesAndRemoveSemicolon(r.datatype1name)} WHERE name = '${Db.replaceQuotes(r.name1)}'`).join(" UNION ");
        var labels = (await Db.query(clientname, labelquery)).rows.sort((a, b) => b.depth - a.depth).map(l => l.label);
        res.send(labels);
    } catch(error) {
        res.sendStatus(400); // Error in request. Maybe the recordtypename does not exist
    }
});

// Get all root elements for a specific list type (parameter forlist). That are those elements which have no parentchild relation where they are children
router.get("/rootelements/:forlist", auth(false, false, co.modules.base), async(req, res) => {
    var clientname = req.user.clientname;
    var forlist = req.params.forlist;
    var permissions = await ph.getpermissionsforuser(req.user);
    var relevantdatatypes = (await Db.query(clientname, `SELECT * FROM datatypes WHERE '${Db.replaceQuotes(forlist)}' = ANY (lists);`)).rows;
    var rootelements = [];
    for (var i = 0; i < relevantdatatypes.length; i++) { // Must be loop because it is not said, that all datatypes have all required columns so UNION will not work
        var rdt = relevantdatatypes[i];
        if (!permissions.find(p => p.key === rdt.permissionkey && p.canRead)) continue; // No permission to access specific datatypes
        var rdtn = rdt.name;
        var entities = (await Db.query(clientname, `SELECT e.* FROM ${Db.replaceQuotesAndRemoveSemicolon(rdtn)} e LEFT JOIN relations r ON r.name2 = e.name AND r.relationtypename = 'parentchild' AND r.datatype2name = '${Db.replaceQuotes(rdtn)}' WHERE r.name IS NULL;`)).rows;
        entities.forEach(e => rootelements.push({ name: e.name, _datatypename: rdt.name, label: e.label, _icon: rdt.icon }));
    }
    res.send(rootelements);
});

router.get("/:recordtypename", auth.dynamic("recordtypename", "r"), async(req, res) => {
    try {
        var filter = req.params;
        delete filter.token;
        var objects = await Db.getDynamicObjects(req.user.clientname, req.params.recordtypename, filter);
        res.send(objects);
    } catch(error) {
        res.sendStatus(400); // Error in request. Maybe the recordtypename does not exist
    }
});

router.post('/:recordtypename', auth.dynamic("recordtypename", "w"), async(req, res) => {
    var newobject = req.body;
    newobject.name = uuidv4();
    try {
        await Db.insertDynamicObject(req.user.clientname, req.params.recordtypename, newobject);
        res.send(newobject.name);
    } catch(error) {
        res.sendStatus(400); // Any error with the request
    }
});

// /**
//  * Creates a new set of values for dynamic attributes for an entity of type MODELNAME and with the given _id.
//  */
// router.post('/values/:modelName/:id', auth(false, false, co.modules.base), validateModelName, validateSameClientId(), async(req, res) => {
//     var clientname = req.user.clientname;
//     var modelName = req.params.modelName;
//     var entity = await Db.getDynamicObject(clientname, modelName, req.params.id);
//     if (!entity) return res.sendStatus(400);
//     var dynamicAttributeValues = req.body;
//     if (!Array.isArray(dynamicAttributeValues)) return res.sendStatus(400); 
//     if (dynamicAttributeValues.find(v => !v.dynamicAttributeId)) return res.sendStatus(400);
//     var dynamicattributenames = dynamicAttributeValues.map(dav => `'${Db.replaceQuotes(dav.dynamicAttributeId)}'`);
//     var dynamicattributes = dynamicattributenames.length > 0 ? (await Db.query(clientname, `SELECT * FROM dynamicattributes WHERE name IN (${dynamicattributenames.join(",")});`)).rows : [];
//     if (dynamicattributes.length !== dynamicAttributeValues.length) return res.sendStatus(400); // Some attributes do not exist or multiply defined in body
//     var valuestoinsert = dynamicAttributeValues.map(dav => { return {
//         name: uuidv4(),
//         entityname: entity.name,
//         dynamicattributename: dav.dynamicAttributeId,
//         value: dav.value
//     }});
//     for (var i = 0; i < valuestoinsert.length; i++) {
//         await Db.deleteDynamicObjects(clientname, co.collections.dynamicattributevalues.name, { entityname: entity.name, dynamicattributename: valuestoinsert[i].dynamicattributename });
//         await Db.insertDynamicObject(clientname, co.collections.dynamicattributevalues.name, valuestoinsert[i]);
//     }
//     res.send(valuestoinsert.map(v => { return {
//         _id: v.name,
//         entityId: v.entityname,
//         clientId: clientname,
//         value: v.value,
//         dynamicAttributeId: v.dynamicattributename
//     }}));
// });

// /**
//  * Creates a new dynamic attribute. Required properties are modelName, name_en and type.
//  */
// router.post('/', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), async(req, res) => {
//     var clientname = req.user.clientname;
//     var dynamicAttribute = req.body;
//     if (!dynamicAttribute || !dynamicAttribute.type || !co.dynamicAttributeTypes[dynamicAttribute.type] || !dynamicAttribute.modelName || !co.collections[dynamicAttribute.modelName] || !co.collections[dynamicAttribute.modelName].canHaveAttributes || !dynamicAttribute.name_en) return res.sendStatus(400);
//     var attributetoinsert = {
//         name: uuidv4(),
//         modelname: dynamicAttribute.modelName,
//         label: dynamicAttribute.name_de ? dynamicAttribute.name_de: dynamicAttribute.name_en,
//         isinactive: !!dynamicAttribute.isInactive, // Convert undefined to false
//         dynamicattributetypename: dynamicAttribute.type,
//         identifier: null// no identifier for manually created attributes!
//     }
//     await Db.insertDynamicObject(clientname, co.collections.dynamicattributes.name, attributetoinsert);
//     dynamicAttribute._id = attributetoinsert.name;
//     res.send(dynamicAttribute);
// });

// /**
//  * Updates an option with the given _id for a dynamic attibute.
//  * The dynamicattributeid of the option cannot be changed.
//  */
// router.put('/option/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), validateSameClientId(co.collections.dynamicattributeoptions.name), async(req, res) => {
//     var clientname = req.user.clientname;
//     var dynamicAttributeOption = req.body;
//     var attribute = await Db.getDynamicObject(clientname, co.collections.dynamicattributes.name, dynamicAttributeOption.dynamicAttributeId);
//     if (!attribute) return res.sendStatus(404);
//     delete dynamicAttributeOption._id;
//     delete dynamicAttributeOption.dynamicAttributeId;
//     delete dynamicAttributeOption.clientId; //clientId should not be changed
//     if(Object.keys(dynamicAttributeOption).length < 1) return res.sendStatus(400);
//     var updateset = { }
//     if (dynamicAttributeOption.text_en) updateset.label = dynamicAttributeOption.text_en;
//     if (dynamicAttributeOption.text_de) updateset.label = dynamicAttributeOption.text_de;
//     if (dynamicAttributeOption.value) updateset.value = dynamicAttributeOption.value;
//     await Db.updateDynamicObject(clientname, co.collections.dynamicattributeoptions.name, req.params.id, updateset);
//     res.send(dynamicAttributeOption);
// });

// /**
//  * Updates a dynamic attribute. Changing the type is not supported.
//  * For this case the attribute needs to be deleted and a new one is to be created.
//  * Also changing the model is not supported. Only the name_* properties can be updated.
//  */
// router.put('/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), validateSameClientId(co.collections.dynamicattributes.name), async(req, res) => {
//     var clientname = req.user.clientname;
//     var dynamicAttribute = req.body;
//     delete dynamicAttribute._id;
//     delete dynamicAttribute.modelName;
//     delete dynamicAttribute.type;
//     delete dynamicAttribute.clientId;
//     delete dynamicAttribute.identifier;
//     if(Object.keys(dynamicAttribute).length < 1) return res.sendStatus(400);
//     var updateset = { }
//     if (dynamicAttribute.name_en) updateset.label = dynamicAttribute.name_en;
//     if (dynamicAttribute.name_de) updateset.label = dynamicAttribute.name_de;
//     await Db.updateDynamicObject(clientname, co.collections.dynamicattributes.name, req.params.id, updateset);
//     res.send(dynamicAttribute);
// });

// /**
//  * Deletes an option with the given _id of a dynamic attribute. 
//  * Also deletes all existing dynamicattributevalues of the corresponding dynamic 
//  * attribute where this option is the value.
//  */
// router.delete('/option/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), validateSameClientId(co.collections.dynamicattributeoptions.name), async(req, res) => {
//     var clientname = req.user.clientname;
//     var existing = await Db.getDynamicObject(clientname, co.collections.dynamicattributeoptions.name, req.params.id);
//     if (existing.value) return res.sendStatus(405);
//     await Db.deleteDynamicObject(clientname, co.collections.dynamicattributeoptions.name, req.params.id);
//     await Db.deleteDynamicObjects(clientname, co.collections.dynamicattributevalues.name, { value: req.params.id });
//     res.sendStatus(204);
// });

// /**
//  * Deletes all dynamic attribute values for an entity of type MODELNAME and the given _id.
//  */
// router.delete('/values/:modelName/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), validateSameClientId(), async(req, res) => {
//     await Db.deleteDynamicObjects(req.user.clientname, co.collections.dynamicattributevalues.name, { entityname: req.params.id });
//     return res.sendStatus(204);
// });

// /**
//  * Deletes a dynamic attribute with the given _id.
//  * All existing dynamicattributevalues which exist for the attribute are also deleted.
//  * When the dynamic attribute is of type picklist, all of its options are also deleted.
//  */
// router.delete('/:id', auth(co.permissions.SETTINGS_CLIENT_DYNAMICATTRIBUTES, 'w', co.modules.base), validateSameClientId(co.collections.dynamicattributes.name), async(req, res) => {
//     var clientname = req.user.clientname;
//     var existing = await Db.getDynamicObject(clientname, co.collections.dynamicattributes.name, req.params.id);
//     if (existing.identifier) return res.sendStatus(405);
//     await Db.deleteDynamicObject(clientname, co.collections.dynamicattributes.name, req.params.id);
//     await Db.deleteDynamicObjects(clientname, co.collections.dynamicattributeoptions.name, { dynamicattributename: req.params.id });
//     await Db.deleteDynamicObjects(clientname, co.collections.dynamicattributevalues.name, { dynamicattributename: req.params.id });
//     res.sendStatus(204);
// });

module.exports = router;
