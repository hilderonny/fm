/**
 * CRUD API for folders of document management
 * 
 * folder {
 *      _id,
 *      name,
 *      parentFolderId,
 *      clientId (id of client of user which created the folder),
 *      documents: [],
 *      folders: []
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateId');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var documentsApi = require('./documents');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');
var dah = require('../utils/dynamicAttributesHelper');
var Db = require("../utils/db").Db;

function mapFields(e) {
    var folder = {
        _id: e.name,
        clientId: "client0",
        name: e.label,
        parentFolderId: e.parentfoldername
    }
    if (e.children) folder.elements = e.children;
    if (e.path) folder.path = e.path;
    return folder;
}

/**
 * Gibt alle Verzeichnisse und Dokumente zurück. Wird für den Dialog
 * zum Erstellen von Verknüpfungen verwendet
 */
router.get('/allFoldersAndDocuments', auth('PERMISSION_OFFICE_DOCUMENT', 'r', 'documents'), function(req, res) {
    var clientId = req.user.clientId; // clientId === null means that the user is a portal user
    req.db.get('folders').find({ clientId: clientId }).then((folders) => {
        folders.forEach(function(folder) { // Um zwischen Verzeichnissen und Dokumenten zu unterscheiden
            folder.type = 'folder';
        })
        var filter = { clientId: clientId };
        if (req.query.type) filter.type = { $regex : new RegExp('^' + req.query.type) } // Wenn nur Bilder angefragt werden
        req.db.get('documents').find(filter).then((documents) => {
            documents.forEach(function(document) { // Um zwischen Verzeichnissen und Dokumenten zu unterscheiden
                document.type = 'document';
            })
            var allFoldersAndDocuments = folders.concat(documents);
            return res.send(allFoldersAndDocuments);
        });
    });
});

/**
 * Liefert eine Liste von Verzeichnissen für die per URL übergebenen IDs. Die IDs müssen kommagetrennt sein.
 * Die Berechtigungen werden hier nicht per auth überprüft, da diese API für die Verknüpfungen verwendet
 * wird und da wäre es blöd, wenn ein 403 zur Neuanmeldung führte. Daher wird bei fehlender Berechtigung
 * einfach eine leere Liste zurück gegeben.
 * @example
 * $http.get('/api/folders/forIds?ids=ID1,ID2,ID3')...
 */
router.get('/forIds', auth(false, false, 'documents'), (req, res) => {
    // Zuerst Berechtigung prüfen
    auth.canAccess(req.user._id, 'PERMISSION_OFFICE_DOCUMENT', 'r', 'documents', req.db).then(function(accessAllowed) {
        if (!accessAllowed) {
            return res.send([]);
        }
        if (!req.query.ids) {
            return res.send([]);
        }
        var ids = req.query.ids.split(',').filter(validateId.validateId).map(function(id) { return monk.id(id); }); // Nur korrekte IDs verarbeiten
        var clientId = req.user.clientId; // Nur die Termine des Mandanten des Benutzers raus holen.
        req.db.get('folders').aggregate([
            { $graphLookup: { // Calculate path, see https://docs.mongodb.com/manual/reference/operator/aggregation/graphLookup/
                from: 'folders',
                startWith: '$parentFolderId',
                connectFromField: 'parentFolderId',
                connectToField: '_id',
                as: 'path',
                depthField: 'depth'
            } },
            { $project: { 
                "name": 1,                    
                "parentFolderId": 1,
                "clientId": 1,
                "path": { $cond: { if: { $eq: [ { $size:'$path' }, 0 ] }, then: [{ depth: -1 }], else: '$path' } } } // To force $unwind to handle top level elements correctly
            },
            { $match: { // Find only relevant elements
                _id: { $in: ids },
                clientId: clientId
            } },
            { $unwind: "$path" },
            { $sort: { "path.depth": -1 } },
            {
                $group:{
                    _id: "$_id",
                    path : { $push: { $cond: { if: { $eq: [ "$path.depth", -1 ] }, then: null, else: "$path" } } }, // top level elements will have a path array with only one entry which is null
                    doc:{"$first": "$$ROOT"}
                }
            },
            {
                $project: {
                    "name": "$doc.name",                    
                    "parentFolderId": "$doc.parentFolderId",
                    "clientId": "$doc.clientId",
                    "path": { "$setDifference": [ "$path", [null] ] } // https://stackoverflow.com/a/29067671
                }
            },
            { $sort: { "_id": 1 } }
        ]).then(function(folders) {
            res.send(folders);
        });
    });
});
// var parentcheck = folder.name ? `='${folder.parentfoldername}'` : " IS NULL";
// var query = `(SELECT name AS _id, label AS name, 'f' AS type FROM folders WHERE parentfoldername${parentcheck} ORDER BY label) UNION ALL (SELECT name AS _id, label AS name, 'd' AS type FROM documents WHERE parentfoldername${parentcheck} ORDER BY label);`;

