/**
 * UNIT Tests for api/partneraddresses
 */
var th = require('../testhelpers');
var co = require('../../utils/constants');

th.createApiTests({
    apiname: "partneraddresses",
    beforeeach: [ th.prepareBusinessPartners, th.preparePartnerAddresses ],
    comparefields: ["_id", "clientId", "addressee", "partnerId", "street", "postcode", "city", "type"],
    cangetid: true,
    canput: true,
    mapfields: (e, clientname) => { return {
        _id: e.name, 
        clientId: clientname, 
        addressee: e.addressee, 
        partnerId: e.businesspartnername, 
        street: e.street, 
        postcode: e.postcode, 
        city: e.city, 
        type: e.partneraddresstypename
    }},
    forparent: { 
        datatypename: "businesspartners", 
        apisuffix: "forBusinessPartner", 
        parentfield: "businesspartnername",
        clientparentfield: "partnerId",
        elementname: "client0_businesspartner0"
    },
    permission: co.permissions.CRM_BUSINESSPARTNERS,
    elementname: "client0_partneraddress0" ,
    testelement: { 
        name: "client0_testpartneraddress", 
        addressee: "testaddressee", 
        businesspartnername: "client0_businesspartner0", 
        street: "street0", 
        postcode: "postcode0", 
        city: "city0", 
        partneraddresstypename: "Primaryaddress"
    },
    updateset: { addressee: "Ronny" },
    client: "client0",
    usergroup: "client0_usergroup0",
    user: "client0_usergroup0_user0",
    adminuser: "client0_usergroup0_user1",
});
