/**
 * UNIT Tests for api/persons
 */
var th = require('../testhelpers');
var co = require('../../utils/constants');

th.createApiTests({
    apiname: "persons",
    beforeeach: [ th.preparePersons, th.prepareCommunications ],
    comparefields: ["_id", "clientId", "firstname", "lastname", "description"],
    mapfields: (e, clientname) => { return {
        _id: e.name, 
        clientId: clientname, 
        firstname: e.firstname, 
        lastname: e.lastname, 
        description: e.description
    }},
    permission: co.permissions.CRM_PERSONS,
    elementname: "client0_person0",
    testelement: { 
        name: "client0_testperson", 
        firstname: "fn0", 
        lastname: "ln0", 
        description: "d0"
    },
    updateset: { firstname: "Ronny" },
    cangetall: true,
    cangetforids: true,
    children: {
        datatypename: "communications",
        parentfield: "personname"
    }
});
