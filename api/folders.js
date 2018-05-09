/**
 * CRUD API for folders of document management
 * 
 * folder {
 *      _id,
 *      name,
 *      parentFolderId,
 *      clientId (id of client of user which created the folder),
 *      elements: []
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateSameClientId = require('../middlewares/validateSameClientId');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');
var dh = require('../utils/documentsHelper');
var dah = require('../utils/dynamicAttributesHelper');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;

function mapFields(e, clientname) {
    return {
        _id: e.name,
        clientId: clientname,
        name: e.label,
        parentFolderId: e.parentfoldername,
        elements: e.elements,
        path: e.path
    };
}

var folderquery = `
DROP TABLE IF EXISTS folderpathtype;
CREATE TEMP TABLE folderpathtype (name text);
DROP TABLE IF EXISTS folderchildtype;
CREATE TEMP TABLE folderchildtype (_id text, name text, type text);
WITH RECURSIVE get_path(name, parentfoldername, depth) AS (
    (SELECT name, parentfoldername, 0 FROM folders)
    UNION
    (SELECT get_path.name, folders.parentfoldername, get_path.depth + 1 FROM folders JOIN get_path on get_path.parentfoldername = folders.name WHERE get_path.depth < 64)
)
SELECT folders.*, COALESCE(pd.path, '[]') as path, COALESCE(cd.children, '[]') as elements FROM folders
LEFT JOIN (
    SELECT name, COALESCE(json_agg(row_to_json(row(label)::folderpathtype)) FILTER (WHERE parentfoldername IS NOT NULL), '[]') AS path
    FROM (SELECT get_path.name, get_path.parentfoldername, folders.label FROM get_path JOIN folders ON get_path.parentfoldername = folders.name ORDER BY depth DESC) a
    GROUP BY name
) pd ON pd.name = folders.name
LEFT JOIN (
    SELECT parentfoldername, json_agg(row_to_json(row(name, label, type)::folderchildtype)) AS children FROM (
        (SELECT name, label, parentfoldername, 'f' AS type FROM folders ORDER BY label)
        UNION ALL
        (SELECT name, label, parentfoldername, 'd' AS type FROM documents ORDER BY label)
    ) a
    GROUP BY parentfoldername
) cd ON cd.parentfoldername = folders.name 
`;

/**
 * Gibt alle Verzeichnisse und Dokumente zurück. Wird für den Dialog
 * zum Erstellen von Verknüpfungen verwendet.
 * Mit dem Parameter "type" kann man den Dokumententyp filtern, "image" matched zum Beispiel auf alle Bildtypen ( WHERE type LIKE "image*")
 */
router.get('/allFoldersAndDocuments', auth(co.permissions.OFFICE_DOCUMENT, 'r', co.modules.documents), async(req, res) => {
    var filter = req.query.type ? ` WHERE documents.type LIKE '${Db.replaceQuotes(req.query.type)}%'` : '';
    var query = `
    (SELECT name AS "_id", label AS "name", parentfoldername AS "parentFolderId", 'folder' AS "type" FROM folders)
    UNION ALL
    (SELECT name AS "_id", label AS "name", parentfoldername AS "parentFolderId", 'document' AS "type" FROM documents${filter})
    `;
    var result = (await Db.query(req.user.clientname, query));
    res.send(result.rowCount > 0 ? result.rows : []);
});

/**
 * Liefert eine Liste von Verzeichnissen für die per URL übergebenen IDs. Die IDs müssen kommagetrennt sein.
 * Die Berechtigungen werden hier nicht per auth überprüft, da diese API für die Verknüpfungen verwendet
 * wird und da wäre es blöd, wenn ein 403 zur Neuanmeldung führte. Daher wird bei fehlender Berechtigung
 * einfach eine leere Liste zurück gegeben.
 * Used for relations dialog. The path.name is used for the second line there
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
    var query = `${folderquery} WHERE folders.name IN (${namestofind})`;
    var result = (await Db.query(req.user.clientname, query))[4]; // 0 = DROP, 1 = CREATE, 2 = DROP, 3 = CREATE, 4 = SELECT
    res.send(result.rowCount > 0 ? result.rows.map((r) => mapFields(r, req.user.clientname)) : []);
});

/**
 * Get a specific folder and its contained folders and documents
 * elements: _id, name, type ("f" / d") of contained folders and documents
 * path: [{ name: label }, ...] inbetween folder names from root level to folder
 */
router.get('/:id', auth(co.permissions.OFFICE_DOCUMENT, 'r', co.modules.documents), validateSameClientId(co.collections.folders.name), async(req, res) => {
    var query = `${folderquery} WHERE folders.name = '${Db.replaceQuotes(req.params.id)}'`;
    var result = (await Db.query(req.user.clientname, query))[4]; // 0 = DROP, 1 = CREATE, 2 = DROP, 3 = CREATE, 4 = SELECT
    if (result.rowCount < 1) return res.sendStatus(404);
    res.send(mapFields(result.rows[0], req.user.clientname));
});

// Create a folder
router.post('/', auth(co.permissions.OFFICE_DOCUMENT, 'w', co.modules.documents), async(req, res) => {
    var clientname = req.user.clientname;
    var folder = req.body;
    if (!folder || Object.keys(folder).length < 1) {
        return res.sendStatus(400);
    }
    var foldertoinsert = { name: uuidv4().replace(/-/g, "") };
    if (folder.name) foldertoinsert.label = folder.name;
    if (folder.parentFolderId && !(await Db.getDynamicObject(clientname, co.collections.folders.name, folder.parentFolderId))) return res.sendStatus(400);
    foldertoinsert.parentfoldername = folder.parentFolderId ? folder.parentFolderId : null;
    await Db.insertDynamicObject(clientname, co.collections.folders.name, foldertoinsert);
    res.send(mapFields(foldertoinsert, clientname));
});

// Update meta data of a folder
router.put('/:id', auth(co.permissions.OFFICE_DOCUMENT, 'w', co.modules.documents), validateSameClientId(co.collections.folders.name), async(req, res) => {
    var clientname = req.user.clientname;
    var folder = req.body;
    if (!folder) return res.sendStatus(400);
    delete folder._id; // When folder object also contains the _id field
    delete folder.clientId; // Prevent assignment of the folder to another client
    if (Object.keys(folder).length < 1) return res.sendStatus(400);
    var updateset = {};
    if (typeof(folder.parentFolderId) !== "undefined") {
        if (folder.parentFolderId !== null && !(await Db.getDynamicObject(clientname, co.collections.folders.name, folder.parentFolderId))) return res.sendStatus(400);
        updateset.parentfoldername = folder.parentFolderId ? folder.parentFolderId : null;
    }
    if (folder.name) updateset.label = folder.name;
    var result = await Db.updateDynamicObject(clientname, co.collections.folders.name, req.params.id, updateset);
    if (result.rowCount < 1) return res.sendStatus(404);
    return res.send(mapFields(updateset, req.user.clientname));
});

// Delete a folder
router.delete('/:id', auth(co.permissions.OFFICE_DOCUMENT, 'w', co.modules.documents), validateSameClientId(co.collections.folders.name), async(req, res) => {
    await dh.deleteFolder(req.user.clientname, req.params.id);
    res.sendStatus(204);
});

module.exports = router;
