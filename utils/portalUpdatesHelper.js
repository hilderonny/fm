var unzip = require('unzip2');
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
        var updateRequest = request(url);
        updateRequest.on('error', function (error) {
            updateRequest.abort();
            reject(error);
        });
        updateRequest.on('response', function (response) {
            if (response.statusCode !== 200) {
                updateRequest.abort();
                reject(response);
            }else{
                var updateExtractPath = localConfig.updateExtractPath ? localConfig.updateExtractPath : './temp/';
                var filename = response.headers['content-disposition'].split("=")[1]; // "attachment; filename=abc.zip"
                if (!fs.existsSync(updateExtractPath)) fs.mkdirSync(updateExtractPath);
                updateRequest.pipe(fs.createWriteStream(updateExtractPath + filename)).on("finish", () => {
                    fs.createReadStream(updateExtractPath + filename).pipe(unzip.Extract({ path: updateExtractPath })).on("close", () => {
                        resolve(true);
                    });
                });
            }
        });
    });
};