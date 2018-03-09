/**
 * CRUD API for fm object management
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateSameClientId = require('../middlewares/validateSameClientId');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');
var dah = require('../utils/dynamicAttributesHelper');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;

function mapFields(fmobject, clientname) {
    var areaTypeCategories = {
        "Wohnen und Aufenthalt" : "FMOBJECTS_CATEGORY_NUF",
        "Büroarbeit" : "FMOBJECTS_CATEGORY_NUF",
        "Produktion, Hand- und Maschinenarbeit, Experimente" : "FMOBJECTS_CATEGORY_NUF",
        "Lagern, Verteilen und Verkaufen" : "FMOBJECTS_CATEGORY_NUF",
        "Bildung, Unterricht und Kultur" : "FMOBJECTS_CATEGORY_NUF",
        "Heilen und Pflegen" : "FMOBJECTS_CATEGORY_NUF",
        "Sonstige Nutzung" : "FMOBJECTS_CATEGORY_NUF",
        "Technische Anlagen" : "FMOBJECTS_CATEGORY_TF",
        "Verkehrserschließung und -sicherung" : "FMOBJECTS_CATEGORY_VF",
    }
    var result = {
        _id: fmobject.name,
        name: fmobject.label,
        parentId: fmobject.parentfmobjectname,
        clientId: clientname,
        type: fmobject.fmobjecttypename,
        areatype: fmobject.areatypename,
        category: areaTypeCategories[fmobject.areatypename],
        f: fmobject.f,
        bgf: fmobject.bgf,
        usagestate: fmobject.areausagestatename,
        previewImageId: fmobject.previewimagedocumentname,
        nrf: fmobject.nrf,
        nuf: fmobject.nuf,
        tf: fmobject.tf,
        vf: fmobject.vf,
    };
    if (fmobject.path) result.path = fmobject.path;
    return result;
}

// Get all FM objects and their recursive children of the current client as hierarchy. Only _id, name and type are returned
// When parameter ?forareas=true is set, also area infos are returned
router.get('/', auth(co.permissions.BIM_FMOBJECT, 'r', co.modules.fmobjects), async(req, res) => {
    var additionalfields = req.query.forareas ? ", f, bgf, nrf, nuf, tf, vf" : "";
    var allfmobjects = (await Db.query(req.user.clientname, `SELECT name AS _id, label AS name, fmobjecttypename AS type, parentfmobjectname AS "parentId", ARRAY[]::text[] as children${additionalfields} FROM fmobjects ORDER BY label;`)).rows;
    var fmmap = {};
    allfmobjects.forEach((fmo) => {
        fmmap[fmo._id] = fmo;
    });
    var toplevelobjects = [];
    allfmobjects.forEach((fmo) => {
        if (!fmo.parentId) {
            toplevelobjects.push(fmo);
            return;
        }
        fmmap[fmo.parentId].children.push(fmo);
    });
    res.send(toplevelobjects);
});

/**
 * Liefert eine Liste von FM Objekten für die per URL übergebenen IDs. Die IDs müssen kommagetrennt sein.
 * Die Berechtigungen werden hier nicht per auth überprüft, da diese API für die Verknüpfungen verwendet
 * wird und da wäre es blöd, wenn ein 403 zur Neuanmeldung führte. Daher wird bei fehlender Berechtigung
 * einfach eine leere Liste zurück gegeben.
 * @example
 * $http.get('/api/fmobjects/forIds?ids=ID1,ID2,ID3')...
 */
