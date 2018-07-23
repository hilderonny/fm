var Db = require("./db").Db;

var doh = {

    getchildren: async(clientname, recordtypename, entityname, permissionsofuser, forlist) => {
        var relevantrelations = (await Db.query(clientname, `
            SELECT r.datatype2name, r.name2, dtc.permissionkey, dtc.icon, CASE WHEN count(rc) > 0 THEN true ELSE false END haschildren FROM relations r 
            JOIN datatypes dtp ON dtp.name = r.datatype1name 
            JOIN datatypes dtc ON dtc.name = r.datatype2name 
            LEFT JOIN relations rc ON rc.name1 = r.name2 AND rc.relationtypename = 'parentchild' AND rc.datatype1name = r.datatype2name
            WHERE r.relationtypename = 'parentchild'
            AND r.datatype1name = '${Db.replaceQuotes(recordtypename)}'
            AND r.name1 = '${Db.replaceQuotes(entityname)}'
            AND '${Db.replaceQuotes(forlist)}' = ANY (dtc.lists)
            GROUP BY r.datatype2name, r.name2, dtc.permissionkey, dtc.icon;
        `)).rows;
        var children = [];
        for (var i = 0; i < relevantrelations.length; i++) {
            var rr = relevantrelations[i];
            // In custom datatypes there currently are no permissions defined
            if (rr.permissionkey && !permissionsofuser[rr.permissionkey]) continue; // No permission to access specific datatype entities
            var child = await Db.getDynamicObject(clientname, rr.datatype2name, rr.name2);
            if (!child) continue; // Sometimes the relation in the database is corrupt and does not target a correct child. So ignore such entries.
            child.datatypename = rr.datatype2name;
            if (!child.icon) child.icon = rr.icon; // Set the icon to the one of the datatype when the object itself has no icon
            child.haschildren = rr.haschildren;
            children.push(child);
        }
        return children;
    },

    getrootelements: async(clientname, forlist, permissionsofuser) => {
        var clientmodulenames = (await Db.query(Db.PortalDatabaseName, `SELECT modulename FROM clientmodules WHERE clientname='${Db.replaceQuotes(clientname)}';`)).rows.map(r => `'${Db.replaceQuotes(r.modulename)}'`);
        // Die Modulzuordnungen von Portalen selbst werden nicht in  den clientmodules gepflegt und müssen daher unbeachtet gelassen werden
        var additionalfilter = clientname !== Db.PortalDatabaseName ? ` AND (modulename IS NULL OR modulename IN (${clientmodulenames.join(",")}))` : ""; // modulename == null kommt bei benutzerdefinierten Datentypen vor.
        var relevantdatatypes = (await Db.query(clientname, `SELECT * FROM datatypes WHERE '${Db.replaceQuotes(forlist)}' = ANY (lists)${additionalfilter};`)).rows;
        var rootelements = [];
        for (var i = 0; i < relevantdatatypes.length; i++) { // Must be loop because it is not said, that all datatypes have all required columns so UNION will not work
            var rdt = relevantdatatypes[i];
            if (rdt.permissionkey && !permissionsofuser[rdt.permissionkey]) continue; // No permission to access specific datatypes
            var rdtn = Db.replaceQuotesAndRemoveSemicolon(rdt.name);
            var entities = (await Db.query(clientname, `
                SELECT e.*, CASE WHEN r.childcount > 0 THEN true ELSE false END haschildren FROM ${rdtn} e JOIN (
                    SELECT e.name, count(rc) childcount FROM ${rdtn} e 
                    LEFT JOIN relations rp ON rp.name2 = e.name AND rp.relationtypename = 'parentchild' AND rp.datatype2name = '${rdtn}' 
                    LEFT JOIN relations rc ON rc.name1 = e.name AND rc.relationtypename = 'parentchild' AND rc.datatype1name = '${rdtn}'
                    WHERE rp.name IS NULL
                    GROUP BY e.name
                ) r ON r.name = e.name;
            `)).rows;
            entities.forEach(e => {
                e.datatypename = rdt.name;
                if (!e.icon) e.icon = rdt.icon; // Set the icon to the one of the datatype when the object itself has no icon
                rootelements.push(e);
            });
        }
        return rootelements;
    }

};

module.exports = doh;