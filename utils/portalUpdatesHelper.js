// unzip, unzip2 and unzipper do not close the file handles correctly and result in incomplete extractions
var decompress = require("decompress");
var request = require('request');
var fs = require('fs');

/**
 * Triggers the download and install process of updating the portal.
 * Returns a promise which resolves after a complete update or which rejects
 * when the license server returns an error, e.g. because of wrong license key.
 */
module.exports.triggerUpdate = function(){
    return new Promise((resolve, reject) => {
        var localconfig = JSON.parse(fs.readFileSync('./config/localconfig.json').toString());  //require('../config/localconfig.json') cannot be used becuase require is synchronous and only reads the file once, following calls return the result from cache, which prevents unit testing
        var url = `${localconfig.licenseserverurl}/api/update/download?licenseKey=${localconfig.licensekey}`;
        console.log("Fetching update package from " + url);
        var updateRequest = request(url);
        updateRequest.on('error', function (error) {
            console.log(error);
            updateRequest.abort();
            reject(error);
        });
        updateRequest.on('response', function (response) {
            if (response.statusCode !== 200) {
                console.log("Unexpected answer: " + response.statusCode);
                updateRequest.abort();
                reject(response);
            }else{
                var updateExtractPath = localconfig.updateExtractPath ? localconfig.updateExtractPath : './temp/';
                var filename = response.headers['content-disposition'].split("=")[1]; // "attachment; filename=abc.zip"
                if (!fs.existsSync(updateExtractPath)) fs.mkdirSync(updateExtractPath);
                console.log("Extracting to path  " + updateExtractPath);
                updateRequest.pipe(fs.createWriteStream(updateExtractPath + filename)).on("finish", async() => {
                    console.log("Using package file " + updateExtractPath + filename);
                    var extractedfiles = await decompress(updateExtractPath + filename, updateExtractPath);
                    // Force the applying of updates on the next start
                    localconfig.applyupdates = true;
                    fs.writeFileSync("./config/localconfig.json", JSON.stringify(localconfig, null, 4)); // Relative to main entry point
                    console.log(`Extracted ${extractedfiles.length} files. Ready for restart.`);
                    // Prozess beenden und hoffen, dass er automatisch neu gestartet wird
                    if (process.env.NODE_ENV !== 'test') process.exit(0);
                    resolve(true);
                });
            }
        });
    });
};