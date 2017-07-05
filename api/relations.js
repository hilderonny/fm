/**
 * CRUD API for relations between objects. These are no separate objects.
 * Relations are modelled in the corresponding objects in the relations-array.
 * TODO: In separate Tabelle verschieben
 * TODO: Update-Script, welches die Relationen aus den Objekten heraus nimmt und in die neue Tabelle verschiebt
 * TODO: Löschen von Objekten soll auch Relationen löschen. Mechanismus ausdenken.
 * TODO: Tests für allen möglichen Mist bauen
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var co = require('../utils/constants');

/**
 * Sucht alle Verknüpfungen zu einer Entität einer bestimmten ID und liefert diese als Liste
 * zurück. Dabei ist egal, ob die Entität in type1 oder type2 definiert ist.
 */
router.get('/:entityType/:id', auth(false, false, 'base'), validateId, function(req, res) {
    var entityType = req.params.entityType;
    var id = monk.id(req.params.id);
    req.db.get(co.collections.relations).find({$or: [
        { $and: [ { type1: entityType, id1: id, clientId: req.user.clientId } ] },
        { $and: [ { type2: entityType, id2: id, clientId: req.user.clientId } ] }
    ]}).then(function(relations) {
        res.send(relations);
    });
});

/**
 * Create a relation between two objects. Parameters:
 * type1: Name of the related object type 1 (e.g. 'activities') 
 * type2: Name of the related object type 2 (e.g. 'fmobjects')
 * id1: ID of the object of type type1 
 * id2: ID of the object of type type2
 * TODO: Alte Verknüpfungen aus Terminen und FM-Objekten raus nehmen 
 */  
router.post('/', auth(false, false, 'base'), (req, res) => {
    var relation = req.body;
    if (!relation || !relation.type1 || !relation.type2 || !relation.id1 || !relation.id2 || !validateId.validateId(relation.id1) || !validateId.validateId(relation.id2)) {
        return res.sendStatus(400);
    }
    relation.id1 = monk.id(relation.id1);
    relation.id2 = monk.id(relation.id2);
    var clientId = req.user.clientId;
    // Prüfen, ob die Quell- und Zielobjekte existieren
    req.db.get(relation.type1).findOne(relation.id1).then((object1) => {
        if (!object1) { // Quell-Objekt existiert nicht
            return res.sendStatus(404);
        }
        //        
        if (`${object1.clientId}` !== `${clientId}`) { // Quell-Objekt gehört nicht zum Mandanten des angemeldeten Benutzers
            return res.sendStatus(403);
        }
        req.db.get(relation.type2).findOne(relation.id2).then((object2) => {
            if (!object2) { // Ziel-Objekt existiert nicht
                return res.sendStatus(404);
            }
            if (`${object2.clientId}` !== `${clientId}`) {
                return res.sendStatus(403); // Ziel-Objekt gehört nicht zum Mandanten des angemeldeten Benutzers
            }
            // Der Verknüpfung wird die ID des Mandanten des Benutzers angehängt, um beim Löschen die Zugehörigkeit zu prüfen
            relation.clientId = clientId;
            // Verknüpfung anlegen. Vorher gucken, ob es die nicht schon gibt
            req.db.get('relations').find({$or: [
                { $and: [ { type1: relation.type1, id1: relation.id1, type2: relation.type2, id2: relation.id2 } ] },
                { $and: [ { type2: relation.type1, id2: relation.id1, type1: relation.type2, id1: relation.id2 } ] }
            ]}).then(function(relations) {
                if (relations.length > 0) {
                    res.send(relations[0]);
                } else {
                    req.db.insert('relations', relation).then((insertedRelation) => {
                        res.send(insertedRelation);
                    });
                }
            });
        });
    });
});

/**
 * Löscht eine Verknüpfung mit einer bestimmten ID
 */  
router.delete('/:id', auth(false, false, 'base'), validateId, validateSameClientId('relations'), function(req, res) {
    req.db.remove('relations', req.params.id).then((result) => {
        res.sendStatus(204);
    });
});


module.exports = router;
