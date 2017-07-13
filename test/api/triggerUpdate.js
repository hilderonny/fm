/**
 * UNIT Tests for api/triggerUpdate
 */
var assert = require('assert');
var rimraf = require('rimraf');
var path = require('path');
var fs = require('fs');
var th = require('../testhelpers');
var db = require('../../middlewares/db');
var co = require('../../utils/constants');
var ap = require('../../utils/app-packager');
var wh = require('../../utils/webHelper');
var lc = require('../../config/localconfig.json');

describe('API triggerUpdate', function() {
    
    beforeEach(() => {
        return th.cleanDatabase()
            .then(th.prepareClients)
            .then(th.prepareClientModules)
            .then(th.prepareUserGroups)
            .then(th.prepareUsers)
            .then(th.preparePermissions);
    });

    describe('GET/', function() {

        it('responds with 404', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.get(`/api/${co.apis.triggerUpdate}?token=${token}`).expect(404);
            });
        });

    });

    describe('POST/', function() {

        var extractPath = './extractTemp/';
        var originalExtractPath = lc.updateExtractPath;
        var httpsPort = process.env.HTTPS_PORT || lc.httpsPort || 443;
        var url = `https://localhost:${httpsPort}/api/triggerUpdate`;
        var secret = 'hubbele bubbele';

        beforeEach(function() {
            lc.updateExtractPath = extractPath;
            rimraf.sync('./temp/');
            rimraf.sync(extractPath);
        });

        afterEach(function() {
            lc.updateExtractPath = originalExtractPath;
            rimraf.sync('./temp/');
            rimraf.sync(extractPath);
        });

        function prepareFile() {
            return new Promise(function(resolve, reject) {
                ap.pack([co.modules.base], resolve, 'Testversion');
            });
        }

        function checkExtractedFiles(path, moduleNames) {
            th.createFileList(moduleNames).forEach(function(fileName) {
                var fullPath = path + fileName;
                assert.ok(fs.existsSync(fullPath), `File ${fullPath} does not exist`);
            });
            return Promise.resolve();
        }

        it('responds with 401 when there is no secret given', function() {
            return prepareFile().then(function(fileContent) {
                return wh.postFileToUrl(url, 'testfile.zip', fileContent, null, 900000);
            }).then(function(response) {
                assert.strictEqual(response.statusCode, 401);
            });
        });

        it('responds with 401 when secret is not "hubbele bubbele"', function() {
            return prepareFile().then(function(fileContent) {
                return wh.postFileToUrl(url, 'testfile.zip', fileContent, { secret: 'irgendwas' }, 900000);
            }).then(function(response) {
                assert.strictEqual(response.statusCode, 401);
            });
        });

        it('responds with 400 when no file was sent in request', function() {
            return prepareFile().then(function(fileContent) {
                return wh.postFileToUrl(url, 'testfile.zip', null, { secret: secret }, 900000);
            }).then(function(response) {
                assert.strictEqual(response.statusCode, 400);
            });
        });

        it('responds with 400 when file is not a ZIP file', function() {
            return prepareFile().then(function(fileContent) {
                return wh.postFileToUrl(url, 'testfile.zip', 'textcontent', { secret: secret }, 900000);
            }).then(function(response) {
                assert.strictEqual(response.statusCode, 400);
            });
        });

        it('responds with 200 and extracts the content of the ZIP file into the updateExtractPath (without existing web.config file)', function() {
            return prepareFile().then(function(fileContent) {
                return wh.postFileToUrl(url, 'testfile.zip', fileContent, { secret: secret }, 900000);
            }).then(function(response) {
                assert.strictEqual(response.statusCode, 200);
                return checkExtractedFiles(extractPath, [co.modules.base]);
            });
        });

        it('responds with 200 and extracts the content of the ZIP file into the updateExtractPath and updates the timestamp of the web.config file when it exists', function() {
            fs.mkdirSync(extractPath);
            var webConfigPath = path.join(extractPath, 'web.config');
            fs.writeFileSync(webConfigPath, 'Dummycontent');
            var mtimeBeforeUpdate = fs.lstatSync(webConfigPath).mtime.getTime();
            return prepareFile().then(function(fileContent) {
                return wh.postFileToUrl(url, 'testfile.zip', fileContent, { secret: secret }, 900000);
            }).then(function(response) {
                assert.strictEqual(response.statusCode, 200);
                var mtimeAfterUpdate = fs.lstatSync(webConfigPath).mtime.getTime();
                assert.notStrictEqual(mtimeAfterUpdate, mtimeBeforeUpdate, 'web.config was not touched or has not updated time stamp');
                return checkExtractedFiles(extractPath, [co.modules.base]);
            });
        });

        it('responds with 200 and extracts the content of the ZIP file into the ./temp path when updateExtractPath is not given in localconfig', function() {
            delete lc.updateExtractPath;
            return prepareFile().then(function(fileContent) {
                return wh.postFileToUrl(url, 'testfile.zip', fileContent, { secret: secret }, 900000);
            }).then(function(response) {
                assert.strictEqual(response.statusCode, 200);
                return checkExtractedFiles('./temp/', [co.modules.base]);
            });
        });

    });

    describe('PUT/', function() {

        it('responds with 404', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.put(`/api/${co.apis.triggerUpdate}?token=${token}`).send({}).expect(404);
            });
        });

    });

    describe('DELETE/', function() {

        it('responds with 404', function() {
            return th.doLoginAndGetToken(th.defaults.user, th.defaults.password).then(function(token) {
                return th.del(`/api/${co.apis.triggerUpdate}?token=${token}`).expect(404);
            });
        });
    
    });

});
