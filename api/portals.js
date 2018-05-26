/**
 * CRUD API for portal management
 */
var co = require('../utils/constants');
var hat = require('hat');
var auth = require('../middlewares/auth');
var router = require('express').Router();

/**
 * Generates a new license key and returns it without assigning it to a portal
 */
router.get('/newkey', auth(co.permissions.LICENSESERVER_PORTAL, 'r', co.modules.licenseserver), async(req, res) => {
    // Generate license key with hat, https://github.com/substack/node-hat
    var licensekey = hat(1024, 32);
    return res.send(licensekey);
});

module.exports = router