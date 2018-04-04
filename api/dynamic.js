var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateSameClientId = require('../middlewares/validateSameClientId');
var apiHelper = require('../utils/apiHelper');
var co = require('../utils/constants');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;
var ph = require('../utils/permissionshelper');
var ch = require('../utils/calculationhelper');

async function getchildren(clientname, recordtypename, entityname, permissions, forlist) {
    var relevantrelations = (await Db.query(clientname, `
        SELECT r.datatype2name, r.name2, dtp.permissionkey, dtc.icon, CASE WHEN count(rc) > 0 THEN true ELSE false END haschildren FROM relations r 
        JOIN datatypes dtp ON dtp.name = r.datatype1name 
        JOIN datatypes dtc ON dtc.name = r.datatype2name 
        LEFT JOIN relations rc ON rc.name1 = r.name2 AND rc.relationtypename = 'parentchild' AND rc.datatype1name = r.datatype2name
        WHERE r.relationtypename = 'parentchild'
        AND r.datatype1name = '${Db.replaceQuotes(recordtypename)}'
        AND r.name1 = '${Db.replaceQuotes(entityname)}'
        AND '${Db.replaceQuotes(forlist)}' = ANY (dtc.lists)
        GROUP BY r.datatype2name, r.name2, dtp.permissionkey, dtc.icon;
    `)).rows;
    var children = [];
    for (var i = 0; i < relevantrelations.length; i++) {
        var rr = relevantrelations[i];
        if (!permissions.find(p => p.key === rr.permissionkey && p.canRead)) continue; // No permission to access specific datatype entities
        var child = await Db.getDynamicObject(clientname, rr.datatype2name, rr.name2);
        if (child) {
            child.datatypename = rr.datatype2name;
            child.icon = rr.icon;
            child.haschildren = rr.haschildren;
            children.push(child);
        }
    }
    return children;
}

async function getrootelements(clientname, forlist, permissions) {
    var relevantdatatypes = (await Db.query(clientname, `SELECT * FROM datatypes WHERE '${Db.replaceQuotes(forlist)}' = ANY (lists);`)).rows;
    var rootelements = [];
    for (var i = 0; i < relevantdatatypes.length; i++) { // Must be loop because it is not said, that all datatypes have all required columns so UNION will not work
        var rdt = relevantdatatypes[i];
        if (!permissions.find(p => p.key === rdt.permissionkey && p.canRead)) continue; // No permission to access specific datatypes
        var rdtn = Db.replaceQuotesAndRemoveSemicolon(rdt.name);
        var entities = (await Db.query(clientname, `
            SELECT e.*, CASE WHEN r.childcount > 0 THEN true ELSE false END haschildren FROM ${rdtn} e JOIN (
                SELECT e.name, count(rc) childcount FROM ${rdtn} e 
                LEFT JOIN relations rp ON rp.name2 = e.name AND rp.relationtypename = 'parentchild' AND rp.datatype2name = '${rdtn}' 
                LEFT JOIN relations rc ON rc.name1 = e.name AND rc.relationtypename = 'parentchild' AND rc.datatype1name = '${rdtn}'
                WHERE rp.name IS NULL
                GROUP BY e.name
            ) r ON r.name = e.name;
        `)).rows;
        entities.forEach(e => rootelements.push({ name: e.name, datatypename: rdt.name, label: e.label, icon: rdt.icon, haschildren: e.haschildren }));
    }
    return rootelements;
}

// Deletes a dynamic object but without children. They must be deleted separately because of the possibly different permissions.
router.delete("/:recordtypename/:entityname", auth.dynamic("recordtypename", "r"), async(req, res) => {
    var clientname = req.user.clientname;
    var datatypename = req.params.recordtypename;
    var entityname = req.params.entityname;
    try {
        // Remember parents for recalculation
        var parentrelations = await Db.getDynamicObjects(clientname, "relations", { datatype2name: datatypename, name2: entityname, relationtypename: 'parentchild'});
        // Delete relations
        await Db.deleteDynamicObjects(clientname, "relations", { datatype1name: datatypename, name1: entityname});
        await Db.deleteDynamicObjects(clientname, "relations", { datatype2name: datatypename, name2: entityname});
        // Delete dynamic attributes
        await Db.deleteDynamicObjects(clientname, "dynamicattributevalues", { entityname: entityname});
        // Delete the element itself (can be a relation)
        // When the object itself is a relation of type "parentchild", then the parent object must be recalculated
        if (datatypename === "relations") {
            var existingrelation = await Db.getDynamicObject(clientname, datatypename, entityname);
            await Db.deleteDynamicObject(clientname, datatypename, entityname); // First delete the relation so that it is not handled by recalculation
            if (existingrelation.relationtypename === "parentchild") {
                await ch.calculateentityandparentsrecursively(clientname, existingrelation.datatype1name, existingrelation.name1);
            }
        } else {
            await Db.deleteDynamicObject(clientname, datatypename, entityname);
        }
        // Recalculate parents
        for (var i = 0; i < parentrelations.length; i++) {
            var relation = parentrelations[i];
            await ch.calculateentityandparentsrecursively(clientname, relation.datatype1name, relation.name1);
        }
        res.sendStatus(204);
    } catch(error) {
        res.sendStatus(400); // Error in request. Maybe the recordtypename does not exist
    }

    // TODO later: For documents, also delete the file
});

