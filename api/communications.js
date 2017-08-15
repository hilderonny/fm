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
var fs = require('fs');

/**
 * Create a new communication and assign it to a person
 */
router.post('/', auth('PERMISSION_CRM_PERSONS', 'w', 'communications'), function(req, res) {
  var comm=req.body;
  if(!comm || Object.keys(comm).lenght<1 || !comm.personId){
      return res.send(400);
  }
   // Assigning the Address with a specific patrner 
req.db.get('persons').findOne(comm.personId).then((person)=>
{ 
    if (!person) {
            return res.sendStatus(400);
        }
    delete comm._id; // generating address id automatically 
    comm.personId = person._id; // partner id 
    req.db.insert('communications', comm).then ((insertedComm)=> {
    return res.send(insertedComm);
    
    });

});

});
/**
 * Get single person communication with given id
 */
router.get('/:id', auth('PERMISSION_CRM_PERSONS', 'r','communications'), validateId,validateSameClientId('communications'), (req, res) => {
    req.db.get('communications').findOne(req.params.id, req.query.fields).then((communication) => {
       res.send(communication);
    });
});

/**
 List all parnter address of a given partner.
 **/
router.get('/', auth('PERMISSION_CRM_PERSONS', 'r', 'persons'), (req, res) => {
    if (!req.query.personId || !validateId.validateId(req.query.personId)) {
        return res.sendStatus(400);
    }
    req.db.get('persons').findOne(req.query.personId).then((person) => {
        if (!person) {
            return res.sendStatus(400);
        }
        //var id= req.query.partnerId;
            req.db.get('communications').find({personId:person._id}, req.query.fields).then((allPersoncommunications) => {
            return res.send(allPersoncommunications);
        });
        
    });
});

/**
Updating person communication.
 **/
router.put('/:id', auth('PERMISSION_CRM_PERSONS', 'w', 'communications'), validateId, validateSameClientId('communications'), function(req, res){
    var communication = req.body;
   // console.log(communication);
    if(!communication || Object.keys(communication).length < 1 ){
        return res.sendStatus(400);
    }
    delete communication._id;
    delete communication.personId;
     req.db.update('communications', req.params.id, { $set: communication }).then((updatedComm) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
         res.send(updatedComm);
    });
});


/**
 * Delete persons communication
 */
router.delete('/:id', auth('PERMISSION_CRM_PERSONS', 'w', 'communications'), validateId, validateSameClientId('communications'), function(req, res) {
    req.db.remove('communications', req.params.id).then((result) => {
        res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
    });
});


module.exports = router;

