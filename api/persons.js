/**
 * CRUD API for persons
 */
var co = require('../utils/constants');
var ah = require("../utils/apiHelper");

module.exports = ah.createApi({
    apiname: "persons",
    modulename: "businesspartners",
    permission: co.permissions.CRM_PERSONS,
    mapfields: (e, clientname) => { return {
        _id: e.name, 
        clientId: clientname, 
        firstname: e.firstname, 
        lastname: e.lastname, 
        description: e.description
    }},
    mapfieldsreverse: (e) => { return {
        name: e._id, 
        firstname: e.firstname, 
        lastname: e.lastname, 
        description: e.description
    }},
    children: [{
        datatypename: "communications",
        parentfield: "personname"
    }],
    getforids: true,
    getall: true,
    getid: true,
    post: true,
    put: true,
    delete: true,
});
