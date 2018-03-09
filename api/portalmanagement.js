/**
 * CRUD API for local portal settings. Settings are stored in /config/localconfig.json
 * {
 *  licenseserverurl
 *  licensekey
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var fs = require('fs');
var request = require('request');
var unzip = require('unzip2');
var co = require('../utils/constants');
var portalUpdatesHelper = require('../utils/portalUpdatesHelper');
var localConfigHelper = require('../utils/localConfigHelper');
var appJs = require('../app.js');

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
        licensekey : localConfig.licensekey,
        autoUpdateMode : localConfig.autoUpdateMode
    };
    if(localConfig.updateTimerInterval){ //no updateTimerInterval value when autoUpdateMode == False
        portalSettings.updateTimerInterval = localConfig.updateTimerInterval;
    }
    return res.send(portalSettings);
});

/**
 * Starts updating the server from the license server
 */
router.post('/triggerupdate', auth(co.permissions.ADMINISTRATION_SETTINGS, 'w', co.modules.portalbase), (req, res) => {
    portalUpdatesHelper.triggerUpdate(true).then((wasUpdated) => {
        res.sendStatus(200);
    }, () => {
        // error
        res.sendStatus(400);
    })
});

/**
 * Updates settings to localconfig.json and sends updated settings
 */
router.put('/', auth(co.permissions.ADMINISTRATION_SETTINGS, 'w', co.modules.portalbase), (req, res) => {
    var portalSettings = req.body;
    if (!portalSettings || Object.keys(portalSettings).length < 1) {
        return res.sendStatus(400);
    }
    localConfigHelper.LocalConfig.updateContent(portalSettings);
    return res.send(portalSettings);
});


/**
 * Call functions for global controll over Auto-Update behaviour
 */
router.post('/manageAutoUpdate', auth(co.permissions.ADMINISTRATION_SETTINGS, 'w', co.modules.portalbase), (req, res) => {
    var portalSettings = req.body;
    if(portalSettings.autoUpdateMode == false || portalSettings.autoUpdateMode == true ){
          appJs.manageAutoUpdate(portalSettings.autoUpdateMode);//toggle automatic updates
    }else if(portalSettings.updateTimerInterval){
        var timeInMS = portalSettings.updateTimerInterval * 3600000 //convert hours to milliseconds
         appJs.changeTimeInterval(portalSettings.updateTimerInterval);
    }
    res.sendStatus(200);
});

module.exports = router;
