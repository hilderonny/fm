/**
 * UNIT Tests for api/notes
 */
var th = require('../testhelpers');
var co = require('../../utils/constants');

th.createApiTests({
    apiname: "notes",
    beforeeach: [ th.prepareNotes ],
    comparefields: ["_id", "clientId", "content"],
    mapfields: (e, clientname) => { return {
        _id: e.name, 
        clientId: clientname, 
        content: e.content
    }},
    permission: co.permissions.OFFICE_NOTE,
    elementname: "client0_note0",
    testelement: { 
        name: "client0_testnote", 
        content: "content"
    },
    updateset: { content: "Ronny" },
    cangetall: true,
    cangetforids: true
});
