/**
 * CRUD API for userGroup management
 */
var co = require('../utils/constants');
var ah = require("../utils/apiHelper");
var auth = require('../middlewares/auth');
var validateSameClientId = require('../middlewares/validateSameClientId');
var Db = require("../utils/db").Db;
var rh = require('../utils/relationsHelper');
var dah = require('../utils/dynamicAttributesHelper');

var router = ah.createApi({
    apiname: "usergroups",
    modulename: "base",
    permission: co.permissions.ADMINISTRATION_USERGROUP,
    mapfields: (e, user) => { return {
        _id: e.name, 
        clientId: user.clientname, 
        name: e.label
    }},
    mapfieldsreverse: (e) => { return {
        name: e._id, 
        label: e.name
    }},
    children: [{
        datatypename: "users",
        parentfield: "usergroupname"
    }],
    getforids: true,
    getall: true,
    getid: true,
    post: true,
    put: true,
});

router.delete('/:id', auth(co.permissions.ADMINISTRATION_USERGROUP, 'w', co.modules.base), validateSameClientId(co.collections.usergroups.name), async(req, res) => {
    var id = req.params.id;
    var clientname = req.user.clientname;
    if ((await Db.getDynamicObjects(clientname, "users", { usergroupname: id })).length > 0) return res.sendStatus(403);
    var result = await Db.deleteDynamicObject(clientname, "usergroups", id);
    await rh.deleteAllRelationsForEntity(clientname, "usergroups", id);
    await dah.deleteAllDynamicAttributeValuesForEntity(clientname, id);
    res.sendStatus(204);
});

module.exports = router
