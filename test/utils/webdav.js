/**
 * Unit tests for the utils/webdav
 */
var assert = require('assert');
var webDav = require('../../utils/webdav');
const webdavClient = require('webdav-client');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;
var ph = require('../../utils/permissionshelper');
var doh = require("../../utils/dynamicobjecthelper");
var dh = require("../../utils/documentsHelper");



describe('UTILS webdav', () => {

    before(async () => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async () => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareFolders();
        await th.prepareDocuments();
        await th.prepareDocumentFiles();
    });
    //custom User Manager
    describe('getUserByName', () => {
        it('Function invocation made with non-existing username returns Error.BadAuthentication', async () => {  });
        xit('Function invocation made with valid username returns deliver correct user data', async () => {
        });
    });

    describe('getUserByNamePassword', () => {
        xit('Function invocation made with correct username but wrong password returns Error.BadAuthentication');
        xit('Function invocation made with correct username and correct password returns correct user data is retrieved ');
    });

    //customPrivilegeManager:   
    describe('_can', () => {
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
    describe('type', () => {
        xit('Function invocation made with path to non-existing source returns Errors ResourceNotFound 404');
        xit('Function invocation made with path to element that has no type returns webdav.ResourceType.NoResource');
        xit('Function invocation made with path to element that has type different than folder or document returns webdav.ResourceType.NoResource');
        xit('Function invocation made with path to the root returns webdav.ResourceType.Directory');

    });

    describe('_move', () => {

        xit('Try to reallocate file returns Error.Forbidden ');
        xit('Function invocation made with path(pathFrom) to non-existing source returns Errors.ResourceNotFound');
        xit('Function invocation made with same source and destination path (pathTo == pathFrom) returns file/folder name stays the same');
        xit('Function invocation made with valid parameters  returns correctly updated name');
        xit('Request rename as user without write rights returns Error.Forbidden');
        //currently the rename functionality can lead to problems with multiple same-name files/folders 
        xit('Rename one of several items (folder or document) with the same name and path returns correctly update the selected item ');
    });

    describe('_delete', () => {
        xit('Valid delettion request returns error.forbidden');
    });

    describe('_readDir', () => {
        xit('Function invocation with path to non-existing source => Errors.ResourceNotFound');
        xit('Function invocation made without authorized user => Error.Frobidden');
        it.only('Function invocation made with valid root path returns correct data retrieval', async () => {
            // await webDav.dav.init();
            return new Promise((resolve, reject) => {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
                var conn = new webdavClient.Connection({
                    url: 'https://localhost:56789',
                    authenticator: new webdavClient.BasicAuthenticator(),
                    username: 'client0_usergroup0_user0',
                    password: 'test'
                });
             
                console.log(conn);
                
                conn.readdir("/", (e, content) => {   
                    console.log(e, content);
                    conn.readdir("/folder0", (err, deeperContent) =>{
                        console.log(err, deeperContent);
                        resolve();
                    });                            
                });
            });
        });

        xit('Function invocation made with valid non-root path returns correct data retrieval');
        xit('Function invocation made as user without read rights => initial login should fail');
    });

    describe('_openReadStream', () => {
        xit('Function invocation made path to non-existing source => Errors.ResourceNotFound');
        xit('Function invocation made when this._clientname  == null => Error.Forbidden');
    });

    describe('__setCredentials', () => {
        xit('Function invocation made with valid client name => correctly set _clientName');
        xit('unction invocation made with valid user name => correctly set _userName');
        xit('Function invocation made with client name different than the client name of the user with the given user name => Error.BadAuthentication');
    });

});


