const webdav = require('webdav-server').v2;
var doh = require("./dynamicobjecthelper");
var co = require("./constants");
var ph = require("./permissionshelper");
var dh = require("./documentsHelper");
var fs = require("fs");
var Db = require("./db").Db;

class WebdavFilesystem extends webdav.FileSystem {

    constructor() {
        super();
        this._cache = {}; // TODO: should be client dependent
        this._lm = new webdav.LocalLockManager();
        this._pm = new webdav.LocalPropertyManager();
        this._clientname = "737e7b80437b45e5b0def70b55d022df";
        this._username = "swriesa";
    }

    // Dummy implementation. Gets relevant when updating files 
    _lockManager(path, ctx, callback) {
        callback(null, this._lm);
    }

    // Dummy implementation
    _propertyManager(path, ctx, callback) {
        callback(null, this._pm);
    }

    // Return correct type of entry by asking the internal cache
    _type(path, ctx, callback) {
        if (path.isRoot()) return callback(null, webdav.ResourceType.Directory);
        var element = this._cache[path.toString()];
        if (!element) return callback(webdav.Errors.ResourceNotFound);
        if (element.datatypename === "folders") return callback(null, webdav.ResourceType.Directory);
        if (element.datatypename === "documents") return callback(null, webdav.ResourceType.File);
        callback(null, webdav.ResourceType.NoResource);
    }

    // Obtain direct child elements of a directory
    _readDir(path, ctx, callback) {
        var self = this;
        Db.getDynamicObject(self._clientname, "users", self._username).then(user => {
            user.clientname = self._clientname;
            return ph.getpermissionsforuser(user);
        }).then(permissions => {
            // Distinguish between root path and child paths
            if (path.isRoot()) {
                return doh.getrootelements(self._clientname, "folders_hierarchy", permissions);
            } else {
                var element = self._cache[path.toString()];
                return doh.getchildren(self._clientname, element.datatypename, element.name, permissions, "folders_hierarchy");
            }
        }).then(dirElements => {
            // Cache folders and documents for later lookup
            dirElements.forEach(de => {
                if (["folders", "documents"].indexOf(de.datatypename) < 0) return;
                // Displayname does not work in windows: https://stackoverflow.com/a/21636844
                var label = de.label ? de.label : de.name;
                var fullPath = path.getChildPath(label).toString();
                self._cache[fullPath] = de; // Label is used as path identifier, no duplicate names possible!
            });
            callback(null, dirElements.map(de => de.label ? de.label : de.name));
        });
    }

    // Request for download of a file
    _openReadStream(path, ctx, callback) {
        var element = this._cache[path.toString()];
        if (!element) return callback(webdav.Errors.ResourceNotFound);
        var path = dh.getDocumentPath(this._clientname, element.name);
        fs.open(path, 'r', function (error, fd) {
            if (error) return callback(webdav.Errors.ResourceNotFound);
            callback(null, fs.createReadStream(null, { fd: fd }));
        });
    }

};

module.exports.WebdavFilesystem = WebdavFilesystem;