var router = require('express').Router(); //Express Router to handle all of our API routes
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var async = require('async');
var bcryptjs = require('bcryptjs');
var constants = require('../utils/constants');

router.get('/forIds', auth(false, false, 'persons'), (req, res) => {
    // Zuerst Berechtigung prüfen
    auth.canAccess(req.user._id, 'PERMISSION_CRM_PERSONS', 'r', 'persons', req.db).then(function(accessAllowed) {
        if (!accessAllowed) {
            return res.send([]);
        }
        if (!req.query.ids) {
            return res.send([]);
        }
        var ids = req.query.ids.split(',').filter(validateId.validateId).map(function(id) { return monk.id(id); }); // Nur korrekte IDs verarbeiten
        var clientId = req.user.clientId; // Nur die Termine des Mandanten des Benutzers raus holen.
        var userId = req.user._id;
        req.db.get('persons').find({
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
router.get('/', auth('PERMISSION_CRM_PERSONS', 'r') , (req, res) =>{
    var clientId = req.user.clientId;
     req.db.get('persons').find({clientId: clientId}).then((persons)=> {
        return res.send(persons);
    })  ;
});


/**
 * Get single person with given id
*/
router.get('/:id', auth('PERMISSION_ADMINISTRATION_CLIENT', 'r','persons'), validateId, validateSameClientId('persons'),(req, res) => {
    req.db.get('persons').findOne(req.params.id, req.query.fields).then((person) => {
        res.send(person);
    });
}); 


/**
 * creating business person details
 */
router.post('/', auth('PERMISSION_CRM_PERSONS', 'w','persons'), function(req, res){
    var person = req.body;
    if (!person || Object.keys(person).length < 1) {
        return res.sendStatus(400);
    }
    delete person._id;
    person.clientId = req.user.clientId;
    req.db.insert('persons', person).then((insertedPerson) => {
        return res.send(insertedPerson);
    });
});

/**
 * Updating person details
 */
router.put('/:id' , auth('PERMISSION_CRM_PERSONS', 'w','persons'),validateId,validateSameClientId('persons'),function(req,res){
var person = req.body;
if(!person || Object.keys(person).length < 1) {
    return res.sendStatus(400);
}
delete person._id;
if (Object.keys(person).length<1){
    req.db.get('persons').findOne(req.params.id, req.query.fields).then((person) => {
        if(!person){

            // Person with given ID not found
             return res.sendStatus(404);
         }
            return res.send(person);
    });
         
}else {
        req.db.update('persons', req.params.id, { $set: person }).then((updatedPerson) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
            res.send(updatedPerson);
        });
    }


});

/**
 * Delete person
 */

router.delete('/:id', auth('PERMISSION_CRM_PERSONS', 'w','persons'),validateId,validateSameClientId('persons'), function(req,res){
    var personId= monk.id(req.params.id);
    req.db.remove('relations', { $or: [ {id1:personId}, {id2:personId} ] }).then(function() {
        return req.db.remove('persons', personId)
    }).then(function() {
        res.sendStatus(204);
    });
});

module.exports = router;
