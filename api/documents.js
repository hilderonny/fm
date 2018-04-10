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
var validateSameClientId = require('../middlewares/validateSameClientId');
var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })
var fs = require('fs');
var path = require('path');
var dh = require('../utils/documentsHelper');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');
var dah = require('../utils/dynamicAttributesHelper');
var mime = require('send').mime;
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;

var documentquery = `
DROP TABLE IF EXISTS folderpathtype;
CREATE TEMP TABLE folderpathtype (name text);
WITH RECURSIVE get_path(name, parentfoldername, depth) AS (
    (SELECT name, parentfoldername, 0 FROM documents)
    UNION
    (SELECT get_path.name, folders.parentfoldername, get_path.depth + 1 FROM folders JOIN get_path on get_path.parentfoldername = folders.name WHERE get_path.depth < 64)
)
SELECT documents.*, COALESCE(pd.path, '[]') as path FROM documents
LEFT JOIN (
    SELECT name, COALESCE(json_agg(row_to_json(row(label)::folderpathtype)) FILTER (WHERE parentfoldername IS NOT NULL), '[]') AS path
    FROM (SELECT get_path.name, get_path.parentfoldername, folders.label FROM get_path JOIN folders ON get_path.parentfoldername = folders.name ORDER BY depth DESC) a
    GROUP BY name
) pd ON pd.name = documents.name
`;

function mapFields(e, clientname) {
    return {
        _id: e.name,
        clientId: clientname,
        name: e.label,
        type: e.type,
        isShared: e.isshared,
        parentFolderId: e.parentfoldername,
        path: e.path
    };
}

var downloadDocument = (response, clientname, document) => {
    var options = {
        headers: {
            'Content-disposition' : 'attachment; filename=' + document.label,
            'Content-Type' : mime.lookup(document.type)
        }
    };
    return response.sendFile(dh.getDocumentPath(clientname, document.name), options);
};

// Download a specific shared document without authentication 
router.get('/share/:clientname/:documentname', async(req, res) => {
    var clientname = req.params.clientname;
    var clientresult = await Db.query(Db.PortalDatabaseName, `SELECT 1 FROM clients WHERE name = '${Db.replaceQuotes(clientname)}';`);
    if(clientresult.rowCount < 1) return res.sendStatus(404);
    var document = await Db.getDynamicObject(clientname, co.collections.documents.name, req.params.documentname);
    if (!document) return res.sendStatus(404);
    if (!document.isshared) return res.sendStatus(403);
    downloadDocument(res, clientname, document);
});

/**
 * Liefert eine Liste von Dokumenten für die per URL übergebenen IDs. Die IDs müssen kommagetrennt sein.
 * Die Berechtigungen werden hier nicht per auth überprüft, da diese API für die Verknüpfungen verwendet
 * wird und da wäre es blöd, wenn ein 403 zur Neuanmeldung führte. Daher wird bei fehlender Berechtigung
 * einfach eine leere Liste zurück gegeben.
 * @example
 * $http.get('/api/documents/forIds?ids=ID1,ID2,ID3')...
 */
router.get('/forIds', auth(false, false, co.modules.documents), async(req, res) => {
    // Zuerst Berechtigung prüfen
    var accessAllowed = await auth.canAccess(req.user.name, co.permissions.OFFICE_DOCUMENT, 'r', co.modules.documents);
    if (!accessAllowed) {
        return res.send([]);
    }
    if (!req.query.ids) {
        return res.send([]);
    }
    var namestofind = req.query.ids.split(",").map((n) => `'${Db.replaceQuotes(n)}'`).join(",");
    var query = `${documentquery} WHERE documents.name IN (${namestofind})`;
    var result = (await Db.query(req.user.clientname, query))[2]; // 0 = DROP, 1 = CREATE, 2 = SELECT
    res.send(result.rowCount > 0 ? result.rows.map((r) => mapFields(r, req.user.clientname)) : []);
});

// Get a specific document 
router.get('/:id', auth(co.permissions.OFFICE_DOCUMENT, 'r', co.modules.documents), validateSameClientId(co.collections.documents.name), async(req, res) => {
    var query = `${documentquery} WHERE documents.name = '${Db.replaceQuotes(req.params.id)}'`;
    var result = (await Db.query(req.user.clientname, query))[2]; // 0 = DROP, 1 = CREATE, 2 = SELECT
    if (result.rowCount < 1) return res.sendStatus(404);
    var document = result.rows[0];
    // When request parameter "action=download" is given, return the document file.
    if (req.query.action && req.query.action === 'download') {
        return downloadDocument(res, req.user.clientname, document);
    }
    res.send(mapFields(document, req.user.clientname));
});

// Create a document via file upload
router.post('/', auth(co.permissions.OFFICE_DOCUMENT, 'w', co.modules.documents), upload.single('file'), async(req, res) => { // https://github.com/expressjs/multer
    var file = req.file;
    if (!file) return res.sendStatus(400);
    var clientname = req.user.clientname;
    var parentFolderId = req.body.parentFolderId ? req.body.parentFolderId : null;
    if (parentFolderId && !(await Db.getDynamicObject(clientname, co.collections.folders.name, parentFolderId))) return res.sendStatus(400);
    var document = {
        name: uuidv4(),
        label: file.originalname,
        type: file.mimetype, 
        parentfoldername: parentFolderId,
        isshared: false
    };
    await Db.insertDynamicObject(clientname, co.collections.documents.name, document);
    dh.moveToDocumentsDirectory(clientname, document.name, path.join(__dirname, '/../', file.path));
    res.send({ _id: document.name, type: "d", name: document.label });
});

// Update meta data of a document
router.put('/:id', auth(co.permissions.OFFICE_DOCUMENT, "w", co.modules.documents), validateSameClientId(co.collections.documents.name), async(req, res) => {
    var clientname = req.user.clientname;
    var document = req.body;
    if (!document) return res.sendStatus(400);
    delete document._id; // When object also contains the _id field
    delete document.clientId; // Prevent assignment of the document to another client
    if (Object.keys(document).length < 1) return res.sendStatus(400);
    var updateset = {};
    if (typeof(document.parentFolderId) !== "undefined") {
        if (document.parentFolderId !== null && !(await Db.getDynamicObject(clientname, co.collections.folders.name, document.parentFolderId))) return res.sendStatus(400);
        updateset.parentfoldername = document.parentFolderId ? document.parentFolderId : null;
    }
    if (document.name) updateset.label = document.name;
    if (document.type) updateset.type = document.type;
    if (typeof(document.isShared) !== "undefined") updateset.isshared = document.isShared;
    var result = await Db.updateDynamicObject(clientname, co.collections.documents.name, req.params.id, updateset);
    if (result.rowCount < 1) return res.sendStatus(404);
    return res.send(mapFields(updateset, req.user.clientname));
});

// Delete a document
router.delete('/:id', auth(co.permissions.OFFICE_DOCUMENT, "w", co.modules.documents), validateSameClientId(co.collections.documents.name), async(req, res) => {
    await dh.deleteDocument(req.user.clientname, req.params.id);
    res.sendStatus(204);
});

module.exports = router;
