// Change working directory, needed when run as windows service with installwindowsservice.js
process.chdir(__dirname);

// Die requires sollten nach Möglichkeit in die init()-Funktion, damit der npm install-Step ganz
// unten eine Chance hat, die nötigen Pakete zu installieren. Außnahme bilden die config-Dateien,
// die keinen Einfluss auf npm haben.
var moduleConfig = require('./config/module-config.json');
var localConfig = require('./config/localconfig.json');

module.exports = {}; // For tests, see testhelpers

/**
 * Extracts all api paths from the module config
 * usable for app.use().
 */
var extractApisFromModuleConfig = () => {
    var apis = [];
    Object.keys(moduleConfig.modules).forEach((moduleName) => {
        var appModule = moduleConfig.modules[moduleName];
        if (appModule.api) appModule.api.forEach((api) => {
            apis.push('/api/' + api);
        });
    });
    return apis;
};

/**
 * Client-seitige Includes vorbereiten. In der Produktivumgebung werden alle
 * Javascript-Dateien in die include.js minifiziert, in der Testumgebung enthält
 * die include.js einen dynamischen Nachlader, damit man vernünftig debuggen kann.
 */
var prepareIncludes = (fs) => {
    if (process.env.NODE_ENV === 'development') {
        var incJs = '';
        var counter = 0;
        Object.keys(moduleConfig.modules).forEach((moduleName) => {
            var appModule = moduleConfig.modules[moduleName];
            if (appModule.include) appModule.include.forEach((include) => {
                var relInc = include.indexOf('public/') === 0 ? include.substring(7) : include;
                incJs += `        <script src="${relInc}"></script>\n`;
                counter++;
            });
        });
        var template = fs.readFileSync('./public/_index.html').toString();
        var replaced = template.replace('        <script src="js/include.js"></script>', incJs);
        var replacedAgain = replaced.replace('###PORTALNAME###', localConfig.portalName).replace('###PORTALLOGO###', localConfig.portalLogo);        
      
        fs.writeFileSync('./public/index.html', replacedAgain);
    } else {
        console.log('Minifying client JavaScript. Can take up to 15 seconds. Please wait ...');
        var includes = [];
        Object.keys(moduleConfig.modules).forEach((moduleName) => {
            var appModule = moduleConfig.modules[moduleName];
            if (appModule.include) appModule.include.forEach((include) => {
                includes.push('./' + include);
            });
        });
        var minifiedJs = require('uglify-js').minify(includes, { mangle:false, compress:false, outSourceMap:"include.js.map", output: { max_line_len: 100000 } });
        fs.writeFileSync('./public/js/include.js', minifiedJs.code);
        fs.writeFileSync('./public/js/include.js.map', minifiedJs.map);
        fs.writeFileSync('./public/index.html', fs.readFileSync('./public/_index.html').toString().replace('###PORTALNAME###', localConfig.portalName).replace('###PORTALLOGO###', localConfig.portalLogo));
    }
};

    var timerId; 
    var portalUpdatesHelper = require('./utils/portalUpdatesHelper');
    var fs = require('fs');
    module.exports.manageAutoUpdate = function(autoUpdateMode){
        if(autoUpdateMode == true){
            var lc = JSON.parse(fs.readFileSync('./config/localconfig.json').toString())
            var updateInterval = lc.updateTimerInterval * 3600000; //convert hours to milliseconds
            if(updateInterval > 10000){ //check if the time interval is at least 1 second long
                if(timerId != null){
                    clearInterval(timerId); //cancel old timer befor setting a new one
                }
                timerId = setInterval(portalUpdatesHelper.triggerUpdate, updateInterval);
                return;                
            }else{
                return;
            }            
        }else{ //autoUpdateMode == false
           clearInterval(timerId);
           return;
        }
    };

    module.exports.changeTimeInterval = function(newTimerInterval){
        //make changes only if an  auto-update is curremtly turned on 
        var lc = JSON.parse(fs.readFileSync('./config/localconfig.json').toString())
        if(lc.autoUpdateMode){
            clearInterval(timerId); //stop timer with old update interval
            var newTimerIntervalMS = newTimerInterval*3600000; //convert hours to milliseconds
            timerId = setInterval(portalUpdatesHelper.triggerUpdate, newTimerIntervalMS); //start new update timer
        }
    };