// Get a specific folder and its contained folders and documents
router.get('/:id', auth(co.permissions.OFFICE_DOCUMENT, 'r', co.modules.documents), validateSameClientId(co.collections.folders.name), async(req, res) => {
    var clientname = req.user.clientname;
    var folder = await Db.getDynamicObject(clientname, co.collections.folders.name, req.params.id);
    if (!folder) return res.sendStatus(404);
    // Direct children
    var childrenquery = `(SELECT name AS _id, label AS name, 'f' AS type FROM folders WHERE parentfoldername = '${folder.name}' ORDER BY label) UNION ALL (SELECT name AS _id, label AS name, 'd' AS type FROM documents WHERE parentfoldername = '${folder.name}' ORDER BY label);`;
    folder.children = (await Db.query(clientname, childrenquery)).rows;
    // Parents
    var pathquery = `WITH RECURSIVE get_path(name, path, parentfoldername, depth) AS ( (SELECT name, '', parentfoldername, 0 FROM folders) UNION (SELECT get_path.name, folders.label || (CASE WHEN get_path.depth > 0 THEN '»' ELSE '' END) || get_path.path, folders.parentfoldername, get_path.depth + 1 FROM folders JOIN get_path on get_path.parentfoldername = folders.name) ) SELECT path FROM get_path WHERE name = '${folder.name}' ORDER BY depth DESC`;
    var pathresult = await Db.query(clientname, pathquery);
    if (pathresult.rowCount > 0) folder.path = pathresult.rows[0].path.split('»').map((p) => { return { name: p}});
    res.send(mapFields(folder, req.user));
    // var id = monk.id(req.params.id);
    // var folder;
    // req.db.get(co.collections.folders.name).aggregate([
    //     { $graphLookup: { // Calculate path, see https://docs.mongodb.com/manual/reference/operator/aggregation/graphLookup/
    //         from: 'folders',
    //         startWith: '$parentFolderId',
    //         connectFromField: 'parentFolderId',
    //         connectToField: '_id',
    //         as: 'path',
    //         depthField: 'depth'
    //     } },
    //     { $project: { 
    //         "name": 1,                    
    //         "parentFolderId": 1,
    //         "clientId": 1,
    //         "path": { $cond: { if: { $eq: [ { $size:'$path' }, 0 ] }, then: [{ depth: -1 }], else: '$path' } } } // To force $unwind to handle top level elements correctly
    //     },
    //     { $match: { // Find only relevant elements
    //         _id: monk.id(req.params.id)
    //     } },
    //     { $limit: 1 },
    //     { $unwind: "$path" },
    //     { $sort: { "path.depth": -1 } },
    //     {
    //         $group:{
    //             _id: "$_id",
    //             path : { $push: { $cond: { if: { $eq: [ "$path.depth", -1 ] }, then: null, else: "$path" } } }, // top level elements will have a path array with only one entry which is null
    //             doc:{"$first": "$$ROOT"}
    //         }
    //     },
    //     {
    //         $project: {
    //             "name": "$doc.name",                    
    //             "parentFolderId": "$doc.parentFolderId",
    //             "clientId": "$doc.clientId",
    //             "path": { "$setDifference": [ "$path", [null] ] } // https://stackoverflow.com/a/29067671
    //         }
    //     }
    // ]).then((matchingFolders) => {
    //     // folder = f;
    //     // assuming that we have exactly one element in the array
    //     folder = matchingFolders[0];
    //     folder.elements = [];
    //     // Database element is available here in every case, because validateSameClientId already checked for existence
    //     return req.db.get(co.collections.folders.name).find({ parentFolderId: id }, { sort : { name : 1 } });
    // }).then((subfolders) => {
    //     folder.elements = folder.elements.concat(subfolders.map((subFolder) => { return {
    //         _id: subFolder._id,
    //         type: 'f',
    //         name: subFolder.name
    //     }}));
    //     return req.db.get(co.collections.documents.name).find({ parentFolderId: id }, { sort : { name : 1 } });
    // }).then((documents) => {
    //     folder.elements = folder.elements.concat(documents.map((document) => { return {
    //         _id: document._id,
    //         type: 'd',
    //         name: document.name
    //     }}));
    //     res.send(folder);
    // });
});

