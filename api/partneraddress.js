/**
 * CRUD API for partner address assignments
 * 
 * partneraddress {
 *  _id
 *  partnerId,
 *  description 
 *  street
 *  postcode
 *  city
 *  addresstype
 * }
 */

var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var monk = require('monk');
var fs = require('fs');

/**
 * Create a new address and assign it to a partner
 */
router.post('/', auth('PERMISSION_CRM_BUSINESSPARTNERS', 'w'), function(req, res) {
  var address=req.body;
  if(!address || Object.keys(address).lenght<1 || !address.partnerId){
      return res.send(400);
  }
   // Assigning the Address with a specific patrner 
req.db.get('partners').findOne(address.partnerId).then((partner)=>
{ 
    if (!partner) {
            return res.sendStatus(400);
        }
    delete address._id; // generating address id automatically 
    address.partnerId = partner._id; // partner id 
    req.db.insert('addresses', address).then ((insertedAddress)=> {
    return res.send(insertedAddress);
    
    });

});

});


/**
 * Get single partner address with given id
 */
router.get('/:id', auth('PERMISSION_CRM_BUSINESSPARTNERS', 'r'), validateId, (req, res) => {
    req.db.get('addresses').findOne(req.params.id, req.query.fields).then((address) => {
        if (!address) {
            // address with given ID not found
            return res.sendStatus(404);
        }
        return res.send(address);
    });
});

/**
 List all parnter address of a given partner.
 **/
router.get('/', auth('PERMISSION_CRM_BUSINESSPARTNERS', 'r', 'partners'), (req, res) => {
    if (!req.query.partnerId || !validateId.validateId(req.query.partnerId)) {
        return res.sendStatus(400);
    }
    req.db.get('partners').findOne(req.query.partnerId).then((partner) => {
        if (!partner) {
            return res.sendStatus(400);
        }
        //var id= req.query.partnerId;
            req.db.get('addresses').find({partnerId:partner._id}, req.query.fields).then((addresses) => {
            return res.send(addresses);
        });
        
    });
});

/**
Updating business partner address.
 **/
router.put('/:id', auth('PERMISSION_CRM_BUSINESSPARTNERS', 'w', 'partners'), validateId, function(req, res){
    var address = req.body;
    if(!address || Object.keys(address).length < 1 ){
        return res.sendStatus(400);
    }
    delete address._id;
    delete address.partnerId;
     req.db.update('addresses', req.params.id, { $set: address }).then((updatedAddress) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
            if (!updatedAddress || updatedAddress.lastErrorObject) {
                // Address with given ID not found
                return res.sendStatus(404);
            }
            return res.send(updatedAddress);
        });
});


/**
 * Delete partner address
 */
router.delete('/:id', auth('PERMISSION_CRM_BUSINESSPARTNERS', 'w', 'partners'), validateId, function(req, res) {
    req.db.remove('addresses', req.params.id).then((result) => {
        if (result.result.n < 1) {
            return res.sendStatus(404);
        }
        res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
    });
});



module.exports = router;

