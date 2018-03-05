var co = require('../utils/constants');
var Db = require("../utils/db").Db;

/**
 * Middleware zum Prüfen, ob der angemeldete Benutzer zum gleichen Mandanten
 * gehört wie das Objekt, auf welches er zugreifen möchte. Wird zur
 * Zugriffssteuerung auf APIs verwendet. Als Parameter muss der Tabellenname
 * übergeben werden, zu der das zu prüfende Objekt gehört.
 * Sendet einen 403 Statuscode im Response zurück, wenn der Benutzer keinen
 * Zugriff auf das angeforderte Objekt hat.
 * Benutzung:
 * 
 * var validateSameClientId = require('../middlewares/validateSameClientId');
 * router.get('/:id', auth('PERMISSION_OFFICE_DOCUMENT', 'r'), validateSameClientId('folders'), (req, res) => { ... }
 */
module.exports = (tableName) => {
    return (req, res, next) => {
        // When tableName is not given, try to extract it from the request.
        // With dynamic attributes it is given as parameter "modelName"
        var tableNameToUse = tableName || req.params.modelName; // Muss lokale Variable verwenden, da tableName ansonsten noch vom vorhergehenden Aufruf gesetzt wäre
        Db.getDynamicObject(req.user.clientname, tableNameToUse, req.params.id).then((result) => {
            if (!result) {
                return res.sendStatus(404);
            } else {
                next();
            }
        }, (error) => { // Tabelle für modelName existiert nicht
            return res.sendStatus(404);
        });
    }
}

