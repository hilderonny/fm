/**
 * CRUD API for notes management
 */
var co = require('../utils/constants');
var ah = require("../utils/apiHelper");

module.exports = ah.createApi({
    apiname: "notes",
    modulename: "notes",
    permission: co.permissions.OFFICE_NOTE,
    mapfields: (e, user) => { return {
        _id: e.name, 
        clientId: user.clientname, 
        content: e.content
    }},
    mapfieldsreverse: (e) => { return {
        name: e._id, 
        content: e.content
    }},
    getforids: true,
    getall: true,
    getid: true,
    post: true,
    put: true,
    delete: true,
});
