var router = require('express').Router();
var lh = require("../utils/loginHelper");
var Db = require("../utils/db").Db;

// Login a user with username and password and return a token for further use
router.post('/', async(req, res) => {
    var loginresult = await lh.getToken(req.body.username, req.body.password);
    if (!loginresult) return res.sendStatus(401);
    var client=(await Db.query(Db.PortalDatabaseName, `SELECT * FROM clients WHERE name = '${loginresult.clientname}';`)).rows;
    res.send({
        token: loginresult.token, 
        clientId: loginresult.clientname, // Used to distinguish between portal and client users to color the toolbar
        clientlabel:client[0].label
       
    });
});

module.exports = router;
