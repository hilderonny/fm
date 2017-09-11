/**
 * Prüfung von UI Elementen.
 * Guckt nach, ob in den partial-Dateien irgendwo
 * noch Verweise auf draft-Elemente sind.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var moduleConfig = require('../../config/module-config.json');
var co = require('../../utils/constants');

describe('UI', function () {
    // Iterate over modules
    Object.keys(moduleConfig.modules).forEach(function eachModule(moduleName) {

        var mod = moduleConfig.modules[moduleName];

        it(`Module ${moduleName} does not contain references to drafts`, async function() {
            if (mod.public) mod.public.forEach(function(fileName) {
                if (!fileName.toLowerCase().endsWith('.html')) return;
                var fullPath = path.join(__dirname, '../../public', fileName);
                var fileContent = fs.readFileSync(fullPath, 'utf8');
                var matches = fileContent.match(/\bdrafts\w*?\b/g);
                assert.ok(!matches, `File ${fileName} contains references to drafts`);
            });
        });

    });

});
