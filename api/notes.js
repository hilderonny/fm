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
var validateId = require('../middlewares/validateId');
var validateSameClientId = require('../middlewares/validateSameClientId');
var monk = require('monk');
var co = require('../utils/constants');
var rh = require('../utils/relationsHelper');
var dah = require('../utils/dynamicAttributesHelper');
var Db = require("../utils/db").Db;
var uuidv4 = require("uuid").v4;

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
    res.send(notes.map((n) => { return { _id: n.name, clientId: req.user.clientname, content: n.content } }));
});

router.get('/', auth(co.permissions.OFFICE_NOTE, 'r', co.modules.notes), async (req, res) =>{
    var notes = await Db.getDynamicObjects(req.user.clientname, "notes");
    res.send(notes.map((n) => { return { _id: n.name, clientId: req.user.clientname, content: n.content } }));
});

router.get('/:id', auth(co.permissions.OFFICE_NOTE, 'r', co.modules.notes), validateSameClientId(co.collections.notes.name), async(req, res) => {
    var note = await Db.getDynamicObject(req.user.clientname, "notes", req.params.id);
    res.send({ _id: note.name, clientId: req.user.clientname, content: note.content });
});

router.post('/', auth(co.permissions.OFFICE_NOTE, 'w', co.modules.notes), async(req, res) => {
   var note = req.body;
    if (!note || Object.keys(note).length < 1) {
        return res.sendStatus(400);
    }
    note.name = uuidv4();
    await Db.insertDynamicObject(req.user.clientname, "notes", note);
    res.send({ _id: note.name, clientId: req.user.clientname, content: note.content });
});

router.put('/:id' , auth(co.permissions.OFFICE_NOTE, 'w', co.modules.notes), validateId, validateSameClientId(co.collections.notes.name), function(req,res){
   var note = req.body;
   if(!note || Object.keys(note).length < 1) {
       return res.sendStatus(400);
   }
   delete note._id;
   delete note.clientId;
   if (Object.keys(note).length < 1) {
       return res.sendStatus(400);
   }
   req.db.update(co.collections.notes.name, req.params.id, { $set: note }).then((updatedNote) => {
       res.send(updatedNote);
   });
});

router.delete('/:id', auth(co.permissions.OFFICE_NOTE, 'w', co.modules.notes),validateId, validateSameClientId(co.collections.notes.name),function(req,res){
    var noteId = monk.id(req.params.id);  
    req.db.remove(co.collections.notes.name, req.params.id).then((result) => {
        return rh.deleteAllRelationsForEntity(co.collections.notes.name, noteId);
    }).then(() => {
        return dah.deleteAllDynamicAttributeValuesForEntity(noteId);
    }).then(() => {
        res.sendStatus(204);       
    });
});

module.exports = router;
