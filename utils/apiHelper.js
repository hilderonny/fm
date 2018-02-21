var auth = require('../middlewares/auth');
var validateSameClientId = require('../middlewares/validateSameClientId');
var Db = require("./db").Db;
var uuidv4 = require("uuid").v4;
var rh = require('./relationsHelper');
var dah = require('./dynamicAttributesHelper');

var ah = {

    createApi: (config) => {

        var router = require('express').Router();

        function mapFields(elements, clientname) {
            return elements.map((e) => { return config.mapfields(e, clientname); });
        }

        if (config.getforids) router.get('/forIds', auth(false, false, config.modulename), async(req, res) => {
            // Zuerst Berechtigung prüfen
            var accessAllowed = await auth.canAccess(req.user.name, config.permission, 'r', config.modulename);
            if (!accessAllowed) {
                return res.send([]);
            }
            if (!req.query.ids) {
                return res.send([]);
            }
            res.send(mapFields(await Db.getDynamicObjectsForNames(req.user.clientname, config.apiname, req.query.ids.split(',')), req.user.clientname));
        });
        
        if (config.parent) router.get(`/${config.parent.apisuffix}/:id`, auth(config.permission, 'r', config.modulename), validateSameClientId(config.parent.datatypename), async(req, res) => {
            var filter = [];
            filter[config.parent.parentfield] = req.params.id;
            var elements = await Db.getDynamicObjects(req.user.clientname, config.apiname, filter);
            res.send(mapFields(elements, req.user.clientname));
        });

        if (config.getall) router.get('/', auth(config.permission, 'r', config.modulename), async(req, res) =>{
            res.send(mapFields(await Db.getDynamicObjects(req.user.clientname, config.apiname), req.user.clientname));
        });
        
        if (config.getid) router.get('/:id', auth(config.permission, 'r', config.modulename), validateSameClientId(config.apiname), async(req, res) => {
            res.send(config.mapfields(await Db.getDynamicObject(req.user.clientname, config.apiname, req.params.id), req.user.clientname));
        });

        if (config.post) router.post('/', auth(config.permission, 'w', config.modulename), async(req, res) => {
            var element = req.body;
            if (!element || Object.keys(element).length < 1) {
                return res.sendStatus(400);
            }
            element = config.mapfieldsreverse(element);
            if (config.parent) {
                if (!element[config.parent.parentfield] || !(await Db.getDynamicObject(req.user.clientname, config.parent.datatypename, element[config.parent.parentfield]))) {
                    return res.sendStatus(400);
                }
            }
            element.name = uuidv4();
            await Db.insertDynamicObject(req.user.clientname, config.apiname, element);
            res.send(config.mapfields(element, req.user.clientname));
        });

        if (config.put) router.put('/:id' , auth(config.permission, 'w', config.modulename), validateSameClientId(config.apiname), async(req,res) => {
            var element = req.body;
            var keys = Object.keys(element);
            if(!element || keys.length < 1) {
                return res.sendStatus(400);
            }
            var elementtoupdate = config.mapfieldsreverse(element);
            delete elementtoupdate.name;
            if (config.parent) {
                delete elementtoupdate[config.parent.parentfield]; // Parent reference cannot be changed
            }
            Object.keys(elementtoupdate).forEach((k) => {
                if (elementtoupdate[k] === undefined) delete elementtoupdate[k]; // Not sent fields should not be updated
            });
            await Db.updateDynamicObject(req.user.clientname, config.apiname, req.params.id, elementtoupdate);
            res.send(elementtoupdate);
        });
        
        if (config.delete) router.delete('/:id', auth(config.permission, 'w', config.modulename), validateSameClientId(config.apiname), async(req,res) => {
            var id = req.params.id;
            var clientname = req.user.clientname;
            await Db.deleteDynamicObject(clientname, config.apiname, id);
            if (config.children) for (var i = 0; i < config.children.length; i++) {
                var child = config.children[i];
                var filter = {};
                filter[child.parentfield] = id;
                await Db.deleteDynamicObjects(clientname, child.datatypename, filter);
            }
            await rh.deleteAllRelationsForEntity(clientname, config.apiname, id);
            await dah.deleteAllDynamicAttributeValuesForEntity(clientname, id);
            res.sendStatus(204);
        });

        return router;
    }

}

ah.createDefaultGetIdRoute = (router, tableName, permissionName, moduleName) => {
    // router.get('/:id', auth(permissionName, 'r', moduleName), validateSameClientId(tableName), (req, res) => {
    //     req.db.get(tableName).findOne(req.params.id, req.query.fields).then((entity) => {
    //         // Database element is available here in every case, because validateSameClientId already checked for existence
    //         res.send(entity);
    //     });
    // });
}

module.exports = ah;