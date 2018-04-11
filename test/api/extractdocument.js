/**
 * UNIT Tests for api/extractdocument
 */
var assert = require('assert');
var fs = require('fs');
var th = require('../testhelpers');
var dh = require('../../utils/documentsHelper');
var co = require('../../utils/constants');
var JSZip = require('jszip');
var path = require('path');
var Db = require("../../utils/db").Db;

describe.only('API extractdocument', () => {

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

    async function getTestDocument() {
        return { name: "client0_" + testDocumentName, label: testDocumentName, parentfoldername: "client0_folder0", type: "application/zip", isshared: false };
    }
    
    async function prepareZippedDocument() {
        var testdocument = await getTestDocument();
        await Db.insertDynamicObject("client0", co.collections.documents.name, testdocument);
        var zip = new JSZip();
        prepareFolder('', zipContent, zip);
        var zipFileBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
        // ZIP-Datei erstellen und als Dokumentendatei speichern
        var filePath = dh.getDocumentPath("client0", testdocument.name);
        th.createPath(path.dirname(filePath));
        fs.writeFileSync(filePath, zipFileBuffer);
    }

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareActivities();
        await th.prepareFmObjects();
        await th.prepareFolders();
        await th.prepareDocuments();
        await th.prepareDocumentFiles();
        await prepareZippedDocument();
        await th.prepareRelations();
    });

    // Delete temporary documents
    afterEach(() => {
        return th.removeDocumentFiles();
    });

    describe('GET/:id', () => {

        function compareStructure(actual, expected) {
            if (expected.folders) expected.folders.forEach(function(expectedFolder) {
                assert.ok(actual.folders);
                assert.ok(actual.folders.length > 0);
                var actualFolder = actual.folders.find((f) => f.label === expectedFolder.name);
                assert.ok(actualFolder);
                compareStructure(actualFolder, expectedFolder);
            });
            if (expected.documents) expected.documents.forEach(function(expectedDocument) {
                assert.ok(actual.documents);
                assert.ok(actual.documents.length > 0);
                var actualDocument = actual.documents.find((d) => d.label === expectedDocument.name);
                assert.ok(actualDocument);
            });
        }

        function checkResult(result) {
            assert.ok(result);
            assert.ok(result.folders);
            assert.strictEqual(result.folders.length, zipContent.folders.length);
            zipContent.folders.forEach(function(folder) {
                assert.ok(result.folders.find((f) => f.label === folder.name));
            });
            assert.strictEqual(result.documents.length, zipContent.files.length);
            zipContent.files.forEach(function(file) {
                assert.ok(result.documents.find((d) => d.label === file));
            });
        }

        th.apiTests.getId.defaultNegative(co.apis.extractdocument, co.permissions.OFFICE_DOCUMENT, co.collections.documents.name);
        th.apiTests.getId.clientDependentNegative(co.apis.documents, co.collections.documents.name);

        it('responds with 400 when document is not an extractable file', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var testdocument = await getTestDocument();
            await Db.updateDynamicObject("client0", co.collections.documents.name, testdocument.name, { type: "plain/text" });
            await th.get(`/api/${co.apis.extractdocument}/${testdocument.name}?token=${token}`).expect(400);
        });

        it('responds with 400 when ZIP file is corrupted', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var testdocument = await getTestDocument();
            var filePath = dh.getDocumentPath("client0", testdocument.name);
            fs.writeFileSync(filePath, 'Invalid ZIP content');
            await th.get(`/api/${co.apis.extractdocument}/${testdocument.name}?token=${token}`).expect(400);
        });

        it('extracts the ZIP file and creates a folder structure in the folder of the document and documents for all contained files', async() => {
            var foldersDict = { rootFolder: { folders:[], documents:[] } };
            var token = await th.defaults.login("client0_usergroup0_user0");
            var testdocument = await getTestDocument();
            var response = await th.get(`/api/${co.apis.extractdocument}/${testdocument.name}?token=${token}`).expect(200);
            checkResult(response.body);
            var folders = await Db.getDynamicObjects("client0", co.collections.folders.name);
            folders.forEach(function(folder) {
                foldersDict[folder.name] = folder;
                folder.folders = [];
                folder.documents = [];
            });
            folders.forEach(function(folder) {
                if (folder.parentfoldername) {
                    foldersDict[folder.parentfoldername].folders.push(folder);
                } else {
                    foldersDict.rootFolder.folders.push(folder);
                }
            });
            var documents = await Db.getDynamicObjects("client0", co.collections.documents.name);
            documents.forEach(function(document) {
                if (document.parentfoldername) {
                    foldersDict[document.parentfoldername].documents.push(document);
                } else {
                    foldersDict.rootFolder.documents.push(document);
                }
            });
            compareStructure(foldersDict["client0_folder0"], zipContent);
        });

        it('creates no folders or documents when the ZIP file is empty', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var testdocument = await getTestDocument();
            var zip = new JSZip();
            var zipFileBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            var filePath = dh.getDocumentPath("client0", testdocument.name);
            fs.writeFileSync(filePath, zipFileBuffer);
            await th.get(`/api/${co.apis.extractdocument}/${testdocument.name}?token=${token}`).expect(200);
            var folders = await Db.getDynamicObjects("client0", co.collections.folders.name, { parentfoldername: testdocument.parentfoldername });
            assert.strictEqual(folders.length, 2); // Nur die vorbereiteten
            var documents = await Db.getDynamicObjects("client0", co.collections.documents.name, { parentfoldername: testdocument.parentfoldername });
            assert.strictEqual(documents.length, 3); // Nur die vorbereiteten und das Testdokument selbst
            assert.strictEqual(documents[2].name, testdocument.name);
        });

        it('creates folder structures in folder of document even if folders with the same name exist (creates duplicates)', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var testdocument = await getTestDocument();
            var folder = {name: "client0_duplicatefolder0", label:'F1', parentfoldername: testdocument.parentfoldername };
            await Db.insertDynamicObject("client0", co.collections.folders.name, folder);
            await th.get(`/api/${co.apis.extractdocument}/${testdocument.name}?token=${token}`).expect(200);
            var folders = await Db.getDynamicObjects("client0", co.collections.folders.name, { parentfoldername: testdocument.parentfoldername });
            assert.strictEqual(folders.length, 5); // 3 Vorbereitete und zwei aus ZIP-Datei
        });

        it('creates documents for files even if documents with the same name exist (creates duplicates)', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            var testdocument = await getTestDocument();
            var document = { name: "client0_duplicatedocument0", label:'Da', parentfoldername: testdocument.parentfoldername, type: "text/plain", isshared: false };
            await Db.insertDynamicObject("client0", co.collections.documents.name, document);
            await th.get(`/api/${co.apis.extractdocument}/${testdocument.name}?token=${token}`).expect(200);
            var documents = await Db.getDynamicObjects("client0", co.collections.documents.name, { parentfoldername: testdocument.parentfoldername });
            assert.strictEqual(documents.length, 6); // 3 Vorbereiteter, 1 Testdokument und zwei aus ZIP-Datei
        });

    });

});
