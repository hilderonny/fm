var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateId');
var validateSameClientId = require('../middlewares/validateSameClientId');

/**
 * Create a default GET/:id route for a database entity. The query URL can
 * contain a "fields" definition where the requested fields can be given.
 * The request is validated for a correct ID and for the same clientId as the logged
 * in user.
 * @param router Reference to the express router object
 * @param tableName Name of the database table to request an object from
 * @param String representing the permission which is needed for reading the database entity
 * @param moduleName Name of the module which is required to have to access the API
 * @example 
 * var router = require('express').Router();
 * var apiHelper = require('/utils/apiHelper');
 * apiHelper.createDefaultGetIdRoute(router, 'users', 'PERMISSION_ADMINISTRATION_USER');
 */
module.exports.createDefaultGetIdRoute = (router, tableName, permissionName, moduleName) => {
    router.get('/:id', auth(permissionName, 'r', moduleName), validateId, validateSameClientId(tableName), (req, res) => {
        req.db.get(tableName).findOne(req.params.id, req.query.fields).then((entity) => {
            // Database element is available here in every case, because validateSameClientId already checked for existence
            res.send(entity);
        });
    });
}