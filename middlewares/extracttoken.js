/**
 * Middleware which extracts the authentication token from the request
 * and creates a req.user object with the user's _id as property.
 * Used via app.use(extracttoken).
 * The authentication itself is done in the api calls with router.get(..., auth, ...)
 */
var jsonWebToken = require('jsonwebtoken');
var localConfig = require('../config/localconfig.json'); // http://stackoverflow.com/a/14678694

module.exports = (req, res, next) => {
    var token = req.query.token || req.headers['x-access-token']; // Token must be sent with "x-access-token" - HTTP-Header or as "token" request parameter (for downloads)
    if (token) {
        jsonWebToken.verify(token, localConfig.tokensecret, (err, decoded) => {
            if (!err) {
                req.user = {
                    name: decoded.username,
                    tokenTime: decoded.time // Used in auth for checking whether the token is older than the last server start
                }; // See api/login
            }
            // Process request in any case, even if no token was provided
            next();
        });
    } else {
        next();        
    }
};