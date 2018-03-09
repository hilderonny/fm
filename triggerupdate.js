/**
 * Triggers checking for and downloading updates
 * from the license server depending on the configuration
 * in localconfig.json.
 * autoUpdateMode must be set to true in localconfig.json
 * Must be called from the app directory (chdir to there!) via
 * node triggerupdate.js
 */
require('./utils/portalUpdatesHelper').triggerUpdate();