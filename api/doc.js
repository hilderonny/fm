/**
 * API für Dokumentationsmenu
 */
var router = require('express').Router();
var moduleConfig = require('../config/module-config.json'); // http://stackoverflow.com/a/14678694
var co = require('../utils/constants');

var extractDocMenu = () => {
    var fullMenu = {};
    var moduleNames = Object.keys(moduleConfig.modules);
    moduleNames.forEach((moduleName) => {
        var appModule = moduleConfig.modules[moduleName];
        // Entweder versteckte Dokumentationen, wie Releasenotes in eigenem Attribut ...
        if (appModule.doc) appModule.doc.forEach((docCard) => {
            fullMenu[docCard.docCard] = docCard;
        });
        // ... oder als Attribut an irgendeinem Menüeintrag
        if (appModule.apps) Object.values(appModule.apps).forEach(appmenus => {
            appmenus.forEach((item) => {
                if (item.docCard) fullMenu[item.docCard] = {
                    docCard: item.docCard,
                    icon: item.icon,
                    title: item.title,
                    index: 0 // Aus Menü so sortieren, wie es kommt.
                };
            });
        });
    });
    return Object.values(fullMenu);
};

/**
 * Only the menu structure available for the current user is returned.
 * When the logged in user is an admin, 
 * then the entire menu structure is returned.
 */
router.get('/', (req, res) => {
    res.send(extractDocMenu());
});

module.exports = router;