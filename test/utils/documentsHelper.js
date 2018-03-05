/**
 * UNIT Tests for utils/documentsHelper
 */
var assert = require('assert');
var documentsHelper = require('../../utils/documentsHelper');
var localConfig = require('../../config/localconfig.json');
var path = require('path');
var fs = require('fs');

describe('UTILS documentsHelper', () => {
    
    describe('getDocumentPath', () => {

        it('returns full path with relative path from localConfig', () => {
            return new Promise(function(resolve, reject) {
                // Define relative path in localconfig
                localConfig.documentspath = 'temporarytestdir/documents/subdirectory';
                var id = '123456789012345678901234';
                var documentPath = documentsHelper.getDocumentPath("client0", id);
                var expectedPath = path.join(__dirname, '../../temporarytestdir/documents/subdirectory/client0/', id);
                assert.strictEqual(documentPath, expectedPath, 'Returned document path not as expected');
                resolve();
            });
        });

        it('returns full path with relative path to "documents" when "documentspath" not set in localConfig', () => {
            return new Promise(function(resolve, reject) {
                // Remove relative path in localconfig
                delete localConfig.documentspath;
                var id = '123456789012345678901234';
                var documentPath = documentsHelper.getDocumentPath("client0", id);
                var expectedPath = path.join(__dirname, '../../documents/client0/', id);
                assert.strictEqual(documentPath, expectedPath, 'Returned document path not as expected');
                resolve();
            });
        });

    });
    
    describe('createPath', () => {

        it('returns immediately when the path exists', () => {
            return new Promise(function(resolve, reject) {
                // Create path
                var pathToCheck = path.join(__dirname, '../../temporarytestdir');
                if (!fs.existsSync(pathToCheck)) fs.mkdirSync(pathToCheck);
                documentsHelper.createPath(pathToCheck);
                var isExisting = fs.existsSync(pathToCheck);
                fs.rmdirSync(pathToCheck); // Cleanup
                assert.ok(isExisting, 'Path does not exist after creation');
                resolve();
            });
        });

        it('creates the path and all intermediate folders when they do not exist', () => {
            return new Promise(function(resolve, reject) {
                var pathToCheck = path.join(__dirname, '../../temporarytestdir/subdir1/subdir2');
                documentsHelper.createPath(pathToCheck);
                var isExisting = fs.existsSync(pathToCheck);
                fs.rmdirSync(pathToCheck); // Cleanup
                fs.rmdirSync(path.dirname(pathToCheck));
                fs.rmdirSync(path.dirname(path.dirname(pathToCheck)));
                assert.ok(isExisting, 'Path does not exist after creation');
                resolve();
            });
        });

    });
    
    describe('moveToDocumentsDirectory', () => {

        it('moves an existing file to the documents directory', () => {
            return new Promise(function(resolve, reject) {
                delete localConfig.documentspath; // Do that to assume the path is 'documents/'
                // Prepare file
                var sourcepath = path.join(__dirname, 'testfile.ext');
                var content = 'testContent';
                fs.writeFileSync(sourcepath, content);
                var id = '123456789012345678901234';
                documentsHelper.moveToDocumentsDirectory("client0", id, sourcepath);
                var expectedPath = path.join(__dirname, '../../documents/client0', id.toString());
                var targetExisting = fs.existsSync(expectedPath);
                var targetContent = fs.readFileSync(expectedPath).toString();
                var sourceExisting = fs.existsSync(sourcepath);
                assert.ok(targetExisting, `Target file "${expectedPath}" does not exist`);
                assert.strictEqual(targetContent, content, `Content of target file "${targetContent}" not as expected "${content}"`);
                assert.ok(!sourceExisting, 'Source file still exists after moving');
                resolve();
            });
        });

        it('throws an error when the source file path does not exist or cannot be accessed', () => {
            return new Promise(function(resolve, reject) {
                var sourcepath = path.join(__dirname, 'notexistingtestfile.ext');
                if (fs.existsSync(sourcepath)) fs.unlinkSync(sourcepath);
                var id = '123456789012345678901234';
                assert.throws(function errorFunction() { documentsHelper.moveToDocumentsDirectory("client0", id, sourcepath) }, 'Expected error was not thrown');
                resolve();
            });
        });

        it('creates the documents target folder and its intermediate folders when they do not exist', () => {
            return new Promise(function(resolve, reject) {
                localConfig.documentspath = 'temporarytestdir/subdir1/subdir2';
                // Prepare file
                var sourcepath = path.join(__dirname, 'testfile.ext');
                var content = 'testContent';
                fs.writeFileSync(sourcepath, content);
                var id = '123456789012345678901234';
                documentsHelper.moveToDocumentsDirectory("client0", id, sourcepath);
                var expectedPath = path.join(__dirname, '../..', localConfig.documentspath, "client0", id);
                var targetExisting = fs.existsSync(expectedPath);
                var targetContent = fs.readFileSync(expectedPath).toString();
                var sourceExisting = fs.existsSync(sourcepath);
                // Cleanup
                fs.unlinkSync(expectedPath);
                fs.rmdirSync(path.dirname(expectedPath));
                fs.rmdirSync(path.dirname(path.dirname(expectedPath)));
                fs.rmdirSync(path.dirname(path.dirname(path.dirname(expectedPath))));
                fs.rmdirSync(path.dirname(path.dirname(path.dirname(path.dirname(expectedPath)))));
                assert.ok(targetExisting, `Target file "${expectedPath}" does not exist`);
                assert.strictEqual(targetContent, content, `Content of target file "${targetContent}" not as expected "${content}"`);
                assert.ok(!sourceExisting, 'Source file still exists after moving');
                resolve();
            });
        });

    });

});
