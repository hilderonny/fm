/**
 * Wrapper for restarting the server each time it stops
 * See https://github.com/foreverjs/forever-monitor
 * 
 * Diese Datei ist nur für Windows-Systeme relevant. Auf Linux werden die deamons
 * anders konfiguriert.
 */
process.chdir(__dirname);

var forever = require('forever-monitor');
var fs = require('fs');

var logpath = __dirname + '/log/';

if (!fs.existsSync(logpath)) fs.mkdirSync(logpath);

var child = new (forever.Monitor)('app.js', {
  silent: true,
  args: [],
  watch: false, // Keine Dateiüberwachung,
  cwd: __dirname,
  logFile: logpath + 'logFile',
  outFile: logpath + 'outFile',
  errFile: logpath + 'errFile'
});

child.on('restart', () => {
  console.log('Restarted.');
});

child.start();
