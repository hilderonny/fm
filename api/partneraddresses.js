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
var validateSameClientId = require('../middlewares/validateSameClientId');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');
var dah = require('../utils/dynamicAttributesHelper');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;

function mapPartnerAddresses(elements, clientname) {
    return elements.map((e) => { return { _id: e.name, clientId: clientname, addressee: e.addressee, partnerId: e.businesspartnername, street: e.street, postcode: e.postcode, city: e.city, type: e.partneraddresstypename } });
}

function mapPartnerAddressReverse(element) {
    return [element].map((e) => { return { name: e._id, addressee: e.addressee, businesspartnername: e.partnerId, street: e.street, postcode: e.postcode, city: e.city, partneraddresstypename: e.type } })[0];
}

router.get('/forBusinessPartner/:id', auth(co.permissions.CRM_BUSINESSPARTNERS, 'r', co.modules.businesspartners), validateSameClientId(co.collections.businesspartners.name), async(req, res) => {
    var addresses = await Db.getDynamicObjects(req.user.clientname, "partneraddresses", { businesspartnername : req.params.id});
    res.send(mapPartnerAddresses(addresses, req.user.clientname));
});

router.get('/:id', auth(co.permissions.CRM_BUSINESSPARTNERS, 'r', co.modules.businesspartners), validateSameClientId(co.collections.partneraddresses.name), async(req, res) => {
    res.send(mapPartnerAddresses([await Db.getDynamicObject(req.user.clientname, "partneraddresses", req.params.id)], req.user.clientname)[0]);
});

router.post('/', auth(co.permissions.CRM_BUSINESSPARTNERS, 'w', co.modules.businesspartners), async(req, res) => {
    var address = req.body;
    if (!address || Object.keys(address).length < 1 || !address.partnerId || !(await Db.getDynamicObject(req.user.clientname, "businesspartners", address.partnerId))) {
        return res.sendStatus(400);
    }
    address = mapPartnerAddressReverse(address);
    address.name = uuidv4();
    await Db.insertDynamicObject(req.user.clientname, "partneraddresses", address);
    res.send(mapPartnerAddresses([address], req.user.clientname)[0]);
});

router.put('/:id', auth(co.permissions.CRM_BUSINESSPARTNERS, 'w', co.modules.businesspartners), validateSameClientId(co.collections.partneraddresses.name), async(req, res) => {
    var address = req.body;
    if(!address || Object.keys(address).length < 1) {
        return res.sendStatus(400);
    }
    var elementtoupdate = {};
    if (typeof(address.addressee) !== "undefined") elementtoupdate.addressee = address.addressee;
    // partnerId is not changeable
    if (typeof(address.street) !== "undefined") elementtoupdate.street = address.street;
    if (typeof(address.postcode) !== "undefined") elementtoupdate.postcode = address.postcode;
    if (typeof(address.city) !== "undefined") elementtoupdate.city = address.city;
    if (typeof(address.type) !== "undefined") elementtoupdate.partneraddresstypename = address.type;
    await Db.updateDynamicObject(req.user.clientname, "partneraddresses", req.params.id, elementtoupdate);
    res.send(elementtoupdate);
});

router.delete('/:id', auth(co.permissions.CRM_BUSINESSPARTNERS, 'w', co.modules.businesspartners), validateSameClientId(co.collections.partneraddresses.name), async(req, res) => {
    var id = req.params.id;
    var clientname = req.user.clientname;
    await Db.deleteDynamicObject(clientname, "partneraddresses", id);
    await rh.deleteAllRelationsForEntity(clientname, co.collections.partneraddresses.name, id);
    await dah.deleteAllDynamicAttributeValuesForEntity(clientname, id);
    res.sendStatus(204);
});

module.exports = router;