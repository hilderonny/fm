/**
 * CRUD API for folders of document management
 * 
 * folder {
 *      _id,
 *      name,
 *      parentFolderId,
 *      clientId (id of client of user which created the folder),
 *      documents: [],
 *      folders: []
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateId');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var documentsApi = require('./documents');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');
var dah = require('../utils/dynamicAttributesHelper');
var Db = require("../utils/db").Db;

function mapFields(e) {
    return {
        _id: e.name,
        clientId: "client0",
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
    (SELECT get_path.name, folders.parentfoldername, get_path.depth + 1 FROM folders JOIN get_path on get_path.parentfoldername = folders.name)
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
 * zum Erstellen von Verknüpfungen verwendet
 */
router.get('/allFoldersAndDocuments', auth('PERMISSION_OFFICE_DOCUMENT', 'r', 'documents'), function(req, res) {
    var clientId = req.user.clientId; // clientId === null means that the user is a portal user
    req.db.get('folders').find({ clientId: clientId }).then((folders) => {
        folders.forEach(function(folder) { // Um zwischen Verzeichnissen und Dokumenten zu unterscheiden
            folder.type = 'folder';
        })
        var filter = { clientId: clientId };
        if (req.query.type) filter.type = { $regex : new RegExp('^' + req.query.type) } // Wenn nur Bilder angefragt werden
        req.db.get('documents').find(filter).then((documents) => {
            documents.forEach(function(document) { // Um zwischen Verzeichnissen und Dokumenten zu unterscheiden
                document.type = 'document';
            })
            var allFoldersAndDocuments = folders.concat(documents);
            return res.send(allFoldersAndDocuments);
        });
    });
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
    var namestofind = req.query.ids.split(",").map((n) => `'${n}'`).join(",");
    var query = `${folderquery} WHERE folders.name IN (${namestofind})`;
    var result = (await Db.query(req.user.clientname, query))[4]; // 0 = DROP, 1 = CREATE, 2 = DROP, 3 = CREATE, 4 = SELECT
    res.send(result.rowCount > 0 ? result.rows.map(mapFields) : []);
});

// var parentcheck = folder.name ? `='${folder.parentfoldername}'` : " IS NULL";
// var query = `(SELECT name AS _id, label AS name, 'f' AS type FROM folders WHERE parentfoldername${parentcheck} ORDER BY label) UNION ALL (SELECT name AS _id, label AS name, 'd' AS type FROM documents WHERE parentfoldername${parentcheck} ORDER BY label);`;

/**
 * Get a specific folder and its contained folders and documents
 * elements: _id, name, type ("f" / d") of contained folders and documents
 * path: [{ name: label }, ...] inbetween folder names from root level to folder
 */
router.get('/:id', auth(co.permissions.OFFICE_DOCUMENT, 'r', co.modules.documents), validateSameClientId(co.collections.folders.name), async(req, res) => {
    var query = `${folderquery} WHERE folders.name = '${req.params.id}'`;
    var result = (await Db.query(req.user.clientname, query))[4]; // 0 = DROP, 1 = CREATE, 2 = DROP, 3 = CREATE, 4 = SELECT
    if (result.rowCount < 1) return res.sendStatus(404);
    res.send(mapFields(result.rows[0], req.user));
});

// Create a folder
router.post('/', auth('PERMISSION_OFFICE_DOCUMENT', 'w', 'documents'), function(req, res) {
    var folder = req.body;
    if (!folder || Object.keys(folder).length < 1 || !folder.name) {
        return res.sendStatus(400);
    }
    delete folder._id; // Ids are generated automatically
    folder.clientId = req.user.clientId;
    if (folder.parentFolderId) {
        // Need to check whether the parent folder which this one is to be assigned to exists
        req.db.get('folders').findOne(folder.parentFolderId).then((parentFolder) => {
            if (!parentFolder) {
                return res.sendStatus(400);
            }
            folder.parentFolderId = parentFolder._id;
            req.db.insert('folders', folder).then((insertedFolder) => {
                res.send(insertedFolder);
            });
        });
    } else {
        req.db.insert('folders', folder).then((insertedFolder) => {
            res.send(insertedFolder);
        });
    }
});

// Update meta data of a folder
router.put('/:id', auth('PERMISSION_OFFICE_DOCUMENT', 'w', 'documents'), validateId, validateSameClientId('folders'), function(req, res) {
    var folder = req.body;
    if (!folder || Object.keys(folder).length < 1) {
        return res.sendStatus(400);
    }
    delete folder._id; // When folder object also contains the _id field
    delete folder.clientId; // Prevent assignment of the folder to another client
    if (folder.parentFolderId) { 
        // Need to check whether the parent folder which this one is to be assigned to exists
        req.db.get('folders').findOne(folder.parentFolderId).then((parentFolder) => {
            if (!parentFolder) {
                return res.sendStatus(400);
            }
            folder.parentFolderId = parentFolder._id;
            req.db.update('folders', req.params.id, { $set: folder }).then((updatedFolder) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
                // Database element is available here in every case, because validateSameClientId already checked for existence
                res.send(updatedFolder);
            });
        });
        folder.parentFolderId = monk.id(folder.parentFolderId); // Convert the prarentfolderid to a reference
    } else {
        req.db.update('folders', req.params.id, { $set: folder }).then((updatedFolder) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
            // Database element is available here in every case, because validateSameClientId already checked for existence
            res.send(updatedFolder);
        });
    }
});

// Remove folder and its content recursively
var removeFolder = (db, folder) => {
    var promises = [];
    // Delete subfolders recursively
    promises.push(db.get('folders').find({ parentFolderId: folder._id }, '_id').then((subFolders) => {
        var folderPromises = subFolders.map((subFolder) => removeFolder(db, subFolder));
        return Promise.all(folderPromises);
    }));
    // Delete documents and their relations
    promises.push(db.get('documents').find({ parentFolderId: folder._id }, '_id clientId').then((documents) => {
        var documentPromises = documents.map((document) => documentsApi.deleteDocument(db, document));
        return Promise.all(documentPromises);
    }));
    promises.push(rh.deleteAllRelationsForEntity(co.collections.folders.name, folder._id));
    promises.push(dah.deleteAllDynamicAttributeValuesForEntity(folder._id));
    // Delete the folder itself
    promises.push(db.remove('folders', folder._id));
    return Promise.all(promises);
};

// Delete a folder
router.delete('/:id', auth('PERMISSION_OFFICE_DOCUMENT', 'w', 'documents'), validateId, validateSameClientId('folders'), function(req, res) {
    req.db.get('folders').findOne(req.params.id).then((folder) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        return removeFolder(req.db, folder);
    }).then(() => {
        res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
    });
});

module.exports = router;
