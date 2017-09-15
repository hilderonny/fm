/**
 * CRUD API for local portal settings. Settings are stored in /config/localconfig.json
 * {
 *  licenseserverurl
 *  licensekey
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateId');
var fs = require('fs');
var request = require('request');
var unzip = require('unzip');
var co = require('../utils/constants');

/**
 * Asks the license server for available updates. Returns a JSON with local and remote update info:
 * {
 *  serverVersion
 *  localVersion
 * }
 */
router.get('/checkforupdate', auth(co.permissions.ADMINISTRATION_SETTINGS, 'r', co.modules.portalbase), (req, res) => {
    var localConfig = JSON.parse(fs.readFileSync('./config/localconfig.json').toString());
    var packageJson = JSON.parse(fs.readFileSync('./package.json').toString());
    var localVersion = packageJson.version;
    var url = `${localConfig.licenseserverurl}/api/update/version?licenseKey=${localConfig.licensekey}`;
    request(url, function (error, response, body) {
        if (error || response.statusCode !== 200) {
            return res.sendStatus(400);
        }
        return res.send({
            serverVersion : body,
            localVersion : localVersion
        });
    });
});

/**
 * Return the current settings from the localconfig.json
 */
router.get('/', auth(co.permissions.ADMINISTRATION_SETTINGS, 'r', co.modules.portalbase), (req, res) => {
    var localConfig = JSON.parse(fs.readFileSync('./config/localconfig.json').toString());
    var portalSettings = { // Extract only relevant data from localConfig
        licenseserverurl : localConfig.licenseserverurl,
        licensekey : localConfig.licensekey
    };
    return res.send(portalSettings);
});

/**
 * Starts updating the server from the license server
 */
router.post('/triggerupdate', auth(co.permissions.ADMINISTRATION_SETTINGS, 'w', co.modules.portalbase), (req, res) => {
    var localConfig = JSON.parse(fs.readFileSync('./config/localconfig.json').toString());
    var updateExtractPath = localConfig.updateExtractPath ? localConfig.updateExtractPath : './temp/';
    var url = `${localConfig.licenseserverurl}/api/update/download?licenseKey=${localConfig.licensekey}`;
    var updateRequest = request(url);
    updateRequest.on('error', function () {
        updateRequest.abort();
        return res.sendStatus(400);
    });
    updateRequest.on('response', function (response) {
        if (response.statusCode !== 200) {
            updateRequest.abort();
            return res.sendStatus(400);
        }
    });
    var unzipStream = updateRequest.pipe(unzip.Extract({ path: updateExtractPath }));
    unzipStream.on('close', function() {
        return res.sendStatus(200); // Erst antworten, wenn alles ausgepackt ist
    });
});

/**
 * Updates settings to localconfig.json and sends updated settings
 */
router.put('/', auth(co.permissions.ADMINISTRATION_SETTINGS, 'w', co.modules.portalbase), function(req, res) {
    var portalSettings = req.body;
    if (!portalSettings || Object.keys(portalSettings).length < 1) {
        return res.sendStatus(400);
    }
    // Load localconfig and update only relevant information
    var localConfig = JSON.parse(fs.readFileSync('./config/localconfig.json').toString());
    localConfig.licenseserverurl = portalSettings.licenseserverurl;
    localConfig.licensekey = portalSettings.licensekey;
    fs.writeFileSync('./config/localconfig.json', JSON.stringify(localConfig, null, 4));
    return res.send(portalSettings);
});

module.exports = router;
