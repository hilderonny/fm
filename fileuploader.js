/**
 * Script for uploading a file to a foreign host. Used for uploading application to fm.avorium.de by TeamCity build process.
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var request = require('request');
var fs = require('fs');

if (process.argv.length < 5) {
    console.log('node fileuploader.js <URL_TO_UPLOAD> <PATH_TO_LOCAL_FILE> <SECRET>');
    process.exit(1);
}

var fileContent = fs.readFileSync(process.argv[3]);

var options = {
    url: process.argv[2],
    timeout: 900000
};

var req = request.post(options, function (err, resp, body) {
    if (err) {
        console.log(err);
        process.exit(1);
    } else {
        console.log(body);
    }
});
var form = req.form();
form.append('file', fileContent, {
    filename: 'fm_18.zip'
});
form.append('secret', process.argv[4]);