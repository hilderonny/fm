/**
 * CRUD API for MAP markers with geolocation.
 * Status: EXPERIMENTAL, NO NEED FOR TESTS!
 * 
 * marker {
 *      _id,
 *      lat,
 *      lng
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateid');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');

router.get('/', (req, res) => {
    var clientId = req.user.clientId;
    req.db.get('markers').find({ clientId: clientId }, req.query.fields).then((markers) => {
        res.send(markers);
    });
});

// Create a marker
router.post('/', function(req, res) {
    var marker = req.body;
    if (!marker || Object.keys(marker).length < 1 || !marker.lat || !marker.lng) {
        return res.sendStatus(400);
    }
    delete marker._id; // Ids are generated automatically
    marker.clientId = req.user.clientId;
    req.db.insert('markers', marker).then((insertedMarker) => {
        res.send(insertedMarker);
    });
});

// Delete a marker
router.delete('/:id', validateId, validateSameClientId('markers'), function(req, res) {
    req.db.remove('markers', req.params.id).then((result) => {
        if (result.result.n < 1) {
            return res.sendStatus(404);
        }
        res.sendStatus(204);
    });
});

module.exports = router;
