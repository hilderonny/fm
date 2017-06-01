// https://glebbahmutov.com/blog/how-to-correctly-unit-test-express-server/

var assert = require('assert');
var request = require('supertest');
describe('API login', function() {
    var server = require('../../app');
    it('responds to GET with 404', function(done) {
        request(server).get('/api/login')
        .expect(404, done);
    });
    it('responds to PUT with 404', function(done) {
        request(server).put('/api/login')
        .expect(404, done);
    });
    it('responds to DELETE with 404', function(done) {
        request(server).delete('/api/login')
        .expect(404, done);
    });
    it('responds to POST without arguments with 401', function(done) {
        request(server).post('/api/login')
        .expect(401, done);
    });
    it('responds to POST with wrong username with 401', function(done) {
        request(server).post('/api/login')
        .send({ 'username' : 'wrong', 'password' : 'wrong' })
        .expect(401, done);
    });
    it('responds to POST with wrong password with 401', function(done) {
        request(server).post('/api/login')
        .send({ 'username' : 'admin', 'password' : 'wrong' })
        .expect(401, done);
    });
    it('responds to POST with 1_0_0/test with 200 and token', function(done) { // The testhelper creates an 1_0_0/test user
        request(server).post('/api/login')
        .send({ 'username' : '1_0_0', 'password' : 'test' })
        .expect(200)
        .end(function(err, res) {
            assert.ok(res.body.token, 'no token in response');
            done();
        });
    });
});
