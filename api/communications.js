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
var validateSameClientId = require('../middlewares/validateSameClientId');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');
var dah = require('../utils/dynamicAttributesHelper');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;

function mapCommunications(elements, clientname) {
    var mediums = {
        emailwork: "email",
        emailother: "email",
        phonework: "phone",
        phonemobile: "phone",
        phoneother: "phone"
    };
    var types = {
        emailwork: "work",
        emailother: "other",
        phonework: "work",
        phonemobile: "mobile",
        phoneother: "other"
    };
    return elements.map((e) => { return { _id: e.name, clientId: clientname, contact: e.contact, personId: e.personname, medium: mediums[e.communicationtypename], type: types[e.communicationtypename] } });
}

function mapCommunicationReverse(element) {
    return [element].map((e) => { return { name: e._id, contact: e.contact, personname: e.personId, communicationtypename: e.medium + e.type } })[0];
}

router.get('/forPerson/:id', auth(co.permissions.CRM_PERSONS, 'r', co.modules.businesspartners), validateSameClientId(co.collections.persons.name), async(req, res) => {
    var elements = await Db.getDynamicObjects(req.user.clientname, "communications", { personname : req.params.id});
    res.send(mapCommunications(elements, req.user.clientname));
});

router.get('/:id', auth(co.permissions.CRM_PERSONS, 'r', co.modules.businesspartners), validateSameClientId(co.collections.communications.name), async(req, res) => {
    res.send(mapCommunications([await Db.getDynamicObject(req.user.clientname, "communications", req.params.id)], req.user.clientname)[0]);
});

router.post('/', auth(co.permissions.CRM_PERSONS, 'w', co.modules.businesspartners), async(req, res) => {
    var element = req.body;
    if (!element || Object.keys(element).length < 1 || !element.personId || !(await Db.getDynamicObject(req.user.clientname, "persons", element.personId))) {
        return res.sendStatus(400);
    }
    element = mapCommunicationReverse(element);
    element.name = uuidv4();
    await Db.insertDynamicObject(req.user.clientname, "communications", element);
    res.send(mapCommunications([element], req.user.clientname)[0]);
});

router.put('/:id', auth(co.permissions.CRM_PERSONS, 'w', co.modules.businesspartners), validateSameClientId(co.collections.communications.name), async(req, res) => {
    var element = req.body;
    if(!element || Object.keys(element).length < 1) {
        return res.sendStatus(400);
    }
    var elementtoupdate = {};
    if (typeof(element.contact) !== "undefined") elementtoupdate.contact = element.contact;
    // personId is not changeable
    if (typeof(element.medium) !== "undefined" && typeof(element.type) !== "undefined") elementtoupdate.communicationtypename = element.medium + element.type;
    await Db.updateDynamicObject(req.user.clientname, "communications", req.params.id, elementtoupdate);
    res.send(elementtoupdate);
});

router.delete('/:id', auth(co.permissions.CRM_PERSONS, 'w', co.modules.businesspartners), validateSameClientId(co.collections.communications.name), async(req, res) => {
    var id = req.params.id;
    var clientname = req.user.clientname;
    await Db.deleteDynamicObject(clientname, "communications", id);
    await rh.deleteAllRelationsForEntity(clientname, co.collections.communications.name, id);
    await dah.deleteAllDynamicAttributeValuesForEntity(clientname, id);
    res.sendStatus(204);
});

module.exports = router;
