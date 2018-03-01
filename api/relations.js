/**
 * CRUD API for relations between objects. These are no separate objects.
 * Relations are modelled in the corresponding objects in the relations-array.
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateSameClientId = require('../middlewares/validateSameClientId');
var co = require('../utils/constants');
var dah = require('../utils/dynamicAttributesHelper');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;

/**
 * Sucht alle Verknüpfungen zu einer Entität einer bestimmten ID und liefert diese als Liste
 * zurück. Dabei ist egal, ob die Entität in type1 oder type2 definiert ist.
 */
router.get('/:entityType/:id', auth(false, false, co.modules.base), async(req, res) => {
    var relations = (await Db.query(req.user.clientname, `SELECT * FROM relations WHERE (name1='${req.params.id}' AND datatype1name='${req.params.entityType}') OR (name2='${req.params.id}' AND datatype2name='${req.params.entityType}');`)).rows;
    res.send(relations.map((r) => { return {
        _id: r.name,
        id1: r.name1,
        type1: r.datatype1name,
        id2: r.name2,
        type2: r.datatype2name,
    }}));
});

/**
 * Create a relation between two objects. Parameters:
 * type1: Name of the related object type 1 (e.g. 'activities') 
 * type2: Name of the related object type 2 (e.g. 'fmobjects')
 * id1: ID of the object of type type1 
 * id2: ID of the object of type type2
 * TODO: Alte Verknüpfungen aus Terminen und FM-Objekten raus nehmen 
 */  
router.post('/', auth(false, false, co.modules.base), async(req, res) => {
    var clientname = req.user.clientname;
    var relation = req.body;
    if (!relation || !relation.type1 || !relation.type2 || !relation.id1 || !relation.id2) return res.sendStatus(400);
    try {
        if ((await Db.query(clientname, `SELECT 1 FROM ${relation.type1} WHERE name='${relation.id1}';`)).rowCount < 1) return res.sendStatus(400);
        if ((await Db.query(clientname, `SELECT 1 FROM ${relation.type2} WHERE name='${relation.id2}';`)).rowCount < 1) return res.sendStatus(400);
    } catch(e) {
        // When datatypes do not exist, maybe at other client?
        return res.sendStatus(400);
    }
    var relationtoinsert = {
        name: uuidv4(),
        name1: relation.id1,
        datatype1name: relation.type1,
        name2: relation.id2,
        datatype2name: relation.type2,
    }
    await Db.insertDynamicObject(clientname, co.collections.relations.name, relationtoinsert);
    relation._id = relationtoinsert.name;
    res.send(relation);
});

/**
 * Löscht eine Verknüpfung mit einer bestimmten ID
 */  
router.delete('/:id', auth(false, false, co.modules.base), validateSameClientId(co.collections.relations.name), async(req, res) => {
    await Db.deleteDynamicObject(req.user.clientname, co.collections.relations.name, req.params.id);
    await dah.deleteAllDynamicAttributeValuesForEntity(req.user.clientname, req.params.id);
    res.sendStatus(204);
});

module.exports = router;
