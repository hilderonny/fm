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

// Get a list of FM objects which have the given ID referenced
router.get('/byRelationId/:id', auth('PERMISSION_BIM_FMOBJECT', 'r', 'fmobjects'), validateId, (req, res) => {
    req.db.get('fmObjects').find({"relations":{"$in":[req.params.id]}}, req.query.fields).then((fmObjects) => {
        res.send(fmObjects);
    });
});

// Get all FM objects and their recursive children of the current client as hierarchy. Only _id, name and type are returned
router.get('/', auth('PERMISSION_BIM_FMOBJECT', 'r', 'fmobjects'), (req, res) => {
    var clientId = req.user.clientId; // clientId === null means that the user is a portal user
    var rootFmObjects = [];
    var allFmObjects = {};
    req.db.get('fmObjects').find({ clientId: clientId }, { sort : { path : 1, name : 1 } }).then((fmObjects) => {
        for (var i = 0; i < fmObjects.length; i++) {
            var fmObject = fmObjects[i];
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

// Get a specific FM object without child information
router.get('/:id', auth('PERMISSION_BIM_FMOBJECT', 'r', 'fmobjects'), validateId, validateSameClientId('fmObjects'), (req, res) => {
    req.db.get('fmObjects').findOne(req.params.id, req.query.fields).then((fmObject) => {
        if (!fmObject) {
            // FM object with given ID not found
            return res.sendStatus(404);
        }
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
        req.db.get('fmObjects').findOne(fmObject.parentId, 'path').then((parentFmObject) => {
            if (!fmObject) {
                // Parent FM object not found, this is an error
                return res.sendStatus(400);
            }
            fmObject.path = parentFmObject.path + fmObject.parentId.toString() + ',';
            req.db.insert('fmObjects', fmObject).then((insertedFmObject) => {
                return res.send(insertedFmObject);
            });
        });
    } else {
        fmObject.path = ',';
        req.db.insert('fmObjects', fmObject).then((insertedFmObject) => {
            return res.send(insertedFmObject);
        });
    }
});

// Update an FM object
router.put('/:id', auth('PERMISSION_BIM_FMOBJECT', 'w', 'fmobjects'), validateId, validateSameClientId('fmObjects'), function(req, res) {
    var fmObject = req.body;
    if (!fmObject || Object.keys(fmObject).length < 1) {
        return res.sendStatus(400);
    }
    delete fmObject._id; // When fmObject object also contains the _id field
    delete fmObject.clientId; // Prevent assignment of the fmObject to another client
    delete fmObject.path; // The path is recalculated depending on the parentId
    req.db.get('fmObjects').findOne(req.params.id).then((existingFmObject) => {
        if (!existingFmObject) {
            // fmObject with given ID not found
            return res.sendStatus(404);
        }
        // Check whether to reassign the FM object to another parent
        if (fmObject.parentId) {
            // Parentid is in request, so reassign it
            if (fmObject.parentId !== null) {
                // Parentid is given, find the parent object
                req.db.get('fmObjects').findOne(fmObject.parentId, 'path').then((parentFmObject) => {
                    if (!fmObject) {
                        // Parent FM object not found, this is an error
                        return res.sendStatus(400);
                    }
                    fmObject.path = parentFmObject.path + fmObject.parentId.toString() + ',';
                    req.db.update('fmObjects', req.params.id, { $set: fmObject }).then((updatedFmObject) => {
                        if (!updatedFmObject || updatedFmObject.lastErrorObject) {
                            return res.sendStatus(400);
                        }
                        return res.send(updatedFmObject);
                    });
                });
            } else {
                // Parentid is null, so assign the FM object to the root
                fmObject.path = ',';
                req.db.update('fmObjects', req.params.id, { $set: fmObject }).then((updatedFmObject) => {
                    if (!updatedFmObject || updatedFmObject.lastErrorObject) {
                        return res.sendStatus(400);
                    }
                    return res.send(updatedFmObject);
                });
            }
        } else{
            // No reassignment, simple store
            req.db.update('fmObjects', req.params.id, { $set: fmObject }).then((updatedFmObject) => {
                if (!updatedFmObject || updatedFmObject.lastErrorObject) {
                    return res.sendStatus(400);
                }
                return res.send(updatedFmObject);
            });
        }
    });
});

// Delete an FM object
router.delete('/:id', auth('PERMISSION_BIM_FMOBJECT', 'w', 'fmobjects'), validateId, validateSameClientId('fmObjects'), function(req, res) {
    // TODO: Auch Referenzen zu anderen Objekten löschen
    req.db.get('fmObjects').findOne(req.params.id).then((existingFmObject) => {
        if (!existingFmObject) {
            // fmObject with given ID not found
            return res.sendStatus(404);
        }
        // Delete subobjects in hierarchy, https://docs.mongodb.com/manual/tutorial/model-tree-structures-with-materialized-paths/, https://wiki.selfhtml.org/wiki/JavaScript/Objekte/RegExp
        var pattern = new RegExp('^' + existingFmObject.path + req.params.id + ',');
        req.db.remove('fmObjects', { path: pattern }).then((result) => {
            // Delete object
            req.db.remove('fmObjects', req.params.id).then((result) => {
                return res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
            });
        });
    });
});

module.exports = router;
