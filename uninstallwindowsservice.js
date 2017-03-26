/**
 * Helper application for uninstalling the windows service created with
 * installwindowsservice.js
 */
var Service = require('node-windows').Service;
// Create a new service object
var svc = new Service({
    name:'Avorium FM',
    script: __dirname + '/keeprunning.js'
});
// Listen for the "install" event, which indicates the
// process is available as a service and start the service
svc.on('uninstall', () => {
    console.log('Service "Avorium FM" uninstalled.');
});

console.log('Uninstalling service ...');
svc.uninstall();