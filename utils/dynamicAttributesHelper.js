var db = require('../middlewares/db');
var co = require('../utils/constants');

/**
 * Deletes all relations where the given entity is the tarte or the source.
 * Usage: require('../utils/relationsHelper').deleteAllRelationsForEntity(co.collections.folders.name, folder._id);
 * @returns Promise
 */
module.exports.deleteAllDynamicAttributeValuesForEntity = (id) => {
    return db.get(co.collections.dynamicattributevalues.name).remove({entityId: id});
};