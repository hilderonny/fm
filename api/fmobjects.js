/**
 * CRUD API for fm object management
 * 
 * fmObject {
 *  _id
 *  name
 *  type
 *  pos
 *  size
 *  rotation
 *  path - https://docs.mongodb.com/manual/tutorial/model-tree-structures-with-materialized-paths/
 *  parentId
 *  clientId
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');

// Get all FM objects and their recursive children of the current client as hierarchy. Only _id, name and type are returned
router.get('/', auth('PERMISSION_BIM_FMOBJECT', 'r', 'fmobjects'), (req, res) => {
    var clientId = req.user.clientId; // clientId === null means that the user is a portal user
    var rootFmObjects = [];
    var allFmObjects = {};
    req.db.get('fmobjects').find({ clientId: clientId }, { sort : { path : 1, name : 1 } }).then((fmobjects) => {
        for (var i = 0; i < fmobjects.length; i++) {
            var fmObject = fmobjects[i];
            allFmObjects[fmObject._id] = {
                _id: fmObject._id,
                name: fmObject.name,
                type: fmObject.type,
                size: fmObject.size,
                pos: fmObject.pos,
                children: []
            };
            if (fmObject.parentId) {
                allFmObjects[fmObject.parentId].children.push(allFmObjects[fmObject._id]);
            } else {
                rootFmObjects.push(allFmObjects[fmObject._id]);
            }
        }
        return res.send(rootFmObjects);
    });
    // https://docs.mongodb.com/manual/tutorial/model-tree-structures-with-materialized-paths/
});

/**
 * Liefert eine Liste von FM Objekten für die per URL übergebenen IDs. Die IDs müssen kommagetrennt sein.
 * Die Berechtigungen werden hier nicht per auth überprüft, da diese API für die Verknüpfungen verwendet
 * wird und da wäre es blöd, wenn ein 403 zur Neuanmeldung führte. Daher wird bei fehlender Berechtigung
 * einfach eine leere Liste zurück gegeben.
 * @example
 * $http.get('/api/fmobjects/forIds?ids=ID1,ID2,ID3')...
 */
router.get('/forIds', auth(false, false, 'fmobjects'), (req, res) => {
    // Zuerst Berechtigung prüfen
    auth.canAccess(req.user._id, 'PERMISSION_BIM_FMOBJECT', 'r', 'fmobjects', req.db).then(function(accessAllowed) {
        if (!accessAllowed) {
            return res.send([]);
        }
        if (!req.query.ids) {
            return res.send([]);
        }
        var ids = req.query.ids.split(',').filter(validateId.validateId).map(function(id) { return monk.id(id); }); // Nur korrekte IDs verarbeiten
        var clientId = req.user.clientId; // Nur die Termine des Mandanten des Benutzers raus holen.
        req.db.get('fmobjects').aggregate([
            { $project: { path: false } }, // Property path wird im nächsten Schritt überschrieben
            { $graphLookup: { // Calculate path, see https://docs.mongodb.com/manual/reference/operator/aggregation/graphLookup/
                from: 'fmobjects',
                startWith: '$parentId',
                connectFromField: 'parentId',
                connectToField: '_id',
                as: 'path'
            } },
            { $match: { // Find only relevant elements
                _id: { $in: ids },
                clientId: clientId
            } }
        ]).then(function(fmobjects) {
            res.send(fmobjects);
        });
    });
});

// Get a specific FM object without child information
router.get('/:id', auth('PERMISSION_BIM_FMOBJECT', 'r', 'fmobjects'), validateId, validateSameClientId('fmobjects'), (req, res) => {
    req.db.get('fmobjects').findOne(req.params.id, req.query.fields).then((fmObject) => {
        return res.send(fmObject);
    });
});

