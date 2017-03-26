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
var localConfig = require('../config/localconfig.json'); // http://stackoverflow.com/a/14678694

var getFilePath = (document) => {
    return path.join(
        __dirname, 
        '/../',
        localConfig.documentspath,
        document.clientId !== null ? document.clientId.toString() : '',
        document._id.toString()
    );
};

var downloadDocument = (response, document) => {
    var options = {
        headers: {
            'Content-disposition': 'attachment; filename=' + document.name
        }
    }
    return response.sendFile(getFilePath(document), options);
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

var createPath = (pathToCreate) => {
    try {
        fs.statSync(pathToCreate);
        return; // Her we come only when the path exists
    }
    catch (err) {
        // path does not exist, create it
        createPath(path.dirname(pathToCreate));
        fs.mkdirSync(pathToCreate);
    }
}

// Create a document via file upload
router.post('/', auth('PERMISSION_OFFICE_DOCUMENT', 'w', 'documents'), upload.single('file'), function(req, res) { // https://github.com/expressjs/multer
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
    // Save file to documents path of client or directly in documents path for portal
    var rootPath = path.join(__dirname, '/../');
    var uploadPath = rootPath + file.path;
    var relativeFileDirectory = clientId !== null ? path.join(localConfig.documentspath, clientId) : localConfig.documentspath;
    var directoryToStore = path.join(rootPath, relativeFileDirectory);
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
        req.db.get('folders').findOne(document.parentFolderId).then((parentFolder) => {
            if (!parentFolder) {
                return res.sendStatus(400);
            }
            req.db.insert('documents', document).then((insertedDocument) => {
                var filePath = path.join(directoryToStore, insertedDocument._id.toString());
                createPath(directoryToStore);
                fs.renameSync(path.join(rootPath, file.path), filePath);
                res.send(insertedDocument);
            });
        });
    } else {
        req.db.insert('documents', document).then((insertedDocument) => {
            var filePath = path.join(directoryToStore, insertedDocument._id.toString());
            createPath(directoryToStore);
            fs.renameSync(path.join(rootPath, file.path), filePath);
            res.send(insertedDocument);
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
        var filePath = getFilePath(document);
        fs.unlink(filePath, (err) => {
            // Remove relations from database
            db.get('relations').remove({ $or: [ { type1: 'documents', id1: document._id }, { type2: 'documents', id2: document._id } ] }).then(() => {
                // Remove document from database
                db.remove('documents', document._id).then(resolve);
            });
        });
    });
} 

module.exports = router;
