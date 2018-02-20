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
var validateSameClientId = require('../middlewares/validateSameClientId');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');
var dah = require('../utils/dynamicAttributesHelper');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;

function mapBusinessPartners(elements, clientname) {
    return elements.map((e) => { return { _id: e.name, clientId: clientname, name: e.label, industry: e.industry, rolle: e.rolle, isJuristic: e.isjuristic } });
}

function mapBusinessPartnerReverse(element) {
    return [element].map((e) => { return { name: e._id, label: e.name, industry: e.industry, rolle: e.rolle, isjuristic: e.isJuristic } })[0];
}

/**
 * Liefert eine Liste von Partners für die per URL übergebenen IDs. Die IDs müssen kommagetrennt sein.
 * Die Berechtigungen werden hier nicht per auth überprüft, da diese API für die Verknüpfungen verwendet
 * wird und da wäre es blöd, wenn ein 403 zur Neuanmeldung führte. Daher wird bei fehlender Berechtigung
 * einfach eine leere Liste zurück gegeben.
 * @example
 * $http.get('/api/businesspartners/forIds?ids=ID1,ID2,ID3')...
 */
router.get('/forIds', auth(false, false, co.modules.businesspartners), async(req, res) => {
    // Zuerst Berechtigung prüfen
    var accessAllowed = await auth.canAccess(req.user.name, co.permissions.CRM_BUSINESSPARTNERS, 'r', co.modules.businesspartners);
    if (!accessAllowed) {
        return res.send([]);
    }
    if (!req.query.ids) {
        return res.send([]);
    }
    res.send(mapBusinessPartners(await Db.getDynamicObjectsForNames(req.user.clientname, "businesspartners", req.query.ids.split(',')), req.user.clientname));
});

/**
 * List of all business partners
 */
router.get('/', auth(co.permissions.CRM_BUSINESSPARTNERS, 'r', co.modules.businesspartners), async(req, res) =>{
    res.send(mapBusinessPartners(await Db.getDynamicObjects(req.user.clientname, "businesspartners"), req.user.clientname));
});

/**
 * Get single partner with given id
 */
router.get('/:id', auth(co.permissions.CRM_BUSINESSPARTNERS, 'r', co.modules.businesspartners), validateSameClientId(co.collections.businesspartners.name), async(req, res) => {
    res.send(mapBusinessPartners([await Db.getDynamicObject(req.user.clientname, "businesspartners", req.params.id)], req.user.clientname)[0]);
});

/**
 * creating business partner details
 */
router.post('/', auth(co.permissions.CRM_BUSINESSPARTNERS, 'w', co.modules.businesspartners), async(req, res) => {
    var partner = req.body;
    if (!partner || Object.keys(partner).length < 1) {
        return res.sendStatus(400);
    }
    partner = mapBusinessPartnerReverse(partner);
    partner.name = uuidv4();
    await Db.insertDynamicObject(req.user.clientname, "businesspartners", partner);
    res.send(mapBusinessPartners([partner], req.user.clientname)[0]);
});

/**
 * Updating partner details
 */
router.put('/:id' , auth(co.permissions.CRM_BUSINESSPARTNERS, 'w', co.modules.businesspartners), validateSameClientId(co.collections.businesspartners.name), async(req,res) => {
    var partner = req.body;
    if(!partner || Object.keys(partner).length < 1) {
        return res.sendStatus(400);
    }
    var elementtoupdate = {};
    if (typeof(partner.name) !== "undefined") elementtoupdate.label = partner.name;
    if (typeof(partner.industry) !== "undefined") elementtoupdate.industry = partner.industry;
    if (typeof(partner.rolle) !== "undefined") elementtoupdate.rolle = partner.rolle;
    if (typeof(partner.isJuristic) !== "undefined") elementtoupdate.isjuristic = partner.isJuristic;
    await Db.updateDynamicObject(req.user.clientname, "businesspartners", req.params.id, elementtoupdate);
    res.send(elementtoupdate);
});

/**
 * Delete partner
 */
router.delete('/:id', auth(co.permissions.CRM_BUSINESSPARTNERS, 'w', co.modules.businesspartners), validateSameClientId(co.collections.businesspartners.name), async(req,res) => {
    var id = req.params.id;
    var clientname = req.user.clientname;
    await Db.deleteDynamicObject(clientname, "businesspartners", id);
    await Db.deleteDynamicObjects(clientname, "partneraddresses", { businesspartnername: id });
    await rh.deleteAllRelationsForEntity(clientname, co.collections.businesspartners.name, id);
    await dah.deleteAllDynamicAttributeValuesForEntity(clientname, id);
    res.sendStatus(204);
});

module.exports = router;