var path = require('path');
var localConfig = require('../config/localconfig.json');
var fs = require('fs');
var rh = require('./relationsHelper');
var dah = require('./dynamicAttributesHelper');
var Db = require("./db").Db;
var co = require('./constants');

/**
 * Helper functions for documents module
 */
var dh = {
    /**
     * Calculates the path for a document with the given ID.
     * Returns the absolute path in the file system.
     * Uses the "documentspath" setting from the localconfig which
     * is defined relative to the app.js. When the documentspath is not set,
     * "documents/" is used by default.
     * Used in documents API, extractdocuments API and unit tests.
     * The ID must be given as Monk ID or as string
     */
    getDocumentPath: function(clientname, documentId) {
        return path.join(
            __dirname, // relative to utils folder
            '..', // go up to app.js folder
            localConfig.documentspath ? localConfig.documentspath : 'documents', // subfolder from localconfig
            clientname, // Subfolder for clients
            documentId // document id as file name
        );
    },

    /**
     * Creates the given path when it does not already exist including its all intermediate
     * folders.
     */
    createPath: function(pathToCreate) {
        try {
            fs.statSync(pathToCreate);
            return; // Here we come only when the path exists
        }
        catch (err) {
            // path does not exist, create it recursively
            module.exports.createPath(path.dirname(pathToCreate));
            fs.mkdirSync(pathToCreate);
        }
    },

    /**
     * Moves a file into the documents folder and renames it to the given id.
     */
    moveToDocumentsDirectory: function(documentId, originalFilePath) {
        // Create path ehen it does not exist
        var documentPath = module.exports.getDocumentPath(documentId);
        module.exports.createPath(path.dirname(documentPath));
        fs.renameSync(originalFilePath, documentPath);
    },

    /**
     * Deletes a document and all of its relations and dynamic attribute values and files
     */
    deleteDocument: async(clientname, documentname) => {
        await Db.deleteDynamicObject(clientname, co.collections.documents.name, documentname);
        await rh.deleteAllRelationsForEntity(clientname, co.collections.documents.name, documentname);
        await dah.deleteAllDynamicAttributeValuesForEntity(clientname, documentname);
        var filePath = dh.getDocumentPath(clientname, documentname);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    },

    /**
     * Deletes a document and all of its relations, dynamic attribute values, subfolders, documents and document files
     */
    deleteFolder: async(clientname, foldername) => {
        // Delete documents and their relations and dynamic attributes
        var documents = await Db.getDynamicObjects(clientname, co.collections.documents.name, { parentfoldername: foldername});
        for (var i = 0; i < documents.length; i++) {
            dh.deleteDocument(clientname, documents[i].name);
        }
        // Delete subfolders and their relations and dynamic attributes
        var subfolders = await Db.getDynamicObjects(clientname, co.collections.folders.name, { parentfoldername: foldername});
        for (var i = 0; i < subfolders.length; i++) {
            await dh.deleteFolder(clientname, subfolders[i].name);
        }
        // Delete the folder itself
        await Db.deleteDynamicObject(clientname, co.collections.folders.name, foldername);
        await rh.deleteAllRelationsForEntity(clientname, co.collections.folders.name, foldername);
        await dah.deleteAllDynamicAttributeValuesForEntity(clientname, foldername);
    },
}

module.exports = dh;