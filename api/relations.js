/**
 * CRUD API for relations between objects. These are no separate objects.
 * Relations are modelled in the corresponding objects in the relations-array.
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');

/**
 * Create a relation between two objects. Parameters:
 * type1: Name of the related object type 1 (e.g. 'activities') 
 * type2: Name of the related object type 2 (e.g. 'fmobjects')
 * id1: ID of the object of type type1 
 * id2: ID of the object of type type2 
 */  
router.post('/', auth(false, false, 'base'), (req, res) => {
    var relation = req.body;
    if (!relation || !relation.type1 || !relation.type2 || !relation.id1 || !relation.id2 || !validateId.validateId(relation.id1) || !validateId.validateId(relation.id2)) {
        return res.sendStatus(400);
    }
    var clientId = req.user.clientId ? req.user.clientId.toString() : null;
    req.db.get(relation.type1).findOne(relation.id1).then((object1) => {
        if (!object1) {
            return res.sendStatus(404);
        }
        var object1ClientId = object1.clientId ? object1.clientId.toString() : null;
        if (object1ClientId !== clientId) {
            return res.sendStatus(403);
        }
        req.db.get(relation.type2).findOne(relation.id2).then((object2) => {
            if (!object2) {
                return res.sendStatus(404);
            }
            var object2ClientId = object2.clientId ? object2.clientId.toString() : null;
            if (object2ClientId !== clientId) {
                return res.sendStatus(403);
            }
            object1.relations = object1.relations || [];
            if (object1.relations.indexOf(relation.id2) < 0) {
                object1.relations.push(relation.id2);
            }
            object2.relations = object2.relations || [];
            if (object2.relations.indexOf(relation.id1) < 0) {
                object2.relations.push(relation.id1);
            }
            req.db.update(relation.type1, object1._id, { $set: object1 }).then(() => {
                req.db.update(relation.type2, object2._id, { $set: object2 }).then(() => {
                    return res.sendStatus(200);
                });
            });
        });
    });
});

/**
 * Delete a relation between two objects. Parameters:
 * type1: Name of the related object type 1 (e.g. 'activities') 
 * type2: Name of the related object type 2 (e.g. 'fmobjects')
 * id1: ID of the object of type type1 
 * id2: ID of the object of type type2 
 */  
router.delete('/', auth(false, false, 'base'), (req, res) => {
    var relation = req.query;
    if (!relation || !relation.type1 || !relation.type2 || !relation.id1 || !relation.id2 || !validateId.validateId(relation.id1) || !validateId.validateId(relation.id2)) {
        return res.sendStatus(400);
    }
    var clientId = req.user.clientId.toString();
    req.db.get(relation.type1).findOne(relation.id1).then((object1) => {
        if (!object1) {
            return res.sendStatus(404);
        }
        if (!object1.clientId || clientId !== object1.clientId.toString()) {
            return res.sendStatus(403);
        }
        req.db.get(relation.type2).findOne(relation.id2).then((object2) => {
            if (!object2) {
                return res.sendStatus(404);
            }
            object1.relations = object1.relations || [];
            var index1 = object1.relations.indexOf(relation.id2);
            if (index1 < 0) {
                return res.sendStatus(404);
            } 
            object1.relations.splice(index1, 1);
            object2.relations = object2.relations || [];
            var index2 = object2.relations.indexOf(relation.id1);
            if (index2 < 0) {
                return res.sendStatus(404);
            } 
            object2.relations.splice(index2, 1);
            req.db.update(relation.type1, object1._id, { $set: object1 }).then(() => {
                req.db.update(relation.type2, object2._id, { $set: object2 }).then(() => {
                    return res.sendStatus(200);
                });
            });
        });
    });
});

module.exports = router;
