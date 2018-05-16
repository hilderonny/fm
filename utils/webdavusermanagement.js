const webdav = require('webdav-server').v2;
var bcryptjs = require('bcryptjs');
var Db = require("../utils/db").Db;
var co = require("../utils/constants");
var ph = require('../utils/permissionshelper');

var userListHelper = async function(){
    return new Promise(resolve => {   
        Db.query(Db.PortalDatabaseName, `SELECT * FROM allusers;`).then((usersfromdatabase) => {
            var users =  usersfromdatabase.rows.map((userfromdb) => {

                var newUser = new webdav.SimpleUser(userfromdb.name, "test", true, false)
                return newUser; 
            });
            resolve(users);
        });
    });
}


class customUserManager {
    
        constructor() {
            this.users = [];   
        }
        
        //getUsers(callback : (error : Error, users ?: IUser[]) => void)
        getUsers(callback) {
            var error = null;
           // console.log("getUsers: ",  this.users);
            callback(error,  this.users);
        }

        async setUsers(){
            this.users = await(userListHelper());
        }

        //getUserByName(name : string, callback : (error : Error, user ?: IUser) => void)
        getUserByName(name, callback){


            Db.query(Db.PortalDatabaseName, `SELECT * FROM allusers WHERE name='${name}';`).then((userfromdatabase) => {
                console.log("userfromdatabase: ", userfromdatabase);
                var user =  userfromdatabase.rows.map((userfromdb) => {

                        var newUser = new webdav.SimpleUser(userfromdb.name, userfromdb.password, false, false);
                        newUser.clientname = userfromdb.clientname;
                        return newUser;
                    });

                return user[0]}).then(function(user){
                        if(!user){
                            callback(Error, null);
                        }else{
                            callback(null, user);
                        }
                    });

        }

        //getUserByNamePassword(name : string, password : string, callback : (error : Error, user ?: IUser) => void)
        getUserByNamePassword(name, password, callback){
        
            this.getUserByName(name, (e, user) => {
                if(e){
                     return callback(e);
                }
                  // console.log("User From DB: ", user); 
                if(bcryptjs.compareSync(password, user.password)){
                    delete user.password;
                    callback(null, user);
                }else{
                    callback(Error);
                }
            });
        }
        
        //getDefaultUser(callback : (user : IUser) => void)
        getDefaultUser(callback){
            var defautUser  =  {uid: "defaultUser",
                                isAdministrator: false,
                                isDefaultUser: true,
                                username: "defaultUser",
                                password: null}
            callback(defautUser);
        }
       
    }


    class arrangeUserManager extends webdav.SimpleUserManager {
    
        //getUserByName(name : string, callback : (error : Error, user ?: IUser) => void)
        getUserByName(name, callback){

            Db.query(Db.PortalDatabaseName, `SELECT * FROM allusers WHERE name='${name}';`).then((userfromdatabase) => {
               // console.log("userfromdatabase: ", userfromdatabase);
                var user =  userfromdatabase.rows.map((userfromdb) => {

                        var newUser = new webdav.SimpleUser(userfromdb.name, userfromdb.password, false, false);
                        newUser.clientname = userfromdb.clientname;
                        return newUser;
                    });

                return user[0]}).then(function(user){
                        if(!user){
                            callback(Error, null);
                        }else{
                            callback(null, user);
                        }
                    });
        }

        //getUserByNamePassword(name : string, password : string, callback : (error : Error, user ?: IUser) => void)
        getUserByNamePassword(name, password, callback){
        
            this.getUserByName(name, (e, user) => {
                if(e){
                     return callback(e);
                }
                  // console.log("User From DB: ", user); 
                if(bcryptjs.compareSync(password, user.password)){
                    delete user.password;
                    this.addUser(user);
                    callback(null, user);
                }else{
                    callback(Error);
                }
            });
        }       
    }
    
    class customPrivilegeManager extends webdav.PrivilegeManager {

            //overrive _can function
            _can(path, simpleUser, resource, privilege, callback){

                   Db.getDynamicObject(simpleUser.clientname, co.collections.users.name, simpleUser.username).then((completeuser) => {
                    completeuser.clientname = simpleUser.clientname; //filed has to be added becuse it is not contained in the DB record
                    var permissionsFromDB = ph.getpermissionsforuser(completeuser);
                    return permissionsFromDB;
                    }).then(function(permissionsFromDB){

                            var  relevant_permission_key = []; 
                        
                            for(i = 0; i < permissionsFromDB.length; i++){
                                var currentPermission = permissionsFromDB[i];
                                if(currentPermission.key == co.permissions.OFFICE_DOCUMENT){
                                    relevant_permission_key = currentPermission;
                                    break;
                                }
                            }

                            return relevant_permission_key;
                        }).then(function(relevant_permission_key){
                            if(relevant_permission_key.length < 1){
                                 callback(null,false);
                            }else{

                               if (privilege.indexOf('canRead')>=0){
                                    callback(null, relevant_permission_key.canRead);
                                }else{
                                    callback(null, relevant_permission_key.canWrite);
                                }
                            }
                        });
            };

    }
    
    module.exports.customUserManager = customUserManager;
    module.exports.customPrivilegeManager = customPrivilegeManager;