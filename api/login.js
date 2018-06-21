var router = require('express').Router();
var lh = require("../utils/loginHelper");

// Login a user with username and password and return a token for further use
router.post('/', async(req, res) => {
    var loginresult = await lh.getToken(req.body.username, req.body.password);
    if (!loginresult) return res.sendStatus(401);
    res.send({
        token: loginresult.token, 
        clientId: loginresult.clientname // Used to distinguish between portal and client users to color the toolbar
    });
});

module.exports = router;
