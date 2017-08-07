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
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');

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
            if (fmObject.parentId && allFmObjects[fmObject.parentId]) {
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
    // Check the parentId for existence
    var insertFmObject = function() {
        req.db.insert(co.collections.fmobjects.name, fmObject).then((insertedFmObject) => {
            return res.send(insertedFmObject);
        });
    };
    if (fmObject.parentId) {
        req.db.get(co.collections.fmobjects.name).findOne(fmObject.parentId).then(function(parentFmObject) {
            if (!parentFmObject) {
                res.sendStatus(400);
            } else {
                fmObject.parentId = monk.id(fmObject.parentId);
                insertFmObject();
            }
        })
    } else {
        insertFmObject();
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
    // For the case that only the _id had to be updated, return an error and do not handle any further
    if (Object.keys(fmObject).length < 1) {
        return res.sendStatus(400);
    }
    // Check the parentId for existence
    var updateFmObject = function() {
        req.db.update(co.collections.fmobjects.name, req.params.id, { $set: fmObject }).then((updatedFmObject) => {
            return res.send(updatedFmObject);
        });
    };
    if (fmObject.parentId) {
        fmObject.parentId = monk.id(fmObject.parentId);
        req.db.get(co.collections.fmobjects.name).findOne(fmObject.parentId).then(function(parentFmObject) {
            if (!parentFmObject) {
                res.sendStatus(400);
            } else {
                updateFmObject();
            }
        })
    } else {
        updateFmObject();
    }
});

// Remove FM object and its children recursively
var removeFmObject = (db, fmObject) => {
    var promises = [];
    // Delete children recursively
    promises.push(db.get(co.collections.fmobjects.name).find({ parentId: fmObject._id }, '_id').then((subElements) => {
        return Promise.all(subElements.map((subElement) => removeFmObject(db, subElement)));
    }));
    // Delete relations
    promises.push(rh.deleteAllRelationsForEntity(co.collections.fmobjects.name, fmObject._id));
    // Delete the FM object itself
    promises.push(db.remove(co.collections.fmobjects.name, fmObject._id));
    return Promise.all(promises);
};

// Delete an FM object
router.delete('/:id', auth('PERMISSION_BIM_FMOBJECT', 'w', 'fmobjects'), validateId, validateSameClientId('fmobjects'), function(req, res) {
    req.db.get(co.collections.fmobjects.name).findOne(req.params.id).then((fmObject) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        return removeFmObject(req.db, fmObject);
    }).then(() => {
        res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
    });
});

module.exports = router;
