/**
 * CRUD API for client settings
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var co = require('../utils/constants');
var Db = require("../utils/db").Db;

function mapFields(e) {
    return {
        _id: e.name,
        clientId: e.clientname,
        logourl: e.logourl
    }
}

/**
 * Gibt den Einstellungssatz für den Mandanten des angemeldeten Benutzers zurück
 */
router.get('/', auth(co.permissions.SETTINGS_CLIENT, 'r', co.modules.base), async(req, res) => {
    var clientsettings = await Db.getDynamicObjects(Db.PortalDatabaseName, "clientsettings", { clientname: req.user.clientname });
    var result = clientsettings.length > 0 ? clientsettings[0] : { name: null, clientname: req.user.clientname, logourl: "css/logo_avorium_komplett.svg" };
    res.send(mapFields(result));
});

/**
 * Aktualisiert die Mandanteneinstellungen für den Mandanten des angemeldeten Benutzers
 */
router.post('/', auth(co.permissions.SETTINGS_CLIENT, 'w', co.modules.base), async(req, res) => {
    var clientSettings = req.body;
    if (!clientSettings || Object.keys(clientSettings).length < 1) return res.sendStatus(400);
    // Alle Einstellungen des Mandanten pauschal löschen
    await Db.deleteDynamicObjects(Db.PortalDatabaseName, "clientsettings", { clientname: req.user.clientname });
    var insertedsetting = { name: Db.createName(), clientname: req.user.clientname, logourl: clientSettings.logourl };
    await Db.insertDynamicObject(Db.PortalDatabaseName, "clientsettings", insertedsetting);
    res.send(mapFields(insertedsetting));
});

module.exports = router;
