/**
 * UNIT Tests for api/businesspartners
 */
var th = require('../testhelpers');
var co = require('../../utils/constants');

th.createApiTests({
    apiname: "businesspartners",
    beforeeach: [ th.prepareBusinessPartners, th.preparePartnerAddresses ],
    comparefields: ["_id", "clientId", "name", "industry", "rolle", "isJuristic"],
    mapfields: (e, clientname) => { return {
        _id: e.name, 
        clientId: clientname, 
        name: e.label, 
        industry: e.industry, 
        rolle: e.rolle, 
        isJuristic: e.isjuristic
    }},
    permission: co.permissions.CRM_BUSINESSPARTNERS,
    elementname: "client0_businesspartner0",
    testelement: { 
        name: "client0_testbusinesspartner", 
        label: "label", 
        industry: "industry", 
        rolle: "rolle",
        isjuristic: false
    },
    updateset: { industry: "Ronny" },
    cangetall: true,
    cangetforids: true,
    children: {
        datatypename: "partneraddresses",
        parentfield: "businesspartnername"
    }
});
