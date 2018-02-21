var readFileSync = require("fs").readFileSync;
var writeFileSync = require("fs").writeFileSync;
var LocalConfig = {
    load: () => {
        /*if (!LocalConfig.isLoaded) {
            // Load from file
            var fromJson = JSON.parse(readFileSync("./config/localconfig.json", "utf8"));
            Object.keys(fromJson).forEach(k => {
                LocalConfig[k] = fromJson[k];
            });
            // Overwrite from environment variables
            Object.keys(LocalConfig).forEach(k => {
                if (process.env[k]) LocalConfig[k] = process.env[k];
            });
            // Append version from package.json
            var packageJson = JSON.parse(readFileSync("./package.json"));
            LocalConfig.version = packageJson.version;
        }*/
        var localConfig = JSON.parse(readFileSync('./config/localconfig.json').toString());
        return localConfig;
    },

    updateContent: (portalSettings) => {
            var localConfig = JSON.parse(readFileSync('./config/localconfig.json').toString());
            if(portalSettings.licenseserverurl && portalSettings.licensekey){
                localConfig.licenseserverurl = portalSettings.licenseserverurl;
                localConfig.licensekey = portalSettings.licensekey;
            }else if(portalSettings.autoUpdateMode == false ||  portalSettings.autoUpdateMode == true){
                // make sure that portalSettings.autoUpdateMode exists; it can have only FALSE or TRUE as valid value
                localConfig.autoUpdateMode = portalSettings.autoUpdateMode;
                if(portalSettings.autoUpdateMode ==false && localConfig.updateTimerInterval){
                    delete localConfig.updateTimerInterval;
                }else{
                    localConfig.updateTimerInterval = portalSettings.updateTimerInterval; //set intial default value
                }
            }else if(portalSettings.updateTimerInterval){
                localConfig.updateTimerInterval = portalSettings.updateTimerInterval;
            }
                writeFileSync('./config/localconfig.json', JSON.stringify(localConfig, null, 4));
    }
}
module.exports.LocalConfig = LocalConfig;