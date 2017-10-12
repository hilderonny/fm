var unzip = require('unzip');
var request = require('request');

module.exports.triggerUpdate = function(instantUpdate, res){
    var localConfig = require('../config/localconfig.json');
    //trigger updates either when 'autoupdate'-checkbox setting is on, or 
    //when user maually wants to trigger updates on button click
    if(localConfig.autoupdateMode || instantUpdate){
        return new Promise(function(resolve, reject){
            var url = `${localConfig.licenseserverurl}/api/update/download?licenseKey=${localConfig.licensekey}`;
            var updateRequest = request(url);

            updateRequest.on('error', function () {
                updateRequest.abort();
                return reject;
                //return res.sendStatus(400);
            });
            updateRequest.on('response', function (response) {
                if (response.statusCode !== 200) {
                    updateRequest.abort();
                    return reject;
                   // return res.sendStatus(400);
                }
            });
            return resolve(updateRequest);

         }).then(function(updateRequest){
             var updateExtractPath = localConfig.updateExtractPath ? localConfig.updateExtractPath : './temp/';
            var unzipStream = updateRequest.pipe(unzip.Extract({ path: updateExtractPath }));
            unzipStream.on('close', function() {
                console.log("Done updating!");
                return; //res.sendStatus(200); // Erst antworten, wenn alles ausgepackt ist
            });
        });

    } else { //when autoupdateMode == false and there wasn't a maual (i.e. via user button click) update trigger
        return; //don't take any actions
    }

};