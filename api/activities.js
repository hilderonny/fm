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
var validateSameClientId = require('../middlewares/validateSameClientId');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');
var dah = require('../utils/dynamicAttributesHelper');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;

function mapActivities(activities, clientname) {
    return activities.map((a) => { return { _id: a.name, clientId: clientname, date: (new Date(a.date)).toISOString(), name: a.label, task: a.task, isDone: a.isdone, type: a.activitytypename, comment: a.comment, createdByUserId: a.createdbyusername, isForAllUsers: a.isforallusers } });
}

function mapActivityReverse(activity) {
    return [activity].map((a) => { return { name: a._id, date: (new Date(a.date)).getTime(), label: a.name, task: a.task, isdone: a.isDone, activitytypename: a.type, comment: a.comment, isforallusers: a.isForAllUsers } })[0];
}

// Get all activities of the current client, which were created by the current user or which are public
router.get('/', auth(co.permissions.OFFICE_ACTIVITY, 'r', co.modules.activities), async(req, res) => {
    var activitiesofuser = await Db.getDynamicObjects(req.user.clientname, "activities", { createdbyusername: req.user.name, isforallusers: false });
    var activitiesofclient = await Db.getDynamicObjects(req.user.clientname, "activities", { isforallusers: true });
    var allactivities = activitiesofuser.concat(activitiesofclient);
    res.send(mapActivities(allactivities, req.user.clientname));
});

/**
 * Liefert eine Liste von Terminen für die per URL übergebenen IDs. Die IDs müssen kommagetrennt sein.
 * Die Berechtigungen werden hier nicht per auth überprüft, da diese API für die Verknüpfungen verwendet
 * wird und da wäre es blöd, wenn ein 403 zur Neuanmeldung führte. Daher wird bei fehlender Berechtigung
 * einfach eine leere Liste zurück gegeben.
 * @example
 * $http.get('/api/activities/forIds?ids=ID1,ID2,ID3')...
 */
router.get('/forIds', auth(false, false, co.modules.activities), async(req, res) => {
    // Zuerst Berechtigung prüfen
    var accessAllowed = await auth.canAccess(req.user.name, co.permissions.OFFICE_ACTIVITY, 'r', co.modules.activities);
    if (!accessAllowed) {
        return res.send([]);
    }
    if (!req.query.ids) {
        return res.send([]);
    }
    var activitiesofuser = await Db.getDynamicObjectsForNames(req.user.clientname, "activities", req.query.ids.split(','), { createdbyusername: req.user.name, isforallusers: false });
    var activitiesofclient = await Db.getDynamicObjectsForNames(req.user.clientname, "activities", req.query.ids.split(','), { isforallusers: true });
    var allactivities = activitiesofuser.concat(activitiesofclient);
    res.send(mapActivities(allactivities, req.user.clientname));
});

// Get a specific activity
router.get('/:id', auth(co.permissions.OFFICE_ACTIVITY, 'r', co.modules.activities), validateSameClientId(co.collections.activities.name), async(req, res) => {
    var activity = await Db.getDynamicObject(req.user.clientname, "activities", req.params.id);
    if (!activity.isforallusers && !req.user.name === activity.createdbyusername) return res.sendStatus(403); // Zugriff nur auf eigene oder auf öffentliche Termine möglich
    activity.creator = activity.createdbyusername; // Needed by client UI
    var mappedActivity = mapActivities([activity], req.user.clientname)[0];
    mappedActivity.currentUserCanWrite = req.user.name === activity.createdbyusername; // public activities from others cannot be written
    res.send(mappedActivity);
});

// Create an activity
router.post('/', auth(co.permissions.OFFICE_ACTIVITY, 'w', co.modules.activities), async(req, res) => {
    var activity = req.body;
    if (!activity || Object.keys(activity).length < 1) {
        return res.sendStatus(400);
    }
    activity = mapActivityReverse(activity);
    activity.name = uuidv4();
    activity.createdbyusername = req.user.name;
    await Db.insertDynamicObject(req.user.clientname, "activities", activity);
    res.send(mapActivities([activity], req.user.clientname)[0]);
});

// Update an activity
router.put('/:id', auth(co.permissions.OFFICE_ACTIVITY, 'w', co.modules.activities), validateSameClientId(co.collections.activities.name), async(req, res) => {
    var activity = req.body;
    if(!activity || Object.keys(activity).length < 1) {
        return res.sendStatus(400);
    }
    var activitytoupdate = {};
    if (typeof(activity.date) !== "undefined") activitytoupdate.date = (new Date(activity.date)).getTime();
    if (typeof(activity.name) !== "undefined") activitytoupdate.label = activity.name;
    if (typeof(activity.task) !== "undefined") activitytoupdate.task = activity.task;
    if (typeof(activity.isDone) !== "undefined") activitytoupdate.isdone = activity.isDone;
    if (typeof(activity.type) !== "undefined") activitytoupdate.activitytypename = activity.type;
    if (typeof(activity.comment) !== "undefined") activitytoupdate.comment = activity.comment;
    if (typeof(activity.isForAllUsers) !== "undefined") activitytoupdate.isforallusers = activity.isForAllUsers;
    var result = await Db.updateDynamicObject(req.user.clientname, "activities", req.params.id, activitytoupdate, { createdbyusername: req.user.name });
    if (result.rowCount < 1) return res.sendStatus(403); // User is not the creator
    res.send(activitytoupdate);
});

/**
 * Löscht einen Termin und alle zugehörigen Verknüpfungen
 */
router.delete('/:id', auth(co.permissions.OFFICE_ACTIVITY, 'w', co.modules.activities), validateSameClientId(co.collections.activities.name), async(req, res) => {
    var id = req.params.id;
    var clientname = req.user.clientname;
    var result = await Db.deleteDynamicObject(clientname, "activities", id, { createdbyusername: req.user.name });
    if (result.rowCount < 1) return res.sendStatus(403); // User is not the creator
    await rh.deleteAllRelationsForEntity(clientname, co.collections.activities.name, id);
    await dah.deleteAllDynamicAttributeValuesForEntity(clientname, id);
    res.sendStatus(204);       
});

module.exports = router;