// Server initialization
async function init() {
    // Datenbank initialisieren und ggf. Admin anlegen (admin/admin)
    var nocache = require('./middlewares/nocache');
    var dah = require('./utils/dynamicAttributesHelper');
    // Vorgegebene dynamische Attribute für Portal erstellen bzw. aktivieren
    var promises = [];
    var moduleNames = Object.keys(moduleConfig.modules);
    for (var i = 0; i < moduleNames.length; i++) {
        await dah.activateDynamicAttributesForClient(null, moduleNames[i]);
    }
    var fs = require('fs');
    // Initialize database
    await require("./utils/db").Db.init();
    // Run update scripts on startup
    if (localConfig.applyupdates) {
        await require("./updateonstart")();
        localConfig.applyupdates = false;
        fs.writeFileSync("./config/localconfig.json", JSON.stringify(localConfig, null, 4)); // Relative to main entry point
    }
    // Includes minifizieren
    prepareIncludes(fs);
    // Anwendung initialisieren und Handler-Reihenfolge festlegen
    var express = require('express');
    var app = express();
    // Logger initialisieren, bei Bedarf auf Portal direkt aktivieren!
    //var accessLogStream = fs.createWriteStream(__dirname + '/access.log', {flags: 'a'});
    //app.use(require('morgan')('combined', {stream: accessLogStream}));
    app.use(require('compression')()); // Ausgabekompression
    app.set('json spaces', '\t'); // Ausgabe im Response verschönern
    app.use(require('./middlewares/extracttoken')); // Authentifizierung und Authorisierung -> req.user{_id}
    app.use(require('body-parser').json()); // JSON Request-Body-Parser -> req.body
    app.use(require('body-parser').urlencoded({extended:true})); // parse application/x-www-form-urlencoded
    // Include APIs configured in module-config.json
    var apis = extractApisFromModuleConfig();
    apis.forEach((api) => {
        app.use(api, nocache, require('.' + api));
    });
    app.use(express.static(__dirname + '/public')); // Statische Ressourcen im public-Verzeichnis, lädt bei root-Aufruf automatisch index.html
    app.use('/node_modules', express.static(__dirname + '/node_modules')); // Node Module als statische Verweise bereit stellen, damit angular geladen werden kann
    app.use('/drafts', express.static(__dirname + '/drafts')); // Drafts for screenshots

    // SSL für HTTPS-Server vorbereiten, siehe https://franciskim.co/2015/07/30/how-to-use-ssl-https-for-express-4-x-node-js/
    var credentials = { 
        key: fs.existsSync('./priv.key') ? fs.readFileSync('./priv.key', 'utf8') : null, 
        cert: fs.existsSync('./pub.cert') ? fs.readFileSync('./pub.cert', 'utf8') : null
    };

    // Read ports from environment first, then from local config and finally define standard ports
    var httpsPort = process.env.HTTPS_PORT || localConfig.httpsPort || 443;
    var httpPort = process.env.PORT || localConfig.httpPort || 80;

    // Require erst hier, damit automatisches npm install auch die Chance hat, das Paket nachzuladen
    var https = require('https');
    var http = require('http');
    var socketio = require('socket.io'); // Chat
    var io, server;

    // Anwendung starten
    if (process.env.NODE_ENV === 'test' || localConfig.useHTTPS) {
        // HTTPS
        var httpsServer = https.createServer(credentials, app);
        io = socketio.listen(httpsServer,credentials); // Chat
        server = httpsServer.listen(httpsPort, function() {
            if (process.env.NODE_ENV !== 'test') console.log(`HTTPS laeuft an Port ${httpsPort}.`);
        });
    }
    if (process.env.NODE_ENV === 'test' || localConfig.useHTTP) {
        // HTTP
        var handler = (process.env.NODE_ENV === 'test' || (localConfig.redirectHTTPtoHTTPS && localConfig.useHTTPS)) ? function(req, res) {
                // When redirecting, the correct port must be used. But the original request can also have a port which must be stripped.
                if (!req || !req.headers || !req.headers.host) return; // Attackers do not send correct header information
                var indexOfColon = req.headers.host.lastIndexOf(':');
                var hostWithoutPort = indexOfColon > 0 ? req.headers.host.substring(0, indexOfColon) : req.headers.host;
                var newUrl = `https://${hostWithoutPort}:${httpsPort}${req.url}`;
                res.writeHead(302, { 'Location': newUrl }); // http://stackoverflow.com/a/4062281
                res.end();
            } : app;
        // Auch für normales HTTP, dann aber auf HTTPS umleiten
        var httpServer = http.createServer(handler);
        if (!io) io = socketio.listen(httpServer); // Chat
        httpServer.listen(httpPort, function() {
            if (process.env.NODE_ENV !== 'test') console.log(`HTTP laeuft an Port ${httpPort}.`);
        });
    }

    io.on('connection', function(socket){
        socket.on('message', function(msg){
            socket.broadcast.emit('message', msg);
        });
    });

    if (process.env.NODE_ENV === 'test') {
        // HTTP Server als Modul exportieren, damit Tests damit laufen können
        module.exports.server = server;
    }

    // Store time of start in cached localconfig to force reload of clients after server restart
    localConfig.startTime = Date.now();
    console.log(`Server started at ${localConfig.startTime}.`)

    //Update local 'version' and 'lastNotification' of portal 
    if (process.env.NODE_ENV !== 'test') { // Bei tests werden die Tabellen gelöscht. Bei denm heartbeat würde dann eine Fehlermeldung kommen
        var request = require('request');
        var packageJson = JSON.parse(fs.readFileSync('./package.json').toString());
        var localVersion = packageJson.version;
        var url =`${localConfig.licenseserverurl}/api/update/heartbeat`;
        var key = localConfig.licensekey;
        request.post({url: url, form:  {"licenseKey":  key, "version": localVersion}}, function(error, response, body){}); // Keine Fehlerbehandlung, einfach ignorieren
    }
    //start the initial auto-update mode on server start 
    if(localConfig.autoUpdateMode && localConfig.updateTimerInterval && localConfig.updateTimerInterval > 0) {
        var initalUpdateInterval;
        initalUpdateInterval = localConfig.updateTimerInterval * 3600000; //convert hours to milliseconds
        timerId = setInterval(portalUpdatesHelper.triggerUpdate, initalUpdateInterval);
    }
};

// Installation of required dependencies must be done by hand when needed
init();
