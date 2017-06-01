/**
 * CRUD API for activity management
 * activity {
 *      _id,
 *      date, // Date of the activity
 *      clientId,
 *      createdByUserId, // id of the user which created the activity. Only this user can change the activity
 *      participantUserIds, // List of user ids of participants of this activity. Those users can see the activity
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
var validateId = require('../middlewares/validateid');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');

// TODO: Mechanismus überlegen, der die createdByUserId und participantUserIdsin richtige ObjectIDs umwandelt
// Get all activities of the current client, which were created by the current user or where the current user is a participant of
router.get('/', auth('PERMISSION_OFFICE_ACTIVITY', 'r', 'activities'), (req, res) => {
    var userId = req.user._id;
    var clientId = req.user.clientId; // clientId === null means that the user is a portal user
    var query = { 
        clientId: clientId,
        $or: [
            { createdByUserId: userId },
            { participantUserIds: userId } // Array query, see https://docs.mongodb.com/manual/tutorial/query-arrays/#query-an-array-for-an-element
        ]
    };
    req.db.get('activities').find(query, req.query.fields).then((activities) => {
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
router.get('/forIds', auth(false, false, 'activities'), (req, res) => {
    // Zuerst Berechtigung prüfen
    auth.canAccess(req.user._id, 'PERMISSION_OFFICE_ACTIVITY', 'r', 'activities', req.db).then(function(accessAllowed) {
        if (!accessAllowed) {
            return res.send([]);
        }
        if (!req.query.ids) {
            return res.send([]);
        }
        var ids = req.query.ids.split(',').filter(validateId.validateId).map(function(id) { return monk.id(id); }); // Nur korrekte IDs verarbeiten
        var clientId = req.user.clientId; // Nur die Termine des Mandanten des Benutzers raus holen.
        var userId = req.user._id;
        req.db.get('activities').find({
            _id: { $in: ids },
            clientId: clientId,
            $or: [ // Nur die Termine, die der Benutzer auch angelegt hat
                { createdByUserId: userId },
                { participantUserIds: userId } 
            ]
        }).then((activities) => {
            res.send(activities);
        });
    });
});

// Get a specific activity
router.get('/:id', auth('PERMISSION_OFFICE_ACTIVITY', 'r', 'activities'), validateId, validateSameClientId('activities'), (req, res) => {
    req.db.get('activities').findOne(req.params.id, req.query.fields).then((activity) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        activity.fullyEditable = activity.createdByUserId.equals(req.user._id); // Flag to show whether the client can edit all properties or only isDone and comment
        res.send(activity);
    });
});

// Create an activity
router.post('/', auth('PERMISSION_OFFICE_ACTIVITY', 'w', 'activities'), function(req, res) {
    var activity = req.body;
    if (!activity || Object.keys(activity).length < 1) {
        return res.sendStatus(400);
    }
    delete activity._id; // Ids are generated automatically
    activity.clientId = req.user.clientId;
    activity.createdByUserId = req.user._id; // Define the current user as the creator of the activity
    // Teilnehmer-IDs umwandeln, falls vorhanden, die Existenz wird dabei nicht geprüft
    if (activity.participantUserIds) {
        activity.participantUserIds = activity.participantUserIds.filter(validateId.validateId).map(function(id) { return monk.id(id); });
    } else {
        activity.participantUserIds = [];
    }
    req.db.insert('activities', activity).then((insertedActivity) => {
        res.send(insertedActivity);
    });
});

// Update an activity
router.put('/:id', auth('PERMISSION_OFFICE_ACTIVITY', 'w', 'activities'), validateId, validateSameClientId('activities'), function(req, res) {
    var activity = req.body;
    if (!activity) {
        return res.sendStatus(400);
    }
    delete activity._id; // When activity object also contains the _id field
    delete activity.clientId; // Prevent assignment of the activity to another client
    delete activity.createdByUserId;
    if (Object.keys(activity).length < 1) {
        return res.sendStatus(400);
    }
    // Load the activity from database to retreive the userId of the creator
    req.db.get('activities').findOne(req.params.id).then((existingActivity) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        // Forbid the change of specific activity data when the current user is not the creator
        if (!existingActivity.createdByUserId.equals(req.user._id) && (
            activity.date ||
            activity.participantUserIds ||
            activity.task ||
            activity.type
        )) {
            return res.sendStatus(403); // Forbidden
        }
        // Teilnehmer-IDs umwandeln, falls vorhanden
        if (activity.participantUserIds) {
            activity.participantUserIds = activity.participantUserIds.filter(validateId.validateId).map(function(id) { return monk.id(id); });
        }
        req.db.update('activities', req.params.id, { $set: activity }).then((updatedActivity) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
            res.send(updatedActivity);
        });
    });
});

/**
 * Löscht einen Termin und alle zugehörigen Verknüpfungen
 */
router.delete('/:id', auth('PERMISSION_OFFICE_ACTIVITY', 'w', 'activities'), validateId, validateSameClientId('activities'), function(req, res) {
    var activityId = monk.id(req.params.id);
    req.db.get('activities').findOne(activityId, '_id createdByUserId').then((activity) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        if (!activity.createdByUserId.equals(req.user._id)) { // Only the creator can delete an activity
            return res.sendStatus(403); // Forbidden
        }
        // Eventuell vorhandene Verknüpfungen ebenfalls löschen
        req.db.remove('relations', { $or: [ {id1:activityId}, {id2:activityId} ] }).then(function() {
            return req.db.remove('activities', activityId);
        }).then(function() {
            res.sendStatus(204);
        });
    });
});

module.exports = router;
