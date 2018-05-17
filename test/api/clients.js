/**
 * UNIT Tests for api/clients
 */
var assert = require('assert');
var th = require('../testhelpers');
var co = require('../../utils/constants');
var Db = require("../../utils/db").Db;
var localconfig = require('../../config/localconfig.json');
var fs = require("fs");
var dh = require("../../utils/documentsHelper");
var request = require('request');
var unzip2 = require('unzip2');

var dbprefix = process.env.POSTGRESQL_TEST_DBPREFIX  || localconfig.dbprefix || 'arrange' ; 

describe('API clients', async() => {

    beforeEach(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
        await th.prepareFolders();
        await th.prepareDocuments();
        await th.prepareDocumentFiles();
    });

    afterEach(async() => {
        await Db.deleteClient("testclient");
    });

    describe('GET/export/:clientname', async() => {

        async function getFilesInPackage(url) {
            var filesInPackage = [];
            await new Promise(function(resolve, reject) {
                var updateRequest = request(url);
                updateRequest.on('error', function (error) {
                    updateRequest.abort();
                    reject(error);
                });
                updateRequest.on('response', function (response) {
                    if (response.statusCode !== 200) {
                        updateRequest.abort();
                        reject(response.statusCode);
                    }
                });
                updateRequest.pipe(unzip2.Parse())
                .on('error', reject)
                .on('entry', function(entry) {
                    if(entry.type === 'File') {
                        filesInPackage.push(entry.path);
                    }
                    entry.autodrain(); // Speicher bereinigen
                })
                .on('close', resolve);
            });
            return filesInPackage;
        }

        it('responds without authentication with 403', async() => {
            await th.get(`/api/clients/export/client0?datatypes=true&content=true&files=true`).expect(403);
        });

        it('responds without read permission with 403', async() => {
            await th.removeReadPermission("client0", "client0_usergroup0", co.permissions.ADMINISTRATION_CLIENT);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.get(`/api/clients/export/client0?datatypes=true&content=true&files=true&token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (normal user) client has no access to this module, with 403', async() => {
            await th.removeClientModule("client0", co.modules.clients);
            var token = await th.defaults.login("client0_usergroup0_user0");
            await th.get(`/api/clients/export/client0?datatypes=true&content=true&files=true&token=${token}`).expect(403);
        });

        it('responds when the logged in user\'s (administrator) client has no access to this module, with 403', async() => {
            await th.removeClientModule("client0", co.modules.clients);
            var token = await th.defaults.login("client0_usergroup0_user1");
            await th.get(`/api/clients/export/client0?datatypes=true&content=true&files=true&token=${token}`).expect(403);
        });

        it('responds with 404 when clientname is invalid', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.get(`/api/clients/export/invalidid?datatypes=true&content=true&files=true&token=${token}`).expect(404);
        });

        it('contains datatypes when datatypes are requested', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var url = `https://localhost:${process.env.HTTPS_PORT || localconfig.httpsPort || 443}/api/clients/export/client0?datatypes=true&content=true&files=true&token=${token}`;
            var files = await getFilesInPackage(url);
            var expectedprefix = "client0_";
            files.forEach(file => {
                assert.strictEqual(file.indexOf(expectedprefix), 0);
            });
            assert.ok(files.find(file => file.indexOf("\\datatypes") > 0));
            assert.ok(files.find(file => file.indexOf("\\datatypefields") > 0));
        });

        it('does not contain datatypes when datatypes are not requested', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var url = `https://localhost:${process.env.HTTPS_PORT || localconfig.httpsPort || 443}/api/clients/export/client0?datatypes=false&content=true&files=true&token=${token}`;
            var files = await getFilesInPackage(url);
            assert.ok(!files.find(file => file.indexOf("\\datatypes") > 0));
            assert.ok(!files.find(file => file.indexOf("\\datatypefields") > 0));
        });

        it('contains database content when content is requested', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var url = `https://localhost:${process.env.HTTPS_PORT || localconfig.httpsPort || 443}/api/clients/export/client0?datatypes=true&content=true&files=true&token=${token}`;
            var files = await getFilesInPackage(url);
            var expecteddatatypenames = (await Db.query("client0", "SELECT name FROM datatypes;")).rows.map(row => row.name);
            expecteddatatypenames.forEach(expecteddatatypename => {
                assert.ok(files.find(file => file.indexOf("\\content\\" + expecteddatatypename) > 0));
            });
        });

        it('does not contain database content when content is not requested', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var url = `https://localhost:${process.env.HTTPS_PORT || localconfig.httpsPort || 443}/api/clients/export/client0?datatypes=true&content=false&files=true&token=${token}`;
            var files = await getFilesInPackage(url);
            assert.ok(!files.find(file => file.indexOf("\\content\\") > 0));
        });

        it('contains document files when files are requested', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var url = `https://localhost:${process.env.HTTPS_PORT || localconfig.httpsPort || 443}/api/clients/export/client0?datatypes=true&content=true&files=true&token=${token}`;
            var files = await getFilesInPackage(url);
            var expecteddocumentfilenames = (await Db.getDynamicObjects("client0", co.collections.documents.name)).map(document => document.name);
            expecteddocumentfilenames.forEach(expecteddocumentfilename => {
                assert.ok(files.find(file => file.indexOf("\\files\\" + expecteddocumentfilename) > 0));
            });
        });

        it('ignores document file when there is no file for an existing document', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var url = `https://localhost:${process.env.HTTPS_PORT || localconfig.httpsPort || 443}/api/clients/export/client0?datatypes=true&content=true&files=false&token=${token}`;
            var files = await getFilesInPackage(url);
            assert.ok(!files.find(file => file.indexOf("\\files\\") > 0));
        });

    });

    describe('POST/', async() => {

        function createPostTestElement() {
            return { label: "testclient" };
        }

        it("Creates the database of the client", async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var newClient = createPostTestElement();
            var createdClientName = (await th.post(`/api/dynamic/clients?token=${token}`).send(newClient).expect(200)).text;
            var dbname = `${process.env.POSTGRESQL_TEST_DBPREFIX  || localconfig.dbprefix || 'arrange'}_${createdClientName}`; 
            var result = await Db.queryDirect("postgres", `SELECT 1 FROM pg_database WHERE datname = '${dbname}';`);
            assert.ok(result.rowCount > 0);
        });

        it('creates client module assignments for modules "base" and "doc"', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var newClient = createPostTestElement();
            var createdClientName = (await th.post(`/api/dynamic/clients?token=${token}`).send(newClient).expect(200)).text;
            var createdClientModules = (await Db.query(Db.PortalDatabaseName, `SELECT * FROM clientmodules WHERE clientname='${createdClientName}';`)).rows;
            assert.strictEqual(createdClientModules.length, 2);
            assert.ok(createdClientModules.find((m) => m.modulename === co.modules.base));
            assert.ok(createdClientModules.find((m) => m.modulename === co.modules.doc));
        });

    });

    describe('POST/newadmin', async() => {

        function createPostNewAdminTestElement() {
            return { name: "client0_newadmin", password: 'password', clientname: "client0" };
        }

        th.apiTests.post.defaultNegative(co.apis.clients + "/newAdmin", co.permissions.ADMINISTRATION_CLIENT, createPostNewAdminTestElement, false, "portal", "portal_usergroup0", "portal_usergroup0_user0");

        it('responds with 400 when no user is given', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/clients/newadmin?token=${token}`).send().expect(400);
        });

        it('responds with 400 when no username is given', async() => {
            var newAdmin = { password: 'password', clientname: "client0" };
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(400);
        });

        it('responds with 400 when no password is given', async() => {
            var newAdmin = { name: "client0_usergroup0_user0", clientname: "client0" };
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(400);
        });

        it('responds with 409 when username is in use', async() => {
            var newAdmin = { name: "client0_usergroup0_user0", password: 'password', clientname: "client0" };
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(409);
        });

        it('responds with 400 when no clientname is given', async() => {
            var newAdmin = { name: "client0_newadmin", password: 'password' };
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(400);
        });

        it('responds with 400 when clientname is invalid', async() => {
            var newAdmin = { name: "client0_newadmin", password: 'password', clientname: "invalidId" };
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(400);
        });

        it('responds with 200 and creates a new admin in a new user group with the same name as the username', async() => {
            var newAdmin = { name: "client0_newadmin", password: 'password', clientname: "client0" };
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.post(`/api/clients/newadmin?token=${token}`).send(newAdmin).expect(200);
            var createdUser = await Db.getDynamicObject("client0", "users", newAdmin.name);
            assert.ok(createdUser);
            assert.ok(createdUser.isadmin);
            var createdUserGroup = await Db.getDynamicObject("client0", "usergroups", createdUser.usergroupname);
            assert.ok(createdUserGroup);
            assert.strictEqual(createdUserGroup.label, createdUser.name);
        });

    });

    describe('DELETE/:id', async() => {

        it('Deletes all clientmodules', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.del(`/api/dynamic/clients/client0?token=${token}`).expect(204);
            assert.ok((await Db.query(Db.PortalDatabaseName, "SELECT 1 FROM clientmodules WHERE clientname='client0';")).rowCount < 1);
        });

        it('Deletes all clientsettings', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.del(`/api/dynamic/clients/client0?token=${token}`).expect(204);
            assert.ok((await Db.query(Db.PortalDatabaseName, "SELECT 1 FROM clientsettings WHERE clientname='client0';")).rowCount < 1);
        });

        it('Drops the database', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.del(`/api/dynamic/clients/client0?token=${token}`).expect(204);
            assert.ok((await Db.queryDirect("postgres", `SELECT 1 FROM pg_database WHERE datname = '${dbprefix}_client0';`)).rowCount < 1);
        });

        it('Deletes all document files', async() => {
            var filePath = dh.getDocumentPath("client0", "");
            assert.ok(fs.existsSync(filePath));
            var token = await th.defaults.login("portal_usergroup0_user0");
            await th.del(`/api/dynamic/clients/client0?token=${token}`).expect(204);
            console.log(filePath);
            assert.ok(!fs.existsSync(filePath));
        });

    });

});
