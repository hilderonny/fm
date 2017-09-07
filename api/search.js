/**
 * API for instant search
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var co = require('../utils/constants');

router.get('/', auth(), (req, res) => {
    var searchTerm = req.query.term;
    if (!searchTerm || searchTerm.length < 1) {
        res.send([]);
        return;
    }
    var promises = [];
    Object.keys(co.collections).forEach((k) => {
        var collection = co.collections[k];
        promises.push(req.db.get(collection.name).aggregate([
            { $match: {
                name: {$regex: searchTerm, $options : 'i' } , // Case insensitive search https://stackoverflow.com/a/33971033
                clientId: req.user.clientId
            } },
            { $project: { // Erst mal Felder filtern und Werte suchen
                _id: 1,
                name: 1,
                collection: k,
                icon: collection.icon
            } }
        ]));
    });
    Promise.all(promises).then((results) => {
        var elements = [].concat.apply([], results); https://stackoverflow.com/a/10865042
        res.send(elements);
    });
});

module.exports = router;