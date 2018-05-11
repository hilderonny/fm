const webdav = require('webdav-server').v2;
var moduleconfig = require('../config/module-config.json');
var fs = require("fs");
var moduleconfig = require('../config/module-config.json');
var Db = require("../utils/db").Db;
var ph = require('../utils/permissionshelper');



    var dav = {

        prepareListOfUsers: async()=>{

            var userResult = await Db.query(Db.PortalDatabaseName, `SELECT * FROM allusers;`);
            console.log(userResult);
        //    console.log(userResult.rows.length);
            // User manager (tells who are the users)
            const userManager = new webdav.SimpleUserManager();
            for(i = 0; i < userResult.rows.length; i++){
                var currentUserName = userResult.rows[i].name;
                var currentPassword = userResult.rows[i].password;
               //TODO find a way to compare the hashed password form the DB agains the plain text pw form the user input
                userManager.addUser(currentUserName, "pw" + i, false); //TODO replace dummy pw with the one from the DB
            } 

            return userManager;
        },

        parceUserRights: async(userManager)=>{
            // Privilege manager (tells which users can access which files/folders)
            const privilegeManager = new webdav.SimplePathPrivilegeManager();
            var users = await userManager.users;
            //console.log("USERS: " + users);
            console.log(Object.entries(users));
           //console.log(Object.entries(users).length);
           var numUsers = Object.entries(users).length;
            for(i = 0; i < numUsers; i++){
                var currentUser = Object.entries(users)[i][1];
                //console.log(currentUser);
                //console.log(i);
               // console.log(Object.entries(users)[i][1].username);
                
                privilegeManager.setRights(currentUser, '/', [ 'all' ]);
            }
            return privilegeManager;
        },

        init: async()=>{

            var userManager = await(dav.prepareListOfUsers(userManager));
            var privilegeManager = await(dav.parceUserRights(userManager));
            
            const WebDavserver = new webdav.WebDAVServer({
                port: 56789, //avoid default port, which might be already in use
                hostname: '127.0.0.1', //localhost
                requireAuthentification: true,
                 httpAuthentication: new webdav.HTTPDigestAuthentication(userManager, 'Default realm'),
                //httpAuthentication: new webdav.HTTPBasicAuthentication(userManager),
                privilegeManager: privilegeManager
            });

            /*WebDavserver.beforeRequest(function(){

            });*/

            WebDavserver.afterRequest((arg, next) => {
                console.log('>>', arg.request.method, arg.fullUri(), '>', arg.response.statusCode, arg.response.statusMessage, arg.response.body);
                next();
            }); 

           // await require("../utils/webdavfoldersanddocuments.js").davdocs.setfiels();

           var fileManager = require("../utils/webdavfoldersanddocuments").davdocs.setfiles(WebDavserver);

        
        
          


        //

            // await require("./utils/db").Db.init();
           /** $http.get('/api/documents').then(function (response) {        
                $scope.doc = response.data;  
                console.log(doc);
  
            });
*/
          
           /** const name = '92d7a719-2597-439f-b2aa-1244c7c9cccb';
            const ctx = WebDavserver.ExternalRequestContext.create(server);
            WebDavserver.getResource(ctx, '/api/documents/' + name, (e, r) => {
                if(e) return isValid(false, 'Could not find //' + name, e);
    
                if(!type.isFile)
                    return callback(r, server);
                
                r.openWriteStream((e, wStream) => {
                    if(e) return isValid(false, 'Could not open the resource for writing.', e);
                    wStream.end(content, (e) => {
                        if(e) return isValid(false, 'Could not write content to the resource.', e);
    
                        callback(r, server);
                    });
                })
            })**/


        }
    }
    
    module.exports.dav = dav;