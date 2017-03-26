/**
 * Wrapper for restarting the server each time it stops
 */
process.chdir(__dirname);
var nodemon = require('nodemon');

// Wait at least 60 seconds before restarting to let the app extract the downloaded update.
// Otherwise the update process would be interrupted.
nodemon({
  script: 'app.js',
  ext: 'js json',
  verbose: true,
  ignore: [ 'coverage/*', 'daemon/*', 'documents/*', 'uploads', 'public/js/include.js' ],
  delay: 60000,
});

nodemon.on('start', function () {
  console.log('App has started');
}).on('quit', function () {
  console.log('App has quit');
}).on('restart', function (files) {
  console.log('App restarted due to: ', files);
});