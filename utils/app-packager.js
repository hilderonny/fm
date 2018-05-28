var moduleConfig = require('../config/module-config.json');
var JSZip = require('jszip');
var fs = require('fs');

/**
 * Updates the version of the given package.json configuration with the given
 * version number (build number from TeamCity).
 * Also removes devDependencies and scripts.
 */
var handlePackageJson = (packageJson, version) => {
    packageJson.version = version;
    delete packageJson.scripts;
    delete packageJson.devDependencies;
    return packageJson; 
};

/**
 * Updates the content of the version-Tag in index.html to show the current version of the app
 */
var handleIndexHtml = (indexHtml, version) => {
    return indexHtml.replace('###VERSION###', version);
};

/**
 * Packaged module-config.json will contain only those modules which are configured for the package.
 */
var handleModuleConfig = (originalModuleConfigString, moduleNameList) => {
    var originalModuleConfigJson = JSON.parse(originalModuleConfigString);
    var resultJson = JSON.parse(originalModuleConfigString);
    resultJson.modules = {};
    moduleNameList.forEach((moduleName) => {
        var appModule = originalModuleConfigJson.modules[moduleName];
        resultJson.modules[moduleName] = (appModule);
    });
    return JSON.stringify(resultJson, null, 4);
}

/**
 * The app packager expects a list of module names from moduleconfig.json
 * and returns a ZIP file with all relevant files.
 * When the moduleNameList is empty or not set, a ZIP file with all modules
 * are returned (used for fm.avorium.de packaging).
 * Returns Promise containing the zipped buffer
 * @param version Version number to use in package.json
 * @throws Error when one of the requested module names does not exist.
 * @example require('/utils/app-packager').pack(['base','module1','module2'], version).then(function(buffer){});
 * @see http://stuk.github.io/jszip/documentation/howto/write_zip.html
 */
module.exports.pack = (moduleNameList, version) => {
    // When no modules are given, take all of them
    if (!moduleNameList || moduleNameList.length < 1) {
        var moduleNameList = Object.keys(moduleConfig.modules);
    }
    // First check whether we have invalid module names
    for (var i in moduleNameList) {
        var moduleName = moduleNameList[i];
        var requestedModule = moduleConfig.modules[moduleName];
        if (!requestedModule) {
            throw new Error(`The requested module "${moduleName}" does not exist`);
        }
    }
    zip = new JSZip();
    // Package.json must be there in every case
    var packageJson = JSON.parse(fs.readFileSync('./package.json').toString());
    var handledPackageJson = handlePackageJson(packageJson, version);
    // module-config.josn must also be there
    var moduleConfigString = fs.readFileSync('./config/module-config.json').toString();
    var handledModuleConfigString = handleModuleConfig(moduleConfigString, moduleNameList);
    zip.file('config/module-config.json', handledModuleConfigString);
    for (var i in moduleNameList) {
        var moduleName = moduleNameList[i];
        var requestedModule = moduleConfig.modules[moduleName];
        // Add api files
        if (requestedModule.api) requestedModule.api.forEach((apiFileName) => {
            var fullPath = `api/${apiFileName}.js`;
            zip.file(fullPath, fs.readFileSync('./' + fullPath));
        });
        // Add middlewares files
        if (requestedModule.middlewares) requestedModule.middlewares.forEach((middlewareFileName) => {
            var fullPath = `middlewares/${middlewareFileName}.js`;
            zip.file(fullPath, fs.readFileSync('./' + fullPath));
        });
        // Add utils files
        if (requestedModule.utils) requestedModule.utils.forEach((utilFileName) => {
            var fullPath = `utils/${utilFileName}.js`;
            zip.file(fullPath, fs.readFileSync('./' + fullPath));
        });
        // Add public files
        requestedModule.public.forEach((publicFileName) => {
            var fullPath = `public/${publicFileName}`;
            if (publicFileName === '_index.html') {
                // _index.html must be prepared before packaging, replace version number
                // _index.html will be copied to index.html on application start
                var indexHtml = fs.readFileSync('./' + fullPath).toString();
                var handledIndexHtml = handleIndexHtml(indexHtml, handledPackageJson.version);
                zip.file(fullPath, handledIndexHtml);
            } else {
                zip.file(fullPath, fs.readFileSync('./' + fullPath));
            }
        });
        // Add root files
        if (requestedModule.root) requestedModule.root.forEach((rootFileName) => {
            if (rootFileName === 'package.json') {
                // Package.json must be prepared before packaging
                zip.file(rootFileName, JSON.stringify(handledPackageJson));
            } else {
                zip.file(rootFileName, fs.readFileSync('./' + rootFileName));
            }
        });
        // Add include files, currently always available
        if (requestedModule.include) requestedModule.include.forEach((includeFileName) => {
            var fullPath = `${includeFileName}`;
            zip.file(fullPath, fs.readFileSync('./' + fullPath));
        });
        // Add language files
        if (requestedModule.languages) requestedModule.languages.forEach((language) => {
            var fullPath = `public/lang/${moduleName}-${language}.json`;
            zip.file(fullPath, fs.readFileSync('./' + fullPath));
        });
        // Add icon files from apps
        if (requestedModule.apps) Object.values(requestedModule.apps).forEach(appmenus => {
            appmenus.forEach(item => {
                // Main card
                var fullPath = `public/partial/${item.mainCard}.html`;
                zip.file(fullPath, fs.readFileSync('./' + fullPath));
                // Icons
                var fullMaterialPath = `public${item.icon}`;
                zip.file(fullMaterialPath, fs.readFileSync('./' + fullMaterialPath));
                var fullOfficePath = `public${item.icon.replace(/\/material\//g, "/office/")}`;
                zip.file(fullOfficePath, fs.readFileSync('./' + fullOfficePath));
            });
        });
    }
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
};