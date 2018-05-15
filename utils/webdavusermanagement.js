const webdav = require('webdav-server').v2;
var bcryptjs = require('bcryptjs');
var Db = require("../utils/db").Db;

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

                        var newUser = new webdav.SimpleUser(userfromdb.name, userfromdb.password, false, false)
                        return newUser; 
                    });

                return user[0]}).then(function(user){
                        if(!user){
                            callback(Error, null);
                        }else{
                            console.log("!UserFromDB: ", user);
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
    
    class customPrivilegeManager {}

    class HTTPownAuthentication  {
        constructor(userManager, realm){
            this.realm = realm;
            this.userManager = userManager;
        };

      //  askForAuthentication() : {[headeName : string] : string}
      //  getUser(ctx : HTTPRequestContext, callback : (error : Error, user ?: IUser) => void) : void
      askForAuthentication(){
        var headerName = { 'WWW-Authenticate': 'Basic realm="' + this.realm + '"'};
        return headerName;
      }

      getUser(context, callback){
          var authHeader = context.headers.find('Authorization');
          console.log(authHeader);
         // var value = Buffer.from(/^Basic \s*([a-zA-Z0-9]+=*)\s*$/.exec(authHeader)[1], 'base64').toString().split(':', 2);
          //var username = value[0];
         // var password = value[1];
          //console.log(username);
          var dummyUser = {};
          return dummyUser; 
      }

    }
    
    module.exports.customUserManager = customUserManager;
    module.exports.customPrivilegeManager = customPrivilegeManager;
    module.exports.HTTPownAuthentication = HTTPownAuthentication;