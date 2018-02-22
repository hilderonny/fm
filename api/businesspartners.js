/**
 * CRUD API for business partner management
 */
var co = require('../utils/constants');
var ah = require("../utils/apiHelper");

module.exports = ah.createApi({
    apiname: "businesspartners",
    modulename: "businesspartners",
    permission: co.permissions.CRM_BUSINESSPARTNERS,
    mapfields: (e, user) => { return {
        _id: e.name, 
        clientId: user.clientname, 
        name: e.label, 
        industry: e.industry, 
        rolle: e.rolle, 
        isJuristic: e.isjuristic
    }},
    mapfieldsreverse: (e) => { return {
        name: e._id, 
        label: e.name, 
        industry: e.industry, 
        rolle: e.rolle, 
        isjuristic: e.isJuristic
    }},
    children: [{
        datatypename: "partneraddresses",
        parentfield: "businesspartnername"
    }],
    getforids: true,
    getall: true,
    getid: true,
    post: true,
    put: true,
    delete: true,
});
