/**
 * Unit tests for the utils/webdav
 */
var assert = require('assert');
var webDav = require('../../utils/webdav');
const webdavClient = require('webdav-client');
const wdSurver = require('webdav-server').v2;
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;
var ph = require('../../utils/permissionshelper');
var doh = require("../../utils/dynamicobjecthelper");
var dh = require("../../utils/documentsHelper");




describe.only('UTILS webdav', () => {

    var WebdavCleintConnection = (usernameInput, passwordInput) => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        var conn = new webdavClient.Connection({
            url: 'https://localhost:56789',
            authenticator: new webdavClient.BasicAuthenticator(),
            username: usernameInput, 
            password: passwordInput
        });
        return conn;
    };

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
        await th.prepareNotes();
        await th.prepareDocumentFiles();
    });

    //custom User Manager
   /* describe('getUserByName', () => {
        xit('Function invocation made with non-existing username returns Error.BadAuthentication', async () => {  });
        xit('Function invocation made with valid username returns deliver correct user data', async () => {
        });
    });*/

    describe('getUserByNamePassword', () => {
        it('Function invocation made with correct username but wrong password returns Error.BadAuthentication', async () =>{
            return new Promise(function(resolve, reject){
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'wrong_password');
                client.readdir("/", (e,content)=>{            
                    assert(e);
                    resolve();
                });
            });
        });

        it('Function invocation made with correct username and correct password returns correct user data is retrieved', async () =>{
            return new Promise(function(resolve, reject){
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                client.readdir("/", (e,content)=>{            
                    console.log(e);
                    resolve();
                });
            });
        });
    });

    //customPrivilegeManager:   
    describe('_can', () => {
        xit('Function invocation made with non-existing clientName of the simpleUser retruns Permission denied');
        xit('Function invocation made with non-exist user returns Permission denied');
        xit('Function invocation made for valid read-only user with ‘canRead’ privilege query returns true');
        xit('Function invocation made for valid read-only user with ‘canWrite’ privilege query returns false');
        xit('Function invocation made for valid read-write user with ‘canWrite’ privilege query returns true');
        xit('Function invocation made for valid admin user with ‘canWrite’ privilege query returns true');
        xit('Function invocation made for valid non-authorized user with ‘canRead’ privilege query returns false');
        xit('Function invocation made for valid non-authorized user with ‘canWrite’ privilege query returns false');

    });
    //WebDav Filesystem
    describe('type', () => {
        it('Function invocation made with path to non-existing source returns Errors ResourceNotFound 404', async()=>{
            return new Promise (function(resolve, reject){
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                client.readdir("/non_exsisting_file", (e,content)=>{
                    console.log(e);
                    resolve();
                });
            });
        });

        it('Function invocation made with path to element that has type different than folder or document returns Error NotFound', async function(){
            return new Promise ( async function(resolve, reject){
                //relation relevant for WebDav testing
                await th.createRelation("folders", "client0_folder0", "notes", "client0_note0", "parentchild");           
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                client.readdir("/", (e,content)=>{
                    client.readdir("/folder0", (err,innerContent)=>{
                        client.readdir("/folder0/client0_note0", (err2, innerContent2)=>{
                            assert(err2);
                            resolve();
                        });
                    });
                });
            });
        });

        it('Function invocation made with path to the root returns webdav.ResourceType.Directory', async function(){
            return new Promise (function(resolve, reject){
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                client.readdir("/", (e,content)=>{
                    console.log(e, content);
                    assert(content);
                    resolve();
                });
            });
        });

    });

    describe('_move', () => {

        it('Try to reallocate file returns Error.Forbidden', async () => {
            return new Promise (function(resolve, reject){
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                client.readdir("/", (e,content)=>{ 
                    client.move('/folder0', '/folder1/folder0', function(err){
                        assert(err);
                        resolve();
                    });
                });
            });
        });
        it('Function invocation made with path(pathFrom) to non-existing source returns Errors.ResourceNotFound', async()=>{
            return new Promise (function(resolve, reject){
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                client.readdir("/", (e,content)=>{ 
                    client.move('/non_existing_data', '/irrelevant_rename', function(err){
                        console.log(err);
                        assert(err);
                        resolve();
                    })
                });
            });
        });

        it('Function invocation made with same source and destination path (pathTo == pathFrom) returns file/folder name stays the same', async()=>{
            return new Promise (function(resolve, reject){
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                client.readdir("/", (e,content)=>{ 
                    client.move('/folder0', '/folder0', function(err){
                        console.log(err);
                        assert(err);
                        resolve();
                    })
                });
            });
        });

        it('Function invocation made with valid parameters  returns correctly updated name', async () =>{
            return new Promise (function(resolve, reject){
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                client.readdir("/", (e,content)=>{ 
                    client.move('/folder0', '/folder_renamed', function(err){
                        if(err){
                            resolve(assert.fail(err));
                        }else{
                            client.readdir('/folder_renamed', function(err, new_content){
                                console.log(new_content);
                                resolve();
                            })
                        }
                    })
                });
            });
        });

        it('Request rename as user without write rights returns Error.Forbidden', async()=>{
            return new Promise (function(resolve, reject){
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test'); //TODO change user
                client.readdir("/", (e,content)=>{ 
                    client.move('/folder0', '/folder_renamed', function(err){
                        console.log(err);
                        resolve();
                    })
                });
            });
        });


        //currently the rename functionality can lead to problems with multiple same-name files/folders 
        //xit('Rename one of several items (folder or document) with the same name and path returns correctly update the selected item ');
    });

    describe('_delete', () => {
        it('Valid delettion request returns error.forbidden', async()=>{
            return new Promise((resolve, reject)=>{
                var conn = WebdavCleintConnection('client0_usergroup0_user0', 'test'); 
                conn.readdir("/", (e,content)=>{            
                    conn.delete("/folder1", (error)=>{
                        //console.log(error);
                        assert(error);
                        resolve();
                    });
                });    
            });
        });          
    });

    describe('_readDir', () => {
        it('Function invocation with path to non-existing source returns Errors.ResourceNotFound', async()=>{
            return new Promise((resolve, reject) => {
                var conn = WebdavCleintConnection('client0_usergroup0_user0', 'test');         
                console.log(conn);
                conn.readdir("/", (e, content) => {   
                    //console.log(e, content);
                    conn.readdir("/folder10", (err, deeperContent) =>{
                        console.log(err, deeperContent);                
                        resolve();                      
                    });                                         
                }); 
            });
        });

        it('Function invocation made without authorized user returns Error.Frobidden',async()=>{
            return new Promise((resolve, reject) => {
                var conn = WebdavCleintConnection('client1_usergroup0_user0', 'test');
                conn.readdir("/", (e, content) => {   
                    conn.readdir("/folder0", (err, deeperContent) =>{
                        console.log(err, deeperContent);                
                        resolve();             
                    });                                         
                });
            });
        });

        it('Function invocation made with valid root path returns correct data retrieval', async () => {
            // await webDav.dav.init();
            return new Promise((resolve, reject) => {
                var conn = WebdavCleintConnection('client0_usergroup0_user0', 'test');             
               // console.log(conn);
                conn.readdir("/", (e, content) => {   
                    //console.log(e, content);                   
                    console.log(e, content);
                    resolve();                                 
                });
            });
        });

        it('Function invocation made with valid non-root path returns correct data retrieval', async () =>{
            return new Promise((resolve, reject) => {
                var conn = WebdavCleintConnection('client0_usergroup0_user0', 'test');                 
                conn.readdir("/", (e, content) => {  
                    conn.readdir("/folder0", (err, deeperContent) =>{
                        //console.log(err, deeperContent);                
                        resolve();                 
                    });                                         
                });
            });        
        });

        xit('Function invocation made as user without read rights returns initial login should fail');
    });

    describe('_openReadStream', () => {
        it('Function invocation made path to existing source returns the data', async() =>{
            return new Promise((resolve,reject)=>{
                var conn = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                conn.readdir("/", (error,contents)=>{
                    conn.prepareForStreaming((error)=> {//https://github.com/OpenMarshal/npm-WebDAV-Client/blob/76392d8a72624c86679ab7f4d8694fe46588eb68/test/test.js
                        var readstream =conn.get("/document0");
                        let data = '';                        
                        readstream.on('data', (chunk) => {
                            data += chunk.toString();
                            console.log("data",data);
                            resolve();                         
                        });
                        readstream.on('end',()=>{
                            console.log("Done data and contents",data);
                            resolve();
                        });                       
                      
                    });
                });                
            });        

        });

        it('Function invocation made path to non-existing source returns Errors.ResourceNotFound', async() => {
            return new Promise((resolve,reject)=>{
                var conn = WebdavCleintConnection('client0_usergroup0_user0', 'test');            
                conn.get("/fake_file" , (err, contents) =>{
                    assert(err);
                    resolve();
                });                
            });       
        });   


        xit('Function invocation made when this._clientname  == null => Error.Forbidden');
    });

   /* describe('__setCredentials', () => {
        xit('Function invocation made with valid client name => correctly set _clientName');
        xit('unction invocation made with valid user name => correctly set _userName');
        xit('Function invocation made with client name different than the client name of the user with the given user name => Error.BadAuthentication');
    });*/

});


