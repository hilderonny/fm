/**
 * CRUD API for partner address assignments
 */
var co = require('../utils/constants');
var ah = require("../utils/apiHelper");

module.exports = ah.createApi({
    apiname: "partneraddresses",
    modulename: "businesspartners",
    permission: co.permissions.CRM_BUSINESSPARTNERS,
    mapfields: (e, user) => { return {
        _id: e.name, 
        clientId: user.clientname, 
        addressee: e.addressee, 
        partnerId: e.businesspartnername, 
        street: e.street, 
        postcode: e.postcode, 
        city: e.city, 
        type: e.partneraddresstypename
    }},
    mapfieldsreverse: (e) => { return {
        name: e._id, 
        addressee: e.addressee, 
        businesspartnername: e.partnerId, 
        street: e.street,
        postcode: e.postcode,
        city: e.city,
        partneraddresstypename: e.type
    }},
    parent: { 
        datatypename: "businesspartners", 
        apisuffix: "forBusinessPartner", 
        parentfield: "businesspartnername"
    },
    getid: true,
    post: true,
    put: true,
    delete: true,
});
