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
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var async = require('async');
var bcryptjs = require('bcryptjs');
var constants = require('../utils/constants');

/**
 * Liefert eine Liste von Partners für die per URL übergebenen IDs. Die IDs müssen kommagetrennt sein.
 * Die Berechtigungen werden hier nicht per auth überprüft, da diese API für die Verknüpfungen verwendet
 * wird und da wäre es blöd, wenn ein 403 zur Neuanmeldung führte. Daher wird bei fehlender Berechtigung
 * einfach eine leere Liste zurück gegeben.
 * @example
 * $http.get('/api/busniesspartner/forIds?ids=ID1,ID2,ID3')...
 */
router.get('/forIds', auth(false, false, 'busniesspartner'), (req, res) => {
    // Zuerst Berechtigung prüfen
    auth.canAccess(req.user._id, 'PERMISSION_CRM_BUSINESSPARTNERS', 'r', 'busniesspartner', req.db).then(function(accessAllowed) {
        if (!accessAllowed) {
            return res.send([]);
        }
        if (!req.query.ids) {
            return res.send([]);
        }
        var ids = req.query.ids.split(',').filter(validateId.validateId).map(function(id) { return monk.id(id); }); // Nur korrekte IDs verarbeiten
        var clientId = req.user.clientId; // Nur die Termine des Mandanten des Benutzers raus holen.
        var userId = req.user._id;
        req.db.get('partners').find({
            _id: { $in: ids },
            clientId: clientId,
        }).then((partners) => {
            res.send(partners);
        });
    });
});

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
router.get('/:id', auth('PERMISSION_CRM_BUSINESSPARTNERS', 'r', 'busniesspartner'), validateId,validateSameClientId('partners'), (req, res) => {
    req.db.get('partners').findOne(req.params.id, req.query.fields).then((partner) => {
        res.send(partner);
    });
});
/**
 * creating business partner details
 */
router.post('/', auth('PERMISSION_CRM_BUSINESSPARTNERS', 'w','busniesspartner'),function(req, res){
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

router.put('/:id' , auth('PERMISSION_CRM_BUSINESSPARTNERS', 'w', 'busniesspartner'),validateId,validateSameClientId('partners'),function(req,res){
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
            res.send(updatedParnter);
        });
    }
});

/**
 * Delete partner
 */

router.delete('/:id', auth('PERMISSION_CRM_BUSINESSPARTNERS', 'w','busniesspartner'),validateId, validateSameClientId('partners'),function(req,res){
    var partnerId = monk.id(req.params.id);  
        req.db.remove('relations', { $or: [ {id1:partnerId}, {id2:partnerId} ] }).then(function() {
            return req.db.remove('partners', partnerId)
        }).then(function() {
            res.sendStatus(204);
        });
});

module.exports = router;




