const webdav = require('webdav-server').v2;
var ph = require('../utils/permissionshelper');
var Db = require("../utils/db").Db;


async function getrootelements(clientname, forlist, permissions) {
    var clientmodulenames = (await Db.query(Db.PortalDatabaseName, `SELECT modulename FROM clientmodules WHERE clientname='${Db.replaceQuotes(clientname)}';`)).rows.map(r => `'${Db.replaceQuotes(r.modulename)}'`);
    // Die Modulzuord nungen von Portalen selbst werden nicht in  den clientmodules gepflegt und müssen daher unbeachtet gelassen werden
    var additionalfilter = clientname !== Db.PortalDatabaseName ? ` AND (modulename IS NULL OR modulename IN (${clientmodulenames.join(",")}))` : ""; // modulename == null kommt bei benutzerdefinierten Datentypen vor.
    var relevantdatatypes = (await Db.query(clientname, `SELECT * FROM datatypes WHERE '${Db.replaceQuotes(forlist)}' = ANY (lists)${additionalfilter};`)).rows;
    var rootelements = [];
    for (var i = 0; i < relevantdatatypes.length; i++) { // Must be loop because it is not said, that all datatypes have all required columns so UNION will not work
        var rdt = relevantdatatypes[i];
        if (rdt.permissionkey && !permissions.find(p => p.key === rdt.permissionkey && p.canRead)) continue; // No permission to access specific datatypes
        var rdtn = Db.replaceQuotesAndRemoveSemicolon(rdt.name);
        var entities = (await Db.query(clientname, `
            SELECT e.*, CASE WHEN r.childcount > 0 THEN true ELSE false END haschildren FROM ${rdtn} e JOIN (
                SELECT e.name, count(rc) childcount FROM ${rdtn} e 
                LEFT JOIN relations rp ON rp.name2 = e.name AND rp.relationtypename = 'parentchild' AND rp.datatype2name = '${rdtn}' 
                LEFT JOIN relations rc ON rc.name1 = e.name AND rc.relationtypename = 'parentchild' AND rc.datatype1name = '${rdtn}'
                WHERE rp.name IS NULL
                GROUP BY e.name
            ) r ON r.name = e.name;
        `)).rows;
        entities.forEach(e => {
            e.datatypename = rdt.name;
            e.icon = rdt.icon;
            rootelements.push(e);
        });
    }
    return rootelements;
}
var davdocs={
    setfiles: async(WebDavserver)=>{
       // var clientname = "rf";
        var clientname = "5a620ac917252917087cd8db";
        var user={clientname: clientname, isadmin:true}
       // console.log(WebDavserver.res)
        var permissions = await ph.getpermissionsforuser(user);
        var rootelements = await getrootelements(user.clientname, "folders_hierarchy", permissions);

     // myutils.getchildren(clientname, clickedelement.datatypename, clickedelement.name, permissions, "folders_hierarchy")
        
       // console.log(rootelements);
        var buildJSON =  async function(rootelements){
            var result = [];
            for (i = 0; i < rootelements.length; i++) {
                var currentDataItem = rootelements[i]; 
                if(currentDataItem.datatypename == "folders"){
                    var objFolder = {}
                    result[currentDataItem.label]= objFolder;
                }else{
                    result[currentDataItem.label]= currentDataItem.label;
                }
            }

            return result;
        }
     
        var rootDataItemsArr = await buildJSON(rootelements);
      //  var rootDataItemsObj = json = Object.assign({}, rootDataItemsArr);


        const ctx = WebDavserver.createExternalContext();
        WebDavserver.rootFileSystem().addSubTree(WebDavserver.createExternalContext(), rootDataItemsArr, (e) => {
            if(e)
                throw e;
        });
        WebDavserver.start((httpServer) => console.log('Server started with success on the port: ' + httpServer.address().port));

     /**   WebDavserver.getResource(ctx, '/folder1/file2.txt').readDir((e, files) => {
            if(e)
            throw e;
        console.log(files)});**/
        /**var myfilesystem = new webdav.PhysicalFileSystem('./documents');      
                   
       
    WebDavserver.setFileSystem('/folder1', new webdav.VirtualFileSystem(),true,(success) => console.log(success));
        WebDavserver.setFileSystem('/documents', new webdav.PhysicalFileSystem('./documents'), (success) => {
        WebDavserver.start((httpServer) => console.log('Server started with success on the port: ' + httpServer.address().port));
    });**/
        
    }
        
}

    /**WebDavserver.setFileSystem('/documents', new webdav.PhysicalFileSystem('./documents'), (success) => {
    WebDavserver.start((httpServer) => console.log('Server started with success on the port: ' + httpServer.address().port));**/



class arrangeFS extends webdav.VirtualFileSystem {
    _readDir(path, ctx, callback){
        var err = null;
       callback(err, ["testFile1", "testFile2"]);
    }
}

module.exports.davdocs = davdocs;
module.exports.arrangeFS = arrangeFS;