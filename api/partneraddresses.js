/**
 * CRUD API for partner address assignments
 * 
 * partneraddresses {
 *  _id
 *  partnerId,
 *  addressee 
 *  street
 *  postcode
 *  city
 *  type
 * }
 */

var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var fs = require('fs');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');

router.get('/forBusinessPartner/:id', auth(co.permissions.CRM_BUSINESSPARTNERS, 'r', co.modules.businesspartners), validateId, function(req, res) {
    req.db.get(co.collections.businesspartners).findOne(req.params.id).then((businessPartner) => {
        if (!businessPartner) {
            return Promise.reject();
        }
        return req.db.get(co.collections.partneraddresses).find({partnerId: businessPartner._id});
    }).then((addresses) => {
        res.send(addresses);
    }, () => {
        res.sendStatus(400);
    });
});

router.get('/:id', auth(co.permissions.CRM_BUSINESSPARTNERS, 'r', co.modules.businesspartners), validateId, validateSameClientId(co.collections.partneraddresses),(req, res) => {
    req.db.get(co.collections.partneraddresses).findOne(req.params.id).then((address) => {
        res.send(address);
    });
});

router.post('/', auth(co.permissions.CRM_BUSINESSPARTNERS, 'w', co.modules.businesspartners), function(req, res) {
    var address = req.body;
    if (!address || Object.keys(address).length < 1 || !address.partnerId || !validateId.validateId(address.partnerId)) {
        return res.sendStatus(400);
    }
    req.db.get(co.collections.businesspartners).findOne(address.partnerId).then((businessPartner) => {
        if (!businessPartner) {
            return Promise.reject();
        }
        delete address._id; // Ids are generated automatically
        address.partnerId = businessPartner._id; // Make it a real id
        return req.db.insert(co.collections.partneraddresses, address);
    }).then((insertedAddress) => {
        return res.send(insertedAddress);
    }, () => {
        res.sendStatus(400);
    });
});

router.put('/:id', auth(co.permissions.CRM_BUSINESSPARTNERS, 'w', co.modules.businesspartners), validateId, validateSameClientId(co.collections.partneraddresses), function(req, res) {
    var address = req.body;
    if (!address || Object.keys(address).length < 1) {
        return res.sendStatus(400);
    }
    delete address._id;
    delete address.clientId;
    delete address.partnerId; // Reassignment of addresses to other business partners is currently not supported
    if (Object.keys(address).length < 1) {
        return res.sendStatus(400);
    }
    req.db.update(co.collections.partneraddresses, req.params.id, { $set: address }).then((updatedAddress) => {
        res.send(updatedAddress);
    });
});

router.delete('/:id', auth(co.permissions.CRM_BUSINESSPARTNERS, 'w', co.modules.businesspartners), validateId, function(req, res) {
    var id = monk.id(req.params.id);  
    req.db.remove(co.collections.partneraddresses, id).then((result) => {
        res.sendStatus(204);
    });
});

module.exports = router;