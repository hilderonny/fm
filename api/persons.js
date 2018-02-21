/**
 * {
 *  firstname,
 *  lastname,
 *  description
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

function mapPersons(elements, clientname) {
    return elements.map((e) => { return { _id: e.name, clientId: clientname, firstname: e.firstname, lastname: e.lastname, description: e.description } });
}

function mapPersonReverse(element) {
    return [element].map((e) => { return { name: e._id, firstname: e.firstname, lastname: e.lastname, description: e.description } })[0];
}

router.get('/forIds', auth(false, false, co.modules.businesspartners), async(req, res) => {
    // Zuerst Berechtigung prüfen
    var accessAllowed = await auth.canAccess(req.user.name, co.permissions.CRM_PERSONS, 'r', co.modules.businesspartners);
    if (!accessAllowed) {
        return res.send([]);
    }
    if (!req.query.ids) {
        return res.send([]);
    }
    res.send(mapPersons(await Db.getDynamicObjectsForNames(req.user.clientname, "persons", req.query.ids.split(',')), req.user.clientname));
});

/**
 * List of  all persons
 */
router.get('/', auth(co.permissions.CRM_PERSONS, 'r', co.modules.businesspartners), async(req, res) =>{
    res.send(mapPersons(await Db.getDynamicObjects(req.user.clientname, "persons"), req.user.clientname));
});

/**
 * Get single person with given id
*/
router.get('/:id', auth(co.permissions.CRM_PERSONS, 'r', co.modules.businesspartners), validateSameClientId(co.collections.persons.name), async(req, res) => {
    res.send(mapPersons([await Db.getDynamicObject(req.user.clientname, "persons", req.params.id)], req.user.clientname)[0]);
});

/**
 * creating person details
 */
router.post('/', auth(co.permissions.CRM_PERSONS, 'w', co.modules.businesspartners), async(req, res) => {
    var element = req.body;
    if (!element || Object.keys(element).length < 1) {
        return res.sendStatus(400);
    }
    element = mapPersonReverse(element);
    element.name = uuidv4();
    await Db.insertDynamicObject(req.user.clientname, "persons", element);
    res.send(mapPersons([element], req.user.clientname)[0]);
});

/**
 * Updating person details
 */
router.put('/:id' , auth(co.permissions.CRM_PERSONS, 'w', co.modules.businesspartners), validateSameClientId(co.collections.persons.name), async(req,res) => {
    var element = req.body;
    if(!element || Object.keys(element).length < 1) {
        return res.sendStatus(400);
    }
    var elementtoupdate = {};
    if (typeof(element.firstname) !== "undefined") elementtoupdate.firstname = element.firstname;
    if (typeof(element.lastname) !== "undefined") elementtoupdate.lastname = element.lastname;
    if (typeof(element.description) !== "undefined") elementtoupdate.description = element.description;
    await Db.updateDynamicObject(req.user.clientname, "persons", req.params.id, elementtoupdate);
    res.send(elementtoupdate);
});

/**
 * Delete person
 */
router.delete('/:id', auth(co.permissions.CRM_PERSONS, 'w', co.modules.businesspartners), validateSameClientId(co.collections.persons.name), async(req,res) => {
    var id = req.params.id;
    var clientname = req.user.clientname;
    await Db.deleteDynamicObject(clientname, "persons", id);
    await Db.deleteDynamicObjects(clientname, "communications", { personname: id });
    await rh.deleteAllRelationsForEntity(clientname, co.collections.persons.name, id);
    await dah.deleteAllDynamicAttributeValuesForEntity(clientname, id);
    res.sendStatus(204);
});

module.exports = router;
