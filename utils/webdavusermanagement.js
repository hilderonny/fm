var bcryptjs = require('bcryptjs');
var Db = require("../utils/db").Db;

var userListHelper = async function(){
    return new Promise(resolve => {   
        Db.query(Db.PortalDatabaseName, `SELECT * FROM allusers;`).then((usersfromdatabase) => {
            var users =  usersfromdatabase.rows.map((userfromdb) => {
                return {
                    uid: userfromdb.name,
                    isAdministrator: false,
                    isDefaultUser: false,
                    username: userfromdb.name,
                    clientname: userfromdb.clientname,
                    password: userfromdb.password
                }
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
           /* Db.query(Db.PortalDatabaseName, `SELECT * FROM allusers;`).then((usersfromdatabase) => {
                var error = null;
                var users = usersfromdatabase.map((userfromdb) => {
                    return {
                        uid: userfromdb.name,
                        isAdministrator: false,
                        isDefaultUser: false,
                        username: userfromdb.name,
                        password: null
                    }
                });
                callback(error, users);
            });*/
            var error = null;
            callback(error,  this.users);
        }

        async setUsers(){
            this.users = await(userListHelper());
        }

        //getUserByName(name : string, callback : (error : Error, user ?: IUser) => void)
        getUserByName(name, callback){
             var listOfUsers = this.users;
             if(!listOfUsers[name]){
                 callback(Error, null);
             }else{
                 callback(null, listOfUsers[name]);
             }
        }

        //getUserByNamePassword(name : string, password : string, callback : (error : Error, user ?: IUser) => void)
        getUserByNamePassword(name, password, callback){
            this.getUserByName(name, (e, user) => {
                if(e)
                    return callback(e);
                    
                if(!bcryptjs.compareSync(password, user.password)){
                    callback(null, user);
                }else{
                    callback(Error);
                }
            });
        }
        
        //getDefaultUser(callback : (user : IUser) => void)
        getDefaultUser(callback){
            callback(null);
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