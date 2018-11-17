/**
 * CRUD API for documents of document management
 * 
 * document {
 *      _id,
 *      name,
 *      type (e.g. application/json),
 *      parentFolderId,
 *      clientId (id of client of user which created the document)
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var multer  = require('multer')
var upload = multer({ dest: 'uploads/', limits: {
    fieldSize: 32 * 1024 * 1024 * 1024, // 32GB,
    fileSize: 32 * 1024 * 1024 * 1024, // 32GB,
} });
var fs = require('fs');
var path = require('path');
var dh = require('../utils/documentsHelper');
var co = require('../utils/constants');
var mime = require("mime");
var Db = require("../utils/db").Db;
var request = require('request');

var downloadDocument = (response, clientname, document, forpreview) => {
    var dispositiontype = forpreview ? 'inline' : 'attachment';
    var options = {
        headers: {
            'Content-disposition' : dispositiontype + '; filename=' + encodeURIComponent(document.label), // When file names contain invalid characters it comes to an error here
            'Content-Type' : document.type
        }
    };
    return response.sendFile(dh.getDocumentPath(clientname, document.name), options);
};

// Download a specific shared document without authentication 
router.get('/share/:documentname', async(req, res) => {
    var clientnames = (await Db.query(Db.PortalDatabaseName, `SELECT name FROM clients;`)).rows.map(c => c.name);
    for (var i = 0; i < clientnames.length; i++) {
        var clientname = clientnames[i];
        var document = await Db.getDynamicObject(clientname, "documents", req.params.documentname);
        if (document && document.isshared) {
            downloadDocument(res, clientname, document, true);
            return;
        }
    }
    res.sendStatus(404);
});

// Get a specific document 
router.get('/download/:documentname', auth(co.permissions.OFFICE_DOCUMENT, 'r', co.modules.documents), async(req, res) => {
    var clientname = req.user.clientname;
    var document = await Db.getDynamicObject(clientname, "documents", req.params.documentname);
    if (!document) return res.sendStatus(404);
    return downloadDocument(res, clientname, document);
});

// Get a specific document 
router.get('/preview/:documentname', auth(co.permissions.OFFICE_DOCUMENT, 'r', co.modules.documents), async(req, res) => {
    var clientname = req.user.clientname;
    var document = await Db.getDynamicObject(clientname, "documents", req.params.documentname);
    if (!document) return res.sendStatus(404);
    return downloadDocument(res, clientname, document, true);
});

// Create a document via file upload
router.post('/', auth(co.permissions.OFFICE_DOCUMENT, 'w', co.modules.documents), upload.single('file'), async(req, res) => { // https://github.com/expressjs/multer
    var file = req.file;
    if (!file) return res.sendStatus(400);
    var clientname = req.user.clientname;
    var document = {
        name: Db.createName(),
        label: file.originalname,
        type: mime.getType(path.extname(file.originalname)),
        isshared: false
    };
    await Db.insertDynamicObject(clientname, "documents", document);
    dh.moveToDocumentsDirectory(clientname, document.name, path.join(__dirname, '/../', file.path));
    var parentdatatypename = req.body.parentdatatypename;
    var parententityname = req.body.parententityname;
    if (parentdatatypename && parententityname) {
        var relation = {
            name: Db.createName(),
            datatype1name: parentdatatypename,
            name1: parententityname,
            datatype2name: "documents",
            name2: document.name,
            relationtypename: "parentchild"
        };
        await Db.insertDynamicObject(clientname, "relations", relation);
    }
    res.send(document.name);
});

// Create a document via upload from URL
// Required parameter: url
// Optional parameters: parentdatatypename, parententityname
router.post('/urlupload', auth(co.permissions.OFFICE_DOCUMENT, 'w', co.modules.documents), async(req, res) => {
    var url = req.body.url;
    if (!url) return res.sendStatus(400);
    var fileRequest = request(url);
    fileRequest.on('error', function (error) {
        fileRequest.abort();
        reject(error);
    });
    fileRequest.on('response', function (response) {
        if (response.statusCode === 301) return res.status(301).send(response);
        if (response.statusCode !== 200) {
            fileRequest.abort();
            reject(response);
            return;
        }
        var contentType = response.headers['content-type'];
        if (contentType.includes('text/html')) return res.sendStatus(400); // file URL cannot be handled by the application
        var filename;
        if (response.headers['content-disposition']) {
            filename = response.headers['content-disposition'].split("=")[1]; // "attachment; filename=abc.zip"
        } else {
            var url_string_array = url.split("/");
            filename = url_string_array[url_string_array.length - 1];
        }
        var clientname = req.user.clientname;
        var document = {
            name: Db.createName(),
            label: filename,
            type: contentType,
            isshared: false
        };
        let fileStream = fs.createWriteStream(filename);
        fileRequest.pipe(fileStream).on('finish', async() => {
            await Db.insertDynamicObject(clientname, "documents", document);
            dh.moveToDocumentsDirectory(clientname, document.name, path.join(__dirname, '/../', filename));
            var parentdatatypename = req.body.parentdatatypename;
            var parententityname = req.body.parententityname;
            if (parentdatatypename && parententityname) {
                var relation = {
                    name: Db.createName(),
                    datatype1name: parentdatatypename,
                    name1: parententityname,
                    datatype2name: "documents",
                    name2: document.name,
                    relationtypename: "parentchild"
                };
                await Db.insertDynamicObject(clientname, "relations", relation);
            }
            res.send(document.name);
        });
    });
});

// replace a file for an existing document
router.post('/replace/:name', auth(co.permissions.OFFICE_DOCUMENT, 'w', co.modules.documents), upload.single('file'), async(req, res) => { // https://github.com/expressjs/multer
    var file = req.file;
    var documentname = req.params.name;
    if (!file) return res.sendStatus(400);
    var clientname = req.user.clientname;
    var document = await Db.getDynamicObject(clientname, "documents", documentname);
    if (!document) return res.sendStatus(404);
    await Db.updateDynamicObject(clientname, "documents", documentname, { type: mime.getType(path.extname(file.originalname)) });
    dh.moveToDocumentsDirectory(clientname, document.name, path.join(__dirname, '/../', file.path));
    res.sendStatus(200);
});

module.exports = router;
