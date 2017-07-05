var monk = require('monk');

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
 * router.get('/:id', auth('PERMISSION_OFFICE_DOCUMENT', 'r'), validateId, validateSameClientId('folders'), (req, res) => { ... }
 */
module.exports = (tableName) => {
    return (req, res, next) => {
        // When tableName is not given, try to extract it from the request.
        // With dynamic attributes it is given as parameter "modelName"
        if (!tableName) {
            tableName = req.params.modelName;
        }
        req.db.get(tableName).find({ _id: req.params.id, clientId: req.user.clientId }).then((result) => {
            if (result.length < 1) {
                return res.sendStatus(403);
            } else {
                next();
            }
        });
    }
}

