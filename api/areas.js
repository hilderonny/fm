/**
 * CRUD API for fm object management
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');
var Db = require("../utils/db").Db;

/**
 * Flächenübersicht mit summierter Grundfläche
 */
router.get('/', auth(co.permissions.BIM_AREAS, 'r', co.modules.areas), async(req, res) => {
    var clientname = req.user.clientname;
    // Only those datatypes which are relevant for list "areas_hierarchy"
    var relevantdatatypes = (await Db.query(clientname, "SELECT * FROM datatypes WHERE 'areas_hierarchy' = ANY (lists);")).rows;

    var allfmobjects = [];
    var fmmap = {};
    var toplevelobjects = [];

    for (var i = 0; i < relevantdatatypes.length; i++) {
        var datatype = relevantdatatypes[i];
        var datatypename = Db.replaceQuotesAndRemoveSemicolon(datatype.name);
        var entities = (await Db.query(clientname, `SELECT '${datatypename}' AS _datatypename, '${Db.replaceQuotes(datatype.icon)}' AS _icon, e.*, r.name1 AS _parententityname FROM ${datatypename} e LEFT JOIN (SELECT * FROM relations WHERE relationtypename = 'parentchild') r on r.name2 = e.name;`)).rows;
        entities.forEach(e => {
            fmmap[e.name] = e;
            allfmobjects.push(e);
            if (!e._parententityname) toplevelobjects.push(e);
            e._children = [];
        });
    }
    allfmobjects.forEach(fmo => {
        if (!fmo._parententityname) return;
        var parententity = fmmap[fmo._parententityname];
        if (!parententity) return;
        parententity._children.push(fmo);
    });
    res.send(toplevelobjects);
});

/**
 * Flächen nach Nutzungsart DIN277 (AVTFM-158)
 */
router.get('/din277/:areatypename', auth(co.permissions.BIM_AREAS, 'r', co.modules.areas), async(req, res) => {
    var clientname = req.user.clientname;
    var areatypename = Db.replaceQuotes(req.params.areatypename);
    var query = `
        WITH RECURSIVE get_path(name, depth) AS (
            (SELECT name, 0 FROM areatypes WHERE name='${areatypename}')
            UNION
            (SELECT
                relations.name2,
                get_path.depth + 1 
            FROM relations 
            JOIN get_path 
            ON relations.name1 = get_path.name
            WHERE relations.relationtypename = 'parentchild'
            AND relations.datatype2name='areatypes'
            AND get_path.depth < 64
            )
        )
        SELECT DISTINCT
        areas.*
        FROM get_path
        JOIN areas ON areas.areatypename = get_path.name
        ;
    `;
    var areas = (await Db.query(clientname, query)).rows;
    if (areas.length < 1) return res.send([]);
    var areasdefinition = (await Db.getdatatypes(clientname))["areas"];
    var areatypes = {};
    (await Db.getDynamicObjects(clientname, "areatypes")).forEach(atd => {
        areatypes[atd.name] = atd;
    });
    var result = areas.map(a => {
        return {
            name: a.name,
            label: a[areasdefinition.titlefield] || a.name,
            areatypenumber: areatypes[a.areatypename].number,
            f: a.f
        }
    });
    res.send(result);
});

module.exports = router;
