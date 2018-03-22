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
    var allfmobjects = (await Db.query(req.user.clientname, `SELECT name AS _id, label AS name, fmobjecttypename AS type, parentfmobjectname AS "parentId", ARRAY[]::text[] as children, f, bgf, nrf, nuf, tf, vf FROM fmobjects ORDER BY label;`)).rows;
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

module.exports = router;