// Create an FM object
router.post('/', auth('PERMISSION_BIM_FMOBJECT', 'w', 'fmobjects'), function(req, res) {
    var fmObject = req.body;
    if (!fmObject || Object.keys(fmObject).length < 1) {
        return res.sendStatus(400);
    }
    delete fmObject._id; // Ids are generated automatically
    fmObject.clientId = req.user.clientId; // Assing the new FM object to the same client as the logged in user
    // Create the path from the parents, if exists
    if (fmObject.parentId) {
        fmObject.parentId = monk.id(fmObject.parentId);
        req.db.get('fmobjects').findOne(fmObject.parentId, 'path').then((parentFmObject) => {
            if (!parentFmObject) {
                // Parent FM object not found, this is an error
                return res.sendStatus(400);
            }
            fmObject.path = parentFmObject.path + fmObject.parentId.toString() + ',';
            req.db.insert('fmobjects', fmObject).then((insertedFmObject) => {
                return res.send(insertedFmObject);
            });
        });
    } else {
        fmObject.path = ',';
        req.db.insert('fmobjects', fmObject).then((insertedFmObject) => {
            return res.send(insertedFmObject);
        });
    }
});

// Update an FM object
router.put('/:id', auth('PERMISSION_BIM_FMOBJECT', 'w', 'fmobjects'), validateId, validateSameClientId('fmobjects'), function(req, res) {
    var fmObject = req.body;
    if (!fmObject || Object.keys(fmObject).length < 1) {
        return res.sendStatus(400);
    }
    delete fmObject._id; // When fmObject object also contains the _id field
    delete fmObject.clientId; // Prevent assignment of the fmObject to another client
    delete fmObject.path; // The path is recalculated depending on the parentId
    req.db.get('fmobjects').findOne(req.params.id).then((existingFmObject) => {
        if (!existingFmObject) {
            // fmObject with given ID not found
            return res.sendStatus(404);
        }
        // Check whether to reassign the FM object to another parent
        if (fmObject.parentId || fmObject.parentId === null) {
            // Parentid is in request, so reassign it
            if (fmObject.parentId !== null) {
                fmObject.parentId = monk.id(fmObject.parentId);
                // Parentid is given, find the parent object
                req.db.get('fmobjects').findOne(fmObject.parentId, 'path').then((parentFmObject) => {
                    if (!parentFmObject) {
                        // Parent FM object not found, this is an error
                        return res.sendStatus(400);
                    }
                    fmObject.path = parentFmObject.path + fmObject.parentId.toString() + ',';
                    req.db.update('fmobjects', req.params.id, { $set: fmObject }).then((updatedFmObject) => {
                        return res.send(updatedFmObject);
                    });
                });
            } else {
                // Parentid is null, so assign the FM object to the root
                fmObject.path = ',';
                req.db.update('fmobjects', req.params.id, { $set: fmObject }).then((updatedFmObject) => {
                    return res.send(updatedFmObject);
                });
            }
        } else{
            // No reassignment, simple store
            req.db.update('fmobjects', req.params.id, { $set: fmObject }).then((updatedFmObject) => {
                return res.send(updatedFmObject);
            });
        }
    });
});

// Delete an FM object
router.delete('/:id', auth('PERMISSION_BIM_FMOBJECT', 'w', 'fmobjects'), validateId, validateSameClientId('fmobjects'), function(req, res) {
    // TODO: Auch Referenzen zu anderen Objekten löschen
    req.db.get('fmobjects').findOne(req.params.id).then((existingFmObject) => {
        if (!existingFmObject) {
            // fmObject with given ID not found
            return res.sendStatus(404);
        }
        // Delete subobjects in hierarchy, https://docs.mongodb.com/manual/tutorial/model-tree-structures-with-materialized-paths/, https://wiki.selfhtml.org/wiki/JavaScript/Objekte/RegExp
        var pattern = new RegExp('^' + existingFmObject.path + req.params.id + ',');
        req.db.remove('fmobjects', { path: pattern }).then((result) => {
            // Delete object
            req.db.remove('fmobjects', req.params.id).then((result) => {
                return res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
            });
        });
    });
});

module.exports = router;
