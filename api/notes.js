/**
 * CRUD API for notes management
 * notes {
 *      _id,
 *      contents, // contents of the notes *     
 *      clientId          
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

function mapNotes(notes, clientname) {
    return notes.map((n) => { return { _id: n.name, clientId: clientname, content: n.content } });
}

function mapNoteReverse(note) {
    return [note].map((n) => { return { name: n._id, content: n.content } })[0];
}

router.get('/forIds', auth(false, false, co.modules.notes), async (req, res) => {
    // Zuerst Berechtigung prüfen
    var accessAllowed = await auth.canAccess(req.user.name, co.permissions.OFFICE_NOTE, 'r', co.modules.notes);
    if (!accessAllowed) {
        return res.send([]);
    }
    if (!req.query.ids) {
        return res.send([]);
    }
    var notes = await Db.getDynamicObjectsForNames(req.user.clientname, "notes", req.query.ids.split(','));
    res.send(mapNotes(notes, req.user.clientname));
});

router.get('/', auth(co.permissions.OFFICE_NOTE, 'r', co.modules.notes), async (req, res) =>{
    var notes = await Db.getDynamicObjects(req.user.clientname, "notes");
    res.send(mapNotes(notes, req.user.clientname));
});

router.get('/:id', auth(co.permissions.OFFICE_NOTE, 'r', co.modules.notes), validateSameClientId(co.collections.notes.name), async(req, res) => {
    var note = await Db.getDynamicObject(req.user.clientname, "notes", req.params.id);
    res.send(mapNotes([note], req.user.clientname)[0]);
});

router.post('/', auth(co.permissions.OFFICE_NOTE, 'w', co.modules.notes), async(req, res) => {
   var note = req.body;
    if (!note || Object.keys(note).length < 1) {
        return res.sendStatus(400);
    }
    note = mapNoteReverse(note);
    note.name = uuidv4();
    await Db.insertDynamicObject(req.user.clientname, "notes", note);
    res.send(mapNotes([note], req.user.clientname)[0]);
});

router.put('/:id' , auth(co.permissions.OFFICE_NOTE, 'w', co.modules.notes), validateSameClientId(co.collections.notes.name), async(req,res) => {
   var note = req.body;
   if(!note || Object.keys(note).length < 1) {
       return res.sendStatus(400);
   }
   var notetoupdate = {};
   if (typeof(note.content) !== "undefined") notetoupdate.content = note.content;
   await Db.updateDynamicObject(req.user.clientname, "notes", req.params.id, notetoupdate);
   res.send(note);
});

router.delete('/:id', auth(co.permissions.OFFICE_NOTE, 'w', co.modules.notes), validateSameClientId(co.collections.notes.name), async(req,res) => {
    var id = req.params.id;
    var clientname = req.user.clientname;
    await Db.deleteDynamicObject(clientname, "notes", id);
    await rh.deleteAllRelationsForEntity(clientname, co.collections.notes.name, id);
    await dah.deleteAllDynamicAttributeValuesForEntity(clientname, id);
    res.sendStatus(204);       
});

module.exports = router;
