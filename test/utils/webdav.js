/**
 * Unit tests for the utils/webdav
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;


describe('UTILS webdav', ()=>{

    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();        
    });

    describe('getUserByName', () =>{
        xit('Function invocation made with non-existing username returns Error.BadAuthentication');
        xit('Function invocation made with valid username => deliver correct user data');
    });

    describe('getUserByNamePassword', () =>{
        xit('Function invocation made with correct username but wrong password returns Error.BadAuthentication');
        xit('Function invocation made with correct username and correct password returns correct user data is retrieved ');
    });


    //customPrivilegeManager:	
    describe('_can', ()=>{
        xit('Function invocation made with non-existing clientName of the simpleUser retruns Permission denied ');
        xit('Function invocation made with non-exist user returns Permission denied ');
        xit('Function invocation made for valid read-only user with ‘canRead’ privilege query returns true');
        xit('Function invocation made for valid read-only user with ‘canWrite’ privilege query returns false');
        xit('Function invocation made for valid read-write user with ‘canWrite’ privilege query returns true');
        xit('Function invocation made for valid admin user with ‘canWrite’ privilege query returns true');
        xit('Function invocation made for valid non-authorized user with ‘canRead’ privilege query returns false');
        xit('Function invocation made for valid non-authorized user with ‘canWrite’ privilege query returns false');
    
    });
    //WebDav Filesystem
    describe('type', ()=>{
        xit('Function invocation made with path to non-existing source returns Errors.ResourceNotFound');
        xit('Function invocation made with path to element that has no type returns webdav.ResourceType.NoResource');
        xit('Function invocation made with path to element that has type different than folder or document returns webdav.ResourceType.NoResource');
        xit('Function invocation made with path to the root returns webdav.ResourceType.Directory');

    });
});

