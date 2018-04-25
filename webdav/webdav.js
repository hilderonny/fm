const webdav = require('webdav-server').v2;
var moduleconfig = require('../config/module-config.json');
var fs = require("fs");
var moduleconfig = require('../config/module-config.json');

    var dav = {
        init: async()=>{
            // User manager (tells who are the users)
            const userManager = new webdav.SimpleUserManager();
            const user = userManager.addUser('rf', 'rf', false);

            // Privilege manager (tells which users can access which files/folders)
            const privilegeManager = new webdav.SimplePathPrivilegeManager();
            privilegeManager.setRights(user, '/documents', [ 'all' ]);

            const WebDavserver = new webdav.WebDAVServer({
                port: 56789, //avoid default port, which might be already in use
                hostname: '127.0.0.1' //localhost
                //requireAuthentification: true,
            // httpAuthentication: new webdav.HTTPBasicAuthentication(userManager, 'Default realm'),
            // privilegeManager: privilegeManager
            });
            
            //  var webdavOptions = new webdav.WebDAVServerOptions;

            /*WebDavserver.rootFileSystem().addSubTree(WebDavserver.createExternalContext(), {
            'folder1': {                                // /folder1
                'file1.txt': webdav.ResourceType.File,  // /folder1/file1.txt
                'file2.txt': webdav.ResourceType.File   // /folder1/file2.txt
            },
            'file0.txt': webdav.ResourceType.File       // /file0.txt
            })*/
            // WebDavserver.newResource("./utils/db", any, ResourceType, IResource),IResource;

            
            WebDavserver.afterRequest((arg, next) => {
                console.log('>>', arg.request.method, arg.fullUri(), '>', arg.response.statusCode, arg.response.statusMessage, arg.response.body);
                next();
            })
        
            WebDavserver.start(httpServer => {
                console.log('Server started with success on the port: ' + httpServer.address().port);
                console.log('address: ' + httpServer.address().address);
                console.log('family: ' + httpServer.address().family);
                console.log('httpServer: ' + httpServer);
                
            });

            // await require("./utils/db").Db.init();
            WebDavserver.setFileSystem('/newfolder', new webdav.PhysicalFileSystem('./documents/rf'), (success) => {
                WebDavserver.start(() => console.log('READY'));
            });

        }
    }
    
    module.exports.dav = dav;