/**
 * UNIT Tests for api/usergroups
 */
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

th.createApiTests({
    apiname: "usergroups",
    comparefields: ["_id", "clientId", "name"],
    mapfields: (e, clientname) => { return {
        _id: e.name, 
        clientId: clientname, 
        name: e.label
    }},
    permission: co.permissions.ADMINISTRATION_USERGROUP,
    elementname: "client0_usergroup0",
    testelement: { 
        name: "client0_testusergroup", 
        label: "label"
    },
    updateset: { name: "Ronny" },
    cangetall: true,
    cangetforids: true,
    children: {
        datatypename: "users",
        parentfield: "usergroupname"
    },
    cangetid: true,
    canput: true,
    client: "client0",
    usergroup: "client0_usergroup0",
    user: "client0_usergroup0_user0",
    adminuser: "client0_usergroup0_user1",
    additionaltests: createAdditionalTests
});

function createAdditionalTests() {

    describe('DELETE/:id', function() {

        async function getDeleteUserGroupId(clientname) {
            var usergroup = { name: clientname + "_testusergroup" };
            await Db.insertDynamicObject(clientname, "usergroups", usergroup );
            return usergroup.name;
        }

        th.apiTests.delete.defaultNegative(co.apis.usergroups, co.permissions.ADMINISTRATION_USERGROUP, getDeleteUserGroupId);
        th.apiTests.delete.clientDependentNegative(co.apis.usergroups, getDeleteUserGroupId);
        th.apiTests.delete.defaultPositive(co.apis.usergroups, co.collections.usergroups.name, getDeleteUserGroupId);

        it('returns with 403 when the usergroup contains users', async() => {
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.del(`/api/usergroups/client0_usergroup0?token=${token}`).expect(403);
        });

    });
    
}
