var router = require('express').Router();
var jsonWebToken = require('jsonwebtoken');
var localConfig = require('../config/localconfig.json'); // http://stackoverflow.com/a/14678694
var bcryptjs = require('bcryptjs');
var Db = require("../utils/db").Db;

// Login a user with username and password and return a token for further use
router.post('/', async(req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    // Check user against database
    var userresult = await Db.query(Db.PortalDatabaseName, `SELECT * FROM allusers WHERE name='${username}';`);
    if (userresult.rowCount < 1 || !bcryptjs.compareSync(password, userresult.rows[0].password)) {
        return res.sendStatus(401);
    }
    // Create token
    var token = jsonWebToken.sign({
        username: username,
        time: Date.now()
    }, localConfig.tokensecret, {
        expiresIn: '24h'
    });
    res.send({
        token: token, 
        clientId: userresult.rows[0].clientname // Used to distinguish between portal and client users to color the toolbar
    });
});

module.exports = router;
