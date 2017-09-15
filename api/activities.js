/**
 * CRUD API for activity management
 * activity {
 *      _id,
 *      date, // Date of the activity
 *      clientId,
 *      createdByUserId, // id of the user which created the activity. Only this user can change the activity
 *      name, // Short name for the activity list
 *      task, // Detailed description of the tasks to be done
 *      isDone, // TRUE / FALSE whether the tasks were completed
 *      type, // select options Gewährleitung, Wartung, etc.
 *      comment, // Comment of the user which met the activity,
 *      fullyEditable // Temporary flag (not in database) whether current user can fully edit activity or only isDone and comment
 * }
 */
var router = require('express').Router();
var auth = require('../middlewares/auth');
var validateId = require('../middlewares/validateId');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');
var dah = require('../utils/dynamicAttributesHelper');

// Get all activities of the current client, which were created by the current user or which are public
router.get('/', auth(co.permissions.OFFICE_ACTIVITY, 'r', co.modules.activities), (req, res) => {
    var userId = req.user._id;
    var clientId = req.user.clientId; // clientId === null means that the user is a portal user
    var query = { 
        clientId: clientId,
        $or: [
            { createdByUserId: userId },
            { isForAllUsers: true } // Array query, see https://docs.mongodb.com/manual/tutorial/query-arrays/#query-an-array-for-an-element
        ]
    };
    req.db.get(co.collections.activities.name).find(query, req.query.fields).then((activities) => {
        res.send(activities);
    });
});

/**
 * Liefert eine Liste von Terminen für die per URL übergebenen IDs. Die IDs müssen kommagetrennt sein.
 * Die Berechtigungen werden hier nicht per auth überprüft, da diese API für die Verknüpfungen verwendet
 * wird und da wäre es blöd, wenn ein 403 zur Neuanmeldung führte. Daher wird bei fehlender Berechtigung
 * einfach eine leere Liste zurück gegeben.
 * @example
 * $http.get('/api/activities/forIds?ids=ID1,ID2,ID3')...
 */
router.get('/forIds', auth(false, false, co.modules.activities), (req, res) => {
    // Zuerst Berechtigung prüfen
    auth.canAccess(req.user._id, co.permissions.OFFICE_ACTIVITY, 'r', co.modules.activities, req.db).then(function(accessAllowed) {
        if (!accessAllowed) {
            return res.send([]);
        }
        if (!req.query.ids) {
            return res.send([]);
        }
        var ids = req.query.ids.split(',').filter(validateId.validateId).map(function(id) { return monk.id(id); }); // Nur korrekte IDs verarbeiten
        var clientId = req.user.clientId; // Nur die Termine des Mandanten des Benutzers raus holen.
        var userId = req.user._id;
        req.db.get(co.collections.activities.name).find({
            _id: { $in: ids },
            clientId: clientId,
            $or: [ // Nur die Termine, die der Benutzer auch angelegt hat oder die öffentlich sind
                { createdByUserId: userId },
                { isForAllUsers: true } 
            ]
        }).then((activities) => {
            res.send(activities);
        });
    });
});

// Get a specific activity
router.get('/:id', auth(co.permissions.OFFICE_ACTIVITY, 'r', co.modules.activities), validateId, validateSameClientId(co.collections.activities.name), (req, res) => {
    req.db.get(co.collections.activities.name).findOne(req.params.id, req.query.fields).then((activity) => {
        if (!activity.isForAllUsers && !req.user._id.equals(activity.createdByUserId)) {
            res.sendStatus(403); // Zugriff nur auf eigene oder auf öffentliche Termine möglich
            return;
        }
        // Database element is available here in every case, because validateSameClientId already checked for existence
        activity.currentUserCanWrite = activity.createdByUserId.equals(req.user._id); // Flag to show whether the client can edit all properties or only isDone and comment
        req.db.get(co.collections.users.name).findOne(activity.createdByUserId).then((creator) => {
            activity.creator = creator.name;
            res.send(activity);
        });
    });
});

// Create an activity
router.post('/', auth(co.permissions.OFFICE_ACTIVITY, 'w', co.modules.activities), function(req, res) {
    var activity = req.body;
    if (!activity || Object.keys(activity).length < 1) {
        return res.sendStatus(400);
    }
    delete activity._id; // Ids are generated automatically
    activity.clientId = req.user.clientId;
    activity.createdByUserId = req.user._id; // Define the current user as the creator of the activity
    req.db.insert(co.collections.activities.name, activity).then((insertedActivity) => {
        res.send(insertedActivity);
    });
});

// Update an activity
router.put('/:id', auth(co.permissions.OFFICE_ACTIVITY, 'w', co.modules.activities), validateId, validateSameClientId(co.collections.activities.name), function(req, res) {
    var activity = req.body;
    delete activity._id; // When activity object also contains the _id field
    delete activity.clientId; // Prevent assignment of the activity to another client
    delete activity.createdByUserId;
    if (Object.keys(activity).length < 1) {
        return res.sendStatus(400);
    }
    // Load the activity from database to retreive the userId of the creator
    req.db.get(co.collections.activities.name).findOne(req.params.id).then((existingActivity) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        // Forbid the change of specific activity data when the current user is not the creator
        if (!existingActivity.createdByUserId.equals(req.user._id)) {
            return res.sendStatus(403); // Forbidden
        }
        req.db.update(co.collections.activities.name, req.params.id, { $set: activity }).then((updatedActivity) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
            res.send(updatedActivity);
        });
    });
});

/**
 * Löscht einen Termin und alle zugehörigen Verknüpfungen
 */
router.delete('/:id', auth(co.permissions.OFFICE_ACTIVITY, 'w', co.modules.activities), validateId, validateSameClientId(co.collections.activities.name), function(req, res) {
    var activityId = monk.id(req.params.id);
    req.db.get(co.collections.activities.name).findOne(activityId).then((existingActivity) => {
        if (!existingActivity.createdByUserId.equals(req.user._id)) { // Es können nur eigene Termine gelöscht werden
            return res.sendStatus(403); // Forbidden
        }
        req.db.remove(co.collections.activities.name, activityId).then((result) => {
            return rh.deleteAllRelationsForEntity(co.collections.activities.name, activityId);
        }).then(() => {
            return dah.deleteAllDynamicAttributeValuesForEntity(activityId);
        }).then(() => {
            res.sendStatus(204);
        });
    });
});

module.exports = router;
