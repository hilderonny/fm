var auth = require('../middlewares/auth');
var validateSameClientId = require('../middlewares/validateSameClientId');
var Db = require("./db").Db;
var uuidv4 = require("uuid").v4;
var rh = require('./relationsHelper');
var dah = require('./dynamicAttributesHelper');

var ah = {

    createApi: (config) => {

        var router = require('express').Router();

        function mapFields(elements, user) {
            return elements.map((e) => { return config.mapfields(e, user); });
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
            var elements = [];
            if (Array.isArray(config.getforids)) {
                for (var i = 0; i < config.getforids.length; i++) {
                    var filter = await config.getforids[i](req);
                    (await Db.getDynamicObjectsForNames(req.user.clientname, config.apiname, req.query.ids.split(','), filter)).forEach((e) => {
                        elements.push(e);
                    });
                }
            } else {
                elements = await Db.getDynamicObjectsForNames(req.user.clientname, config.apiname, req.query.ids.split(','));
            }
            res.send(mapFields(elements, req.user));
        });
        
        if (config.parent) router.get(`/${config.parent.apisuffix}/:id`, auth(config.permission, 'r', config.modulename), validateSameClientId(config.parent.datatypename), async(req, res) => {
            var filter = [];
            filter[config.parent.parentfield] = req.params.id;
            var elements = await Db.getDynamicObjects(req.user.clientname, config.apiname, filter);
            res.send(mapFields(elements, req.user));
        });

        if (config.getall) router.get('/', auth(config.permission, 'r', config.modulename), async(req, res) =>{
            var elements = [];
            if (Array.isArray(config.getall)) {
                for (var i = 0; i < config.getall.length; i++) {
                    var filter = await config.getall[i](req);
                    (await Db.getDynamicObjects(req.user.clientname, config.apiname, filter)).forEach((e) => {
                        elements.push(e);
                    });
                }
            } else {
                elements = await Db.getDynamicObjects(req.user.clientname, config.apiname);
            }
            res.send(mapFields(elements, req.user));
        });
        
        if (config.getid) router.get('/:id', auth(config.permission, 'r', config.modulename), validateSameClientId(config.apiname), async(req, res) => {
            var element = await Db.getDynamicObject(req.user.clientname, config.apiname, req.params.id);
            if (config.getid !== true && !(await config.getid(element, req, res))) return; // Callback can handle errors and returns false in this case
            res.send(config.mapfields(element, req.user));
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
            element.name = uuidv4().replace(/-/g, "");
            if (config.post !== true && !(await config.post(element, req, res))) return; // Callback can handle errors and returns false in this case
            await Db.insertDynamicObject(req.user.clientname, config.apiname, element);
            res.send(config.mapfields(element, req.user));
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
            var filter = (config.put !== true) ? await config.put(req) : undefined;
            var result = await Db.updateDynamicObject(req.user.clientname, config.apiname, req.params.id, elementtoupdate, filter);
            if (result.rowCount < 1) return res.sendStatus(403); // Error in update, maybe filters do not match like in activities?
            res.send(elementtoupdate);
        });
        
        if (config.delete) router.delete('/:id', auth(config.permission, 'w', config.modulename), validateSameClientId(config.apiname), async(req,res) => {
            var id = req.params.id;
            var clientname = req.user.clientname;

            var filter = (config.delete !== true) ? await config.delete(req) : undefined;
            var result = await Db.deleteDynamicObject(clientname, config.apiname, id, filter);
            if (result.rowCount < 1) return res.sendStatus(403); // Error in deletion, maybe filters do not match like in activities?
            if (config.children) for (var i = 0; i < config.children.length; i++) {
                var child = config.children[i];
                var childfilter = {};
                childfilter[child.parentfield] = id;
                await Db.deleteDynamicObjects(clientname, child.datatypename, childfilter);
            }
            await rh.deleteAllRelationsForEntity(clientname, config.apiname, id);
            await dah.deleteAllDynamicAttributeValuesForEntity(clientname, id);
            res.sendStatus(204);
        });

        return router;
    }

}

module.exports = ah;