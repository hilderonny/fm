/**
 * {
 *  firstname,
 *  lastname,
 *  description
 * }
 */
var router = require('express').Router(); //Express Router to handle all of our API routes
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateId');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var async = require('async');
var bcryptjs = require('bcryptjs');
var co = require('../utils/constants');
var dah = require('../utils/dynamicAttributesHelper');

router.get('/forIds', auth(false, false, co.modules.businesspartners), (req, res) => {
    // Zuerst Berechtigung prüfen
    auth.canAccess(req.user._id, co.permissions.CRM_PERSONS, 'r', co.modules.businesspartners, req.db).then(function(accessAllowed) {
        if (!accessAllowed) {
            return res.send([]);
        }
        if (!req.query.ids) {
            return res.send([]);
        }
        var ids = req.query.ids.split(',').filter(validateId.validateId).map(function(id) { return monk.id(id); }); // Nur korrekte IDs verarbeiten
        var clientId = req.user.clientId; // Nur die Termine des Mandanten des Benutzers raus holen.
        var userId = req.user._id;
        req.db.get(co.collections.persons.name).find({
            _id: { $in: ids },
            clientId: clientId,
        }).then((persons) => {
            res.send(persons);
        });
    });
});

/**
 * List of  all persons
 */
router.get('/', auth(co.permissions.CRM_PERSONS, 'r', co.modules.businesspartners) , (req, res) =>{
    var clientId = req.user.clientId;
     req.db.get(co.collections.persons.name).find({clientId: clientId}).then((persons)=> {
        return res.send(persons);
    })  ;
});


/**
 * Get single person with given id
*/
router.get('/:id', auth(co.permissions.CRM_PERSONS, 'r', co.modules.businesspartners), validateId, validateSameClientId(co.collections.persons.name),(req, res) => {
    req.db.get(co.collections.persons.name).findOne(req.params.id, req.query.fields).then((person) => {
        res.send(person);
    });
}); 


/**
 * creating business person details
 */
router.post('/', auth(co.permissions.CRM_PERSONS, 'w', co.modules.businesspartners), function(req, res){
    var person = req.body;
    if (!person || Object.keys(person).length < 1) {
        return res.sendStatus(400);
    }
    delete person._id;
    person.clientId = req.user.clientId;
    req.db.insert(co.collections.persons.name, person).then((insertedPerson) => {
        return res.send(insertedPerson);
    });
});

/**
 * Updating person details
 */
router.put('/:id' , auth(co.permissions.CRM_PERSONS, 'w', co.modules.businesspartners),validateId,validateSameClientId(co.collections.persons.name),function(req,res){
    var person = req.body;
    if(!person || Object.keys(person).length < 1) {
        return res.sendStatus(400);
    }
    delete person._id;
    delete person.clientId;
    if (Object.keys(person).length < 1) {
        return res.sendStatus(400);
    }
    req.db.update(co.collections.persons.name, req.params.id, { $set: person }).then((updatedPerson) => {
        res.send(updatedPerson);
    });
});

/**
 * Delete person
 */

router.delete('/:id', auth(co.permissions.CRM_PERSONS, 'w', co.modules.businesspartners),validateId,validateSameClientId(co.collections.persons.name), function(req,res){
    var personId= monk.id(req.params.id);
    req.db.remove(co.collections.relations.name, { $or: [ {id1:personId}, {id2:personId} ] }).then(function() {
        return req.db.remove(co.collections.communications.name, {personId:personId});
    }).then(function() {
        return req.db.remove(co.collections.persons.name, personId)
    }).then(() => {
        return dah.deleteAllDynamicAttributeValuesForEntity(personId);
    }).then(function() {
        res.sendStatus(204);
    });
});

module.exports = router;
