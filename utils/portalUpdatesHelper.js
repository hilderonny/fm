var unzipper = require('unzipper'); // unzip2 does not work for any reason
var request = require('request');
var fs = require('fs');

/**
 * Triggers the download and install process of updating the portal.
 * Returns a promise which resolves after a complete update or which rejects
 * when the license server returns an error, e.g. because of wrong license key.
 */
module.exports.triggerUpdate = function(){
    return new Promise((resolve, reject) => {
        var localConfig = JSON.parse(fs.readFileSync('./config/localconfig.json').toString());  //require('../config/localconfig.json') cannot be used becuase require is synchronous and only reads the file once, following calls return the result from cache, which prevents unit testing
        var url = `${localConfig.licenseserverurl}/api/update/download?licenseKey=${localConfig.licensekey}`;
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
                var updateExtractPath = localConfig.updateExtractPath ? localConfig.updateExtractPath : './temp/';
                var filename = response.headers['content-disposition'].split("=")[1]; // "attachment; filename=abc.zip"
                if (!fs.existsSync(updateExtractPath)) fs.mkdirSync(updateExtractPath);
                console.log("Extracting to path  " + updateExtractPath);
                updateRequest.pipe(fs.createWriteStream(updateExtractPath + filename)).on("finish", () => {
                    console.log("Using package file " + updateExtractPath + filename);
                    fs.createReadStream(updateExtractPath + filename).pipe(unzipper.Extract({ path: updateExtractPath })).on("close", () => {
                        console.log("Ready for restart.");
                        resolve(true);
                    });
                });
            }
        });
    });
};