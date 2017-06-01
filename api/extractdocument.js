/**
 * API for extracting zip files
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var validateSameClientId = require('../middlewares/validateSameClientId');
var mime = require('mime');
var monk = require('monk');
var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })
var fs = require('fs');
var path = require('path');
var unzip = require('unzip');
var documentsHelper = require('../utils/documentsHelper');

var existingFolders;
var newFoldersInDocumentFolder;
var newDocumentsInDocumentFolder;

// Create the folders in the database for the given file path
var prepareFolderStructure = (db, parentFolderOfDocumentId, clientId, filePath, callback) => {
    var dirpath = path.dirname(filePath);
    if (dirpath === '.') {
        return callback(parentFolderOfDocumentId);
    }
    prepareFolderStructure(db, parentFolderOfDocumentId, clientId, dirpath, (parentFolderId) => {
        if (existingFolders[dirpath]) {
            return callback(existingFolders[dirpath]._id);
        }
        // Parent is now created, create this level
        var folder = {
            name: path.basename(dirpath),
            clientId: clientId
        }
        if (parentFolderId) {
            folder.parentFolderId = parentFolderId
        }
        db.insert('folders', folder).then((insertedFolder) => {
            existingFolders[dirpath] = insertedFolder;
            if (insertedFolder.parentFolderId === parentFolderOfDocumentId) {
                newFoldersInDocumentFolder.push(insertedFolder);
            }
            callback(insertedFolder._id);
        });
    });
};

var extractDocumentIntoFolder = (db, zipDocument, finishCallback) => {
    var parentFolderId = zipDocument.parentFolderId;
    var clientId = zipDocument.clientId;
    var fullFilePath = path.join(__dirname, '/../', zipDocument.filePath);
    // Process each file in the ZIP
    var fileIndex = 0;
    var parser = unzip.Parse();
    parser.on('close', finishCallback);
    fs.createReadStream(fullFilePath).pipe(parser).on('entry', (entry) => {
        var fileName = entry.path;
        if(entry.type === 'File') {
            // Create document
            prepareFolderStructure(db, parentFolderId, clientId, fileName, (parentFolderOfEntryId) => {
                fileIndex = fileIndex + 1;
                var mimeType = mime.lookup(path.extname(fileName));
                var document = {
                    name: path.basename(fileName),
                    type: mimeType,
                    clientId: clientId,
                    parentFolderId: parentFolderOfEntryId,
                    isExtractable: mimeType === 'application/x-zip-compressed' || mimeType === 'application/zip'
                };
                if (parentFolderId) {
                    document.parentFolderId = parentFolderOfEntryId;
                }
                db.insert('documents', document).then((insertedDocument) => {
                    if (insertedDocument.parentFolderId === parentFolderId) {
                        newDocumentsInDocumentFolder.push(insertedDocument);
                    }
                    var documentPath = documentsHelper.getDocumentPath(insertedDocument._id);
                    documentsHelper.createPath(path.dirname(documentPath));
                    entry.pipe(fs.createWriteStream(documentPath));
                });
            });
        }
    });
};

// Extract a specific document and create folder and document structure and returns the newly created folders and documents
router.get('/:id', auth('PERMISSION_OFFICE_DOCUMENT', 'w', 'documents'), validateId, validateSameClientId('documents'), (req, res) => {
    existingFolders = {};
    newFoldersInDocumentFolder = [];
    newDocumentsInDocumentFolder = [];
    req.db.get('documents').findOne(req.params.id).then((document) => {
        if (!document) {
            // Document with given ID not found
            return res.sendStatus(404);
        }
        // Extract the document into the path of the parent folder
        extractDocumentIntoFolder(req.db, document, () => {
            res.send({
                folders: newFoldersInDocumentFolder,
                documents: newDocumentsInDocumentFolder
            });
        });
    });
});

module.exports = router;
