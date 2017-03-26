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
    // Delete the folder itself
    promises.push(db.remove('folders', folder._id));
    return Promise.all(promises);
}

// Delete a folder
router.delete('/:id', auth('PERMISSION_OFFICE_DOCUMENT', 'w', 'documents'), validateId, validateSameClientId('folders'), function(req, res) {
    req.db.get('folders').findOne(req.params.id).then((folder) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        removeFolder(req.db, folder).then(() => {
            res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
        });
    });
});

module.exports = router;
