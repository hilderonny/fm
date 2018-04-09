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
            if (child[formuladef]) sum += child[formuladef];
        }
        value = sum ? parseFloat(sum) : null; // Prevent NaN
        await Db.query(clientname, `UPDATE ${Db.replaceQuotes(datatypename)} SET ${Db.replaceQuotesAndRemoveSemicolon(datatypefield.name)}=${value} WHERE name='${Db.replaceQuotes(entityname)}';`);
    },
    calculate_ifthenelse: async(clientname, datatypename, entityname, datatypefield, formuladef) => {
        if (formuladef.length !== 4) throw new Error(`ifthenelse must be array of 4 elements, not ${datatypefield.formula}`);
        var entity = await Db.getDynamicObject(clientname, datatypename, entityname);
        var elsedef = formuladef[3];
        var value = (entity[formuladef[0]] === formuladef[1]) ? entity[formuladef[2]] : (typeof(elsedef) === 'string' ? entity[elsedef] : elsedef);
        value = value ? parseFloat(value) : null; // Prevent NaN
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
            if (entity[fieldname]) sum += minus ? -entity[fieldname] : entity[fieldname];
        }
        value = sum ? parseFloat(sum) : null; // Prevent NaN
        await Db.query(clientname, `UPDATE ${Db.replaceQuotes(datatypename)} SET ${Db.replaceQuotesAndRemoveSemicolon(datatypefield.name)}=${value} WHERE name='${Db.replaceQuotes(entityname)}';`);
    },
    // Recalculates an antity and all of its parents recursively
    calculateentityandparentsrecursively: async(clientname, datatypename, entityname) => {
        // Fetch parent structure
        var parents = (await Db.getparentrelationstructure(clientname, datatypename, entityname)).sort((a, b) => a.depth - b.depth);
        // Calculate the entity itself
        await ch.calculateformula(clientname, datatypename, entityname);
        // Calculate parents, order is important!
        for (var i = 0; i < parents.length; i++) {
            var parent = parents[i];
            await ch.calculateformula(clientname, parent.datatype1name, parent.name1);
        }
    },
    // Calculates all formulas for a specific entity
    calculateformula: async(clientname, datatypename, entityname) => {
        var fieldref = (await Db.getdatatypes(clientname))[datatypename].fields;
        var datatypefields = Object.keys(fieldref).map(k => fieldref[k]).filter(f => f.fieldtype === co.fieldtypes.formula).sort((a,b) => a.formulaindex - b.formulaindex);
        for (var i = 0; i < datatypefields.length; i++) {
            var dtf = datatypefields[i];
            var formula = JSON.parse(dtf.formula);
            var keys = Object.keys(formula);
            if (keys.length !== 1) throw new Error(`Invalid formula ${dtf.formula}`);
            var key = keys[0];
            var formuladef = formula[key];
            switch (key) {
                case co.formulatypes.childsum: await ch.calculate_childsum(clientname, datatypename, entityname, dtf, formuladef); break;
                case co.formulatypes.ifthenelse: await ch.calculate_ifthenelse(clientname, datatypename, entityname, dtf, formuladef); break;
                case co.formulatypes.sum: await ch.calculate_sum(clientname, datatypename, entityname, dtf, formuladef); break;
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
                // perform calculations for all FM object types, the order here is important!
                var datatypestocalculate = ["areas", "rooms", "levels", "buildings", "properties", "projects"];
                for (var j = 0; j < datatypestocalculate.length; j++) {
                    var dt = datatypestocalculate[j];
                    var entitynames = (await Db.query(clientname, `SELECT name FROM ${dt};`)).rows.map(r => r.name);
                    for (var k = 0; k < entitynames.length; k++) {
                        await ch.calculateformula(clientname, dt, entitynames[k]);
                    }
                }
            }
        } catch(error) {
            console.log(error);
        }
        console.log("Recalculation finished.");
    }
}

module.exports = ch;