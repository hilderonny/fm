/**
 * Api for importing CSV files
 * https://jsfiddle.net/mohan_rathour/Lt3wjgfx/7/
 */

var router = require('express').Router();
var auth = require('../middlewares/auth');
var mime = require('mime');
var fs = require('fs');
var path = require('path');
var documentsHelper = require('../utils/documentsHelper');
var co = require('../utils/constants');
var Db = require("../utils/db").Db;

async function importDocument(csvdocument, clientname, targetdatatypename){
    var filePath = documentsHelper.getDocumentPath(clientname, csvdocument.name);
   // var readstream = fs.createReadStream(filePath);
    console.log(filePath);
    console.log("target data ",targetdatatypename);
    console.log("clientname", clientname);
   // console.log(readstream);
   var contents={};
   
    var columnnames = (await Db.query(clientname, `SELECT column_name FROM information_schema.columns WHERE table_name= '${targetdatatypename}';`)).rows;
    
    console.log("columnnames", columnnames);
    console.log("columnnames_name", columnnames[0].column_name);
    var data = fs.readFileSync(filePath, 'utf8');
    console.log(data, data.length);  
    var array =csvtoJSON(data);
    console.log("received array", array)
    var lastarr=[];
    //console.log(array[0]);
    //console.log(array[0].label);
    //console.log(array[0].Name);        
    for (var i = 0; i < array.length-1; i++) {
        var object = array[i];
        for (var property in object) {
           console.log('item ' + i + ': ' + property + '=' + object[property]);
            for(var j=0; j<columnnames.length;j++){
                
               var clean_property=property.toLowerCase().replace(/\s/g, '').split('\r\n');
               var cleaned_values= object[property].replace(/\s/g, '').replace(/\'/g, "\"").split('\r\n');            
                if(clean_property==columnnames[j].column_name){                      
                   //contents = Object.assign({[columnnames[j].column_name]: object[property]},contents);
                   contents = Object.assign({[columnnames[j].column_name]: cleaned_values},contents);          
                    break;
                }
            }
        } 
        lastarr.push(contents);
        contents={};
    }  
    var lastdata={};
    console.log("last lastarr",lastarr);  
    var fieldMap = {}; 
    
    var fields = (await Db.query(clientname, `SELECT * FROM datatypefields WHERE datatypename = '${Db.replaceQuotes(targetdatatypename)}';`)).rows;
    for(var k=0; k < lastarr.length; k++)
    {
        lastdata= lastarr[k];   
        console.log("last dataaaaaaa",lastdata);
        var keys = Object.keys(lastdata);
        var values = Object.keys(lastdata).map(e => lastdata[e]);
        console.log("keysssssssss", keys);
        console.log("valueeeeeees", values);

        fields.forEach((field) => { 
            fieldMap[field.name] = field;
            if (field.isrequired && (keys.indexOf(field.name) < 0 || lastdata[field.name] === undefined)) throw new Error(`Required field '${field.name}' is missing`);
        });
        console.log(fieldMap);

        keys = keys.filter(k => fieldMap[k]);

        var val= keys.map((k) => {
            var value = lastdata[k];
            var field = fieldMap[k];
            var result;
            console.log("typeof" , typeof(value[0]));
           console.log(/^\d+\.\d+$/.test(value[0]));
            switch (field.fieldtype) {
                case co.fieldtypes.boolean: if (value !== undefined && value !== null && typeof(value) !== "boolean") throw new Error(`Value type ${typeof(value)} not allowed for field type boolean`); result = (value === undefined || value === null) ? "null" : value; break;
                case co.fieldtypes.datetime: if (value !== undefined && value !== null && typeof(value) !== "number") throw new Error(`Value type ${typeof(value)} not allowed for field type datetime`); result = (value === undefined || value === null) ? "null" : value; break;
                case co.fieldtypes.decimal: if (value !== undefined && value !== null && typeof(value) !== "number") throw new Error(`Value type ${typeof(value)} not allowed for field type decimal`); result = (value === undefined || value === null) ? "null" : value; break;
                case co.fieldtypes.formula: var isnumber= (/^\d+\.\d+$/.test(value[0])); result = (value === undefined || value === null || isnumber===false) ? "null" : `'${Db.replaceQuotes(value)}'`; break;
                case co.fieldtypes.password: result = (value === undefined || value === null) ? "null" : `'${Db.replaceQuotes(bcryptjs.hashSync(value))}'`; break;
                case co.fieldtypes.reference: result = (value === undefined || value === null) ? "null" : `'${Db.replaceQuotes(value)}'`; break;
                case co.fieldtypes.text: result = (value === undefined || value === null) ? "null" : `'${Db.replaceQuotes(value)}'`; break;
                default: throw new Error(`Unknown field type '${field.fieldtype}'`);
            }
            return result;
        });


       /** var query = `INSERT INTO ${targetdatatypename} (${keys}) VALUES ('${values.join('\',\'')}') ON CONFLICT (name) DO UPDATE SET (${keys}) = ('${values.join('\',\'')}');`;
        var query1 = `INSERT INTO ${targetdatatypename} (${keys}) VALUES ('${val.join('\',\'')}') ON CONFLICT (name) DO UPDATE SET (${keys}) = ('${val.join('\',\'')}');`;
        var query2 = `INSERT INTO ${targetdatatypename} (${keys}) VALUES ('${val.join(',')}') ON CONFLICT (name) DO UPDATE SET (${keys}) = ('${val.join(',')}');`;**/

        var query = `INSERT INTO ${targetdatatypename} (${keys.map(k => Db.replaceQuotesAndRemoveSemicolon(k)).join(',')}) VALUES (${val.join(',')}) ON CONFLICT (name) DO UPDATE SET (${keys.map(k => Db.replaceQuotesAndRemoveSemicolon(k)).join(',')}) = (${val.join(',')});`;
        await Db.query(clientname, query);
        //await Db.query(clientname, query);
    }
   
     
        
}//the end of the function 


function CSVToArray(strData, strDelimiter) {
    // Check to see if the delimiter is defined. If not,
    // then default to comma.
    strDelimiter = (strDelimiter || ",");
    // Create a regular expression to parse the CSV values.
    var objPattern = new RegExp((
    // Delimiters.
    "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
    // Quoted fields.
    "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
    // Standard fields.
    "([^\"\\" + strDelimiter + "\\r\\n]*))"), "gi");
    // Create an array to hold our data. Give the array
    // a default empty first row.
    var arrData = [[]];
    // Create an array to hold our individual pattern
    // matching groups.
    var arrMatches = null;
    // Keep looping over the regular expression matches
    // until we can no longer find a match.
    while (arrMatches = objPattern.exec(strData)) {
        // Get the delimiter that was found.
        var strMatchedDelimiter = arrMatches[1];
        // Check to see if the given delimiter has a length
        // (is not the start of string) and if it matches
        // field delimiter. If id does not, then we know
        // that this delimiter is a row delimiter.
        if (strMatchedDelimiter.length && (strMatchedDelimiter != strDelimiter)) {
            // Since we have reached a new row of data,
            // add an empty row to our data array.
            arrData.push([]);
        }
        // Now that we have our delimiter out of the way,
        // let's check to see which kind of value we
        // captured (quoted or unquoted).
        if (arrMatches[2]) {
            // We found a quoted value. When we capture
            // this value, unescape any double quotes.
            var strMatchedValue = arrMatches[2].replace(
            new RegExp("\"\"", "g"), "\"");
        } else {
            // We found a non-quoted value.
            var strMatchedValue = arrMatches[3];
        }
        // Now that we have our value string, let's add
        // it to the data array.
        arrData[arrData.length - 1].push(strMatchedValue);
    }
    // Return the parsed data.
    return (arrData);
}

function csvtoJSON(csv) {
    var array = CSVToArray(csv);
    var objArray = [];
    for (var i = 1; i < array.length; i++) {
        objArray[i - 1] = {};
        for (var k = 0; k < array[0].length && k < array[i].length; k++) {
            var key = array[0][k];
            objArray[i - 1][key] = array[i][k]
        }
    }

    var json = JSON.stringify(objArray);//JavaScript object and transforms it into a JSON string.
    var str = json.replace(/},/g, "},\r\n");
    console.log("Json parsing str",JSON.parse(str));

    return objArray;
}




// import a specific CSV document 
router.get('/:id/:targetname', auth(co.permissions.OFFICE_DOCUMENT, 'w', co.modules.documents), async(req, res) => {
    var clientname = req.user.clientname;
    var document = await Db.getDynamicObject(clientname, co.collections.documents.name, req.params.id);
    console.log(document, req.params.targetname);
    if (!document) return res.sendStatus(404);
    if (document.type !== 'text/csv') return res.sendStatus(400);
    importDocument(document, clientname, req.params.targetname).then((result) => {
        res.sendStatus(200);
    }, (error) => {
        // Error parsing file
        res.sendStatus(400);
    });
});

module.exports = router;

