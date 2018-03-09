/**
 * UNIT Tests for api/communications
 */
var th = require('../testhelpers');
var co = require('../../utils/constants');

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

th.createApiTests({
    apiname: "communications",
    beforeeach: [ th.preparePersons, th.prepareCommunications ],
    cangetid: true,
    canput: true,
    candelete: true,
    comparefields: ["_id", "clientId", "contact", "personId", "medium", "type"],
    mapfields: (e, clientname) => { return {
        _id: e.name, 
        clientId: clientname, 
        contact: e.contact, 
        personId: e.personname, 
        medium: mediums[e.communicationtypename], 
        type: types[e.communicationtypename]
    }},
    forparent: { 
        datatypename: "persons", 
        apisuffix: "forPerson", 
        parentfield: "personname", 
        clientparentfield: "personId",
        elementname: "client0_person0" 
    },
    permission: co.permissions.CRM_PERSONS,
    elementname: "client0_communication0",
    testelement: { 
        name: "client0_testcommunication", 
        contact: "c", 
        personname: "client0_person0", 
        communicationtypename: "emailwork"
    },
    updateset: { contact: "Ronny" },
    client: "client0",
    usergroup: "client0_usergroup0",
    user: "client0_usergroup0_user0",
    adminuser: "client0_usergroup0_user1",
});
