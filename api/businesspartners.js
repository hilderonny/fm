/**
 * CRUD API for business partner management
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
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');

/**
 * Liefert eine Liste von Partners für die per URL übergebenen IDs. Die IDs müssen kommagetrennt sein.
 * Die Berechtigungen werden hier nicht per auth überprüft, da diese API für die Verknüpfungen verwendet
 * wird und da wäre es blöd, wenn ein 403 zur Neuanmeldung führte. Daher wird bei fehlender Berechtigung
 * einfach eine leere Liste zurück gegeben.
 * @example
 * $http.get('/api/businesspartners/forIds?ids=ID1,ID2,ID3')...
 */
router.get('/forIds', auth(false, false, co.modules.businesspartners), (req, res) => {
    // Zuerst Berechtigung prüfen
    auth.canAccess(req.user._id, co.permissions.CRM_BUSINESSPARTNERS, 'r', co.modules.businesspartners, req.db).then(function(accessAllowed) {
        if (!accessAllowed) {
            return res.send([]);
        }
        if (!req.query.ids) {
            return res.send([]);
        }
        var ids = req.query.ids.split(',').filter(validateId.validateId).map(function(id) { return monk.id(id); }); // Nur korrekte IDs verarbeiten
        var clientId = req.user.clientId; // Nur die Termine des Mandanten des Benutzers raus holen.
        var userId = req.user._id;
        req.db.get(co.collections.businesspartners.name).find({
            _id: { $in: ids },
            clientId: clientId,
        }).then((partner) => {
            res.send(partner);
        });
    });
});

/**
 * List of all business partners
 */
router.get('/', auth(co.permissions.CRM_BUSINESSPARTNERS, 'r', co.modules.businesspartners) , (req, res) =>{
    var clientId = req.user.clientId;
     req.db.get(co.collections.businesspartners.name).find({clientId: clientId}).then((partner)=> {
        return res.send(partner);
    })  ;
});

/**
 * Get single partner with given id
 */
router.get('/:id', auth(co.permissions.CRM_BUSINESSPARTNERS, 'r', co.modules.businesspartners), validateId,validateSameClientId(co.collections.businesspartners.name), (req, res) => {
    req.db.get(co.collections.businesspartners.name).findOne(req.params.id, req.query.fields).then((partner) => {
        res.send(partner);
    });
});
/**
 * creating business partner details
 */
router.post('/', auth(co.permissions.CRM_BUSINESSPARTNERS, 'w', co.modules.businesspartners),function(req, res){
    var partner = req.body;
    if (!partner || Object.keys(partner).length < 1) {
        return res.sendStatus(400);
    }
    delete partner._id;
    partner.clientId = req.user.clientId;
    req.db.insert(co.collections.businesspartners.name, partner).then((insertedPartner) => {
        return res.send(insertedPartner);
    });
});

/**
 * Updating partner details
 */
router.put('/:id' , auth(co.permissions.CRM_BUSINESSPARTNERS, 'w', co.modules.businesspartners), validateId, validateSameClientId(co.collections.businesspartners.name), function(req,res){
    var partner = req.body;
    if(!partner || Object.keys(partner).length < 1) {
        return res.sendStatus(400);
    }
    delete partner._id;
    delete partner.clientId;
    if (Object.keys(partner).length < 1) {
        return res.sendStatus(400);
    }
    req.db.update(co.collections.businesspartners.name, req.params.id, { $set: partner }).then((updatedParnter) => {
        res.send(updatedParnter);
    });
});

/**
 * Delete partner
 */

router.delete('/:id', auth(co.permissions.CRM_BUSINESSPARTNERS, 'w', co.modules.businesspartners),validateId, validateSameClientId(co.collections.businesspartners.name),function(req,res){
    var partnerId = monk.id(req.params.id);  
    req.db.remove(co.collections.businesspartners.name, req.params.id).then((result) => {
        return req.db.remove(co.collections.partneraddresses.name, {partnerId:partnerId});
    }).then(() => {
        return rh.deleteAllRelationsForEntity(co.collections.businesspartners.name, partnerId);
    }).then(function() {
        res.sendStatus(204);
    });
});

module.exports = router;