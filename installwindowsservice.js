/**
 * Helper application for installing the server as windows service.
 * Use this approach ONLY on windows and ONLY when no IIS is used!
 * See https://github.com/coreybutler/node-windows for details.
 * The service is installed with the name "Avorium FM" so it can be referenced
 * from the app.
 * The update mechanism triggers restarts of the service after installing new versions 
 * of the app.
 */
var localConfig = require('./config/localconfig.json');
var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
    name: localConfig.serviceName || 'Avorium FM',
    description: localConfig.serviceDescription || 'Facility management portal',
    script: __dirname + '/keeprunning.js'
});
// Listen for the "install" event, which indicates the
// process is available as a service and start the service
svc.on('install', () => {
    console.log('Service "Avorium FM" installed. Starting service ...');
    svc.start();
});

svc.on('start', () => {
    console.log('Service "Avorium FM" started.');
});

console.log('Installing service ...');
svc.install();