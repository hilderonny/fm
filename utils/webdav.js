const webdav = require('webdav-server').v2;
var moduleconfig = require('../config/module-config.json');
var fs = require("fs");
var Db = require("../utils/db").Db;
var userManagerClass = require("../utils/webdavusermanagement").customUserManager;
//var arrangeUserManager = require("../utils/webdavusermanagement").arrangeUserManager;
var arrangePrivilegeManager = require("../utils/webdavusermanagement").customPrivilegeManager;
var wdfs = require("./webdavfilesystem");

    var dav = {
        
        init: async()=>{
            
            var customFS = new  wdfs.WebdavFilesystem();
            var customUserManager = new userManagerClass(customFS); //  new arrangeUserManager(customFS);
            var privilegeManager = new arrangePrivilegeManager(); 
            
            // SSL für HTTPS-Server vorbereiten, siehe https://franciskim.co/2015/07/30/how-to-use-ssl-https-for-express-4-x-node-js/
            var fs = require('fs');
            var credentials = { 
                key: fs.existsSync('./priv.key') ? fs.readFileSync('./priv.key', 'utf8') : null, 
                cert: fs.existsSync('./pub.cert') ? fs.readFileSync('./pub.cert', 'utf8') : null
            };
            
            var arrangeFS = require("../utils/webdavfoldersanddocuments").arrangeFS;
            const WebDavserver = new webdav.WebDAVServer({
                port: 56789, //avoid default port, which might be already in use
                hostname: '127.0.0.1', //localhost
                requireAuthentification: true,
                httpAuthentication: new webdav.HTTPBasicAuthentication(customUserManager),
                https: credentials,
                privilegeManager: privilegeManager,
                enableLocationTag: true,
                rootFileSystem: customFS
            });

            //print incoming client requests
            WebDavserver.afterRequest((arg, next) => {
                console.log('>>', arg.request.method, arg.fullUri(), '>', arg.response.statusCode, arg.response.statusMessage, arg.response.body);
                next();
            }); 
            
            WebDavserver.start((httpServer) => console.log('Server started with success on the port: ' + httpServer.address().port));
           // var fileManager = require("../utils/webdavfoldersanddocuments").davdocs.setfiles(WebDavserver);

        }
    }
    
    module.exports.dav = dav;