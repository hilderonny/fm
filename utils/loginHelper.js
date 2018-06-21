var Db = require("../utils/db").Db;
var bcryptjs = require('bcryptjs');
var jsonWebToken = require('jsonwebtoken');
var localConfig = require('../config/localconfig.json');

/**
 * Tries a login with the given credentials and returns null when user could not be authenticated
 * or an object with the token and the clientname.
 * {
 *  token: String
 *  clientname: String
 * }
 */
module.exports.getToken = async(username, password) => {
    // Check user against database
    var userresult = await Db.query(Db.PortalDatabaseName, `SELECT * FROM allusers WHERE name='${Db.replaceQuotes(username)}';`);
    if (userresult.rowCount < 1 || !bcryptjs.compareSync(password, userresult.rows[0].password)) {
        return null; // Could not be authenticated
    }
    // Create token
    var token = jsonWebToken.sign({
        username: username,
        time: Date.now()
    }, localConfig.tokensecret, {
        expiresIn: '24h'
    });
    return {
        token: token, 
        clientname: userresult.rows[0].clientname
    };
}