// Get a list of all children of the given entity
router.get("/children/:forlist/:recordtypename/:entityname", auth(false, false, co.modules.base), async(req, res) => {
    var permissions = await ph.getpermissionsforuser(req.user);
    var children = await getchildren(req.user.clientname, req.params.recordtypename, req.params.entityname, permissions, req.params.forlist);
    res.send(children);
});

router.get("/hierarchytoelement/:forlist/:recordtypename/:entityname", auth(false, false, co.modules.base), async(req, res) => {
    var clientname = req.user.clientname;
    var recordtypename = req.params.recordtypename;
    var forlist = req.params.forlist;
    try {
        var permissions = await ph.getpermissionsforuser(req.user);
        var parentrelations = (await Db.getparentrelationstructure(clientname, recordtypename, req.params.entityname)).filter(r => r.datatype1name && r.name1).sort((a, b) => b.depth - a.depth);
        var rootelements = await getrootelements(clientname, forlist, permissions);
        var children = rootelements;
        for (var i = 0; i < parentrelations.length; i++) {
            var elementtohandle = children.find(c => c.name === parentrelations[i].name1);
            children = await getchildren(clientname, elementtohandle.datatypename, elementtohandle.name, permissions, forlist);
            elementtohandle.children = children;
            elementtohandle.isopen = true; // Selecting the path
        }
        res.send(rootelements);
    } catch(error) {
        res.sendStatus(400); // Error in request. Maybe the recordtypename does not exist
    }
});

// Get path of all parents of an object as array (root first) for breadcrumbs
router.get("/parentpath/:recordtypename/:entityname", auth.dynamic("recordtypename", "r"), async(req, res) => {
    var clientname = req.user.clientname;
    try {
        var relations = (await Db.getparentrelationstructure(clientname, req.params.recordtypename, req.params.entityname)).filter(r => r.datatype1name && r.name1); // When there are no parents (root element created)
        if (relations.length < 1) return res.send([]);
        var labelquery = relations.map(r => `SELECT label, ${r.depth} AS depth FROM ${Db.replaceQuotesAndRemoveSemicolon(r.datatype1name)} WHERE name = '${Db.replaceQuotes(r.name1)}'`).join(" UNION ");
        var labels = (await Db.query(clientname, labelquery)).rows.sort((a, b) => b.depth - a.depth).map(l => l.label);
        res.send(labels);
    } catch(error) {
        res.sendStatus(400); // Error in request. Maybe the recordtypename does not exist
    }
});

// Get all root elements for a specific list type (parameter forlist). That are those elements which have no parentchild relation where they are children
router.get("/rootelements/:forlist", auth(false, false, co.modules.base), async(req, res) => {
    var permissions = await ph.getpermissionsforuser(req.user);
    var rootelements = await getrootelements(req.user.clientname, req.params.forlist, permissions);
    res.send(rootelements);
});

// Get list of all dynamic objects of given record type
router.get("/:recordtypename", auth.dynamic("recordtypename", "r"), async(req, res) => {
    try {
        var filter = req.query;
        delete filter.token;
        var objects = await Db.getDynamicObjects(req.user.clientname, req.params.recordtypename, filter);
        res.send(objects);
    } catch(error) {
        res.sendStatus(400); // Error in request. Maybe the recordtypename does not exist
    }
});

// Get a specific dynamic object
router.get("/:recordtypename/:entityname", auth.dynamic("recordtypename", "r"), async(req, res) => {
    try {
        var dynamicobject = await Db.getDynamicObject(req.user.clientname, req.params.recordtypename, req.params.entityname);
        res.send(dynamicobject);
    } catch(error) {
        res.sendStatus(400); // Error in request. Maybe the recordtypename does not exist
    }
});

// Create a dynamic object and return its generated name
router.post('/:recordtypename', auth.dynamic("recordtypename", "w"), async(req, res) => {
    var newobject = req.body;
    var clientname = req.user.clientname;
    var recordtypename = req.params.recordtypename;
    newobject.name = uuidv4();
    try {
        await Db.insertDynamicObject(clientname, recordtypename, newobject);
        // When the new object is a relation of type "parentchild", then the parent object must be recalculated
        if (recordtypename === "relations" && newobject.relationtypename === "parentchild") {
            await ch.calculateentityandparentsrecursively(clientname, newobject.datatype1name, newobject.name1);
        }
        res.send(newobject.name);
    } catch(error) {
        res.sendStatus(400); // Any error with the request
    }
});

// Updates a dynamic object
router.put('/:recordtypename/:entityname', auth.dynamic("recordtypename", "w"), async(req, res) => {
    var clientname = req.user.clientname;
    var recordtypename = req.params.recordtypename;
    var entityname = req.params.entityname;
    var objecttoupdate = req.body;
    try {
        delete objecttoupdate.name;
        await Db.updateDynamicObject(clientname, recordtypename, entityname, objecttoupdate);
        // When the object is a relation of type "parentchild", then the parent object must be recalculated
        if (recordtypename === "relations" && objecttoupdate.relationtypename === "parentchild") {
            await ch.calculateentityandparentsrecursively(clientname, objecttoupdate.datatype1name, objecttoupdate.name1);
        }
        // The objects and its possible parents must be recalculated in every case
        await ch.calculateentityandparentsrecursively(clientname, recordtypename, entityname);
        res.sendStatus(200);
    } catch(error) {
        res.sendStatus(400); // Error in request
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
