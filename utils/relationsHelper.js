var Db = require("../utils/db").Db;

module.exports.deleteAllRelationsForEntity = async(clientname, datatypename, entityname) => {
    await Db.deleteDynamicObjects(clientname, "relations", { datatype1name: datatypename, name1: entityname });
    await Db.deleteDynamicObjects(clientname, "relations", { datatype2name: datatypename, name2: entityname });
};