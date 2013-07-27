var erm = require('../lib/express-restify-mongoose');

var assert   = require('assertmessage'),
    express  = require('express'),
    mongoose = require('mongoose'),
    request  = require('request'),
    Schema   = mongoose.Schema;

var util = require('util');

var testPort = 30023,
    testUrl  = 'http://localhost:' + testPort;

describe('express tests', function () {

    var app, server;

    before(function (done) {
        var Customer = new Schema({
            name: { type: String, required: true },
            comment: { type: String }
        });
        var CustomerModel = mongoose.model('Customer', Customer);

        mongoose.connect('mongodb://localhost/database', function (err) {
            assert(!err, err);
            CustomerModel.remove(function () {
                app = express();
                app.use(express.bodyParser());
                app.use(express.methodOverride());
                erm.serve(app, CustomerModel);
                server = app.listen(testPort, done);
            });
        });
    });

    after(function (done) {
        server.close(done);
    });

    it('200 get Customers', function (done) {
        request.get({
            url: util.format('%s/api/v1/Customers', testUrl)
        }, function (err, res, body) {
            assert.equal(res.statusCode, 200, 'Wrong status code');
            done();
        });
    });

    it('200 get Customers/count', function (done) {
        request.get({
            url: util.format('%s/api/v1/Customers/count', testUrl),
            json: true
        }, function (err, res, body) {
            assert.equal(res.statusCode, 200, 'Wrong status code');
            assert.equal(body.count, 0, 'Wrong count');
            done();
        });
    });

    it('200 post Customers', function (done) {
        request.post({
            url: util.format('%s/api/v1/Customers', testUrl),
            json: {
                name: 'Test',
                comment: 'Comment'
            }
        }, function (err, res, body) {
            assert.equal(res.statusCode, 200, 'Wrong status code');
            assert.equal(body.name, 'Test');
            assert.equal(body.comment, 'Comment');
            done();
        });
    });

    it('200 PUT Customers/:id');
    it('200 GET Customers/:id');
    it('200 DEL Customers/:id');
});