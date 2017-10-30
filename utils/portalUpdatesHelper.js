var unzip = require('unzip2');
var request = require('request');
var fs = require('fs');

/**
 * Triggers the download and install process of updating the portal.
 * Either autoUpdateMode in localconfig must be set to true or the parameter
 * instantUpdate must be set to true to start the process.
 * Returns a promise which resolves after a complete update or which rejects
 * when the license server returns an error, e.g. because of wrong license key.
 * The resolve function expects a boolean parameter. It is true, when an update
 * was performed and false, when neither autoUpdateMode nor instantUpdate was set
 * and so, no update was started.
 */
module.exports.triggerUpdate = function(instantUpdate){
    return new Promise((resolve, reject) => {
        //trigger updates either when 'autoupdate'-checkbox setting is on, or 
        //when user maually wants to trigger updates on button click
        var localConfig = JSON.parse(fs.readFileSync('./config/localconfig.json').toString());  //require('../config/localconfig.json') cannot be used becuase require is synchronous and only reads the file once, following calls return the result from cache, which prevents unit testing
        if(localConfig.autoUpdateMode || instantUpdate){
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
                    var unzipStream = updateRequest.pipe(unzip.Extract({ path: updateExtractPath }));
                    unzipStream.on('close', function() {
                        resolve(true);
                    });
                }
            });

        } else {
            resolve(false);
        }
    });
};