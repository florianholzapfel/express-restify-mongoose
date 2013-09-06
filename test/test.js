var erm = require('../lib/express-restify-mongoose');

var setup = require('./setup');

var assert = require('assertmessage'),
    express = require('express'),
    mongoose = require('mongoose'),
    restify = require('restify'),
    request = require('request'),
    Schema = mongoose.Schema;

var util = require('util');

require('sugar');

var testPort = 30023,
    testUrl = 'http://localhost:' + testPort;

function Express() {
    var app = express();
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    return app;
}
function Restify() {
    var app = restify.createServer();
    app.use(restify.queryParser());
    app.use(restify.bodyParser());
    app.isRestify = true;
    return app;
}

[Express, Restify].each(function (createFn) {
    describe(createFn.name, function () {
        describe('General', function () {
            var savedCustomer, savedInvoice, server,
                app = createFn();

            setup();

            before(function (done) {
                erm.serve(app, setup.customerModel, { restify: app.isRestify });
                erm.serve(app, setup.invoiceModel, { restify: app.isRestify });
                server = app.listen(testPort, done);
            });

            after(function (done) {
                if (app.close) {
                    return app.close(done);
                }
                server.close(done);
            });
            
            it('200 GET Customers should return no objects', function (done) {
                request.get({
                    url: util.format('%s/api/v1/Customers', testUrl),
                    json: true
                }, function (err, res, body) {
                    assert.equal(res.statusCode, 200, 'Wrong status code');
                    assert.equal(body.length, 0, 'Answer is not empty');
                    done();
                });
            });

            it('200 GET Customers/count should return 0', function (done) {
                request.get({
                    url: util.format('%s/api/v1/Customers/count', testUrl),
                    json: true
                }, function (err, res, body) {
                    assert.equal(res.statusCode, 200, 'Wrong status code');
                    assert.equal(body.count, 0, 'Wrong count');
                    done();
                });
            });

            it('200 POST Customers', function (done) {
                request.post({
                    url: util.format('%s/api/v1/Customers', testUrl),
                    json: {
                        name: 'Test',
                        comment: 'Comment',
                        _id: null
                    }
                }, function (err, res, body) {
                    assert.equal(res.statusCode, 200, 'Wrong status code');
                    assert.ok(body._id, '_id is not set');
                    assert.equal(body.name, 'Test');
                    assert.equal(body.comment, 'Comment');
                    savedCustomer = body;
                    done();
                });
            });

            it('200 POST 2 Customers', function (done) {
                request.post({
                    url: util.format('%s/api/v1/Customers', testUrl),
                    json: [{
                        name: 'First Customer',
                        comment: 'Comment'
                    }, {
                        name: 'Second Customer',
                        comment: 'Comment 2'
                    }]
                }, function (err, res, body) {
                    assert.equal(res.statusCode, 200, 'Wrong status code');
                    assert.ok(Array.isArray(body));
                    assert.equal(body.length, 2);
                    done();
                });
            });

            it('200 GET Customers should return 3 objects',
            function (done) {
                request.get({
                    url: util.format('%s/api/v1/Customers', testUrl),
                    json: true
                }, function (err, res, body) {
                    assert.equal(res.statusCode, 200, 'Wrong status code');
                    assert.equal(body.length, 3, 'Wrong count');
                    done();
                });
            });
            
            it('200 GET Customers/count should return 3', function (done) {
                request.get({
                    url: util.format('%s/api/v1/Customers/count', testUrl),
                    json: true
                }, function (err, res, body) {
                    assert.equal(res.statusCode, 200, 'Wrong status code');
                    assert.equal(body.count, 3, 'Wrong count');
                    done();
                });
            });
            
            it('200 POST Invoice using pre-defined version', function (done) {
                request.post({
                    url: util.format('%s/api/v1/Invoices', testUrl),
                    json: {
                        customer: savedCustomer._id,
                        amount: 8.5,
                        __version: 1
                    }
                }, function (err, res, body) {
                    assert.equal(res.statusCode, 200, 'Wrong status code');
                    assert.ok(body._id, '_id is not set');
                    assert.equal(body.customer, savedCustomer._id);
                    assert.equal(body.amount, 8.5);
                    savedInvoice = body;
                    done();
                });
            });

            // disable those tests for express, because restify modifies
            // the prototype of the global Request object. Such an object
            // is also defined by express. This breaks express' request.query
            if (app.isRestify) {
                it('200 GET Customers?limit=1 should return 1 object',
                function (done) {
                    request.get({
                        url: util.format('%s/api/v1/Customers', testUrl),
                        qs: {
                            limit: 1
                        },
                        json: true
                    }, function (err, res, body) {
                        assert.equal(res.statusCode, 200, 'Wrong status code');
                        assert.equal(body.length, 1, 'Wrong count');
                        done();
                    });
                });

                it('200 GET Customers?skip=2 should return 1 object',
                function (done) {
                    request.get({
                        url: util.format('%s/api/v1/Customers', testUrl),
                        qs: {
                            skip: 2
                        },
                        json: true
                    }, function (err, res, body) {
                        assert.equal(res.statusCode, 200, 'Wrong status code');
                        assert.equal(body.length, 1, 'Wrong count');
                        done();
                    });
                });

                it('200 GET Customers?name=Test', function (done) {
                    request.get({
                        url: util.format('%s/api/v1/Customers', testUrl),
                        qs: {
                            name: 'Test'
                        },
                        json: true
                    }, function (err, res, body) {
                        assert.equal(res.statusCode, 200, 'Wrong status code');
                        assert.equal(body.length, 1,
                            'Wrong count of customers returned');
                        assert.deepEqual(savedCustomer, body[0]);
                        done();
                    });
                });

                it('200 GET Customers?name=Test', function (done) {
                    request.get({
                        url: util.format('%s/api/v1/Customers', testUrl),
                        qs: {
                            name: 'Test'
                        },
                        json: true
                    }, function (err, res, body) {
                        assert.equal(res.statusCode, 200, 'Wrong status code');
                        assert.equal(body.length, 1,
                            'Wrong count of customers returned');
                        assert.deepEqual(savedCustomer, body[0]);
                        done();
                    });
                });

                it('200 GET Invoices?populate=customer should populate ' +
                    'customer', function (done) {
                    request.get({
                        url: util.format('%s/api/v1/Invoices', testUrl),
                        qs: {
                            populate: 'customer'
                        },
                        json: true
                    }, function (err, res, body) {
                        assert.equal(res.statusCode, 200, 'Wrong status code');
                        assert.deepEqual(body[0].customer, savedCustomer);
                        savedInvoice = body[0];
                        savedInvoice.amount = 9.5;
                        done();
                    });
                });

                it('200 POST Updated and populated Invoice', function (done) {
                    request.post({
                        url: util.format('%s/api/v1/Invoices/%s', testUrl,
                        savedInvoice._id),
                        json: savedInvoice
                    }, function (err, res, body) {
                        assert.equal(res.statusCode, 200, 'Wrong status code');
                        assert.equal(body.amount, 9.5);
                        done();
                    });
                });
            }

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

            it('200 POST Customers/:id', function (done) {
                request.post({
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

            it('404 on deleted Customers/:id', function (done) {
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

        describe('Excluded comment field', function () {
            var savedCustomer, server,
                app = createFn();

            setup();

            before(function (done) {
                erm.serve(app, setup.customerModel, {
                    exclude: 'comment',
                    restify: app.isRestify
                });
                server = app.listen(testPort, function () {
                    request.post({
                        url: util.format('%s/api/v1/Customers', testUrl),
                        json: {
                            name: 'Test',
                            comment: 'Comment'
                        }
                    }, function (err, res, body) {
                        savedCustomer = body;

                        done();
                    });
                });
            });

            after(function (done) {
                if (app.close) {
                    return app.close(done);
                }
                server.close(done);
            });

            it('200 GET Customers', function (done) {
                request.get({
                    url: util.format('%s/api/v1/Customers', testUrl),
                    json: true
                }, function (err, res, body) {
                    assert.equal(res.statusCode, 200, 'Wrong status code');
                    assert.ok(body[0], 'no items found');
                    assert.ok(body[0].comment === undefined,
                        'comment is not undefined');

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
                    assert.ok(body, 'no item found');
                    assert.deepEqual(savedCustomer, body);
                    assert.ok(body.comment === undefined,
                        'comment is not undefined');
                    done();
                });
            });

            // see comment above
            if (app.isRestify) {
                it('400 GET Customers?comment=Comment should return HTTP 400',
                    function (done) {
                    request.get({
                        url: util.format('%s/api/v1/Customers', testUrl),
                        qs: {
                            comment: 'Comment'
                        },
                        json: true
                    }, function (err, res, body) {
                        assert.equal(res.statusCode, 400, 'Wrong status code');
                        done();
                    });
                });
            }
        });

        describe('Lower case model name', function () {
            var savedCustomer, server,
                app = createFn();

            // only restify's routes are case sensitive
            if (app.isRestify) {
                setup();

                before(function (done) {
                    erm.serve(app, setup.customerModel, {
                        lowercase: true,
                        restify: app.isRestify
                    });
                    server = app.listen(testPort, done);
                });

                after(function (done) {
                    if (app.close) {
                        return app.close(done);
                    }
                    server.close(done);
                });

                it('200 GET customers', function (done) {
                    request.get({
                        url: util.format('%s/api/v1/customers', testUrl),
                        json: true
                    }, function (err, res, body) {
                        assert.equal(res.statusCode, 200, 'Wrong status code');
                        done();
                    });
                });

                it('404 GET Customers', function (done) {
                    request.get({
                        url: util.format('%s/api/v1/Customers', testUrl),
                        json: true
                    }, function (err, res, body) {
                        assert.equal(res.statusCode, 404, 'Wrong status code');
                        done();
                    });
                });
            }
        });

        describe('postProcess', function () {
            var savedCustomer, server, postProcess,
                app = createFn();

            setup();

            before(function (done) {
                erm.serve(app, setup.customerModel, {
                    restify: app.isRestify,
                    postProcess: function (req, res) {
                        postProcess(null, req, res);
                    }
                });
                server = app.listen(testPort, done);
            });

            after(function (done) {
                if (app.close) {
                    return app.close(done);
                }
                server.close(done);
            });

            it('GET', function (done) {
                postProcess = done;
                request.get(util.format('%s/api/v1/Customers', testUrl));
            });

            it('POST', function (done) {
                postProcess = done;
                request.post({
                    url: util.format('%s/api/v1/Customers', testUrl),
                    json: {
                        name: 'Test',
                        comment: 'Comment'
                    }
                }, function (err, res, body) {
                    savedCustomer = body;
                });
            });

            it('GET count', function (done) {
                postProcess = done;
                request.get({
                    url: util.format('%s/api/v1/Customers/count', testUrl),
                    json: true
                });
            });

            it('DELETE', function (done) {
                postProcess = done;
                request.del({
                    url: util.format('%s/api/v1/Customers/%s', testUrl,
                        savedCustomer._id),
                    json: true
                });
            });

        });
    });
});
