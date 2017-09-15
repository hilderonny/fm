/**
 * API for extracting zip files
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateId');
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
 * Rekursives Erstellen von Verzeichnissen und deren Datenbankeinträgen.
 * Das Promise enthält als Parameter die Instanz des Verzeichnisses.
 * topMostFolderId ist die ID des obersten Verzeichnisses, in welches die neue Struktur hineingelegt wird.
 */
function prepareFolderStructure(db, filePath, parentFolderId, clientId, foldersToCreateWithDocumentList, documentsAndFoldersCreatePromises) {
    // Prüfen, ob für den aktuellen Pfad schon ein Eintrag existiert oder ob es sich um den Stammpfad handelt
    if (filePath === './' || foldersToCreateWithDocumentList[filePath]) {
        // Pfad ist bereits in Bearbeitung
        return;
    } else {
        // Verzeichnis gibt es noch nicht, anlegen
        foldersToCreateWithDocumentList[filePath] = {folders:[],documents:[]};
        // Erst mal rekursiv die übergeordneten Verzeichnisse anlegen, parentfolderid bleibt erst mal auf das Stammverzeichnis gesetzt
        var parentPath = path.dirname(filePath) + '/';
        prepareFolderStructure(db, parentPath, parentFolderId, clientId, foldersToCreateWithDocumentList, documentsAndFoldersCreatePromises);
        var folder = {
            name: path.basename(filePath),
            parentFolderId: parentFolderId,
            clientId: clientId
        };
        documentsAndFoldersCreatePromises.push(db.insert(co.collections.folders.name, folder).then(function(insertedFolder) {
            // Verzeichnis in Liste nachzubearbeitender Elemente aufnehmen, dabei im Parent gucken
            foldersToCreateWithDocumentList[parentPath].folders.push(insertedFolder);
            foldersToCreateWithDocumentList[filePath].instance = insertedFolder;
            return Promise.resolve();
        }));
    }
}

/**
Das Problem besteht hier darin, dass der pipe()-Mechanismus event-basiert und synchron ist.
Wenn in einem solchen Event aber asyncchrone Promises (Verzeichnisstruktur anlegen) enthalten sind,
so kann die Event-Abarbeitung nicht warten, da es keinen resolve-hook im Ereignis gibt.

Daher müssen die Dokumente in mehreren Schritten erzeugt werden:
1. Dateien als Dokumente anlegen und anschließend mit der ID im Verzeichnis abspeichern
2. Gleichzeitig merken, welche Verzeichnisse erstellt werden müssen und welche Dokumente darin enthalten sind.
3. Parents den generierten Verzeichnissen nud Dokumenten zuweisen, nachdem die Zwischenverzeichnisse in der Dtaenbank gelandet sind.
*/
function extractDocument(db, zipDocument) {
    return new Promise(function(resolve, reject) {
        var foldersToCreateWithDocumentList = { './': {folders:[],documents:[]}};
        var documentsAndFoldersCreatePromises = [];
        var filePath = documentsHelper.getDocumentPath(zipDocument._id);
        var parser = unzip.Parse();
        parser.on('close', function() {
            var documentsAndFoldersUpdatePromises = [];
            // Warten, bis alle Dokumente in der Datenbank erzeugt wurden
            Promise.all(documentsAndFoldersCreatePromises).then(function() {
                var createdFoldersInSameFolderAsZipDocument = [];
                var createdDocumentsInSameFolderAsZipDocument = [];
                // So, nun die Parents vernünftig zuweisen
                Object.keys(foldersToCreateWithDocumentList).forEach(function(key) {
                    var folderWithChildren = foldersToCreateWithDocumentList[key];
                    // Root folder wird dem Verzeichnis des Dokumentes angehangen
                    var parentFolderId = key === './' ? zipDocument.parentFolderId : folderWithChildren.instance._id;
                    folderWithChildren.folders.forEach(function(childFolder) {
                        if (key === './') createdFoldersInSameFolderAsZipDocument.push(childFolder);
                        childFolder.parentFolderId = parentFolderId;
                        documentsAndFoldersUpdatePromises.push(db.update(co.collections.folders.name, childFolder._id, childFolder));
                    });
                    folderWithChildren.documents.forEach(function(childDocument) {
                        if (key === './') createdDocumentsInSameFolderAsZipDocument.push(childDocument);
                        childDocument.parentFolderId = parentFolderId;
                        documentsAndFoldersUpdatePromises.push(db.update(co.collections.documents.name, childDocument._id, childDocument));
                    });
                });
                // Warten, bis alle Updates ausgeführt wurden, dann Aufruf zurück geben
                Promise.all(documentsAndFoldersUpdatePromises).then(function() {
                    var result = {
                        folders: createdFoldersInSameFolderAsZipDocument,
                        documents: createdDocumentsInSameFolderAsZipDocument
                    };
                    resolve(result);
                });
            });
        });
        fs.createReadStream(filePath).pipe(parser).on('entry', (entry) => {
            var fileName = entry.path;
            var parentPath = path.dirname(fileName) + '/';
            // Leere Verzeichnisse werden hier behandelt
            if (entry.type === 'Directory') {
                prepareFolderStructure(db, fileName, null, null, foldersToCreateWithDocumentList, documentsAndFoldersCreatePromises);
            }
            // Dateien und deren Verzeichnisstruktur kommen von hier
            if(entry.type === 'File') {
                prepareFolderStructure(db, parentPath, null, null, foldersToCreateWithDocumentList, documentsAndFoldersCreatePromises);
                // Dokument in Datenbank anlegen
                var mimeType = mime.lookup(path.extname(fileName));
                var document = {
                    name: path.basename(fileName),
                    type: mimeType,
                    clientId: zipDocument.clientId,
                    parentFolderId: zipDocument.parentFolderId, // Erst mal in das gewählte Stammverzeichnis packen. Die werden später noch umgehangen
                    isExtractable: mimeType === 'application/x-zip-compressed' || mimeType === 'application/zip'
                };
                documentsAndFoldersCreatePromises.push(db.insert(co.collections.documents.name, document).then((insertedDocument) => {
                    foldersToCreateWithDocumentList[parentPath].documents.push(insertedDocument);
                    var documentPath = documentsHelper.getDocumentPath(insertedDocument._id);
                    documentsHelper.createPath(path.dirname(documentPath));
                    // Datei auf Festplatte schreiben und Dokumenten-ID als Dateiname nehmen
                    entry.pipe(fs.createWriteStream(documentPath));
                    return Promise.resolve();
                }));
            }
        }).on('error', reject);
    });
}


// Extract a specific document and create folder and document structure and returns the newly created folders and documents
router.get('/:id', auth(co.permissions.OFFICE_DOCUMENT, 'w', co.modules.documents), validateId, validateSameClientId(co.collections.documents.name), (req, res) => {
    existingFolders = {};
    newFoldersInDocumentFolder = [];
    newDocumentsInDocumentFolder = [];
    req.db.get(co.collections.documents.name).findOne(req.params.id).then((document) => {
        if (!document.isExtractable) {
            return res.sendStatus(400);
        }
        extractDocument(req.db, document).then(function(result) {
            res.send(result);
        }, (error) => {
            // Error parsing file
            res.sendStatus(400);
        });
    });
});

module.exports = router;
