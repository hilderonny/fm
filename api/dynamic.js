var router = require('express').Router();
var auth = require('../middlewares/auth');
var co = require('../utils/constants');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;
var ph = require('../utils/permissionshelper');
var ch = require('../utils/calculationhelper');
var dh = require("../utils/documentsHelper");
var fs = require("fs");

async function getchildren(clientname, recordtypename, entityname, permissions, forlist) {
    var relevantrelations = (await Db.query(clientname, `
        SELECT r.datatype2name, r.name2, dtc.permissionkey, dtc.icon, CASE WHEN count(rc) > 0 THEN true ELSE false END haschildren FROM relations r 
        JOIN datatypes dtp ON dtp.name = r.datatype1name 
        JOIN datatypes dtc ON dtc.name = r.datatype2name 
        LEFT JOIN relations rc ON rc.name1 = r.name2 AND rc.relationtypename = 'parentchild' AND rc.datatype1name = r.datatype2name
        WHERE r.relationtypename = 'parentchild'
        AND r.datatype1name = '${Db.replaceQuotes(recordtypename)}'
        AND r.name1 = '${Db.replaceQuotes(entityname)}'
        AND '${Db.replaceQuotes(forlist)}' = ANY (dtc.lists)
        GROUP BY r.datatype2name, r.name2, dtc.permissionkey, dtc.icon;
    `)).rows;
    var children = [];
    for (var i = 0; i < relevantrelations.length; i++) {
        var rr = relevantrelations[i];
        if (!permissions.find(p => p.key === rr.permissionkey && p.canRead)) continue; // No permission to access specific datatype entities
        var child = await Db.getDynamicObject(clientname, rr.datatype2name, rr.name2);
        child.datatypename = rr.datatype2name;
        child.icon = rr.icon;
        child.haschildren = rr.haschildren;
        children.push(child);
    }
    return children;
}

async function getrootelements(clientname, forlist, permissions) {
    var clientmodulenames = (await Db.query(Db.PortalDatabaseName, `SELECT modulename FROM clientmodules WHERE clientname='${Db.replaceQuotes(clientname)}';`)).rows.map(r => `'${Db.replaceQuotes(r.modulename)}'`);
    if (clientname !== Db.PortalDatabaseName && clientmodulenames.length < 1) return [];
    var additionalfilter = clientname !== Db.PortalDatabaseName ? ` AND modulename IN (${clientmodulenames.join(",")})` : "";
    var relevantdatatypes = (await Db.query(clientname, `SELECT * FROM datatypes WHERE '${Db.replaceQuotes(forlist)}' = ANY (lists)${additionalfilter};`)).rows;
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
        entities.forEach(e => {
            e.datatypename = rdt.name;
            e.icon = rdt.icon;
            rootelements.push(e);
        });
    }
    return rootelements;
}

// Deletes a dynamic object but without children. They must be deleted separately because of the possibly different permissions.
router.delete("/:recordtypename/:entityname", auth.dynamic("recordtypename", "w"), async(req, res) => {
    var clientname = req.user.clientname;
    var datatypename = req.params.recordtypename;
    var entityname = req.params.entityname;
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
    // Special handle documents for which the files must also be deleted
    if (datatypename === "documents") {
        var filepath = dh.getDocumentPath(clientname, entityname);
        await new Promise((resolve, reject) => {
            fs.unlink(filepath, (err) => { resolve(); }); // Ignore errors on not existing files
        });
    }
    // Recalculate parents
    for (var i = 0; i < parentrelations.length; i++) {
        var relation = parentrelations[i];
        await ch.calculateentityandparentsrecursively(clientname, relation.datatype1name, relation.name1);
    }
    res.sendStatus(204);
});

// Get a list of all children of the given entity. Used for hierarchies when one opens an element which has children
router.get("/children/:forlist/:recordtypename/:entityname", auth.dynamic("recordtypename", "r"), async(req, res) => {
    var permissions = await ph.getpermissionsforuser(req.user);
    var children = await getchildren(req.user.clientname, req.params.recordtypename, req.params.entityname, permissions, req.params.forlist);
    res.send(children);
});

// Get the entire hierarchy from the root to a specific element with all intermediate children. Used for hierarchies when a direct URL is loaded
router.get("/hierarchytoelement/:forlist/:recordtypename/:entityname", auth.dynamic("recordtypename", "r"), async(req, res) => {
    var clientname = req.user.clientname;
    var recordtypename = req.params.recordtypename;
    var forlist = req.params.forlist;
    var datatypes = await Db.getdatatypes(clientname);
    var permissions = await ph.getpermissionsforuser(req.user);
    var parentrelations = (await Db.getparentrelationstructure(clientname, recordtypename, req.params.entityname)).filter(r => r.datatype1name && r.name1 && datatypes[r.datatype1name] && datatypes[r.datatype1name].lists && datatypes[r.datatype1name].lists.indexOf(forlist) >= 0).sort((a, b) => b.depth - a.depth);
    var rootelements = await getrootelements(clientname, forlist, permissions);
    if (rootelements.length > 0) { // Else can happen when user has no access to the permissions required for the root elements
        var children = rootelements;
        for (var i = 0; i < parentrelations.length; i++) {
            var elementtohandle = children.find(c => c.name === parentrelations[i].name1);
            if (!elementtohandle) break; // When the user has no access to an intermediate parent
            children = await getchildren(clientname, elementtohandle.datatypename, elementtohandle.name, permissions, forlist);
            elementtohandle.children = children;
            elementtohandle.isopen = true; // Selecting the path
        }
    }
    res.send(rootelements);
});

