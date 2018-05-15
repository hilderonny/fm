const webdav = require('webdav-server').v2;
var moduleconfig = require('../config/module-config.json');
var fs = require("fs");
var moduleconfig = require('../config/module-config.json');
var Db = require("../utils/db").Db;
var ph = require('../utils/permissionshelper');
var userManagerClass = require("../utils/webdavusermanagement").customUserManager;

    var dav = {

      /*  prepareListOfUsers: async()=>{

            var userResult = await Db.query(Db.PortalDatabaseName, `SELECT * FROM allusers;`);
            //console.log(userResult);
            // User manager (tells who are the users)
            const userManager = new webdav.SimpleUserManager();
            for(i = 0; i < userResult.rows.length; i++){
                var currentUserName = userResult.rows[i].name;
                var currentPassword = userResult.rows[i].password;
                userManager.addUser(currentUserName, currentPassword, false); 
            } 

            return userManager;
        },

        parceUserRights: async(userManager)=>{
            // Privilege manager (tells which users can access which files/folders)
            const privilegeManager = new webdav.SimplePathPrivilegeManager();
            var users;
            await userManager.getUsers(function(e,usersRes){
                users = usersRes;
            });
           console.log("USERS in PM: " + Object.entries(users));
           var numUsers = Object.entries(users).length;
            for(i = 0; i < numUsers; i++){
                var currentUser = Object.entries(users)[i][1];
                console.log(currentUser);             
                privilegeManager.setRights(currentUser, '/', [ 'all' ]);
            }
            return privilegeManager;
        },*/

        init: async()=>{

           // var userManager = await(dav.prepareListOfUsers(userManager));
            
            var customUserManager = new userManagerClass();
          //  await customUserManager.setUsers();

            var privilegeManager = new webdav.SimplePathPrivilegeManager(); //await(dav.parceUserRights(customUserManager));
            
            // SSL für HTTPS-Server vorbereiten, siehe https://franciskim.co/2015/07/30/how-to-use-ssl-https-for-express-4-x-node-js/
            var fs = require('fs');
            var credentials = { 
                key: fs.existsSync('./priv.key') ? fs.readFileSync('./priv.key', 'utf8') : null, 
                cert: fs.existsSync('./pub.cert') ? fs.readFileSync('./pub.cert', 'utf8') : null
            };
            
            //read-only permissions
            privilegeManager.__proto__._can=function(a,b,c,d,e){
                console.log(d)
                if (d.indexOf('canRead')>=0){
                    e(null,true);
                }else{
                    e(null,false);
                }
                
            };

            var arrangeFS = require("../utils/webdavfoldersanddocuments").arrangeFS;
            const WebDavserver = new webdav.WebDAVServer({
                port: 56789, //avoid default port, which might be already in use
                hostname: '127.0.0.1', //localhost
                requireAuthentification: true,
                httpAuthentication: new webdav.HTTPBasicAuthentication(customUserManager),
                https: credentials,
                privilegeManager: privilegeManager,
                enableLocationTag: true
               // rootFileSystem: new  arrangeFS()
            });

            //print incoming client requests
            WebDavserver.afterRequest((arg, next) => {
                console.log('>>', arg.request.method, arg.fullUri(), '>', arg.response.statusCode, arg.response.statusMessage, arg.response.body);
                next();
            }); 

            var clientname = "5a620ac917252917087cd8db"; //TODO make this value dependednt on the logged user
            var fileManager = require("../utils/webdavfoldersanddocuments").davdocs.setfiles(WebDavserver, clientname);
           // WebDavserver.start((httpServer) => console.log('Server started with success on the port: ' + httpServer.address().port));

           

        }
    }
    
    module.exports.dav = dav;