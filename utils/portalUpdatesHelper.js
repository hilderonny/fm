var unzip = require('unzip');
var request = require('request');
var fs = require('fs');

module.exports.triggerUpdate = function(instantUpdate, res){
    //var localConfig = require('../config/localconfig.json');
    //trigger updates either when 'autoupdate'-checkbox setting is on, or 
    //when user maually wants to trigger updates on button click
    var localConfig = JSON.parse(fs.readFileSync('./config/localconfig.json').toString());  //require('../config/localconfig.json') cannot be used becuase require is synchronous and only reads the file once, following calls return the result from cache, which prevents unit testing
    if(localConfig.autoUpdateMode || instantUpdate){
        return new Promise(function(resolve, reject){
            var url = `${localConfig.licenseserverurl}/api/update/download?licenseKey=${localConfig.licensekey}`;
            var updateRequest = request(url);

            // console.log(updateRequest);
            updateRequest.on('error', function (error) {
              //  console.log(error);
                updateRequest.abort();
                res.sendStatus(400);
                reject();
            });

            updateRequest.on('response', function (response) {
                if (response.statusCode !== 200) {
                    updateRequest.abort();
                    // console.log("Bad response :(");
                    res.sendStatus(400);
                    reject();
                }else{
                    var updateExtractPath = localConfig.updateExtractPath ? localConfig.updateExtractPath : './temp/';
                    var unzipStream = updateRequest.pipe(unzip.Extract({ path: updateExtractPath }));
                    console.log(unzipStream);
                    console.log(updateExtractPath, __dirname);
                    unzipStream.on('close', function() {
                        // console.log('Done writing updates!');
                        res.sendStatus(200); // Erst antworten, wenn alles ausgepackt ist
                        resolve();
                    });
                }
            });
        });

    } else { //when autoUpdateMode == false and there wasn't a maual (i.e. via user button click) update trigger
        //console.log("No actions required!");
        return; //don't take any actions
    }

};