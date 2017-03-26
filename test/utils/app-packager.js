/**
 * Unit tests for the App packaging utils library
 */
var assert = require('assert');
var moduleConfig = require('../../config/module-config.json');
var appPackager = require('../../utils/app-packager');
var JSZip = require('jszip');

// Helper for creating a list of file names which must be contained with the given modules
var createFileList = (moduleNames) => {
    var fileList = [];
    fileList.push('config/module-config.json');
    if (!moduleNames || moduleNames.length < 1) {
        var moduleNames = Object.keys(moduleConfig.modules);
    }
    moduleNames.forEach((moduleName) => {
        var module = moduleConfig.modules[moduleName];
        if (module.api) module.api.forEach((apiFileName) => {
            fileList.push(`api/${apiFileName}.js`);
        });
        if (module.middlewares) module.middlewares.forEach((middlewareFileName) => {
            fileList.push(`middlewares/${middlewareFileName}.js`);
        });
        if (module.utils) module.utils.forEach((utilFileName) => {
            fileList.push(`utils/${utilFileName}.js`);
        });
        if (module.public) module.public.forEach((publicFileName) => {
            fileList.push(`public/${publicFileName}`);
        });
        if (module.root) module.root.forEach((rootFileName) => {
            fileList.push(`${rootFileName}`);
        });
        if (module.include) module.include.forEach((includeFileName) => {
            if (includeFileName.indexOf('node_modules/') === 0) return; // Ignore node modules
            fileList.push(`${includeFileName}`);
        });
        if (module.languages) module.languages.forEach((language) => {
            fileList.push(`public/lang/${moduleName}-${language}.json`);
        });
    });
    return fileList;
};

// Validates the given moduleConfig that it contains all configuration data
// for the modules with the given names and return true, when all is okay
var testModuleConfig = (moduleConfigForModuleNames, moduleNames, done) => {
    if (!moduleNames || moduleNames.length < 1) {
        var moduleNames = Object.keys(moduleConfig.modules);
    }
    var appModules = moduleConfigForModuleNames.modules;
    moduleNames.forEach((moduleName) => {
        if (!appModules[moduleName]) {
            done(new Error(`Module config in ZIP file does not contain module ${moduleName}`));
            return;
        }
        delete appModules[moduleName];
    });
    var restModuleNames = Object.keys(appModules);
    if (restModuleNames.length > 0) {
        done(new Error(`Module config in ZIP contains more modules than configured (${restModuleNames})`));
        return;
    }
    done();
};

// Helper for making tests with different module name lists
var testAppPackager = (moduleNames, version, done) => {
    appPackager.pack(moduleNames, (buffer) => {
        // From http://stackoverflow.com/a/39324475
        var zip = new JSZip();
        var fileList = createFileList(moduleNames);
        var zippedModuleConfigFile = false;
        zip.loadAsync(buffer).then((zipContent) => {
            var fileNames = Object.keys(zipContent.files);
            var tooMuchFiles = [];
            for (var i in fileNames) {
                var fileName = fileNames[i];
                if (fileName.indexOf('node_modules/') === 0) continue; // Ignore node modules
                var fileInZip = zipContent.files[fileName]; 
                if (fileInZip.dir) continue; // Ignore directories
                var index = fileList.indexOf(fileName);
                if (index < 0) {
                    tooMuchFiles.push(fileName);
                }
                if (fileName === 'config/module-config.json') {
                    zippedModuleConfigFile = fileInZip;
                }
                do { // Sometimes files are included in multiple modules (e.g. image Module.svg)
                    fileList.splice(index, 1);
                    index = fileList.indexOf(fileName);                    
                } while(index >= 0);
            };
            if (tooMuchFiles.length > 0) {
                    done(new Error(`Files from ZIP not found in module config. Maybe they are referenced as icons in menus or settingsets but not referenced in the public-part. Or maybe the filename has some camelcase problems. ${JSON.stringify(tooMuchFiles)}`));
                    return;
            } else if (fileList.length > 0) {
                done(new Error(`Module config contains ${fileList.length} more elements than the returned ZIP: ${JSON.stringify(fileList)}`));
                return;
            } else if(zippedModuleConfigFile) {
                zippedModuleConfigFile.async('string').then((textContent) => {
                    var moduleConfigFromZip = JSON.parse(textContent);
                    testModuleConfig(moduleConfigFromZip, moduleNames, done);
                });
                return;
            }
            done();
        });
    }, version);
};

describe('UTILS App packager', function() {
    it('returns a ZIP file with all modules when no module list is given', function(done) {
        testAppPackager(false, 'Testversion', done);
    });
    it('throws an error when a module is requested which does not exist', function(done) {
        assert.throws(
            () => { appPackager.pack([ 'base', 'notexistingmodule' ]) },
            Error,
            'The requested module "notexistingmodule" does not exist'
        );
        done();
    });
    it('throws an error when no handling callback is given', function(done) {
        assert.throws(
            () => { appPackager.pack([ ]) },
            Error,
            'Missing callback'
        );
        done();
    });
    it('returns a ZIP file with some requested modules (documents, fmobjects)', function(done) {
        testAppPackager([ 'documents', 'fmobjects' ], 'Testversion', done);
    });
    it('returns a ZIP file with some requested modules (base)', function(done) {
        testAppPackager([ 'base' ], 'Testversion', done);
    });
});