// Create a folder
router.post('/', auth('PERMISSION_OFFICE_DOCUMENT', 'w', 'documents'), function(req, res) {
    var folder = req.body;
    if (!folder || Object.keys(folder).length < 1 || !folder.name) {
        return res.sendStatus(400);
    }
    delete folder._id; // Ids are generated automatically
    folder.clientId = req.user.clientId;
    if (folder.parentFolderId) {
        // Need to check whether the parent folder which this one is to be assigned to exists
        req.db.get('folders').findOne(folder.parentFolderId).then((parentFolder) => {
            if (!parentFolder) {
                return res.sendStatus(400);
            }
            folder.parentFolderId = parentFolder._id;
            req.db.insert('folders', folder).then((insertedFolder) => {
                res.send(insertedFolder);
            });
        });
    } else {
        req.db.insert('folders', folder).then((insertedFolder) => {
            res.send(insertedFolder);
        });
    }
});

// Update meta data of a folder
router.put('/:id', auth('PERMISSION_OFFICE_DOCUMENT', 'w', 'documents'), validateId, validateSameClientId('folders'), function(req, res) {
    var folder = req.body;
    if (!folder || Object.keys(folder).length < 1) {
        return res.sendStatus(400);
    }
    delete folder._id; // When folder object also contains the _id field
    delete folder.clientId; // Prevent assignment of the folder to another client
    if (folder.parentFolderId) { 
        // Need to check whether the parent folder which this one is to be assigned to exists
        req.db.get('folders').findOne(folder.parentFolderId).then((parentFolder) => {
            if (!parentFolder) {
                return res.sendStatus(400);
            }
            folder.parentFolderId = parentFolder._id;
            req.db.update('folders', req.params.id, { $set: folder }).then((updatedFolder) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
                // Database element is available here in every case, because validateSameClientId already checked for existence
                res.send(updatedFolder);
            });
        });
        folder.parentFolderId = monk.id(folder.parentFolderId); // Convert the prarentfolderid to a reference
    } else {
        req.db.update('folders', req.params.id, { $set: folder }).then((updatedFolder) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
            // Database element is available here in every case, because validateSameClientId already checked for existence
            res.send(updatedFolder);
        });
    }
});

// Remove folder and its content recursively
var removeFolder = (db, folder) => {
    var promises = [];
    // Delete subfolders recursively
    promises.push(db.get('folders').find({ parentFolderId: folder._id }, '_id').then((subFolders) => {
        var folderPromises = subFolders.map((subFolder) => removeFolder(db, subFolder));
        return Promise.all(folderPromises);
    }));
    // Delete documents and their relations
    promises.push(db.get('documents').find({ parentFolderId: folder._id }, '_id clientId').then((documents) => {
        var documentPromises = documents.map((document) => documentsApi.deleteDocument(db, document));
        return Promise.all(documentPromises);
    }));
    promises.push(rh.deleteAllRelationsForEntity(co.collections.folders.name, folder._id));
    promises.push(dah.deleteAllDynamicAttributeValuesForEntity(folder._id));
    // Delete the folder itself
    promises.push(db.remove('folders', folder._id));
    return Promise.all(promises);
};

// Delete a folder
router.delete('/:id', auth('PERMISSION_OFFICE_DOCUMENT', 'w', 'documents'), validateId, validateSameClientId('folders'), function(req, res) {
    req.db.get('folders').findOne(req.params.id).then((folder) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        return removeFolder(req.db, folder);
    }).then(() => {
        res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
    });
});

module.exports = router;