// Get path of all parents of an object as array (root first) for breadcrumbs
router.get("/parentpath/:forlist/:recordtypename/:entityname", auth.dynamic("recordtypename", "r"), async(req, res) => {
    var clientname = req.user.clientname;
    var datatypes = await Db.getdatatypes(clientname);
    var permissionskeys = (await ph.getpermissionsforuser(req.user)).map(p => p.key);
    var relations = (await Db.getparentrelationstructure(clientname, req.params.recordtypename, req.params.entityname)).filter(r => 
        r.datatype1name && 
        r.name1 && 
        datatypes[r.datatype1name] && 
        datatypes[r.datatype1name].lists && 
        datatypes[r.datatype1name].lists.indexOf(req.params.forlist) >= 0 && // When there are no parents (root element created)
        permissionskeys.indexOf(datatypes[r.datatype1name].permissionkey) >= 0
    );
    if (relations.length < 1) return res.send([]);
    var labelquery = relations.map(r => `SELECT ${datatypes[r.datatype1name].titlefield || 'name'} AS label, ${r.depth} AS depth FROM ${Db.replaceQuotesAndRemoveSemicolon(r.datatype1name)} WHERE name = '${Db.replaceQuotes(r.name1)}'`).join(" UNION ");
    var labels = (await Db.query(clientname, labelquery)).rows.sort((a, b) => b.depth - a.depth).map(l => l.label);
    res.send(labels);
});

// Get all root elements for a specific list type (parameter forlist). That are those elements which have no parentchild relation where they are children. Used in hierarchies when they are loaded without targettig a specific element (click in menu)
router.get("/rootelements/:forlist", auth(false, false, co.modules.base), async(req, res) => {
    var permissions = await ph.getpermissionsforuser(req.user);
    var rootelements = await getrootelements(req.user.clientname, req.params.forlist, permissions);
    res.send(rootelements);
});

// Get list of all dynamic objects of given record type
// TODO: Wird das benutzt?
router.get("/:recordtypename", auth.dynamic("recordtypename", "r"), async(req, res) => {
    var filter = req.query;
    delete filter.token;
    var objects = await Db.getDynamicObjects(req.user.clientname, req.params.recordtypename, filter);
    res.send(objects);
});

// Get a specific dynamic object
router.get("/:recordtypename/:entityname", auth.dynamic("recordtypename", "r"), async(req, res) => {
    var dynamicobject = await Db.getDynamicObject(req.user.clientname, req.params.recordtypename, req.params.entityname);
    if (!dynamicobject) return res.sendStatus(404);
    res.send(dynamicobject);
});

// Create a dynamic object and return its generated name
router.post('/:recordtypename', auth.dynamic("recordtypename", "w"), async(req, res) => {
    var newobject = req.body;
    var clientname = req.user.clientname;
    var recordtypename = req.params.recordtypename;
    var datatype = (await Db.getdatatypes(clientname))[recordtypename];
    if (newobject.name && datatype.candefinename) { // Check whether name can be set by API (users)
        var existing = await Db.getDynamicObject(clientname, recordtypename, newobject.name);
        if (existing) return res.sendStatus(409); // Conflict, name is already in use
    } else {
        newobject.name = uuidv4();
    }
    try {
        await Db.insertDynamicObject(clientname, recordtypename, newobject);
        // When the new object is a relation of type "parentchild", then the parent object must be recalculated
        if (recordtypename === "relations" && newobject.relationtypename === "parentchild") {
            await ch.calculateentityandparentsrecursively(clientname, newobject.datatype2name, newobject.name2);
        }
        // The objects and its possible parents must be recalculated in every case
        await ch.calculateentityandparentsrecursively(clientname, recordtypename, newobject.name);
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
        var existingbefore = await Db.getDynamicObject(clientname, recordtypename, entityname);
        if (!existingbefore) return res.sendStatus(404);
        delete objecttoupdate.name;
        await Db.updateDynamicObject(clientname, recordtypename, entityname, objecttoupdate);
        // When the object is a relation, then the parent objects must be recalculated
        if (recordtypename === "relations") {
            var existingafter = await Db.getDynamicObject(clientname, recordtypename, entityname);
            await ch.calculateentityandparentsrecursively(clientname, existingbefore.datatype1name, existingbefore.name1);
            await ch.calculateentityandparentsrecursively(clientname, existingafter.datatype1name, existingafter.name1);
        }
        // The objects and its possible parents must be recalculated in every case
        await ch.calculateentityandparentsrecursively(clientname, recordtypename, entityname);
        res.sendStatus(200);
    } catch(error) {
        res.sendStatus(400); // Error in request
    }
});

module.exports = router;
