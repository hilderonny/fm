/**
 * CRUD API for busniess partner management
 * 
 * partner {
 *  _id
 *  name
 * client_id (id of client of user which created the folder)
 * 
 * }
 */

var router = require('express').Router(); //Express Router to handle all of our API routes
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var monk = require('monk');
var async = require('async');
var bcryptjs = require('bcryptjs');
var constants = require('../utils/constants');

/**
 * List of  all partners
 */
router.get('/', auth('PERMISSION_CRM_BUSINESSPARTNERS', 'r') , (req, res) =>{
    var clientId = req.user.clientId;
  //  req.db.get('partners').find({},req.query.fields).then((partners)=>
     req.db.get('partners').find({clientId: clientId}).then((partners)=> {
        return res.send(partners);
    })  ;
});



/**
 * Get single partner with given id
 */
router.get('/:id', auth('PERMISSION_ADMINISTRATION_CLIENT', 'r'), validateId, (req, res) => {
    req.db.get('partners').findOne(req.params.id, req.query.fields).then((partner) => {
        if (!partner) {
            // partner with given ID not found
            return res.sendStatus(404);
        }
        return res.send(partner);
    });
});


/**
 * creating business partner details
 */
router.post('/', auth('PERMISSION_CRM_BUSINESSPARTNERS', 'w'), function(req, res){
    var partner = req.body;
    if (!partner || Object.keys(partner).length < 1) {
        return res.sendStatus(400);
    }
    delete partner._id;
    partner.clientId = req.user.clientId;
    req.db.insert('partners', partner).then((insertedPartner) => {
        return res.send(insertedPartner);
    });
});

/**
 * Updating partner details
 */

router.put('/:id' , auth('PERMISSION_CRM_BUSINESSPARTNERS', 'w'),validateId,function(req,res){
var partner = req.body;
if(!partner || Object.keys(partner).length < 1) {
    return res.sendStatus(400);
}
delete partner._id;
if (Object.keys(partner).length<1){
    req.db.get('partners').findOne(req.params.id, req.query.fields).then((partner) => {
        if(!partner){

            // Partner with given ID not found
             return res.sendStatus(404);
         }
            return res.send(partner);
    });
         
}else {
        req.db.update('partners', req.params.id, { $set: partner }).then((updatedParnter) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
            if (!updatedParnter || updatedParnter.lastErrorObject) {
                // Client with given ID not found
                return res.sendStatus(404);
            }
            return res.send(updatedParnter);
        });
    }


});


/**
 * Delete partner
 */

router.delete('/:id', auth('PERMISSION_CRM_BUSINESSPARTNERS', 'w'),validateId, function(req,res){
    var partnerId= monk.id(req.params.id);
    var dependentCollections = constants.collections;
    async.eachSeries(dependentCollections, (dependentCollection, callback)=>{
        req.db.remove(dependentCollection, {partnerId: partnerId}).then((res)=>{
            callback();
        });
    }, (err)=>{
        req.db.remove('partners', req.params.id).then((result)=>{
            if(result.result.n <1){
                return res.sendStatus(404);
            } 
            res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
        });
    });
});





module.exports = router;




