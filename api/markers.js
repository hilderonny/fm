/**
 * CRUD API for MAP markers with geolocation.
 * Status: EXPERIMENTAL, NO NEED FOR TESTS!
 */
var co = require('../utils/constants');
var ah = require("../utils/apiHelper");

module.exports = ah.createApi({
    apiname: "markers",
    modulename: "ronnyseins",
    mapfields: (e, user) => { return {
        _id: e.name, 
        clientId: user.clientname, 
        lat: e.lat,
        lng: e.lon
    }},
    mapfieldsreverse: (e) => { return {
        name: e._id, 
        lat: e.lat,
        lon: e.lng
    }},
    getall: true,
    post: true,
    delete: true,
});
