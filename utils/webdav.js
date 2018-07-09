const webdav = require('webdav-server').v2;
var moduleconfig = require('../config/module-config.json');
var fs = require("fs");
var Db = require("../utils/db").Db;
var localConfig = require('../config/localconfig.json');
var bcryptjs = require('bcryptjs');
var co = require("../utils/constants");
var ph = require('../utils/permissionshelper');
var doh = require("./dynamicobjecthelper");
var dh = require("./documentsHelper");


class WebdavFilesystem extends webdav.FileSystem {

    constructor() {
        super();
        this._lm = new webdav.LocalLockManager();
        this._pm = new webdav.LocalPropertyManager();
        this._clientname = null;
        this._username = null;
    }

    // Dummy implementation. Gets relevant when updating files 
    _lockManager(path, ctx, callback) {
        callback(null, this._lm);
    }

    // Dummy implementation
    _propertyManager(path, ctx, callback) {
        callback(null, this._pm);
    }

    //helper function 
    retriveElements (path, traverseDeeply){ 
        var self = this;
        var cacheduser;
        return Db.getDynamicObject(self._clientname, "users", self._username).then(user => {
            user.clientname = self._clientname;
            return require("../middlewares/auth").getCachedUser(user.name);
        }).then(cachedUser => {
            cacheduser =  cachedUser;
            return doh.getrootelements(self._clientname, "folders_hierarchy", cacheduser.permissions);
        }).then( async function(rootElements){
           /* if(rootElements){
                console.log("OK rootElements");
            }*/
            // Distinguish between root path and child paths
            if (path.isRoot()) {
                return rootElements;
            } else {      
                var counter = 1; //skip empty entry before the root
                var subPathsArr = path.toString().split("/");              
                var currentRootElements = rootElements;
                var currentParentElement = [];
                var depth;
                //make distinction between ...TODO
                if(traverseDeeply){
                    depth = subPathsArr.length;
                } else{
                   depth =  subPathsArr.length -1;
                }
                while(counter < depth){
                    currentParentElement = currentRootElements.find(function(crrentElement){return crrentElement.label == subPathsArr[counter];});
                    if (!currentParentElement){
                       // console.log("No parent element for entry", subPathsArr[counter]); //, "for ref: ", currentRootElements);
                        return [];
                    }else{ 
                       // console.log("currentParentElement", currentParentElement); 
                        currentRootElements = await doh.getchildren(self._clientname, currentParentElement.datatypename,
                                                                    currentParentElement.name, cacheduser.permissions, "folders_hierarchy");
                    }
                    counter++;
                }
                return currentRootElements;//doh.getchildren(self._clientname, element.datatypename, element.name, cacheduser.permissions, "folders_hierarchy");               
            }
        });
   }

    // Return correct type of entry by asking the internal cache
    _type(path, ctx, callback) {
        var self = this;
        return  self.retriveElements(path, false).then(function(allElements){
            if (path.isRoot()) return callback(null, webdav.ResourceType.Directory);
            var subPaths = path.toString().split("/");
            var element = allElements.find(function(curentElemet){return curentElemet.label == subPaths[subPaths.length - 1]});
            if (!element) return callback(webdav.Errors.ResourceNotFound);
            if (element.datatypename === "folders") return callback(null, webdav.ResourceType.Directory);
            if (element.datatypename === "documents") return callback(null, webdav.ResourceType.File);
            callback(null, webdav.ResourceType.NoResource);
        });     
    }

    //MOVE request
    _move(pathFrom, pathTo, contextAndOverwriteFlag, callback) {
        var self = this;
        var lastElementIndex = pathFrom.paths.length - 1;
        if (pathTo.paths.includes(pathFrom.paths[lastElementIndex])) { //request to reallocate file/folder
            callback(webdav.Errors.Forbidden); //action is prohibited
        } else { //request to rename file/folder
            var newLabel = pathTo.paths[pathTo.paths.length - 1];
            var clientname = contextAndOverwriteFlag.context.user.clientname;
            self.retriveElements(pathFrom, false).then(function(allElements){
                var subPaths = pathFrom.toString().split("/");
                var element = allElements.find(function(curentElemet){return curentElemet.label == subPaths[subPaths.length - 1]});
                if(element){
                    Db.updateDynamicObject(clientname, element.datatypename, element.name, { label: newLabel }).then(function () {
                       callback();
                    });
                } else {
                    callback(webdav.Errors.ResourceNotFound);
                }
            })
        }
    }

    // Request for file deletion
    _delete(path, ctx, callback) {
        callback(webdav.Errors.Forbidden);
    }

    // Obtain direct child elements of a directory
    _readDir(path, ctx, callback) {
        var self = this;
        var cacheduser;
        self.retriveElements(path, true).then(dirElements => {
            // Cache folders and documents for later lookup
            dirElements.forEach(de => {
                //NO elements with types different than folders/documents can be retrieved, as long as such are not added to the "folders_hierarchy"- list in mofule-config
                // if (["folders", "documents"].indexOf(de.datatypename) < 0) return;

                // Displayname does not work in windows: https://stackoverflow.com/a/21636844
                var label = de.label ? de.label : de.name;
                var fullPath = path.getChildPath(label).toString();
                // Label is used as path identifier, no duplicate names possible!
            });
            callback(null, dirElements.map(de => de.label ? de.label : de.name));
        });
    }

