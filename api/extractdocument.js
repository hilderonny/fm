/**
 * API for extracting zip files
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateSameClientId = require('../middlewares/validateSameClientId');
var mime = require('mime');
var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })
var fs = require('fs');
var path = require('path');
var unzip = require('unzip2');
var documentsHelper = require('../utils/documentsHelper');
var co = require('../utils/constants');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;

// TODO: Complete refactor to relations

// /**
//  * Rekursives Erstellen von Verzeichnissen und deren Datenbankeinträgen.
//  * Das Promise enthält als Parameter die Instanz des Verzeichnisses.
//  * topMostFolderId ist die ID des obersten Verzeichnisses, in welches die neue Struktur hineingelegt wird.
//  */
// function prepareFolderStructure(filePath, parentfoldername, clientname, foldersToCreateWithDocumentList, documentsAndFoldersCreatePromises) {
//     // Prüfen, ob für den aktuellen Pfad schon ein Eintrag existiert oder ob es sich um den Stammpfad handelt
//     if (filePath === './' || foldersToCreateWithDocumentList[filePath]) return; // Pfad ist bereits in Bearbeitung
//     // Verzeichnis gibt es noch nicht, anlegen
//     foldersToCreateWithDocumentList[filePath] = {folders:[],documents:[]};
//     // Erst mal rekursiv die übergeordneten Verzeichnisse anlegen, parentfolderid bleibt erst mal auf das Stammverzeichnis gesetzt
//     var parentPath = path.dirname(filePath) + '/';
//     prepareFolderStructure(parentPath, parentfoldername, clientname, foldersToCreateWithDocumentList, documentsAndFoldersCreatePromises);
//     var foldertoinsert = {
//         name: uuidv4(),
//         label: path.basename(filePath)
//     };
//     documentsAndFoldersCreatePromises.push(Db.insertDynamicObject(clientname, co.collections.folders.name, foldertoinsert).then(async() => {
//         // Verzeichnis in Liste nachzubearbeitender Elemente aufnehmen, dabei im Parent gucken
//         foldersToCreateWithDocumentList[parentPath].folders.push(foldertoinsert);
//         foldersToCreateWithDocumentList[filePath].instance = foldertoinsert;
//     }));
//     var relation = {
//         name: uuidv4(),
//         datatype1name: "folders",
//         name1: parentfoldername,
//         datatype2name: "folders",
//         name2: foldertoinsert.name,
//         relationtypename: "parentchild"
//     };
//     documentsAndFoldersCreatePromises.push(Db.insertDynamicObject(clientname, "relations", relation));
// }

// /**
// Das Problem besteht hier darin, dass der pipe()-Mechanismus event-basiert und synchron ist.
// Wenn in einem solchen Event aber asyncchrone Promises (Verzeichnisstruktur anlegen) enthalten sind,
// so kann die Event-Abarbeitung nicht warten, da es keinen resolve-hook im Ereignis gibt.

