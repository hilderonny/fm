/**
 * CRUD API for activity management
 */
var co = require('../utils/constants');
var ah = require("../utils/apiHelper");

module.exports = ah.createApi({
    apiname: "activities",
    modulename: "activities",
    permission: co.permissions.OFFICE_ACTIVITY,
    mapfields: (e, user) => { return {
        _id: e.name, 
        clientId: user.clientname, 
        date: (new Date(e.date)).toISOString(), 
        name: e.label, 
        task: e.task, 
        isDone: e.isdone, 
        type: e.activitytypename, 
        comment: e.comment, 
        createdByUserId: e.createdbyusername, 
        isForAllUsers: e.isforallusers,
        currentUserCanWrite: user.name === e.createdbyusername
    }},
    mapfieldsreverse: (e) => { return {
        name: e._id, 
        date: e.date !== undefined ? (new Date(e.date)).getTime() : undefined, 
        label: e.name, 
        task: e.task, 
        isdone: e.isDone, 
        activitytypename: e.type, 
        comment: e.comment, 
        isforallusers: e.isForAllUsers
    }},
    getforids: [
        (req) => { return { createdbyusername: req.user.name, isforallusers: false } },
        (req) => { return { isforallusers: true } }
    ],
    getall: [
        (req) => { return { createdbyusername: req.user.name, isforallusers: false } },
        (req) => { return { isforallusers: true } }
    ],
    getid: (activity, req, res) => {
        if (!activity.isforallusers && !req.user.name === activity.createdbyusername) {
            res.sendStatus(403);
            return false;
        }
        return true;
    },
    post: (activity, req, res) => {
        activity.createdbyusername = req.user.name;
        return true;
    },
    put: (req) => { return { createdbyusername: req.user.name } },
    delete: (req) => { return { createdbyusername: req.user.name } },
});