router.get('/forIds', auth(false, false, co.modules.fmobjects), async(req, res) => {
    var clientname = req.user.clientname;
    // Zuerst Berechtigung prüfen
    var accessAllowed = await auth.canAccess(req.user.name, co.permissions.BIM_FMOBJECT, 'r', co.modules.fmobjects);
    if (!accessAllowed) {
        return res.send([]);
    }
    if (!req.query.ids) {
        return res.send([]);
    }
    var namestofind = req.query.ids.split(",").map((n) => `'${Db.replaceQuotes(n)}'`).join(",");
    var fmobjectquery = `
    DROP TABLE IF EXISTS fmobjectpathtype;
    CREATE TEMP TABLE fmobjectpathtype (name text);
    WITH RECURSIVE get_path(name, parentfmobjectname, depth) AS (
        (SELECT name, parentfmobjectname, 0 FROM fmobjects)
        UNION
        (SELECT get_path.name, fmobjects.parentfmobjectname, get_path.depth + 1 FROM fmobjects JOIN get_path on get_path.parentfmobjectname = fmobjects.name)
    )
    SELECT fmobjects.name AS _id, fmobjects.label AS name, fmobjects.fmobjecttypename AS "type", fmobjects.parentfmobjectname AS "parentId", '${Db.replaceQuotes(clientname)}' AS "clientId", COALESCE(pd.path, '[]') as path FROM fmobjects
    LEFT JOIN (
        SELECT name, COALESCE(json_agg(row_to_json(row(label)::fmobjectpathtype)) FILTER (WHERE parentfmobjectname IS NOT NULL), '[]') AS path
        FROM (SELECT get_path.name, get_path.parentfmobjectname, fmobjects.label FROM get_path JOIN fmobjects ON get_path.parentfmobjectname = fmobjects.name ORDER BY depth DESC) a
        GROUP BY name
    ) pd ON pd.name = fmobjects.name
    WHERE fmobjects.name IN (${namestofind})
    `;
    var result = (await Db.query(clientname, fmobjectquery))[2]; // 0 = DROP, 1 = CREATE, 2 = SELECT
    res.send(result.rowCount > 0 ? result.rows : []);
});

// Get a specific FM object without child information
router.get('/:id', auth(co.permissions.BIM_FMOBJECT, 'r', co.modules.fmobjects), validateSameClientId(co.collections.fmobjects.name), async(req, res) => {
    var clientname = req.user.clientname;
    var fmobjectquery = `
    DROP TABLE IF EXISTS fmobjectpathtype;
    CREATE TEMP TABLE fmobjectpathtype (name text);
    WITH RECURSIVE get_path(name, parentfmobjectname, depth) AS (
        (SELECT name, parentfmobjectname, 0 FROM fmobjects)
        UNION
        (SELECT get_path.name, fmobjects.parentfmobjectname, get_path.depth + 1 FROM fmobjects JOIN get_path on get_path.parentfmobjectname = fmobjects.name)
    )
    SELECT fmobjects.*, COALESCE(pd.path, '[]') as path FROM fmobjects
    LEFT JOIN (
        SELECT name, COALESCE(json_agg(row_to_json(row(label)::fmobjectpathtype)) FILTER (WHERE parentfmobjectname IS NOT NULL), '[]') AS path
        FROM (SELECT get_path.name, get_path.parentfmobjectname, fmobjects.label FROM get_path JOIN fmobjects ON get_path.parentfmobjectname = fmobjects.name ORDER BY depth DESC) a
        GROUP BY name
    ) pd ON pd.name = fmobjects.name
    WHERE fmobjects.name = '${Db.replaceQuotes(req.params.id)}'
    `;
    var fmobject = (await Db.query(clientname, fmobjectquery))[2].rows[0]; // 0 = DROP, 1 = CREATE, 2 = SELECT
    res.send(mapFields(fmobject, clientname));
});