// Daher müssen die Dokumente in mehreren Schritten erzeugt werden:
// 1. Dateien als Dokumente anlegen und anschließend mit der ID im Verzeichnis abspeichern
// 2. Gleichzeitig merken, welche Verzeichnisse erstellt werden müssen und welche Dokumente darin enthalten sind.
// 3. Parents den generierten Verzeichnissen nud Dokumenten zuweisen, nachdem die Zwischenverzeichnisse in der Datenbank gelandet sind.
// */
// function extractDocument(zipDocument, clientname) {
//     return new Promise((resolve, reject) => {
//         var foldersToCreateWithDocumentList = { './': {folders:[],documents:[]}};
//         var documentsAndFoldersCreatePromises = [];
//         var filePath = documentsHelper.getDocumentPath(clientname, zipDocument.name);
//         var parser = unzip.Parse();
//         var occuredError = null;
//         parser.on('close', () => {
//             var documentsAndFoldersUpdatePromises = [];
//             // Warten, bis alle Dokumente in der Datenbank erzeugt wurden
//             Promise.all(documentsAndFoldersCreatePromises).then(() => {
//                 var createdFoldersInSameFolderAsZipDocument = [];
//                 var createdDocumentsInSameFolderAsZipDocument = [];
//                 // So, nun die Parents vernünftig zuweisen
//                 Object.keys(foldersToCreateWithDocumentList).forEach((key) => {
//                     var folderWithChildren = foldersToCreateWithDocumentList[key];
//                     // Root folder wird dem Verzeichnis des Dokumentes angehangen
//                     var parentfoldername = key === './' ? zipDocument.parentfoldername : folderWithChildren.instance.name;
//                     folderWithChildren.folders.forEach((childFolder) => {
//                         if (key === './') createdFoldersInSameFolderAsZipDocument.push(childFolder);
//                         childFolder.parentfoldername = parentfoldername;
//                         documentsAndFoldersUpdatePromises.push(Db.updateDynamicObject(clientname, co.collections.folders.name, childFolder.name, childFolder));
//                     });
//                     folderWithChildren.documents.forEach((childDocument) => {
//                         if (key === './') createdDocumentsInSameFolderAsZipDocument.push(childDocument);
//                         childDocument.parentfoldername = parentfoldername;
//                         documentsAndFoldersUpdatePromises.push(Db.updateDynamicObject(clientname, co.collections.documents.name, childDocument.name, childDocument));
//                     });
//                 });
//                 // Warten, bis alle Updates ausgeführt wurden, dann Aufruf zurück geben
//                 Promise.all(documentsAndFoldersUpdatePromises).then(() => {
//                     var result = {
//                         folders: createdFoldersInSameFolderAsZipDocument,
//                         documents: createdDocumentsInSameFolderAsZipDocument
//                     };
//                     resolve(result);
//                 });
//             });
//         });
//         var stream = fs.createReadStream(filePath);
//         stream.pipe(parser).on('entry', (entry) => {
//             var fileName = entry.path;
//             var parentPath = path.dirname(fileName) + '/';
//             // Leere Verzeichnisse werden hier behandelt
//             if (entry.type === 'Directory') {
//                 prepareFolderStructure(fileName, null, clientname, foldersToCreateWithDocumentList, documentsAndFoldersCreatePromises);
//             }
//             // Dateien und deren Verzeichnisstruktur kommen von hier
//             if(entry.type === 'File') {
//                 prepareFolderStructure(parentPath, null, clientname, foldersToCreateWithDocumentList, documentsAndFoldersCreatePromises);
//                 // Dokument in Datenbank anlegen
//                 var mimeType = mime.lookup(path.extname(fileName));
//                 var document = {
//                     name: uuidv4(),
//                     label: path.basename(fileName),
//                     type: mimeType,
//                     parentfoldername: zipDocument.parentfoldername // Erst mal in das gewählte Stammverzeichnis packen. Die werden später noch umgehangen
//                 };
//                 documentsAndFoldersCreatePromises.push(Db.insertDynamicObject(clientname, co.collections.documents.name, document).then(() => {
//                     foldersToCreateWithDocumentList[parentPath].documents.push(document);
//                     var documentPath = documentsHelper.getDocumentPath(clientname, document.name);
//                     documentsHelper.createPath(path.dirname(documentPath));
//                     // Datei auf Festplatte schreiben und Dokumenten-ID als Dateiname nehmen
//                     entry.pipe(fs.createWriteStream(documentPath));
//                     return Promise.resolve(); // No need for this? https://javascript.info/promise-chaining
//                 }));
//             }
//         }).on('error', (err) => { 
//             stream.destroy();
//             reject(err);
//         });
//     });
// }

// // Extract a specific document and create folder and document structure and returns the newly created folders and documents
// router.get('/:id', auth(co.permissions.OFFICE_DOCUMENT, 'w', co.modules.documents), validateSameClientId(co.collections.documents.name), async(req, res) => {
//     var clientname = req.user.clientname;
//     var existingFolders = {};
//     var newFoldersInDocumentFolder = [];
//     var newDocumentsInDocumentFolder = [];
//     var document = await Db.getDynamicObject(clientname, co.collections.documents.name, req.params.id);
//     if (document.type !== 'application/x-zip-compressed' && document.type !== 'application/zip') return res.sendStatus(400);
//     extractDocument(document, clientname).then((result) => {
//         res.send(result);
//     }, (error) => {
//         // Error parsing file
//         res.sendStatus(400);
//     });
// });

module.exports = router;
