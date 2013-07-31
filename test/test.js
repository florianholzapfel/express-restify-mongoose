var erm = require('../lib/express-restify-mongoose');

var setup = require('./setup');

var assert   = require('assertmessage'),
    express  = require('express'),
    mongoose = require('mongoose'),
    restify  = require('restify'),
    request  = require('request'),
    Schema   = mongoose.Schema;

var util = require('util');

require('sugar');

var testPort = 30023,
    testUrl  = 'http://localhost:' + testPort;

var expressApp = express();
expressApp.use(express.bodyParser());
expressApp.use(express.methodOverride());
expressApp.describe = 'Express';

var restifyApp = restify.createServer();
restifyApp.use(restify.bodyParser());
restifyApp.describe = 'Restify';

[expressApp, restifyApp].each(function (app) {
    describe(app.describe, function () {

        var savedCustomer, server;
        setup();

        before(function (done) {
            erm.serve(app, setup.customerModel);
            server = app.listen(testPort, done);
        });

        after(function (done) {
            mongoose.connection.close(done);
        });
        after(function (done) {
            if (app.close) {
                return app.close(done);
            }
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
                savedCustomer = body;
                done();
            });
        });

        it('200 GET Customers/:id', function (done) {
            request.get({
                url: util.format('%s/api/v1/Customers/%s', testUrl,
                    savedCustomer._id),
                json: true
            }, function (err, res, body) {
                assert.equal(res.statusCode, 200, 'Wrong status code');
                assert.deepEqual(savedCustomer, body);
                done();
            });
        });

        it('200 PUT Customers/:id', function (done) {
            savedCustomer.name = 'Test 2';
            request.put({
                url: util.format('%s/api/v1/Customers/%s', testUrl,
                    savedCustomer._id),
                json: savedCustomer
            }, function (err, res, body) {
                assert.equal(res.statusCode, 200, 'Wrong status code');
                assert.deepEqual(savedCustomer, body);
                done();
            });
        });

        it('200 DEL Customers/:id', function (done) {
            request.del({
                url: util.format('%s/api/v1/Customers/%s', testUrl,
                    savedCustomer._id),
                json: true
            }, function (err, res) {
                assert.equal(res.statusCode, 200, 'Wrong status code');
                done();
            });
        });

        it('404s on deleted Customers/:id', function (done) {
            request.get({
                url: util.format('%s/api/v1/Customers/%s', testUrl,
                    savedCustomer._id),
                json: true
            }, function (err, res, body) {
                assert.equal(res.statusCode, 404, 'Wrong status code');
                done();
            });
        });
    });
});