// Create an FM object
router.post('/', auth(co.permissions.BIM_FMOBJECT, 'w', co.modules.fmobjects), async(req, res) => {
    var clientname = req.user.clientname;
    var fmobject = req.body;
    if (!fmobject || Object.keys(fmobject).length < 1) {
        return res.sendStatus(400);
    }
    var fmobjecttoinsert = { name: uuidv4() };
    if (fmobject.name) fmobjecttoinsert.label = fmobject.name;
    if (fmobject.type) fmobjecttoinsert.fmobjecttypename = fmobject.name;
    if (fmobject.areatype) fmobjecttoinsert.areatypename = fmobject.areatype;
    if (fmobject.f) fmobjecttoinsert.f = fmobject.name;
    if (fmobject.bgf) fmobjecttoinsert.bgf = fmobject.name;
    if (fmobject.usagestate) fmobjecttoinsert.areausagestatename = fmobject.name;
    if (fmobject.nrf) fmobjecttoinsert.nrf = fmobject.name;
    if (fmobject.nuf) fmobjecttoinsert.nuf = fmobject.name;
    if (fmobject.tf) fmobjecttoinsert.tf = fmobject.name;
    if (fmobject.vf) fmobjecttoinsert.vf = fmobject.name;
    if (fmobject.parentId && !(await Db.getDynamicObject(clientname, co.collections.fmobjects.name, fmobject.parentId))) return res.sendStatus(400);
    fmobjecttoinsert.parentfmobjectname = fmobject.parentId ? fmobject.parentId : null;
    if (fmobject.previewImageId && !(await Db.getDynamicObject(clientname, co.collections.documents.name, fmobject.previewImageId))) return res.sendStatus(400);
    fmobjecttoinsert.previewimagedocumentname = fmobject.previewImageId ? fmobject.previewImageId : null;
    await Db.insertDynamicObject(clientname, co.collections.fmobjects.name, fmobjecttoinsert);
    res.send(mapFields(fmobjecttoinsert, clientname));
});

// Update an FM object
router.put('/:id', auth(co.permissions.BIM_FMOBJECT, 'w', co.modules.fmobjects), validateSameClientId(co.collections.fmobjects.name), async(req, res) => {
    var clientname = req.user.clientname;
    var fmobject = req.body;
    if (!fmobject) return res.sendStatus(400);
    var updateset = { };
    if (fmobject.name) updateset.label = fmobject.name;
    if (fmobject.type) updateset.fmobjecttypename = fmobject.type;
    if (fmobject.areatype) updateset.areatypename = fmobject.areatype;
    if (fmobject.f) updateset.f = fmobject.f;
    if (fmobject.bgf) updateset.bgf = fmobject.bgf;
    if (fmobject.usagestate) updateset.areausagestatename = fmobject.usagestate;
    if (fmobject.nrf) updateset.nrf = fmobject.nrf;
    if (fmobject.nuf) updateset.nuf = fmobject.nuf;
    if (fmobject.tf) updateset.tf = fmobject.tf;
    if (fmobject.vf) updateset.vf = fmobject.vf;
    if (fmobject.parentId && !(await Db.getDynamicObject(clientname, co.collections.fmobjects.name, fmobject.parentId))) return res.sendStatus(400);
    if (typeof(fmobject.parentId) !== "undefined") updateset.parentfmobjectname = fmobject.parentId ? fmobject.parentId : null;
    if (fmobject.previewImageId && !(await Db.getDynamicObject(clientname, co.collections.documents.name, fmobject.previewImageId))) return res.sendStatus(400);
    if (typeof(fmobject.previewImageId) !== "undefined") updateset.previewimagedocumentname = fmobject.previewImageId ? fmobject.previewImageId : null;
    if (Object.keys(updateset).length < 1) return res.sendStatus(400);
    var result = await Db.updateDynamicObject(clientname, co.collections.fmobjects.name, req.params.id, updateset);
    if (result.rowCount < 1) return res.sendStatus(404);
    return res.send(mapFields(updateset, req.user.clientname));
});

// Remove FM object and its children recursively
var removeFmObject = async(clientname, fmobjectname) => {
    var subelements = await Db.getDynamicObjects(clientname, co.collections.fmobjects.name, { parentfmobjectname: fmobjectname });
    for (var i = 0; i < subelements.length; i++) {
        await removeFmObject(clientname, subelements[i].name);
    }
    // Delete the FM object itself
    await Db.deleteDynamicObject(clientname, co.collections.fmobjects.name, fmobjectname);
    await rh.deleteAllRelationsForEntity(clientname, co.collections.fmobjects.name, fmobjectname);
    await dah.deleteAllDynamicAttributeValuesForEntity(clientname, fmobjectname);
};

// Delete an FM object
router.delete('/:id', auth(co.permissions.BIM_FMOBJECT, 'w', co.modules.fmobjects), validateSameClientId(co.collections.fmobjects.name), async(req, res) => {
    await removeFmObject(req.user.clientname, req.params.id);
    res.sendStatus(204);
});

module.exports = router;
