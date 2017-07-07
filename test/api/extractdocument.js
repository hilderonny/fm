/**
 * UNIT Tests for api/extractdocument
 */
var assert = require('assert');
var fs = require('fs');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var dh = require('../../utils/documentsHelper');
var co = require('../../utils/constants');
var JSZip = require('jszip');
var path = require('path');

describe.only('API extractdocument', function() {

    var zipContent = {
        folders: [
            { 
                name: 'F1',
                folders: [
                    { name: 'F1_1' },
                    { name: 'F1_2', files: [ 'D1_2_a', 'D1_2_b' ] }
                ],
                files: [ 'D1_a', 'D1_b' ]
            },
            {
                name: 'F2',
                folders: [
                    { name: 'F2_1' }
                ]
            }
        ],
        files: [ 'Da', 'Db' ]
    };

    function prepareFolder(name, definition, zip) {
        if (name !== '') zip.folder(name);
        if (definition.folders) definition.folders.forEach(function(folder) {
            prepareFolder(`${name}${folder.name}/`, folder, zip);
        });
        if (definition.files) definition.files.forEach(function(file) {
            zip.file(`${name}${file}`, file);
        });
    }

    var testFolderName = 'extractTestFolder';
    var testDocumentName = 'extractTestDocument';

    function getTestDocument() {
        return db.get(co.collections.documents).findOne({name:testDocumentName});
    }
    
    function prepareZippedDocument() {
        var document, client;
        // Dokument erstellen
        return th.defaults.getClient().then(function(c) {
            client = c;
            return db.insert(co.collections.folders, {name: testFolderName, clientId: client._id});
        }).then(function(folder){
            return db.insert(co.collections.documents, {name: testDocumentName, clientId: client._id, parentFolderId: folder._id, isExtractable:true});
        }).then(function(doc) {
            document = doc;
            // Inhalte für ZIP-Datei vorbereiten
            var zip = new JSZip();
            prepareFolder('', zipContent, zip);
            return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
        }).then(function(zipFileBuffer) {
            // ZIP-Datei erstellen und als Dokumentendatei speichern
            var filePath = dh.getDocumentPath(document._id);
            th.createPath(path.dirname(filePath));
            fs.writeFileSync(filePath, zipFileBuffer);
            return Promise.resolve();
        });
    }

    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions)
            .then(th.prepareActivities)
            .then(th.prepareFmObjects)
            .then(th.prepareFolders)
            .then(th.prepareDocuments)
            .then(th.prepareDocumentFiles)
            .then(prepareZippedDocument);
    });

    // Delete temporary documents
    afterEach(() => {
        return th.removeDocumentFiles();
    });

    describe('GET/', function() {

        it('responds with 404', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.get(`/api/${co.apis.extractdocument}?token=${token}`).expect(404);
            });
        });

    });

    describe.only('GET/:id', function() {

        th.apiTests.getId.defaultNegative(co.apis.extractdocument, co.permissions.OFFICE_DOCUMENT, co.collections.documents);
        th.apiTests.getId.clientDependentNegative(co.apis.documents, co.collections.documents);

        it('responds with 400 when document is not an extractable file', function() {
            var token, document;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(tok) {
                token = tok;
                return getTestDocument();
            }).then(function(doc) {
                document = doc;
                return db.update(co.collections.documents, document._id, { $set: { isExtractable: false } });
            }).then(function() {
                return th.get(`/api/${co.apis.extractdocument}/${document._id.toString()}?token=${token}`).expect(400);
            });
        });

        xit('responds with 400 when ZIP file is corrupted', function() {
        });

        xit('responds with not existing id with 404', function() {
        });

        xit('responds with 403 when the document with the given _id does not belong to the client of the user', function() {
        });

        // Positive tests

        function compareStructure(actual, expected) {
            console.log(actual);
            return Promise.resolve();
        }

        it.only('extracts the ZIP file and creates a folder structure in the folder of the document and documents for all contained files', function() {
            var token, documentFromDatabase, foldersDict = { rootFolder: { folders:[], documents:[] } };
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(tok) {
                token = tok;
                return getTestDocument();
            }).then(function(doc) {
                documentFromDatabase = doc;
                return th.get(`/api/${co.apis.extractdocument}/${documentFromDatabase._id.toString()}?token=${token}`).expect(200);
            }).then(function() {
                return db.get(co.collections.folders).find({});
            }).then(function(folders) {
                console.log(folders);
                folders.forEach(function(folder) {
                    foldersDict[folder._id] = folder;
                    folder.folders = [];
                    folder.documents = [];
                });
                folders.forEach(function(folder) {
                    if (folder.parentFolderId) {
                        foldersDict[folder.parentFolderId].folders.push(folder);
                    } else {
                        foldersDict.rootFolder.folders.push(folder);
                    }
                });
                return db.get(co.collections.documents).find({});
            }).then(function(documents) {
                documents.forEach(function(document) {
                    if (document.parentFolderId) {
                        foldersDict[document.parentFolderId].documents.push(document);
                    } else {
                        foldersDict.rootFolder.documents.push(document);
                    }
                });
                return compareStructure(foldersDict[documentFromDatabase.parentFolderId], zipContent);
            });
        });

        xit('creates no folders or documents when the ZIP file is empty', function() {
        });

        xit('creates folder structures in folder of document even if folders with the same name exist (creates duplicates)', function() {
            // Create a subfolder "subfolder1"
            // Prepare a ZIP containing "subfolder1" as folder
            // Extract the ZIP file
            // The current folder must now contain two folders named "subfolder1" and the newly created folder must contain the files from the ZIP file
        });

        xit('creates documents for files even if documents with the same name exist (creates duplicates)', function() {
            // Upload a document "doc1.txt"
            // Prepare a ZIP containing "doc1.txt" as file
            // Extract the ZIP file
            // The current folder must now contain two documents named "doc1.txt"
        });

    });

    describe('POST/', function() {

        it('responds with 404', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.post(`/api/${co.apis.extractdocument}?token=${token}`).send({name:'doc'}).expect(404);
            });
        });

    });

    describe('PUT/', function() {

        it('responds with 404', function() {
            var token;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(tok) {
                token = tok;
                return getTestDocument();
            }).then(function(document) {
                return th.put(`/api/${co.apis.extractdocument}/${document._id.toString()}?token=${token}`).send({name:'updatedName'}).expect(404);
            });
        });

    });

    describe('DELETE/', function() {

        it('responds with 404', function() {
            var token;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(tok) {
                token = tok;
                return getTestDocument();
            }).then(function(document) {
                return th.del(`/api/${co.apis.extractdocument}/${document._id.toString()}?token=${token}`).expect(404);
            });
        });
    
    });

});
