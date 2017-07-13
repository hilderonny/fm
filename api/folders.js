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
var validateId = require('../middlewares/validateid');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var documentsApi = require('./documents');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');

/**
 * Retrieve all folders and documents of the root folder of the client of
 * the logged in user. The root folder is no real object. It is cunstructed by
 * collecting all folders and documents, where the parentFolderId is null.
 * @return { 
 *  folders: [], 
 *  documents: []
 * }
 */
router.get('/', auth('PERMISSION_OFFICE_DOCUMENT', 'r', 'documents'), (req, res) => {
    var clientId = req.user.clientId;
    req.db.get('folders').find({ parentFolderId: null, clientId: clientId }).then((folders) => {
        req.db.get('documents').find({ parentFolderId: null, clientId: clientId }).then((documents) => {
            var rootFolder = {
                folders: folders,
                documents: documents
            };
            res.send(rootFolder);
        });
    });
});

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
        req.db.get('documents').find({ clientId: clientId }).then((documents) => {
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
                as: 'path'
            } },
            { $match: { // Find only relevant elements
                _id: { $in: ids },
                clientId: clientId
            } }
        ]).then(function(folders) {
            res.send(folders);
        });
    });
});

// Get a specific folder and its contained folders and documents
router.get('/:id', auth('PERMISSION_OFFICE_DOCUMENT', 'r', 'documents'), validateId, validateSameClientId('folders'), (req, res) => {
    var id = monk.id(req.params.id);
    req.db.get('folders').findOne(id).then((folder) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        req.db.get('folders').find({ parentFolderId: id }).then((folders) => {
            folder.folders = folders;
            req.db.get('documents').find({ parentFolderId: id }).then((documents) => {
                folder.documents = documents;
                res.send(folder);
            });
        });
    });
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
