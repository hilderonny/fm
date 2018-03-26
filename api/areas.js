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

router.get('/', auth(co.permissions.BIM_AREAS, 'r', co.modules.areas), async(req, res) => {
    var clientname = req.user.clientname;
    var relevantdatatypes = (await Db.query(clientname, "SELECT * FROM datatypes WHERE 'fmobjects' = ANY (lists);")).rows;

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
        fmmap[fmo._parententityname]._children.push(fmo);
    });
    res.send(toplevelobjects);

    // var allfmobjects = (await Db.query(clientname, `SELECT name AS _id, label AS name, fmobjecttypename AS type, parentfmobjectname AS "parentId", ARRAY[]::text[] as children, f, bgf, nrf, nuf, tf, vf FROM fmobjects ORDER BY label;`)).rows;
    // var fmmap = {};
    // allfmobjects.forEach((fmo) => {
    //     fmmap[fmo._id] = fmo;
    // });
    // var toplevelobjects = [];
    // allfmobjects.forEach((fmo) => {
    //     if (!fmo.parentId) {
    //         toplevelobjects.push(fmo);
    //         return;
    //     }
    //     fmmap[fmo.parentId].children.push(fmo);
    // });
    // res.send(toplevelobjects);
});

module.exports = router;
