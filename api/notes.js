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

router.get('/forIds', auth(false, false, co.modules.notes), (req, res) => {
    // Zuerst Berechtigung prüfen
    auth.canAccess(req.user._id, co.permissions.OFFICE_NOTE, 'r', co.modules.notes, req.db).then(function(accessAllowed) {
        if (!accessAllowed) {
            return res.send([]);
        }
        if (!req.query.ids) {
            return res.send([]);
        }
        var ids = req.query.ids.split(',').filter(validateId.validateId).map(function(id) { return monk.id(id); }); // Nur korrekte IDs verarbeiten
        var clientId = req.user.clientId; // Nur die Notiz des Mandanten des Benutzers raus holen.
        var userId = req.user._id;
        req.db.get(co.collections.notes.name).find({
            _id: { $in: ids },
            clientId: clientId,
        }).then((notes) => {
            res.send(notes);
        });
    });
});
// Get all notes of the current client 
router.get('/', auth(co.permissions.OFFICE_NOTE, 'r', co.modules.notes), async (req, res) =>{
    var clientId = req.user.clientId;
    var oldnotes = await req.db.get(co.collections.notes.name).find({clientId: clientId});
    console.log(oldnotes);
    var newnotes = await Db.getDynamicObjects(clientId.toString(), "notes");
    console.log(newnotes);
    res.send(newnotes.map((n) => { return { _id: n.name, content: n.content } }));
});
/**
 * Get single note with given id
 */
router.get('/:id', auth(co.permissions.OFFICE_NOTE, 'r', co.modules.notes), validateId,validateSameClientId(co.collections.notes.name), (req, res) => {
    req.db.get(co.collections.notes.name).findOne(req.params.id, req.query.fields).then((note) => {
        res.send(note);
    });
});
// Create a Note
router.post('/', auth(co.permissions.OFFICE_NOTE, 'w', co.modules.notes), function(req, res) {
   var note = req.body;
    if (!note || Object.keys(note).length < 1) {
        return res.sendStatus(400);
    }
    delete note._id; // Ids are generated automatically
    note.clientId = req.user.clientId;
    req.db.insert(co.collections.notes.name, note).then((insertedNote) => {
       return res.send(insertedNote);
    });

});

/**
* Updating note details
*/
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

/**
 * Delete note
 */

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
