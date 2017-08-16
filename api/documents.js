/**
 * CRUD API for documents of document management
 * 
 * document {
 *      _id,
 *      name,
 *      type (e.g. application/json),
 *      parentFolderId,
 *      clientId (id of client of user which created the document)
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })
var fs = require('fs');
var path = require('path');
var documentsHelper = require('../utils/documentsHelper');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');
var dah = require('../utils/dynamicAttributesHelper');
var mime = require('send').mime;

var downloadDocument = (response, document) => {
    var options = {
        headers: {
            'Content-disposition' : 'attachment; filename=' + document.name,
            'Content-Type' : mime.lookup(document.name)
        }
    };
    return response.sendFile(documentsHelper.getDocumentPath(document._id), options);
};

// Download a specific shared document without authentication 
router.get('/share/:id', validateId, (req, res) => {
    req.db.get('documents').findOne(req.params.id).then((document) => {
        if (!document) {
            // Document with given ID not found
            return res.sendStatus(404);
        }
        if (!document.isShared) {
            // Document is not shared
            return res.sendStatus(403);
        }
        return downloadDocument(res, document);
    });
});

/**
 * Liefert eine Liste von Dokumenten für die per URL übergebenen IDs. Die IDs müssen kommagetrennt sein.
 * Die Berechtigungen werden hier nicht per auth überprüft, da diese API für die Verknüpfungen verwendet
 * wird und da wäre es blöd, wenn ein 403 zur Neuanmeldung führte. Daher wird bei fehlender Berechtigung
 * einfach eine leere Liste zurück gegeben.
 * @example
 * $http.get('/api/documents/forIds?ids=ID1,ID2,ID3')...
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
        req.db.get('documents').aggregate([
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
        ]).then(function(documents) {
            // Pfade müssen sortiert werden, da graphLookup ein Problem beim Cachen hat und die Reihenfolge manchmal durcheinander haut
            documents.forEach(function(document) {
                if (document.path.length < 2) return; // Wenn nur ein Element oder keines drin ist, brauchen wir auch nicht zu sortieren
                var oldPath = document.path;
                var newPath = [ ];
                var rootFolder;
                var folderDict = {};
                // Dictionary zum Nachschlagen bauen
                oldPath.forEach(function(folder) {
                    folderDict[folder._id] = folder;
                    if (!folder.parentFolderId) rootFolder = folder;
                });
                // Jetzt verkettete Liste bauen
                oldPath.forEach(function(folder) {
                    if (!folder.parentFolderId) return;
                    folderDict[folder.parentFolderId].child = folder;
                });
                // Und nun auflösen
                var currentFolder = rootFolder;
                do {
                    newPath.push(currentFolder);
                    var child = currentFolder.child;
                    delete currentFolder.child;
                    currentFolder = child;
                } while(currentFolder);
                document.path = newPath;
            });
            res.send(documents);
        });
    });
});

// Get a specific document 
router.get('/:id', auth('PERMISSION_OFFICE_DOCUMENT', 'r', 'documents'), validateId, validateSameClientId('documents'), (req, res) => {
    req.db.get('documents').findOne(req.params.id).then((document) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        // When request parameter "action=download" is given, return the document file.
        if (req.query.action && req.query.action === 'download') {
            return downloadDocument(res, document);
        }
        res.send(document);
    });
});

// Create a document via file upload
router.post('/', auth(co.permissions.OFFICE_DOCUMENT, 'w', co.modules.documents), upload.single('file'), function(req, res) { // https://github.com/expressjs/multer
    var file = req.file;
    if (!file) {
        return res.sendStatus(400);
    }
    var user = req.user;
    var clientId = user && user.clientId ? user.clientId.toString() : null;
    var parentFolderId = req.body.parentFolderId;
    if (!parentFolderId) {
        parentFolderId = null; // Assign to root folder, when no parent folder ID is given
    }
    if (parentFolderId !== null && !validateId.validateId(parentFolderId)) {
        return res.sendStatus(400); // ID has wrong length
    }
    // Create document in database and assign user, client and parentFolderId
    var document = { 
        name: file.originalname,
        type: file.mimetype, 
        clientId: clientId !== null ? monk.id(clientId) : null,
        isExtractable: file.mimetype === 'application/x-zip-compressed' || file.mimetype === 'application/zip',
        parentFolderId: parentFolderId !== null ? monk.id(parentFolderId) : null
    };
    if (document.parentFolderId) { 
        // Need to check whether the parent folder which this document is to be assigned to exists
        req.db.get(co.collections.folders.name).findOne(document.parentFolderId).then((parentFolder) => {
            if (!parentFolder) {
                return res.sendStatus(400);
            }
            req.db.insert(co.collections.documents.name, document).then((insertedDocument) => {
                documentsHelper.moveToDocumentsDirectory(insertedDocument._id, path.join(__dirname, '/../', file.path));
                res.send({
                    _id: insertedDocument._id,
                    type: 'd',
                    name: insertedDocument.name
                });
            });
        });
    } else {
        req.db.insert(co.collections.documents.name, document).then((insertedDocument) => {
            documentsHelper.moveToDocumentsDirectory(insertedDocument._id, path.join(__dirname, '/../', file.path));
            res.send({
                _id: insertedDocument._id,
                type: 'd',
                name: insertedDocument.name
            });
        });
    }
});

// Update meta data of a document
router.put('/:id', auth('PERMISSION_OFFICE_DOCUMENT', 'w', 'documents'), validateId, validateSameClientId('documents'), function(req, res) {
    var document = req.body;
    if (!document || Object.keys(document).length < 1) {
        return res.sendStatus(400);
    }
    delete document._id; // When document object also contains the _id field
    delete document.clientId; // Prevent assignment of the document to another client
    if (document.parentFolderId) { 
        // Need to check whether the parent folder which this document is to be assigned to exists
        req.db.get('folders').findOne(document.parentFolderId).then((parentFolder) => {
            if (!parentFolder) {
                return res.sendStatus(400);
            }
            document.parentFolderId = parentFolder._id;
            req.db.update('documents', req.params.id, { $set: document }).then((updatedDocument) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
                // Database element is available here in every case, because validateSameClientId already checked for existence
                res.send(updatedDocument);
            });
        });
    } else {
        req.db.update('documents', req.params.id, { $set: document }).then((updatedDocument) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
            // Database element is available here in every case, because validateSameClientId already checked for existence
            res.send(updatedDocument);
        });
    }
});

// Delete a document
router.delete('/:id', auth('PERMISSION_OFFICE_DOCUMENT', 'w', 'documents'), validateId, validateSameClientId('documents'), function(req, res) {
    req.db.get('documents').findOne(req.params.id).then((document) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        router.deleteDocument(req.db, document).then(() => {
            res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
        });
    });
});

// Enable cross API access for folders
router.deleteDocument = (db, document) => {
    return new Promise((resolve, reject) => {
        // Remove file
        var filePath = documentsHelper.getDocumentPath(document._id);
        fs.unlink(filePath, (err) => {
            // Remove relations from database
            rh.deleteAllRelationsForEntity(co.collections.documents.name, document._id).then(() => {
                dah.deleteAllDynamicAttributeValuesForEntity(document._id).then(() => {
                    // Remove document from database
                    db.remove('documents', document._id).then(resolve);
                });
            });
        });
    });
} 

module.exports = router;
