var path = require('path');
var localConfig = require('../config/localconfig.json');
var fs = require('fs');

/**
 * Helper functions for documents module
 */

/**
 * Calculates the path for a document with the given ID.
 * Returns the absolute path in the file system.
 * Uses the "documentspath" setting from the localconfig which
 * is defined relative to the app.js. When the documentspath is not set,
 * "documents/" is used by default.
 * Used in documents API, extractdocuments API and unit tests.
 * The ID must be given as Monk ID or as string
 */
module.exports.getDocumentPath = function(documentId) {
    return path.join(
        __dirname, // relative to utils folder
        '..', // go up to app.js folder
        localConfig.documentspath ? localConfig.documentspath : 'documents', // subfolder from localconfig
        documentId.toString() // document id as file name
    );
};

/**
 * Creates the given path when it does not already exist including its all intermediate
 * folders.
 */
module.exports.createPath = function(pathToCreate) {
    try {
        fs.statSync(pathToCreate);
        return; // Here we come only when the path exists
    }
    catch (err) {
        // path does not exist, create it recursively
        module.exports.createPath(path.dirname(pathToCreate));
        fs.mkdirSync(pathToCreate);
    }
};

/**
 * Moves a file into the documents folder and renames it to the given id.
 */
module.exports.moveToDocumentsDirectory = function(documentId, originalFilePath) {
    // Create path ehen it does not exist
    var documentPath = module.exports.getDocumentPath(documentId);
    module.exports.createPath(path.dirname(documentPath));
    fs.renameSync(originalFilePath, documentPath);
};

