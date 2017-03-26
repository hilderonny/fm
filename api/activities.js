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

// Get a list of activities which have the given ID referenced
router.get('/byRelationId/:id', auth('PERMISSION_OFFICE_ACTIVITY', 'r', 'activities'), validateId, (req, res) => {
    req.db.get('activities').find({"relations":{"$in":[req.params.id]}}, req.query.fields).then((activities) => {
        res.send(activities);
    });
});

// Get all activities of the current client, which were created by the current user or where the current user is a participant of
router.get('/', auth('PERMISSION_OFFICE_ACTIVITY', 'r', 'activities'), (req, res) => {
    var userId = req.user._id.toString(); // reference ids are stored as strings
    var clientId = req.user.clientId; // clientId === null means that the user is a portal user
    var query = req.query.all ? { 
        clientId: clientId
    } : { 
        clientId: clientId,
        $or: [
            { createdByUserId: userId },
            { participantUserIds: userId }
        ]
    };
    req.db.get('activities').find(query, req.query.fields).then((activities) => {
        res.send(activities);
    });
});

// Get a specific activity
router.get('/:id', auth('PERMISSION_OFFICE_ACTIVITY', 'r', 'activities'), validateId, validateSameClientId('activities'), (req, res) => {
    req.db.get('activities').findOne(req.params.id, req.query.fields).then((activity) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        activity.fullyEditable = activity.createdByUserId === req.user._id.toString(); // Flag to show whether the client can edit all properties or only isDone and comment
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
    activity.createdByUserId = req.user._id.toString(); // Define the current user as the creator of the activity
    req.db.insert('activities', activity).then((insertedActivity) => {
        res.send(insertedActivity);
    });
});

// Update an activity
router.put('/:id', auth('PERMISSION_OFFICE_ACTIVITY', 'w', 'activities'), validateId, validateSameClientId('activities'), function(req, res) {
    var activity = req.body;
    if (!activity || Object.keys(activity).length < 1) {
        return res.sendStatus(400);
    }
    delete activity._id; // When activity object also contains the _id field
    delete activity.clientId; // Practivity assignment of the activity to another client
    delete activity.createdByUserId;
    // Load the activity from database to retreive the userId of the creator
    req.db.get('activities').findOne(req.params.id).then((existingActivity) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        // Forbid the change of activity data when the current user is not the creator
        if (existingActivity.createdByUserId !== req.user._id.toString() && (
            activity.date ||
            activity.participantUserIds ||
            activity.task ||
            activity.type
        )) {
            return res.sendStatus(403); // Forbidden
        }
        req.db.update('activities', req.params.id, { $set: activity }).then((updatedActivity) => { // https://docs.mongodb.com/manual/reference/operator/update/set/
            res.send(updatedActivity);
        });
    });
});

// Delete an activity
router.delete('/:id', auth('PERMISSION_OFFICE_ACTIVITY', 'w', 'activities'), validateId, validateSameClientId('activities'), function(req, res) {
    req.db.get('activities').findOne(req.params.id, '_id createdByUserId').then((activity) => {
        // Database element is available here in every case, because validateSameClientId already checked for existence
        if (activity.createdByUserId !== req.user._id.toString()) { // Only the creator can delete an activity
            return res.sendStatus(403); // Forbidden
        }
        req.db.remove('activities', req.params.id).then((result) => {
            res.sendStatus(204); // https://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html#sec9.7, https://tools.ietf.org/html/rfc7231#section-6.3.5
        });
    });
});

module.exports = router;
