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

describe('API extractdocument', function() {

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
        return db.get(co.collections.documents.name).findOne({name:testDocumentName});
    }
    
    function prepareZippedDocument() {
        var document, client;
        // Dokument erstellen
        return th.defaults.getClient().then(function(c) {
            client = c;
            return db.insert(co.collections.folders.name, {name: testFolderName, clientId: client._id});
        }).then(function(folder){
            return db.insert(co.collections.documents.name, {name: testDocumentName, clientId: client._id, parentFolderId: folder._id, isExtractable:true});
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

    describe('GET/:id', function() {

        function compareStructure(actual, expected) {
            if (expected.folders) expected.folders.forEach(function(expectedFolder) {
                assert.ok(actual.folders);
                assert.ok(actual.folders.length > 0);
                var actualFolder = actual.folders.find((f) => f.name === expectedFolder.name);
                assert.ok(actualFolder);
                compareStructure(actualFolder, expectedFolder);
            });
            if (expected.documents) expected.documents.forEach(function(expectedDocument) {
                assert.ok(actual.documents);
                assert.ok(actual.documents.length > 0);
                var actualDocument = actual.documents.find((d) => d.name === expectedDocument.name);
                assert.ok(actualDocument);
            });
        }

        function checkResult(result) {
            assert.ok(result);
            assert.ok(result.folders);
            assert.strictEqual(result.folders.length, zipContent.folders.length);
            zipContent.folders.forEach(function(folder) {
                assert.ok(result.folders.find((f) => f.name === folder.name));
            });
            assert.strictEqual(result.documents.length, zipContent.files.length);
            zipContent.files.forEach(function(file) {
                assert.ok(result.documents.find((d) => d.name === file));
            });
        }

        th.apiTests.getId.defaultNegative(co.apis.extractdocument, co.permissions.OFFICE_DOCUMENT, co.collections.documents.name);
        th.apiTests.getId.clientDependentNegative(co.apis.documents, co.collections.documents.name);

        it('responds with 400 when document is not an extractable file', function() {
            var token, document;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(tok) {
                token = tok;
                return getTestDocument();
            }).then(function(doc) {
                document = doc;
                return db.update(co.collections.documents.name, document._id, { $set: { isExtractable: false } });
            }).then(function() {
                return th.get(`/api/${co.apis.extractdocument}/${document._id.toString()}?token=${token}`).expect(400);
            });
        });

        it('responds with 400 when ZIP file is corrupted', function() {
            var token;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(tok) {
                token = tok;
                return getTestDocument();
            }).then(function(document) {
                var filePath = dh.getDocumentPath(document._id);
                fs.writeFileSync(filePath, 'Invalid ZIP content');
                return th.get(`/api/${co.apis.extractdocument}/${document._id.toString()}?token=${token}`).expect(400);
            });
        });

        it('extracts the ZIP file and creates a folder structure in the folder of the document and documents for all contained files', function() {
            var token, documentFromDatabase, foldersDict = { rootFolder: { folders:[], documents:[] } };
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(tok) {
                token = tok;
                return getTestDocument();
            }).then(function(doc) {
                documentFromDatabase = doc;
                return th.get(`/api/${co.apis.extractdocument}/${documentFromDatabase._id.toString()}?token=${token}`).expect(200);
            }).then(function(response) {
                checkResult(response.body);
                return db.get(co.collections.folders.name).find();
            }).then(function(folders) {
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
                return db.get(co.collections.documents.name).find({});
            }).then(function(documents) {
                documents.forEach(function(document) {
                    if (document.parentFolderId) {
                        foldersDict[document.parentFolderId].documents.push(document);
                    } else {
                        foldersDict.rootFolder.documents.push(document);
                    }
                });
                compareStructure(foldersDict[documentFromDatabase.parentFolderId], zipContent);
                return Promise.resolve();
            });
        });

        it('creates no folders or documents when the ZIP file is empty', function() {
            var token, document;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(tok) {
                token = tok;
                return getTestDocument();
            }).then(function(doc) {
                document = doc;
                var zip = new JSZip();
                return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            }).then(function(zipFileBuffer) {
                var filePath = dh.getDocumentPath(document._id);
                fs.writeFileSync(filePath, zipFileBuffer);
                return th.get(`/api/${co.apis.extractdocument}/${document._id.toString()}?token=${token}`).expect(200);
            }).then(function() {
                return db.get(co.collections.folders.name).find({parentFolderId:document.parentFolderId});
            }).then(function(folders) {
                assert.strictEqual(folders.length, 0);
                return db.get(co.collections.documents.name).find({parentFolderId:document.parentFolderId});
            }).then(function(documents) {
                assert.strictEqual(documents.length, 1); // Nur das Testdokument selbst
                assert.strictEqual(documents[0]._id.toString(), document._id.toString());
                return Promise.resolve();
            });
        });

        it('creates folder structures in folder of document even if folders with the same name exist (creates duplicates)', function() {
            var token, document;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(tok) {
                token = tok;
                return getTestDocument();
            }).then(function(doc) {
                document = doc;
                var folder = {name:'F1', parentFolderId:document.parentFolderId, clientId:document.clientId};
                return db.insert(co.collections.folders.name, folder);
            }).then(function() {
                return th.get(`/api/${co.apis.extractdocument}/${document._id.toString()}?token=${token}`).expect(200);
            }).then(function(response) {
                checkResult(response.body);
                return db.get(co.collections.folders.name).find({parentFolderId:document.parentFolderId});
            }).then(function(folders) {
                assert.strictEqual(folders.length, 3); // 1 Vorbereiteter und zwei aus ZIP-Datei
                return Promise.resolve();
            });
        });

        it('creates documents for files even if documents with the same name exist (creates duplicates)', function() {
            var token, document;
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(tok) {
                token = tok;
                return getTestDocument();
            }).then(function(doc) {
                document = doc;
                var duplicateDocument = {name:'Da', parentFolderId:document.parentFolderId, clientId:document.clientId};
                return db.insert(co.collections.documents.name, duplicateDocument);
            }).then(function() {
                return th.get(`/api/${co.apis.extractdocument}/${document._id.toString()}?token=${token}`).expect(200);
            }).then(function() {
                return db.get(co.collections.documents.name).find({parentFolderId:document.parentFolderId});
            }).then(function(documents) {
                assert.strictEqual(documents.length, 4); // 1 Vorbereiteter, 1 Testdokument und zwei aus ZIP-Datei
                return Promise.resolve();
            });
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
