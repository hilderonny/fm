var Db = require("./db").Db;
var co = require("./constants");

var ch = {
    calculate_childsum: async(clientname, datatypename, entityname, datatypefield, formuladef) => {
        if (typeof(formuladef) !== 'string') throw new Error(`childsum must be reference to fieldname, not ${datatypefield.formula}`);
        var parent = await Db.getDynamicObject(clientname, datatypename, entityname);
        var childrelations = (await Db.query(clientname, `SELECT datatype2name, name2 FROM relations WHERE relationtypename='parentchild' AND datatype1name='${Db.replaceQuotes(datatypename)}' AND name1='${Db.replaceQuotes(entityname)}';`)).rows;
        var sum = 0;
        for (var i = 0; i < childrelations.length; i++) {
            var childrelation = childrelations[i];
            var child = await Db.getDynamicObject(clientname, childrelation.datatype2name, childrelation.name2);
            if (child[formuladef]) sum += parseFloat(child[formuladef]);
        }
        var value = typeof(sum) === "number" ? parseFloat(sum) : null; // Prevent NaN
        await Db.query(clientname, `UPDATE ${Db.replaceQuotes(datatypename)} SET ${Db.replaceQuotesAndRemoveSemicolon(datatypefield.name)}=${value} WHERE name='${Db.replaceQuotes(entityname)}';`);
    },
    calculate_ifthenelse: async(clientname, datatypename, entityname, datatypefield, formuladef) => {
        if (formuladef.length !== 4) throw new Error(`ifthenelse must be array of 4 elements, not ${datatypefield.formula}`);
        var entity = await Db.getDynamicObject(clientname, datatypename, entityname);
        var elsedef = formuladef[3];
        var value = (entity[formuladef[0]] === formuladef[1]) ? entity[formuladef[2]] : (typeof(elsedef) === 'string' ? entity[elsedef] : elsedef);
        value = typeof(value) === "number" ? parseFloat(value) : null; // Prevent NaN
        await Db.query(clientname, `UPDATE ${Db.replaceQuotes(datatypename)} SET ${Db.replaceQuotesAndRemoveSemicolon(datatypefield.name)}=${value} WHERE name='${Db.replaceQuotes(entityname)}';`);
    },
    calculate_sum: async(clientname, datatypename, entityname, datatypefield, formuladef) => {
        if (formuladef.length < 1) throw new Error(`sum must be array of at least 1 element, not ${datatypefield.formula}`);
        var entity = await Db.getDynamicObject(clientname, datatypename, entityname);
        var sum = 0;
        for (var i = 0; i < formuladef.length; i++) {
            var fieldname = formuladef[i];
            var minus = false;
            if (fieldname.indexOf("-") === 0) {
                minus = true;
                fieldname = fieldname.substring(1);
            }
            if (entity[fieldname]) sum += minus ? -parseFloat(entity[fieldname]) : parseFloat(entity[fieldname]);
        }
        var value = typeof(sum) === "number" ? parseFloat(sum) : null; // Prevent NaN
        await Db.query(clientname, `UPDATE ${Db.replaceQuotes(datatypename)} SET ${Db.replaceQuotesAndRemoveSemicolon(datatypefield.name)}=${value} WHERE name='${Db.replaceQuotes(entityname)}';`);
    },
    calculate_concat: async(clientname, datatypename, entityname, datatypefield, formuladef) => {
        if (formuladef.length < 1) throw new Error(`concat must be array of at least 1 element, not ${datatypefield.formula}`);
        var entity = await Db.getDynamicObject(clientname, datatypename, entityname);
        var concattedstring = "";
        for (var i = 0; i < formuladef.length; i++) {
            var part = formuladef[i];
            if (part.indexOf("@") === 0) {
                // Field
                fieldname = part.substring(1);
                if (entity[fieldname]) concattedstring += entity[fieldname];
            } else {
                // String
                concattedstring += part;
            }
        }
        await Db.query(clientname, `UPDATE ${Db.replaceQuotes(datatypename)} SET ${Db.replaceQuotesAndRemoveSemicolon(datatypefield.name)}='${Db.replaceQuotes(concattedstring)}' WHERE name='${Db.replaceQuotes(entityname)}';`);
    },
    // Recalculates an antity and all of its parents recursively
    calculateentityandparentsrecursively: async(clientname, datatypename, entityname) => {
        // Fetch parent structure
        var parents = (await Db.getparentrelationstructure(clientname, datatypename, entityname)).sort((a, b) => a.depth - b.depth);
        // Calculate the entity itself
        try {
            await ch.calculateformula(clientname, datatypename, entityname);
        } catch(error) {
            console.log(error);
        } // Ignore calculation errors for invalid formulas
        // Calculate parents, order is important!
        for (var i = 0; i < parents.length; i++) {
            var parent = parents[i];
            try {
                await ch.calculateformula(clientname, parent.datatype1name, parent.name1);
            } catch(error) { } // Ignore calculation errors for invalid formulas
        }
    },
    // Calculates all formulas for a specific entity
    calculateformula: async(clientname, datatypename, entityname) => {
        var fieldref = (await Db.getdatatypes(clientname))[datatypename].fields;
        var datatypefields = Object.keys(fieldref).map(k => fieldref[k]).filter(f => f.fieldtype === co.fieldtypes.formula).sort((a,b) => a.formulaindex - b.formulaindex);
        for (var i = 0; i < datatypefields.length; i++) {
            var dtf = datatypefields[i];
            var formula = JSON.parse(dtf.formula);
            if (!formula) throw new Error(`Invalid formula ${dtf.formula}`);
            var keys = Object.keys(formula);
            if (keys.length !== 1) throw new Error(`Invalid formula ${dtf.formula}`);
            var key = keys[0];
            var formuladef = formula[key];
            switch (key) {
                case co.formulatypes.childsum: await ch.calculate_childsum(clientname, datatypename, entityname, dtf, formuladef); break;
                case co.formulatypes.ifthenelse: await ch.calculate_ifthenelse(clientname, datatypename, entityname, dtf, formuladef); break;
                case co.formulatypes.sum: await ch.calculate_sum(clientname, datatypename, entityname, dtf, formuladef); break;
                case co.formulatypes.concat: await ch.calculate_concat(clientname, datatypename, entityname, dtf, formuladef); break;
                default: throw new Error(`Unknown formula type "${key}"`);
            }
        }
    },
    recalculateall: async() => { // Called in app.js in line 118
        console.log("Recalculating all formulas ...");
        try {
            var clients = (await Db.query(Db.PortalDatabaseName, "SELECT name FROM clients;")).rows;
            for (var i = 0; i < clients.length; i++) {
                var clientname = clients[i].name;
                // perform calculations for all datatypes beginning with all leaf elements proceeding hierarchically upwards
                var datatypestocalculate = (await Db.query(clientname, "SELECT DISTINCT datatypename FROM datatypefields WHERE fieldtype = 'formula';")).rows.map(r => r.datatypename);
                for (var j = 0; j < datatypestocalculate.length; j++) {
                    var dt = datatypestocalculate[j];
                    var query = `SELECT x.name FROM ${dt} x LEFT JOIN relations r ON r.datatype1name = '${dt}' AND r.name1 = x.name WHERE r IS NULL OR (r.relationtypename='parentchild' AND NOT r.datatype2name IN (${datatypestocalculate.map(d => `'${d}'`).join(",")}));`;
                    var entitynames = (await Db.query(clientname, query)).rows.map(r => r.name);
                    for (var k = 0; k < entitynames.length; k++) {
                        await ch.calculateentityandparentsrecursively(clientname, dt, entitynames[k]);
                    }
                }
            }
        } catch(error) {
            console.log(error);
        }
        console.log("Recalculation finished.");
    },
    // Recalculate all entites of a datatype and their parents
    recalculateforupdateddatatype: async(clientname, datatypename) => { // Called in db.js in line 154
        try {
            // perform calculations beginning with all leaf elements proceeding hierarchically upwards
            var entitynames = (await Db.query(clientname, `SELECT x.name FROM ${datatypename} x LEFT JOIN relations r ON r.datatype1name = '${datatypename}' AND r.name1 = x.name WHERE r IS NULL;`)).rows.map(r => r.name);
            for (var k = 0; k < entitynames.length; k++) {
                await ch.calculateentityandparentsrecursively(clientname, datatypename, entitynames[k]);
            }
        } catch(error) {
            console.log(error);
        }
    }
}

module.exports = ch;