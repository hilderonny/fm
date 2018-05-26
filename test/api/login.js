// https://glebbahmutov.com/blog/how-to-correctly-unit-test-express-server/
var assert = require('assert');
var th = require('../testhelpers');

describe('API login', () => {
    
    before(async() => {
        await th.cleanDatabase();
        await th.prepareClients();
    });

    beforeEach(async() => {
        await th.prepareClientModules();
        await th.prepareUserGroups();
        await th.prepareUsers();
        await th.preparePermissions();
    });

    it('responds to GET with 404', async() => {
        await th.get('/api/login').expect(404);
    });

    it('responds to PUT with 404', async() => {
        await th.put('/api/login').expect(404);
    });

    it('responds to DELETE with 404', async() => {
        await th.del('/api/login').expect(404);
    });

    it('responds to POST without arguments with 401', async() => {
        await th.post('/api/login').expect(401);
    });

    it('responds to POST with wrong username with 401', async() => {
        await th.post('/api/login').send({ username : 'wrong', password : 'test' }).expect(401);
    });

    it('responds to POST with wrong password with 401', async() => {
        await th.post('/api/login').send({ username : 'client0_usergroup0_user0', password : 'wrong' }).expect(401);
    });

    it('responds to POST with correct user with 200 and token', async() => {
        var body = (await th.post('/api/login').send({ username : 'client0_usergroup0_user0', password : 'test' }).expect(200)).body;
        assert.ok(body.token, 'no token in response');
    });

});
