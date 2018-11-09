/**
 * Api for importing CSV files
 * 
 */

var router = require('express').Router();
var auth = require('../middlewares/auth');
var mime = require('mime');
var fs = require('fs');
var path = require('path');
var documentsHelper = require('../utils/documentsHelper');
var co = require('../utils/constants');
var Db = require("../utils/db").Db;


/**
 * Parsing CSV file into json then into array 
 * https://jsfiddle.net/mohan_rathour/Lt3wjgfx/7/ 
 */
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
    //return (arrData);
    var objArray = [];
    for (var i = 1; i < arrData.length; i++) {
        objArray[i - 1] = {};
        for (var k = 0; k < arrData[0].length && k < arrData[i].length; k++) {
            var key = arrData[0][k];
            objArray[i - 1][key] = arrData[i][k];
        }
    }
    for (var i = 0; i < objArray.length-1; i++) {
            var object = objArray[i];
            for (var property in object) {
            // ignore(delete) rows containing single qoute
            if (((/^'.*'$/|/'$/.test(object[property])) || (/^\s/|/\s$/.test(object[property])))) { 
                    delete objArray[i];
                    break;
                }      
            }      
    }  
    return objArray;
}

async function importDocument(csvdocument, clientname, targetdatatypename){
    var filePath = documentsHelper.getDocumentPath(clientname, csvdocument.name);
    var data = fs.readFileSync(filePath, 'utf8');
    var array =CSVToArray(data.trim());    
    var lastdata={}; 
    for(var k=0; k < array.length; k++)
    {      
        lastdata= array[k];   
        if(lastdata != undefined){
            var keys = Object.keys(lastdata);
            //check if the name key is exist. Otherwise, create a DB name..
            if(!(keys.indexOf("name")<0)) {
                var elementname= array[k].name;
                var data = (await Db.query(clientname, `SELECT * FROM ${targetdatatypename} WHERE name= '${elementname}';`)).rows; //check if the name is already exist in the DB 
                if(data.length>0)  
                await Db.updateDynamicObject(clientname, targetdatatypename, elementname, lastdata);
                else 
                await Db.insertDynamicObject(clientname, targetdatatypename, lastdata);
            }   
            else 
            {
                lastdata=Object.assign( {name: Db.createName()}, lastdata);
                console.log(lastdata);
                await Db.insertDynamicObject(clientname, targetdatatypename, lastdata); 
            }             
        }
    }

    // filter the imported fields 
    var row= array.filter(function(x){return x!=undefined});
     return row;        
}

// import a specific CSV document 
router.get('/:id/:targetname', auth(co.permissions.OFFICE_DOCUMENT, 'w', co.modules.documents), async(req, res) => {
    var clientname = req.user.clientname;
    var document = await Db.getDynamicObject(clientname, co.collections.documents.name, req.params.id);
    console.log(document, req.params.targetname);
    if (!document) return res.sendStatus(404);
    if (document.type !== 'text/csv') return res.sendStatus(400);
    importDocument(document, clientname, req.params.targetname).then((result) => {

        //res.sendStatus(200);
        res.send(result);
  
    }, (error) => {
        // Error parsing file
        res.sendStatus(400);
    });
});

module.exports = router;

