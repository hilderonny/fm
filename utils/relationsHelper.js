var db = require('../middlewares/db');
var co = require('../utils/constants');

/**
 * Deletes all relations where the given entity is the tarte or the source.
 * Usage: require('../utils/relationsHelper').deleteAllRelationsForEntity(co.collections.folders.name, folder._id);
 * @returns Promise
 */
module.exports.deleteAllRelationsForEntity = (entityType, id) => {
    return db.get(co.collections.relations.name).remove({$or: [
        { type1: entityType, id1: id },
        { type2: entityType, id2: id }
    ]});
};