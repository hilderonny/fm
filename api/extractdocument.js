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
var co = require('../utils/constants');

/**
 * key: Pfad des Verzeichnisses
 * value: Liste von enthaltenen Dokumenten und Verzeichnissen
 */
var foldersToCreateWithDocumentList = { './': {folders:[],documents:[]}};
var documentsAndFoldersCreatePromises = [];


/**
 * Rekursives Erstellen von Verzeichnissen und deren Datenbankeinträgen.
 * Das Promise enthält als Parameter die Instanz des Verzeichnisses.
 * topMostFolderId ist die ID des obersten Verzeichnisses, in welches die neue Struktur hineingelegt wird.
 */
function prepareFolderStructure(db, filePath, parentFolderId, clientId) {
    // Prüfen, ob für den aktuellen Pfad schon ein Eintrag existiert oder ob es sich um den Stammpfad handelt
    if (filePath === './' || foldersToCreateWithDocumentList[filePath]) {
        // Pfad ist bereits in Bearbeitung
        return;
    } else {
        // Verzeichnis gibt es noch nicht, anlegen
        foldersToCreateWithDocumentList[filePath] = {folders:[],documents:[]};
        // Erst mal rekursiv die übergeordneten Verzeichnisse anlegen, parentfolderid bleibt erst mal auf das Stammverzeichnis gesetzt
        var parentPath = path.dirname(filePath) + '/';
        prepareFolderStructure(db, parentPath, parentFolderId, clientId);
        var folder = {
            name: path.basename(filePath),
            parentFolderId: parentFolderId,
            clientId: clientId
        };
        documentsAndFoldersCreatePromises.push(db.insert(co.collections.folders, folder).then(function(folder) {
            // Verzeichnis in Liste nachzubearbeitender Elemente aufnehmen, dabei im Parent gucken
            foldersToCreateWithDocumentList[parentPath].folders.push(folder);
            return Promise.resolve();
        }));
    }
}

var extractDocumentIntoFolder = (db, zipDocument, finishCallback) => {
    var parentFolderId = zipDocument.parentFolderId;
    var clientId = zipDocument.clientId;
    var filePath = documentsHelper.getDocumentPath(zipDocument._id);
    // Process each file in the ZIP
    var fileIndex = 0;
    var parser = unzip.Parse();
    parser.on('close', finishCallback);
    fs.createReadStream(filePath).pipe(parser).on('entry', (entry) => {
        // Leere Verzeichnisse werden hier behandelt
        if (entry.type === 'Directory') {
            prepareFolderStructure(db, parentFolderId, clientId, entry.path);
        }
        // Dateien und deren Verzeichnisstruktur kommen von hier
        if(entry.type === 'File') {
            var fileName = entry.path;
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




/*
Das Problem besteht hier darin, dass der pipe()-Mechanismus event-basiert und synchron ist.
Wenn in einem solchen Event aber asyncchrone Promises (Verzeichnisstruktur anlegen) enthalten sind,
so kann die Event-Abarbeitung nicht warten, da es keinen resolve-hook im Ereignis gibt.

Daher müssen die Dokumente in zwei Schritten erzeugt werden:
1. Dateien als Dokumente anlegen und anschließend mit der ID im Verzeihnis abspeichern
2. Gleichzeitig merken, welche Verzeichnisse erstellt werden müssen und welche Dokumente darin enthalten sind.
*/

function extractDocument(db, zipDocument) {
    return new Promise(function(resolve, reject) {
        var filePath = documentsHelper.getDocumentPath(zipDocument._id);
        var parser = unzip.Parse();
        var documentCreatePromises = [];
        parser.on('close', function() {
            // Warten, bis alle Dokumente in der Datenbank erzeugt wurden
            Promise.all(documentsAndFoldersCreatePromises).then(function() {
                // So, nun die Parents vernünftig zuweisen


                // TODO: Hier nun weiter



                console.log(foldersToCreateWithDocumentList);
                resolve();
            });
        });
        fs.createReadStream(filePath).pipe(parser).on('entry', (entry) => {
            var fileName = entry.path;
            var parentPath = path.dirname(fileName) + '/';
            // Leere Verzeichnisse werden hier behandelt
            if (entry.type === 'Directory') {
                prepareFolderStructure(db, fileName);
            }
            // Dateien und deren Verzeichnisstruktur kommen von hier
            if(entry.type === 'File') {
                prepareFolderStructure(db, parentPath);
                // Dokument in Datenbank anlegen
                var mimeType = mime.lookup(path.extname(fileName));
                var document = {
                    name: path.basename(fileName),
                    type: mimeType,
                    clientId: zipDocument.clientId,
                    parentFolderId: zipDocument.parentFolderId, // Erst mal in das gewählte Stammverzeichnis packen. Die werden später noch umgehangen
                    isExtractable: mimeType === 'application/x-zip-compressed' || mimeType === 'application/zip'
                };
                documentsAndFoldersCreatePromises.push(db.insert('documents', document).then((insertedDocument) => {
                    foldersToCreateWithDocumentList[parentPath].documents.push(insertedDocument);
                    var documentPath = documentsHelper.getDocumentPath(insertedDocument._id);
                    documentsHelper.createPath(path.dirname(documentPath));
                    // Datei auf Festplatte schreiben und Dokumenten-ID als Dateiname nehmen
                    entry.pipe(fs.createWriteStream(documentPath));
                    return Promise.resolve();
                }));
            }
        });
    });
}


// Extract a specific document and create folder and document structure and returns the newly created folders and documents
router.get('/:id', auth('PERMISSION_OFFICE_DOCUMENT', 'w', 'documents'), validateId, validateSameClientId('documents'), (req, res) => {
    existingFolders = {};
    newFoldersInDocumentFolder = [];
    newDocumentsInDocumentFolder = [];
    req.db.get('documents').findOne(req.params.id).then((document) => {
        if (!document.isExtractable) {
            return res.sendStatus(400);
        }
        extractDocument(req.db, document).then(function(createdFoldersInSameFolderAsZipDocument, createdDocumentsInSameFolderAsZipDocument) {
            res.send({
                folders: createdFoldersInSameFolderAsZipDocument,
                documents: createdDocumentsInSameFolderAsZipDocument
            });
        });
        /*
        // Extract the document into the path of the parent folder
        extractDocumentIntoFolder(req.db, document, () => {
            res.send({
                folders: newFoldersInDocumentFolder,
                documents: newDocumentsInDocumentFolder
            });
        });*/
    });
});

module.exports = router;
