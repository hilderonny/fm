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

async function importDocument(csvdocument, clientname){
    var filePath = documentsHelper.getDocumentPath(clientname, csvdocument.name);
    var counter = 0;
   // var readstream = fs.createReadStream(filePath);
    console.log(filePath);
   // console.log(readstream);
   
    fs.readFile(filePath, 'utf8',(err, data) => {
        if (err) throw err;
        console.log(data, data.length);
        //var array =  CSVtoArray(data);
        var array =csvtoJSON(data);
        console.log(array);
        //console.log(data, data.length);
        
           /**  var index = data.indexOf('\n');
            var header = data.substring(0, index);
            console.log(index);
            console.log(header, header[2]);**/
           /** var array = data.split("\n");
            var str = array[0];
            console.log(array, str);
            var headtitls; var head=null;
            for(i=0; i<=str.length; i++){
                if(str[i]!== ",")
                 head= head+str[i];                
                else{
                   // console.log(head);                   
                    headtitls [counter]= head;
                    counter=counter+1;
                    head="";                                      
                }               
               
            }

            console.log("headtitls",headtitls);**/
            
         
      });    
}


/*("([^"]|"")*")
"[^"\\]*(?:\\[\S\s][^"\\]*)*" 
"(?:[^]>|"")*")? */
/** function CSVtoArray(text) {  
    var re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|"[^]>|"")*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|"[^]>|"")*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
    var re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|("([^"]|"")*")|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
    // Return NULL if input string is not well formed CSV string.
    if (!re_valid.test(text)) return null;
    var a = [];                     // Initialize array to receive values.
    text.replace(re_value, // "Walk" the string using replace with callback.
        function(m0, m1, m2, m3, m4) {
            // Remove backslash from \' in single quoted values.
            if      (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
            // Remove backslash from \" in double quoted values.
            else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
            else if(m3 !== undefined) a.push(m3.replace(/"""/g, '"'));
            else if (m3 !== undefined) a.push(m4);
            return ''; // Return empty string.
        });
    // Handle special case of empty last value.
    if (/,\s*$/.test(text)) a.push('');
    return a;
};**/

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

    var json = JSON.stringify(objArray);
    var str = json.replace(/},/g, "},\r\n");

    return str;
}

/**function csvtoJSON(csv){

    var lines=csv.split('\r');
for(let i = 0; i<lines.length; i++){
lines[i] = lines[i].replace(/\s/,'')//delete all blanks
}

var result = [];

var headers=lines[0].split(",");

for(var i=1;i<lines.length;i++){

  var obj = {};
  var currentline=lines[i].split(",");
  for(var j=0;j<headers.length;j++){
  obj[headers[j].toString()] = currentline[j];
  }
  result.push(obj);
}
return result; //JavaScript object
//return JSON.stringify(result); //JSON
}**/



// import a specific CSV document 
router.get('/:id', auth(co.permissions.OFFICE_DOCUMENT, 'w', co.modules.documents), async(req, res) => {
    var clientname = req.user.clientname;
    var document = await Db.getDynamicObject(clientname, co.collections.documents.name, req.params.id);
    console.log(document);
    if (!document) return res.sendStatus(404);
    if (document.type !== 'text/csv') return res.sendStatus(400);
    importDocument(document, clientname).then((result) => {
        res.sendStatus(200);
    }, (error) => {
        // Error parsing file
        res.sendStatus(400);
    });
});

module.exports = router;

