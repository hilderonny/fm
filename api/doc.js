/**
 * API für Dokumentationsmenu
 */
var router = require('express').Router();
var moduleConfig = require('../config/module-config.json'); // http://stackoverflow.com/a/14678694
var co = require('../utils/constants');
var Db = require("../utils/db").Db;
var auth = require('../middlewares/auth');

var extractDocMenu = async(clientname) => {
    var fullMenu = {};
    var views = await Db.getDynamicObjects(clientname, co.collections.views.name);
    views.forEach(view => {
        if (view.doccard) fullMenu[view.doccard] = {
            docCard: view.doccard,
            icon: view.icon,
            title: view.label,
            index: 0 // Aus Menü so sortieren, wie es kommt.
        };
    });
    // Versteckte Dokumentationseinträge (Release Notes)
    var moduleNames = Object.keys(moduleConfig.modules);
    moduleNames.forEach((moduleName) => {
        var appModule = moduleConfig.modules[moduleName];
        if (appModule.doc) appModule.doc.forEach((docCard) => {
            fullMenu[docCard.docCard] = docCard;
        });
    });
    return Object.values(fullMenu);
};

/**
 * Only the menu structure available for the current user is returned.
 * When the logged in user is an admin, 
 * then the entire menu structure is returned.
 */
router.get('/', auth(), async(req, res) => {
    var doc = await extractDocMenu(req.user.clientname);
    res.send(doc);
});

module.exports = router;