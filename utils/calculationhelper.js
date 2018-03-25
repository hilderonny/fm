var Db = require("./db").Db;
var co = require("./constants");

var ch = {
    calculate_childifsumzero: async(clientname, datatypename, entityname, datatypefield, formuladef) => {
        if (formuladef.length !== 2) throw new Error(`childifsumzero must be array of 2 elements, not ${datatypefield.formula}`);
        var parent = await Db.getDynamicObject(clientname, datatypename, entityname);
        var childrelations = (await Db.query(clientname, `SELECT datatype2name, name2 FROM relations WHERE relationtypename='parentchild' AND datatype1name='${Db.replaceQuotes(datatypename)}' AND name1='${Db.replaceQuotes(entityname)}';`)).rows;
        var sum = 0;
        var childsumfieldname = formuladef[0];
        for (var i = 0; i < childrelations.length; i++) {
            var childrelation = childrelations[i];
            var child = await Db.getDynamicObject(clientname, childrelation.datatype2name, childrelation.name2);
            if (child[childsumfieldname]) sum += child[childsumfieldname];
        }
        if (!sum) sum = parent[formuladef[1]];
        value = sum ? parseFloat(sum) : 0; // Prevent NaN
        await Db.query(clientname, `UPDATE ${Db.replaceQuotes(datatypename)} SET ${Db.replaceQuotesAndRemoveSemicolon(datatypefield.name)}=${parseFloat(value)} WHERE name='${Db.replaceQuotes(entityname)}';`);
    },
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
        value = sum ? parseFloat(sum) : 0; // Prevent NaN
        await Db.query(clientname, `UPDATE ${Db.replaceQuotes(datatypename)} SET ${Db.replaceQuotesAndRemoveSemicolon(datatypefield.name)}=${parseFloat(value)} WHERE name='${Db.replaceQuotes(entityname)}';`);
    },
    calculate_div: async(clientname, datatypename, entityname, datatypefield, formuladef) => {
        if (formuladef.length !== 2) throw new Error(`div must be array of 2 elements, not ${datatypefield.formula}`);
        var entity = await Db.getDynamicObject(clientname, datatypename, entityname);
        var divident = entity[formuladef[0]];
        var divisor = entity[formuladef[1]];
        var quotient = (!divident || !divisor) ? 0 : divident / divisor;
        value = quotient ? parseFloat(quotient) : 0; // Prevent NaN
        await Db.query(clientname, `UPDATE ${Db.replaceQuotes(datatypename)} SET ${Db.replaceQuotesAndRemoveSemicolon(datatypefield.name)}=${parseFloat(value)} WHERE name='${Db.replaceQuotes(entityname)}';`);
    },
    calculate_ifthenelse: async(clientname, datatypename, entityname, datatypefield, formuladef) => {
        if (formuladef.length !== 4) throw new Error(`ifthenelse must be array of 4 elements, not ${datatypefield.formula}`);
        var entity = await Db.getDynamicObject(clientname, datatypename, entityname);
        var elsedef = formuladef[3];
        var value = (entity[formuladef[0]] === formuladef[1]) ? entity[formuladef[2]] : (typeof(elsedef) === 'string' ? entity[elsedef] : elsedef);
        value = value ? parseFloat(value) : 0; // Prevent NaN
        await Db.query(clientname, `UPDATE ${Db.replaceQuotes(datatypename)} SET ${Db.replaceQuotesAndRemoveSemicolon(datatypefield.name)}=${parseFloat(value)} WHERE name='${Db.replaceQuotes(entityname)}';`);
    },
    calculate_prod: async(clientname, datatypename, entityname, datatypefield, formuladef) => {
        if (formuladef.length < 1) throw new Error(`prod must be array of at least 1 element, not ${datatypefield.formula}`);
        var entity = await Db.getDynamicObject(clientname, datatypename, entityname);
        var prod = 0;
        for (var i = 0; i < formuladef.length; i++) {
            var fieldname = formuladef[i];
            var minus = false;
            if (fieldname.indexOf("-") === 0) {
                minus = true;
                fieldname = fieldname.substring(1);
            }
            if (entity[fieldname]) prod *= minus ? -entity[fieldname] : entity[fieldname];
        }
        value = prod ? parseFloat(prod) : 0; // Prevent NaN
        await Db.query(clientname, `UPDATE ${Db.replaceQuotes(datatypename)} SET ${Db.replaceQuotesAndRemoveSemicolon(datatypefield.name)}=${parseFloat(value)} WHERE name='${Db.replaceQuotes(entityname)}';`);
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
        value = sum ? parseFloat(sum) : 0; // Prevent NaN
        await Db.query(clientname, `UPDATE ${Db.replaceQuotes(datatypename)} SET ${Db.replaceQuotesAndRemoveSemicolon(datatypefield.name)}=${parseFloat(value)} WHERE name='${Db.replaceQuotes(entityname)}';`);
    },
    calculateformula: async(clientname, datatypename, entityname) => {
        var datatypefields = (await Db.getDataTypeFields(clientname, datatypename)).sort((a,b) => a.formulaindex - b.formulaindex);
        for (var i = 0; i < datatypefields.length; i++) {
            var dtf = datatypefields[i];
            if (dtf.fieldtype !== co.fieldtypes.formula) continue;
            var formula = JSON.parse(dtf.formula);
            var keys = Object.keys(formula);
            if (keys.length !== 1) throw new Error(`Invalid formula ${dtf.formula}`);
            var key = keys[0];
            var formuladef = formula[key];
            switch (key) {
                case co.formulatypes.childifsumzero: await ch.calculate_childifsumzero(clientname, datatypename, entityname, dtf, formuladef); break;
                case co.formulatypes.childsum: await ch.calculate_childsum(clientname, datatypename, entityname, dtf, formuladef); break;
                case co.formulatypes.div: await ch.calculate_div(clientname, datatypename, entityname, dtf, formuladef); break;
                case co.formulatypes.ifthenelse: await ch.calculate_ifthenelse(clientname, datatypename, entityname, dtf, formuladef); break;
                case co.formulatypes.prod: await ch.calculate_prod(clientname, datatypename, entityname, dtf, formuladef); break;
                case co.formulatypes.sum: await ch.calculate_sum(clientname, datatypename, entityname, dtf, formuladef); break;
                default: throw new Error(`Unknown formula type "${key}"`);
            }
        }
    }
}

module.exports = ch;