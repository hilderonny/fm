/**
 * Unit tests for the utils/webdav
 */
var assert = require('assert');
const webdavClient = require('webdav-client');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;

describe('UTILS webdav', () => {

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
                    assert(e);
                    resolve();
                });
            });
        });
     
    });

    //customPrivilegeManager:  

    describe('_can', () => {
        it('Function invocation made for valid user with non-privilege query returns Unauthorized ', async ()=>{
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.OFFICE_DOCUMENT);
            return new Promise(function(resolve, reject){            
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                client.readdir("/", (e,content)=>{  
                    assert(e);        
                    resolve();
                });            
             });
        });   
    });
    //WebDav Filesystem
    describe('_type', () => {
        it('Function invocation made with path to non-existing source returns Errors ResourceNotFound 404', async()=>{
            return new Promise (function(resolve, reject){
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                client.readdir("/non_exsisting_file", (e,content)=>{
                    assert(e);
                    resolve();
                });
            });
        });

        it('Function invocation made with path to element that has type different than folder or document returns Error NotAllowed', async function(){
            return new Promise ( async function(resolve, reject){
                // Update the folders_hierarchy list for notes
                var updateset = {lists: [ "notes_hierarchy", "folders_hierarchy" ]};
                await Db.updaterecordtype("client0", "notes", updateset);
                // Create parent-child relation between a folder and a note
                await th.createRelation("folders", "client0_folder0", "notes", "client0_note0", "parentchild");           
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                client.get("/folder0/client0_note0", (err2, innerContent2)=>{
                    assert(err2);
                    resolve();
                });
            });
        });

        it('Function invocation made with path to the root returns webdav.ResourceType.Directory', async function(){
            return new Promise (function(resolve, reject){
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                client.readdir("/", (e,content)=>{
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
                client.move('/folder0', '/folder1/folder0', function(err){
                    assert(err);
                    resolve();
                });
            });
        });
        it('Function invocation made with path(pathFrom) to non-existing source returns Errors.ResourceNotFound', async()=>{
            return new Promise (function(resolve, reject){
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                client.move('/non_existing_data', '/irrelevant_rename', function(err){
                    assert(err);
                    resolve();
                });
            });
        });

        it('Function invocation made with same source and destination path (pathTo == pathFrom) returns file/folder name stays the same', async()=>{
            return new Promise (function(resolve, reject){
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                client.move('/folder0', '/folder0', function(err){
                    assert(err);
                    resolve();
                });
            });
        });
        it('Function invocation made with valid parameters  returns correctly updated name', async () =>{
            return new Promise (function(resolve, reject){
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                client.readdir("/folder0", (e, content)=>{ 
                    client.move('/folder0', '/folder_renamed', function(err){
                        if(err){
                            resolve(assert.fail(err));
                        }else{
                            client.readdir('/folder_renamed', function(err, contentAfterRename){
                                assert.ifError(err);
                                assert.equal(content.length, contentAfterRename.length);
                                resolve();
                            });
                        }
                    })
                });
            });
        });

        it('Request rename as user without write rights returns Error.Forbidden', async()=>{
            return new Promise (async function(resolve, reject){
                await th.removeWritePermission("client0", "client0_usergroup0", co.permissions.OFFICE_DOCUMENT);
                var client = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                client.move('/folder0', '/folder_renamed', function(err){
                    assert(err);
                    resolve();
                });
            });
        });
    });

    describe('_delete', () => {
        it('Valid delettion request returns error.forbidden', async()=>{
            return new Promise((resolve, reject)=>{
                var conn = WebdavCleintConnection('client0_usergroup0_user0', 'test');     
                conn.delete("/folder1", (error)=>{
                    assert(error);
                    resolve();
                });    
            });
        });          
    });

    describe('_readDir', () => {
        it('Function invocation with path to non-existing source returns Errors.ResourceNotFound', async()=>{
            return new Promise((resolve, reject) => {
                var conn = WebdavCleintConnection('client0_usergroup0_user0', 'test');         
                conn.readdir("/folder10", (err, content) =>{
                    assert(err);
                    resolve();                      
                });
            });
        });

        it('Function invocation with partally inccorect path source returns Errors.ResourceNotFound', async()=>{
            return new Promise((resolve, reject) => {
                var conn = WebdavCleintConnection('client0_usergroup0_user0', 'test');            
                conn.readdir("/fake_parent_folder/folder00", (err, content) =>{ 
                    assert(err);
                    resolve();                                                              
                }); 
            });
        });

        it('Function invocation with empty path returns Errors.ResourceNotFound', async()=>{
            return new Promise((resolve, reject) => {
                var conn = WebdavCleintConnection('client0_usergroup0_user0', 'test');   
                conn.readdir("bla-bla", (err, content) =>{
                    assert(err);
                    resolve();                    
                });
            });
        });

        it('Function invocation made without authorized user returns Error.Frobidden',async()=>{
            return new Promise((resolve, reject) => {
                var conn = WebdavCleintConnection('client1_usergroup0_user0', 'test');
                conn.readdir("/folder0", (err, content) =>{
                    assert(err);
                    resolve();                                         
                });
            });
        });

        it('Function invocation made with valid root path returns correct data retrieval', async () => {
            return new Promise((resolve, reject) => {
                var conn = WebdavCleintConnection('client0_usergroup0_user0', 'test');             
                conn.readdir("/", (e, content) => {                 
                    assert(content);
                    resolve();                                 
                });
            });
        });

        it('Function invocation made with valid non-root path returns correct data retrieval', async () =>{
            return new Promise((resolve, reject) => {
                var conn = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                conn.readdir("/folder0", (err, content) =>{
                    assert(content);
                    resolve();                 
                });
            });        
        });

        it('Function invocation made with empty clientname and correct password returns unauthrized', async () =>{
            return new Promise(function(resolve, reject){
                var client = WebdavCleintConnection(null, 'test');
                client.readdir("/", (e,content)=>{            
                    assert(e)
                    resolve();
                });
            });
        }); 
        
        it('Function invocation made with a path to non-labeled source', async()=>{
            return new Promise((resolve, reject) => {
                var conn = WebdavCleintConnection('client0_usergroup0_user0', 'test'); 
                conn.readdir("/", (e, content)=>{
                    var elementWithoutLabel = content.indexOf("client0_folder2");
                    if(elementWithoutLabel < 0){
                        reject();
                    } else {
                        resolve();
                   }
                    
                });
            
            });
        });

    });

    describe('_openReadStream', () => {
        it('Function invocation made path to existing source returns the data', async() =>{
            return new Promise((resolve,reject)=>{
                var conn = WebdavCleintConnection('client0_usergroup0_user0', 'test');               
                var readstream = conn.get("/document0", function(err, content){
                    assert(content); //TODO compare against expected output
                    resolve();
                });       
            });        
        });

        it('Function invocation made path to non-existing source returns Errors.ResourceNotFound', async() => {
            return new Promise((resolve,reject)=>{
                var conn = WebdavCleintConnection('client0_usergroup0_user0', 'test');
                var readstream =conn.get("/folder0/fake_doc", function(err, content){
                    assert(err);
                    resolve();
                });              
            });      
        });   

        it('Function invocation made path to source exisiting only as metadata in db returns Errors.ResourceNotFound', async() => {
            return new Promise((resolve,reject)=>{
                var conn = WebdavCleintConnection('client0_usergroup0_user0', 'test');                          
                    var readstream =conn.get("/documentWithoutContent", function(err, content){
                        assert(err);
                        resolve();
                    });         
            });      
        });
        
    });
});


