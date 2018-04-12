/**
 * API for extracting zip files
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var mime = require('mime');
var fs = require('fs');
var path = require('path');
var documentsHelper = require('../utils/documentsHelper');
var co = require('../utils/constants');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;
var unzipper = require("unzipper");

async function extractDocument(zipdocument, clientname) {
    var folders = {};
    var documents = {};
    var filePath = documentsHelper.getDocumentPath(clientname, zipdocument.name);
    var parentrelations = await Db.getDynamicObjects(clientname, "relations", { datatype2name: "documents", name2: zipdocument.name });
    var readstream = fs.createReadStream(filePath);
    await readstream.pipe(unzipper.Parse().on('entry', entry => {
        if (entry.type === "Directory") {
            folders[entry.path] = { name: uuidv4(), label: path.basename(entry.path) };
            entry.autodrain();
        } else {
            var lastslash = entry.path.lastIndexOf("/") + 1;
            var parentpath = path.dirname(entry.path) + "/";
            var filename = path.basename(entry.path);
            var mimetype = mime.lookup(path.extname(filename));
            var document = { name: uuidv4(), label: filename, type: mimetype };
            documents[entry.path] = document;
            var documentpath = documentsHelper.getDocumentPath(clientname, document.name);
            documentsHelper.createPath(path.dirname(documentpath));
            entry.pipe(fs.createWriteStream(documentpath));
        }
    })).promise().then(undefined, err => { // ZIP file is corrupted, close readstream correctly
        readstream.close();
        return Promise.reject(err);
    });
    var relations = [];
    var folderkeys = Object.keys(folders);
    for (var i = 0; i < folderkeys.length; i++) {
        var k = folderkeys[i];
        var folder = folders[k];
        var parentpath = path.dirname(k) + "/";
        if (parentpath === "./") {
            parentrelations.forEach(pr => {
                relations.push({ name: uuidv4(), datatype1name: pr.datatype1name, name1: pr.name1, datatype2name: "folders", name2: folder.name, relationtypename: "parentchild" });
            });
        } else {
            relations.push({ name: uuidv4(), datatype1name: "folders", name1: folders[parentpath].name, datatype2name: "folders", name2: folder.name, relationtypename: "parentchild" });
        }
        await Db.insertDynamicObject(clientname, "folders", folder);
    }
    var documentkeys = Object.keys(documents);
    for (var i = 0; i < documentkeys.length; i++) {
        var k = documentkeys[i];
        var document = documents[k];
        var parentpath = path.dirname(k) + "/";
        if (parentpath === "./") {
            parentrelations.forEach(pr => {
                relations.push({ name: uuidv4(), datatype1name: pr.datatype1name, name1: pr.name1, datatype2name: "documents", name2: document.name, relationtypename: "parentchild" });
            });
        } else {
            relations.push({ name: uuidv4(), datatype1name: "folders", name1: folders[parentpath].name, datatype2name: "documents", name2: document.name, relationtypename: "parentchild" });
        }
        await Db.insertDynamicObject(clientname, "documents", document);
    }
    for (var i = 0; i < relations.length; i++) {
        await Db.insertDynamicObject(clientname, "relations", relations[i]);
    }
}

// Extract a specific document and create folder and document structure and returns the newly created folders and documents
router.get('/:id', auth(co.permissions.OFFICE_DOCUMENT, 'w', co.modules.documents), async(req, res) => {
    var clientname = req.user.clientname;
    var document = await Db.getDynamicObject(clientname, co.collections.documents.name, req.params.id);
    if (!document) return res.sendStatus(404);
    if (document.type !== 'application/x-zip-compressed' && document.type !== 'application/zip') return res.sendStatus(400);
    extractDocument(document, clientname).then((result) => {
        res.sendStatus(200);
    }, (error) => {
        // Error parsing file
        res.sendStatus(400);
    });
});

module.exports = router;
