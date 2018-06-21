/**
 * UNIT Tests for api/markers
 */
var th = require('../testhelpers');

th.createApiTests({
    apiname: "markers",
    beforeeach: [ th.prepareMarkers ],
    comparefields: ["_id", "clientId", "lat", "lng"],
    mapfields: (e, clientname) => { return {
        _id: e.name, 
        clientId: clientname, 
        lat: e.lat,
        lng: e.lon
    }},
    elementname: "client0_marker0",
    testelement: { 
        name: "client0_testmarker",
        lat: "lat",
        lon: "lon"
    },
    updateset: { lat: "newlat" },
    cangetall: true,
    candelete: true,
    client: "client0",
    usergroup: "client0_usergroup0",
    user: "client0_usergroup0_user0",
    adminuser: "client0_usergroup0_user1",
});
