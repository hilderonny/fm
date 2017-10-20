var unzip = require('unzip');
var request = require('request');
var fs = require('fs');

module.exports.triggerUpdate = function(instantUpdate, res){
    //var localConfig = require('../config/localconfig.json');
    //trigger updates either when 'autoupdate'-checkbox setting is on, or 
    //when user maually wants to trigger updates on button click
    var localConfig = JSON.parse(fs.readFileSync('./config/localconfig.json').toString());  //require('../config/localconfig.json') cannot be used becuase require is synchronous and only reads the file once, following calls return the result from cache, which prevents unit testing
    if(localConfig.autoupdateMode || instantUpdate){
        return new Promise(function(resolve, reject){
            var url = `${localConfig.licenseserverurl}/api/update/download?licenseKey=${localConfig.licensekey}`;
            var updateRequest = request(url);
            resolve(updateRequest);

         }).then(function(updateRequest){

            updateRequest.on('error', function (error) {
                updateRequest.abort();
                return res.sendStatus(400);
            });

            updateRequest.on('response', function (response) {
                if (response.statusCode !== 200) {
                    updateRequest.abort();
                    return res.sendStatus(400);
                }else{
                    var updateExtractPath = localConfig.updateExtractPath ? localConfig.updateExtractPath : './temp/';
                    var unzipStream = updateRequest.pipe(unzip.Extract({ path: updateExtractPath }));
                    unzipStream.on('close', function() {
                        return res.sendStatus(200); // Erst antworten, wenn alles ausgepackt ist
                    });
                }
            });
        });

    } else { //when autoupdateMode == false and there wasn't a maual (i.e. via user button click) update trigger
        return; //don't take any actions
        //TODO should it return res.sendStatus(200)?
    }

};