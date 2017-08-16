/**
 * clientsettings {
 *  _id,
 *  clientId,
 *  logourl
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var co = require('../utils/constants');

/**
 * Gibt den Einstellungssatz für den Mandanten des angemeldeten Benutzers zurück
 */
router.get('/', auth(co.permissions.SETTINGS_CLIENT, 'r', co.modules.base), (req, res) => {
    req.db.get(co.collections.clientsettings.name).findOne({clientId:req.user.clientId}).then((clientSettings) => {
        if (!clientSettings) clientSettings = {
            logourl: 'css/logo_avorium_komplett.svg' // Default Avorium Logo
        };
        res.send(clientSettings);
    });
});

/**
 * Aktualisiert die Mandanteneinstellungen für den Mandanten des angemeldeten Benutzers
 */
router.post('/', auth(co.permissions.SETTINGS_CLIENT, 'w', co.modules.base), function(req, res) {
    var clientSettings = req.body;
    if (!clientSettings || Object.keys(clientSettings).length < 1) {
        return res.sendStatus(400);
    }
    var clientId = req.user.clientId;
    clientSettings.clientId = clientId;
    // Alle Einstellungen des Mandanten pauschal löschen
    req.db.get(co.collections.clientsettings.name).remove({clientId:clientId}).then(() => {
        return req.db.insert(co.collections.clientsettings.name, clientSettings);
    }).then((insertedSettings) => {
        res.send(insertedSettings);
    });
});

module.exports = router;
