/**
 * UNIT Tests for utils/documentsHelper
 */
var assert = require('assert');
var superTest = require('supertest');
var documentsHelper = require('../../utils/documentsHelper');
var localConfig = require('../../config/localconfig.json');
var monk = require('monk');
var path = require('path');
var fs = require('fs');

describe('UTILS documentsHelper', function() {

    var server = require('../../app');
    
    describe('getDocumentPath', function() {

        it('returns full path with relative path from localConfig', function() {
            return new Promise(function(resolve, reject) {
                // Define relative path in localconfig
                localConfig.documentspath = 'temporarytestdir/documents/subdirectory';
                var id = monk.id('123456789012345678901234');
                var documentPath = documentsHelper.getDocumentPath(id);
                var expectedPath = path.join(__dirname, '../../temporarytestdir/documents/subdirectory', id.toString());
                assert.strictEqual(documentPath, expectedPath, 'Returned document path not as expected');
                resolve();
            });
        });

        it('returns full path with relative path to "documents" when "documentspath" not set in localConfig', function() {
            return new Promise(function(resolve, reject) {
                // Remove relative path in localconfig
                delete localConfig.documentspath;
                var id = monk.id('123456789012345678901234');
                var documentPath = documentsHelper.getDocumentPath(id);
                var expectedPath = path.join(__dirname, '../../documents', id.toString());
                assert.strictEqual(documentPath, expectedPath, 'Returned document path not as expected');
                resolve();
            });
        });

        it('returns full path when ID is given as string', function() {
            return new Promise(function(resolve, reject) {
                // Define relative path in localconfig
                localConfig.documentspath = 'temporarytestdir/documents/subdirectory';
                var id = '123456789012345678901234'; // ID as string
                var documentPath = documentsHelper.getDocumentPath(id);
                var expectedPath = path.join(__dirname, '../../temporarytestdir/documents/subdirectory', id);
                assert.strictEqual(documentPath, expectedPath, 'Returned document path not as expected');
                resolve();
            });
        });

    });
    
    describe('createPath', function() {

        it('returns immediately when the path exists', function() {
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

        it('creates the path and all intermediate folders when they do not exist', function() {
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
    
    describe('moveToDocumentsDirectory', function() {

        it('moves an existing file to the documents directory', function() {
            return new Promise(function(resolve, reject) {
                delete localConfig.documentspath; // Do that to assume the path is 'documents/'
                // Prepare file
                var sourcepath = path.join(__dirname, 'testfile.ext');
                var content = 'testContent';
                fs.writeFileSync(sourcepath, content);
                var id = monk.id('123456789012345678901234');
                documentsHelper.moveToDocumentsDirectory(id, sourcepath);
                var expectedPath = path.join(__dirname, '../../documents', id.toString());
                var targetExisting = fs.existsSync(expectedPath);
                var targetContent = fs.readFileSync(expectedPath).toString();
                var sourceExisting = fs.existsSync(sourcepath);
                assert.ok(targetExisting, `Target file "${expectedPath}" does not exist`);
                assert.strictEqual(targetContent, content, `Content of target file "${targetContent}" not as expected "${content}"`);
                assert.ok(!sourceExisting, 'Source file still exists after moving');
                resolve();
            });
        });

        it('moves an existing file to the documents directory when the ID is given as string', function() {
            return new Promise(function(resolve, reject) {
                delete localConfig.documentspath; // Do that to assume the path is 'documents/'
                // Prepare file
                var sourcepath = path.join(__dirname, 'testfile.ext');
                var content = 'testContent';
                fs.writeFileSync(sourcepath, content);
                var id = '123456789012345678901234';
                documentsHelper.moveToDocumentsDirectory(id, sourcepath);
                var expectedPath = path.join(__dirname, '../../documents', id);
                var targetExisting = fs.existsSync(expectedPath);
                var targetContent = fs.readFileSync(expectedPath).toString();
                var sourceExisting = fs.existsSync(sourcepath);
                assert.ok(targetExisting, `Target file "${expectedPath}" does not exist`);
                assert.strictEqual(targetContent, content, `Content of target file "${targetContent}" not as expected "${content}"`);
                assert.ok(!sourceExisting, 'Source file still exists after moving');
                resolve();
            });
        });

        it('throws an error when the source file path does not exist or cannot be accessed', function() {
            return new Promise(function(resolve, reject) {
                var sourcepath = path.join(__dirname, 'notexistingtestfile.ext');
                if (fs.existsSync(sourcepath)) fs.unlinkSync(sourcepath);
                var id = monk.id('123456789012345678901234');
                assert.throws(function errorFunction() { documentsHelper.moveToDocumentsDirectory(id, sourcepath) }, 'Expected error was not thrown');
                resolve();
            });
        });

        it('creates the documents target folder and its intermediate folders when they do not exist', function() {
            return new Promise(function(resolve, reject) {
                localConfig.documentspath = 'temporarytestdir/subdir1/subdir2';
                // Prepare file
                var sourcepath = path.join(__dirname, 'testfile.ext');
                var content = 'testContent';
                fs.writeFileSync(sourcepath, content);
                var id = monk.id('123456789012345678901234');
                documentsHelper.moveToDocumentsDirectory(id, sourcepath);
                var expectedPath = path.join(__dirname, '../..', localConfig.documentspath, id.toString());
                var targetExisting = fs.existsSync(expectedPath);
                var targetContent = fs.readFileSync(expectedPath).toString();
                var sourceExisting = fs.existsSync(sourcepath);
                // Cleanup
                fs.unlinkSync(expectedPath);
                fs.rmdirSync(path.dirname(expectedPath));
                fs.rmdirSync(path.dirname(path.dirname(expectedPath)));
                fs.rmdirSync(path.dirname(path.dirname(path.dirname(expectedPath))));
                assert.ok(targetExisting, `Target file "${expectedPath}" does not exist`);
                assert.strictEqual(targetContent, content, `Content of target file "${targetContent}" not as expected "${content}"`);
                assert.ok(!sourceExisting, 'Source file still exists after moving');
                resolve();
            });
        });

    });

});
