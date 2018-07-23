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
var eh = require("../../utils/exporthelper");
var wh = require('../../utils/webHelper');
var jszip = require('jszip');
var path = require("path");

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
        await th.preparedatatypes();
        await th.preparedatatypefields();
        await th.preparedynamicobjects();
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
                if(expecteddocumentfilename != "client0_document2"){ //skip document without content, which is used for other tests
                    assert.ok(files.find(file => file.indexOf("\\files\\" + expecteddocumentfilename) > 0));
                }
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

    describe("POST/import", async() => {

        var httpsPort = process.env.HTTPS_PORT || localconfig.httpsPort || 443;
        var url = `https://localhost:${httpsPort}/api/clients/import`;

        async function prepareFileForUpload() {
            return eh.export("client0", false, false, false, "dummyprefix"); // Returns buffer
        }

        it('responds without authentication with 403', async() => {
            var zipfilebuffer = await prepareFileForUpload();
            var response = await wh.postFileToUrl(url, 'clientpackage.zip', zipfilebuffer, null, 900000);
            assert.strictEqual(response.statusCode, 403);
        });

        it('responds without write permission with 403', async() => {
            await th.removeWritePermission(Db.PortalDatabaseName, "portal_usergroup0", co.permissions.ADMINISTRATION_CLIENT);
            var token = await th.defaults.login("portal_usergroup0_user0");
            var zipfilebuffer = await prepareFileForUpload();
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', zipfilebuffer, null, 900000);
            assert.strictEqual(response.statusCode, 403);
        });

        it('responds with "Error" when no file was posted', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', null, null, 900000);
            assert.strictEqual(response.statusCode, 200);
            assert.strictEqual(response.body, "Error");
        });

        it('Ignores the content when posted file was not a ZIP file', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', 'textcontent', null, 900000);
            assert.strictEqual(response.statusCode, 200);
            assert.notEqual(response.body, "Error");
        });

        it('Ignores the content when ZIP file has no root folder in it', async() => {
            await Db.createDatatype("client0", "datatypesafter", "label", "labels", "name", "", "", null, null, true, false);
            var zip = new jszip();
            var datatypes = (await Db.query("client0", "SELECT * FROM datatypes;")).rows;
            zip.file("datatypes", JSON.stringify(datatypes));
            var zipfilebuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            var token = await th.defaults.login("portal_usergroup0_user0");
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', zipfilebuffer, null, 900000);
            assert.strictEqual(response.statusCode, 200);
            var clientname = response.body;
            var datatypesafterresult = await Db.query(clientname, "SELECT * FROM datatypes WHERE name='datatypesafter';");
            assert.strictEqual(datatypesafterresult.rowCount, 0);
        });

        it('Creates a client when ZIP file has correct structure (even without content)', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var zipfilebuffer = await eh.export("client0", false, false, false, "dummyprefix");
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', zipfilebuffer, null, 900000);
            assert.strictEqual(response.statusCode, 200);
            var clientname = response.body;
            assert.ok(clientname !== "Error");
            assert.ok(clientname.length > 0);
            var clientresult = await Db.query(Db.PortalDatabaseName, `SELECT 1 FROM clients WHERE name='${Db.replaceQuotesAndRemoveSemicolon(clientname)}';`);
            assert.strictEqual(clientresult.rowCount, 1);
        });

        it('Sets the label of the client when it was sent', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var zipfilebuffer = await eh.export("client0", false, false, false, "dummyprefix");
            var response = await wh.postFileToUrl(`${url}?token=${token}&label=MyClient`, 'clientpackage.zip', zipfilebuffer, null, 900000);
            var clientresult = await Db.query(Db.PortalDatabaseName, `SELECT * FROM clients WHERE name='${Db.replaceQuotesAndRemoveSemicolon(response.body)}';`);
            assert.strictEqual(clientresult.rows[0].label, "MyClient");
        });

        it('Creates datatypes when ZIP file contains datatype definitions', async() => {
            await Db.createDatatype("client0", "newdatatype", "label", "labels", "name", "", "", null, null, true, false);
            var zipfilebuffer = await eh.export("client0", true, false, false, "dummyprefix");
            var token = await th.defaults.login("portal_usergroup0_user0");
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', zipfilebuffer, null, 900000);
            var clientname = response.body;
            var datatypesafterresult = await Db.query(clientname, "SELECT * FROM datatypes WHERE name='newdatatype';");
            assert.strictEqual(datatypesafterresult.rowCount, 1);
        });

        it('Creates datatype fields when ZIP file contains datatype AND datatypefield definitions', async() => {
            await Db.createDatatype("client0", "newdatatype", "label", "labels", "name", "", "", null, null, true, false);
            await Db.createDatatypeField("client0", "newdatatype", "newdatatypefield", "label", co.fieldtypes.text, false, false, null, null, 0, true, false, false, true, 0);
            var zipfilebuffer = await eh.export("client0", true, false, false, "dummyprefix");
            var token = await th.defaults.login("portal_usergroup0_user0");
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', zipfilebuffer, null, 900000);
            var clientname = response.body;
            var datatypefieldsafterresult = await Db.query(clientname, "SELECT * FROM datatypefields WHERE name='newdatatypefield';");
            assert.strictEqual(datatypefieldsafterresult.rowCount, 1);
        });

        it('Does not create datatype fields when datatypefields are contained but datatypes are not contained', async() => {
            await Db.createDatatype("client0", "newdatatype", "label", "labels", "name", "", "", null, null, true, false);
            await Db.createDatatypeField("client0", "newdatatype", "newdatatypefield", "label", co.fieldtypes.text, false, false, null, null, 0, true, false, false, true, 0);
            var zip = new jszip();
            var datatypefields = (await Db.query("client0", "SELECT * FROM datatypefields;")).rows;
            zip.file("client0\\datatypefields", JSON.stringify(datatypefields));
            var zipfilebuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            var token = await th.defaults.login("portal_usergroup0_user0");
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', zipfilebuffer, null, 900000);
            assert.strictEqual(response.statusCode, 200);
            var clientname = response.body;
            var datatypefieldsafterresult = await Db.query(clientname, "SELECT * FROM datatypefields WHERE name='newdatatypefield';");
            assert.strictEqual(datatypefieldsafterresult.rowCount, 0);
        });

        it('Ignores datatype creation when datatypes file contains invalid content', async() => {
            var zip = new jszip();
            zip.file("client0\\datatypes", "invalidcontent");
            var zipfilebuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            var token = await th.defaults.login("portal_usergroup0_user0");
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', zipfilebuffer, null, 900000);
            assert.strictEqual(response.statusCode, 200);
            assert.notStrictEqual(response.body, "Error");
        });

        it('Ignores datatypefield creation when datatypefields file contains invalid content', async() => {
            var zip = new jszip();
            var datatypes = (await Db.query("client0", "SELECT * FROM datatypes;")).rows;
            zip.file("client0\\datatypes", JSON.stringify(datatypes));
            var datatypefields = (await Db.query("client0", "SELECT * FROM datatypefields;")).rows;
            zip.file("client0\\datatypefields", "invalidcontent");
            var zipfilebuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            var token = await th.defaults.login("portal_usergroup0_user0");
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', zipfilebuffer, null, 900000);
            assert.strictEqual(response.statusCode, 200);
            assert.notStrictEqual(response.body, "Error");
        });

        it('Creates database content when content folder was included', async() => {
            var token = await th.defaults.login("portal_usergroup0_user0");
            var zipfilebuffer = await eh.export("client0", false, true, false, "dummyprefix");
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', zipfilebuffer, null, 900000);
            var result = await Db.query(response.body, `SELECT * FROM documents;`);
            assert.ok(result.rowCount > 0);
        });

        it('Ignores content tables, for which no datatype exists', async() => {
            var zip = new jszip();
            var documents = (await Db.query("client0", "SELECT * FROM documents;")).rows;
            zip.file("client0\\content\\unknowndatatype", JSON.stringify(documents));
            var zipfilebuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            var token = await th.defaults.login("portal_usergroup0_user0");
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', zipfilebuffer, null, 900000);
            assert.strictEqual(response.statusCode, 200);
            assert.notStrictEqual(response.body, "Error");
        });

        it('Ignores content table fields, for which no datatype field exists', async() => {
            await Db.createDatatypeField("client0", "documents", "newdatatypefield", "labeldingens", co.fieldtypes.text, false, false, null, null, 0, true, false, false, true, 0);
            var zip = new jszip();
            var documents = (await Db.query("client0", "SELECT * FROM documents;")).rows;
            zip.file("client0\\content\\documents", JSON.stringify(documents));
            var zipfilebuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            await Db.deleteRecordTypeField("client0", "documents", "newdatatypefield");
            var token = await th.defaults.login("portal_usergroup0_user0");
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', zipfilebuffer, null, 900000);
            assert.strictEqual(response.statusCode, 200);
            assert.notStrictEqual(response.body, "Error");
            var result = await Db.query(response.body, `SELECT * FROM documents;`);
            assert.ok(result.rowCount > 0);
        });

        it('Ignores invalid content (wrong attribute type)', async() => {
            var zip = new jszip();
            var documents = [{ name:"client0_testdoc", isshared:"mustnotbeastring" }];
            zip.file("client0\\content\\documents", JSON.stringify(documents));
            var zipfilebuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            var token = await th.defaults.login("portal_usergroup0_user0");
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', zipfilebuffer, null, 900000);
            assert.strictEqual(response.statusCode, 200);
            assert.notStrictEqual(response.body, "Error");
        });

        it('does not insert formula values even if they are contained in the content table in the ZIP file', async() => {
            var zip = new jszip();
            var datatypes = (await Db.query("client0", "SELECT * FROM datatypes;")).rows;
            zip.file("client0\\datatypes", JSON.stringify(datatypes));
            var datatypefields = (await Db.query("client0", "SELECT * FROM datatypefields;")).rows;
            zip.file("client0\\datatypefields", JSON.stringify(datatypefields));
            var clientnulldatatypenull = (await Db.query("client0", "SELECT * FROM clientnulldatatypenull;")).rows;
            clientnulldatatypenull.find(e => e.name === "clientnulldatatypenullentity0").formula0 = 12345;
            // var documents = [{ name:"client0_testdoc", isshared:"mustnotbeastring" }];
            zip.file("client0\\content\\clientnulldatatypenull", JSON.stringify(clientnulldatatypenull));
            var zipfilebuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
            var token = await th.defaults.login("portal_usergroup0_user0");
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', zipfilebuffer, null, 900000);
            assert.strictEqual(response.statusCode, 200);
            var newclientname = response.body;
            assert.notStrictEqual(newclientname, "Error");
            var entity = await Db.getDynamicObject(newclientname, "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.notEqual(entity.formula0, 12345);
        });

        it('recalculates all formulas of the newly created client', async() => {
            var zipfilebuffer = await eh.export("client0", true, true, false, "dummyprefix");
            var token = await th.defaults.login("portal_usergroup0_user0");
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', zipfilebuffer, null, 900000);
            var newclientname = response.body;
            var entity = await Db.getDynamicObject(newclientname, "clientnulldatatypenull", "clientnulldatatypenullentity0");
            assert.strictEqual(entity.formula1, "234.567"); // Formula values are returned as strings
        });

        it('Extracts document files when they are contained in the "files" folder', async() => {
            var zipfilebuffer = await eh.export("client0", false, false, true, "dummyprefix");
            var token = await th.defaults.login("portal_usergroup0_user0");
            var response = await wh.postFileToUrl(`${url}?token=${token}`, 'clientpackage.zip', zipfilebuffer, null, 900000);
            var newclientname = response.body;
            var documentspath = dh.getDocumentPath(newclientname, "");
            assert.ok(fs.existsSync(documentspath));
            var files = fs.readdirSync(documentspath);
            assert.ok(files.length > 0);
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
