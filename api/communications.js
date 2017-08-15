/**
 * CRUD API for person communication assignments
 * 
 * communications {
 *  _id
 *  personId,
 *  medium 
 *  type
 * }
 */

var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var co = require('../utils/constants');
var dah = require('../utils/dynamicAttributesHelper');

/**
 List all communications for a given person
 **/
router.get('/forPerson/:id', auth(co.permissions.CRM_PERSONS, 'r', co.modules.businesspartners), validateId, validateSameClientId(co.collections.persons.name), (req, res) => {
    req.db.get(co.collections.persons.name).findOne(req.params.id).then((person) => {
        if (!person) {
            return Promise.reject();
        }
        return req.db.get(co.collections.communications.name).find({personId:person._id});
    }).then((allPersoncommunications) => {
        res.send(allPersoncommunications);
    }, () => {
        res.sendStatus(400);
    });
});

/**
 * Get single person communication with given id
 */
router.get('/:id', auth(co.permissions.CRM_PERSONS, 'r', co.modules.businesspartners), validateId, validateSameClientId(co.collections.communications.name), (req, res) => {
    req.db.get(co.collections.communications.name).findOne(req.params.id).then((communication) => {
        res.send(communication);
    });
});

/**
 * Create a new communication and assign it to a person
 */
router.post('/', auth(co.permissions.CRM_PERSONS, 'w', co.modules.businesspartners), function(req, res) {
    var comm=req.body;
    if(!comm || Object.keys(comm).lenght<1 || !comm.personId || !validateId.validateId(comm.personId)){
        return res.sendStatus(400);
    }
    comm.personId = monk.id(comm.personId); // Make it a real id
    // Assigning the Address with a specific patrner 
    req.db.get(co.collections.persons.name).findOne({_id:comm.personId,clientId:req.user.clientId}).then((person)=>
    { 
        if (!person) {
            return Promise.reject();
        }
        delete comm._id; // generating address id automatically 
        comm.clientId = req.user.clientId; // Make it a real id
        return req.db.insert(co.collections.communications.name, comm);
    }).then((insertedComm)=> {
        res.send(insertedComm);
    }, () => {
        res.sendStatus(400);
    });
});

/**
Updating person communication.
 **/
router.put('/:id', auth(co.permissions.CRM_PERSONS, 'w', co.modules.businesspartners), validateId, validateSameClientId(co.collections.communications.name), function(req, res){
    var communication = req.body;
    if(!communication || Object.keys(communication).length < 1 ){
        return res.sendStatus(400);
    }
    delete communication._id;
    delete communication.personId;
    delete communication.clientId;
    if (Object.keys(communication).length < 1) {
        return res.sendStatus(400);
    }
    req.db.update(co.collections.communications.name, req.params.id, { $set: communication }).then((updatedComm) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
        res.send(updatedComm);
    });
});

/**
 * Delete persons communication
 */
router.delete('/:id', auth(co.permissions.CRM_PERSONS, 'w', co.modules.businesspartners), validateId, validateSameClientId(co.collections.communications.name), function(req, res) {
    var id = monk.id(req.params.id);
    req.db.remove(co.collections.communications.name, req.params.id).then((result) => {
        return dah.deleteAllDynamicAttributeValuesForEntity(id);
    }).then(() => {
        res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
    });
});

module.exports = router;
