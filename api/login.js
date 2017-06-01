var router = require('express').Router();
var jsonWebToken = require('jsonwebtoken');
var localConfig = require('../config/localconfig.json'); // http://stackoverflow.com/a/14678694
var bcryptjs = require('bcryptjs');

// Login a user with username and password and return a token for further use
router.post('/', (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    // Check user against database
    var users = req.db.get('users');
    users.findOne({ name: username }).then((userInDatabase) => {
        if (!userInDatabase || !bcryptjs.compareSync(password, userInDatabase.pass)) {
            return res.sendStatus(401);
        }
        // Create token
        var token = jsonWebToken.sign({
            userId: userInDatabase._id,
            time: Date.now()
        }, localConfig.tokensecret, {
            expiresIn: '24h'
        });
        return res.send({
            token: token, 
            clientId: userInDatabase.clientId // Used to distinguish between portal and client users to color the toolbar
        });
    });
});

module.exports = router;
