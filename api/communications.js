/**
 * CRUD API for person communication assignments
 */
var co = require('../utils/constants');
var ah = require("../utils/apiHelper");

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

module.exports = ah.createApi({
    apiname: "communications",
    modulename: "businesspartners",
    permission: co.permissions.CRM_PERSONS,
    mapfields: (e, clientname) => { return {
        _id: e.name, 
        clientId: clientname, 
        contact: e.contact, 
        personId: e.personname, 
        medium: mediums[e.communicationtypename], 
        type: types[e.communicationtypename]
    }},
    mapfieldsreverse: (e) => { return {
        name: e._id, 
        contact: e.contact, 
        personname: e.personId, 
        communicationtypename: e.medium + e.type
    }},
    parent: { 
        datatypename: "persons", 
        apisuffix: "forPerson", 
        parentfield: "personname"
    },
    getid: true,
    post: true,
    put: true,
    delete: true,
});