    // Request for download of a file
    _openReadStream(path, ctx, callback) {
        var Path = path;
        var self = this;
        self.retriveElements(Path, false).then(function(allElements){
            // the existance of the ellement is checked already in the _type function
            //if (!element) return callback(webdav.Errors.ResourceNotFound);
            var subPaths = Path.toString().split("/");
            var element = allElements.find(function(curentElemet){return curentElemet.label == subPaths[subPaths.length - 1]});
            var path = dh.getDocumentPath(self._clientname, element.name);
            fs.open(path, 'r', function (error, fd) {
                if (error) return callback(webdav.Errors.ResourceNotFound);
                callback(null, fs.createReadStream(null, { fd: fd }));
            });
        });
    }

    // Save information about the logged user
    _setCredentials(clientname, username) {
        this._clientname = clientname;
        this._username = username;
    }

};

class customUserManager {

    constructor(fileSystem) {
        this.users = [];
        this.fs = fileSystem;
    }

    //getUserByName(name : string, callback : (error : Error, user ?: IUser) => void)
    getUserByName(name, callback) {
        Db.query(Db.PortalDatabaseName, `SELECT * FROM allusers WHERE name='${name}';`).then((userfromdatabase) => {
            var user = userfromdatabase.rows.map((userfromdb) => {

                var newUser = new webdav.SimpleUser(userfromdb.name, userfromdb.password, false, false);
                newUser.clientname = userfromdb.clientname;
                return newUser;
            });

            return user[0]
        }).then(function (user) {
            if (!user) {
                callback(webdav.Errors.BadAuthentication, null);
            } else {
                callback(null, user);
            }
        });

    }

    //getUserByNamePassword(name : string, password : string, callback : (error : Error, user ?: IUser) => void)
    getUserByNamePassword(name, password, callback) {
        var self = this;
        this.getUserByName(name, (e, user) => {
            if (e) {
                return callback(e);
            }
            if (bcryptjs.compareSync(password, user.password)) {
                delete user.password;
                self.fs._setCredentials(user.clientname, name);
                callback(null, user);
            } else {
                callback(webdav.Errors.BadAuthentication);
            }
        });
    }

    //getDefaultUser(callback : (user : IUser) => void)
    getDefaultUser(callback) {
        var defautUser = {
            uid: "defaultUser",
            isAdministrator: false,
            isDefaultUser: true,
            username: "defaultUser",
            password: null
        }
        callback(defautUser);
    }

}

class customPrivilegeManager extends webdav.PrivilegeManager {

    //overrive _can function
    _can(path, simpleUser, resource, privilege, callback) {

        Db.getDynamicObject(simpleUser.clientname, co.collections.users.name, simpleUser.username).then((completeuser) => {
            completeuser.clientname = simpleUser.clientname; //filed has to be added becuse it is not contained in the DB record
            var permissionsFromDB = ph.getpermissionsforuser(completeuser);
            return permissionsFromDB;
        }).then(function (permissionsFromDB) {

            var relevant_permission_key = [];

            for (var i = 0; i < permissionsFromDB.length; i++) {
                var currentPermission = permissionsFromDB[i];
                if (currentPermission.key == co.permissions.OFFICE_DOCUMENT) {
                    relevant_permission_key = currentPermission;
                    break;
                }
            }

            return relevant_permission_key;
        }).then(function (relevant_permission_key) {
            if (relevant_permission_key.length < 1) {
                callback(null, false);
            } else {

                if (privilege.indexOf('canRead') >= 0) {
                    callback(null, relevant_permission_key.canRead);
                } else {
                    callback(null, relevant_permission_key.canWrite);
                }
            }
        });
    };

}

var dav = {

    init: async () => {

        var customFS = new WebdavFilesystem();
        var userManager = new customUserManager(customFS);
        var privilegeManager = new customPrivilegeManager();

        // SSL für HTTPS-Server vorbereiten, siehe https://franciskim.co/2015/07/30/how-to-use-ssl-https-for-express-4-x-node-js/
        var fs = require('fs');
        var credentials = {
            key: fs.existsSync('./priv.key') ? fs.readFileSync('./priv.key', 'utf8') : null,
            cert: fs.existsSync('./pub.cert') ? fs.readFileSync('./pub.cert', 'utf8') : null
        };

        const WebDavserver = new webdav.WebDAVServer({
            port: localConfig.webdavport, //avoid default port, which might be already in use
            requireAuthentification: true,
            httpAuthentication: new webdav.HTTPBasicAuthentication(userManager),
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

        WebDavserver.start((httpServer) => console.log('Webdav server started with success on the port: ' + httpServer.address().port));

    }
}

module.exports.dav = dav;
