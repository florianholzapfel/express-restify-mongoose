var erm = require('../lib/express-restify-mongoose');

var setup = require('./setup');

var assert = require('assertmessage'),
    async = require('async'),
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
                erm.serve(app, setup.customerModel, {
                    restify: app.isRestify,
                    lean: false
                });
                erm.serve(app, setup.invoiceModel, {
                    restify: app.isRestify,
                    lean: false
                });
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
                        savedInvoice = body[0];
                        savedInvoice.amount = 9.5;
                        assert.equal(res.statusCode, 200, 'Wrong status code');
                        assert.deepEqual(body[0].customer, savedCustomer);
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

                //here
                it('200 GET Customers/:id?select=name should not fetch ' +
                   'comment or address fields', function (done) {
                    request.get({
                        url: util.format('%s/api/v1/Customers/%s?select=name',
                                     testUrl,
                                     savedCustomer._id),
                        json: true
                    }, function (err, res, body) {
                        assert.equal(res.statusCode, 200, 'Wrong status code');
                        assert.equal('Test', body.name);
                        assert.equal(undefined, body.comment,
                                 'Comment field should not be included');
                        assert.equal(undefined, body.address,
                                 'Address field should not be included');
                        done();
                    });
                });

                it('200 GET Invoices/:id?populate=customer&select=' +
                   'customer.name,amount should not fetch ' +
                   'customer.comment field', function (done) {
                    request.get({
                        url: util.format('%s/api/v1/Invoices/%s?populate' +
                            '=customer&select=amount,customer.name',
                                         testUrl,
                                         savedInvoice._id),
                        json: true
                    }, function (err, res, body) {
                        assert.equal(res.statusCode, 200, 'Wrong status code');
                        assert.equal(9.5, body.amount);
                        assert.equal(undefined, body.products);
                        assert.equal(undefined, body.customer.comment);
                        assert.equal('Test', body.customer.name);
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
                savedCustomer.info = savedCustomer.name  + ' is awesome';
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

        describe('Return virtuals', function () {
            var savedCustomer, server,
                app = createFn();

            setup();

            before(function (done) {
                erm.serve(app, setup.customerModel, {
                    lean: false,
                    restify: app.isRestify
                });
                server = app.listen(testPort,  function () {
                    request.post({
                        url: util.format('%s/api/v1/Customers', testUrl),
                        json: {
                            name: 'Bob'
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
                var info = savedCustomer.name + ' is awesome';
                request.get({
                    url: util.format('%s/api/v1/Customers', testUrl),
                    json: true
                }, function (err, res, body) {
                    assert.equal(res.statusCode, 200, 'Wrong status code');
                    assert.equal(body[0].info, info, 'info is not defined');
                    done();
                });
            });
        });

        describe('Excluded comment field', function () {
            var savedCustomer, savedInvoice, server,
                app = createFn();

            setup();

            before(function (done) {
                erm.defaults({ restify: app.isRestify });

                erm.serve(app, setup.customerModel, {
                    'private': 'comment',
                    lean: false
                });
                erm.serve(app, setup.invoiceModel);

                server = app.listen(testPort, function () {
                    async.waterfall([function (next) {
                        request.post({
                            url: util.format('%s/api/v1/Customers', testUrl),
                            json: {
                                name: 'Test',
                                comment: 'Comment'
                            },
                        }, function (err, res, body) {
                            next(null, body);
                        });
                    }, function (customer, next) {
                        request.post({
                            url: util.format('%s/api/v1/Invoices', testUrl),
                            json: {
                                customer: customer._id,
                                amount: 42,
                                __version: 1
                            }
                        }, function (err, res, body) {
                            next(null, customer, body);
                        });
                    }], function (err, customer, invoice) {
                        savedCustomer = customer;
                        savedInvoice = invoice;
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
                it('excludes populated fields', function (done) {
                    request.get({
                        url: util.format('%s/api/v1/Invoices/%s', testUrl,
                                         savedInvoice._id),
                        qs: { populate: 'customer' },
                        json: true
                    }, function (err, res, body) {
                        assert.ok(body.customer._id, 'customer not populated');
                        assert.ok(body.customer.comment === undefined,
                            'comment is not undefined');
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

        describe('Use default options', function () {
            var server, postProcess,
              app = createFn();

            setup();

            before(function (done) {
                erm.defaults({version: '/custom'});

                erm.serve(app, setup.customerModel, {
                    lowercase: true,
                    restify: app.isRestify
                });

                server = app.listen(testPort, done);
            });

            after(function (done) {
                erm.defaults(null);

                if (app.close) {
                    return app.close(done);
                }

                server.close(done);
            });

            it('200 GET custom/customers', function (done) {
                request.get({
                    url: util.format('%s/api/custom/customers', testUrl),
                    json: true
                }, function (err, res, body) {
                    assert.equal(res.statusCode, 200, 'Wrong status code');
                    done();
                });
            });
        });

        describe('Prereqs', function () {
            describe('allowed', function (done) {
                var savedCustomer, server,
                    app = createFn();

                setup();

                before(function (done) {
                    erm.serve(app, setup.customerModel, {
                        prereq: function () { return true; },
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

                it('allows all GET requests', function (done) {
                    request.get({
                        url: util.format('%s/api/v1/Customers', testUrl),
                        json: true
                    }, function (err, res, body) {
                        assert.equal(res.statusCode, 200, 'Wrong status code');
                        done();
                    });
                });

                it('allows all POST requests', function (done) {
                    request.post({
                        url: util.format('%s/api/v1/Customers', testUrl),
                        json: {
                            name: 'Test',
                            comment: 'Comment',
                            _id: null
                        }
                    }, function (err, res, body) {
                        assert.equal(res.statusCode, 200, 'Wrong status code');
                        savedCustomer = body;
                        done();
                    });
                });

                it('allows all PUT requests', function (done) {
                    savedCustomer.name = 'Test 2';
                    savedCustomer.info = savedCustomer.name  + ' is awesome';
                    request.put({
                        url: util.format('%s/api/v1/Customers/%s', testUrl,
                        savedCustomer._id),
                        json: savedCustomer
                    }, function (err, res, body) {
                        assert.equal(res.statusCode, 200, 'Wrong status code');
                        done();
                    });
                });

                it('allows all DELETE requests', function (done) {
                    request.del({
                        url: util.format('%s/api/v1/Customers/%s', testUrl,
                        savedCustomer._id),
                        json: true
                    }, function (err, res) {
                        assert.equal(res.statusCode, 200, 'Wrong status code');
                        done();
                    });
                });
            });

            describe('not allowed', function (done) {
                var server,
                    app = createFn();

                setup();

                before(function (done) {
                    erm.serve(app, setup.customerModel, {
                        prereq: function () { return false; },
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

                it('allows all GET requests', function (done) {
                    request.get({
                        url: util.format('%s/api/v1/Customers', testUrl),
                        json: true
                    }, function (err, res) {
                        assert.equal(res.statusCode, 200, 'Wrong status code');
                        done();
                    });
                });

                it('blocks POST requests', function (done) {
                    request.post({
                        url: util.format('%s/api/v1/Customers', testUrl),
                        json: {
                            name: 'Test',
                            comment: 'Comment',
                            _id: null
                        }
                    }, function (err, res, body) {
                        assert.equal(res.statusCode, 403, 'Wrong status code');
                        done();
                    });
                });

                it('blocks PUT requests', function (done) {
                    request.put({
                        url: util.format('%s/api/v1/Customers/%s', testUrl,
                        43),
                        json: {
                            name: 'HI'
                        }
                    }, function (err, res, body) {
                        assert.equal(res.statusCode, 403, 'Wrong status code');
                        done();
                    });
                });

                it('blocks DELETE requests', function (done) {
                    request.del({
                        url: util.format('%s/api/v1/Customers/%s', testUrl,
                        43),
                        json: true
                    }, function (err, res) {
                        assert.equal(res.statusCode, 403, 'Wrong status code');
                        done();
                    });
                });
            });
        });

        describe('Access', function () {
            var savedCustomer, server, app, access;

            setup();

            before(function (done) {
                erm.defaults({
                    'private': 'address',
                    'protected': 'comment',
                });

                app = createFn();
                var accessFn = function () { return access; };

                erm.serve(app, setup.customerModel, {
                    restify: app.isRestify,
                    access: accessFn,
                });

                access = 'private';
                server = app.listen(testPort, function () {
                    request.post({
                        url: util.format('%s/api/v1/Customers', testUrl),
                        json: {
                            name: 'Test',
                            comment: 'Comment',
                            address: '123 Drury Lane'
                        },
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

                erm.defaults(null);
            });

            describe('public access', function () {
                before(function () {
                    access = 'public';
                });

                it('returns only public fields', function (done) {
                    request.get({
                        url: util.format('%s/api/v1/Customers/%s', testUrl,
                        savedCustomer._id),
                        json: true
                    }, function (err, res, body) {
                        assert.equal(body.name, 'Test');
                        assert.ok(body.address === undefined,
                            'address is not undefined');
                        assert.ok(body.comment === undefined,
                            'comment is not undefined');
                        done();
                    });
                });

                it('saves only public fields', function (done) {
                    request.post({
                        url: util.format('%s/api/v1/Customers', testUrl),
                        json: {
                            name: 'Test 2',
                            comment: 'Comment',
                            address: '123 Drury Lane'
                        },
                    }, function (err, res, body) {
                        var customer = body;

                        assert.equal(body.name, 'Test 2');
                        assert.ok(body.address === undefined,
                            'address is not undefined');
                        assert.ok(body.comment === undefined,
                            'comment is not undefined');

                        access = 'private';
                        request.get({
                            url: util.format('%s/api/v1/Customers/%s', testUrl,
                            customer._id),
                            json: true
                        }, function (err, res, body) {
                            assert.equal(body.name, 'Test 2');
                            assert.ok(body.address === undefined,
                                'address is not undefined');
                            assert.ok(body.comment === undefined,
                                'comment is not undefined');
                            done();
                        });
                    });
                });
            });

            describe('proteced access', function () {
                before(function () {
                    access = 'protected';
                });


                it('excludes private fields', function (done) {
                    request.get({
                        url: util.format('%s/api/v1/Customers/%s', testUrl,
                        savedCustomer._id),
                        json: true
                    }, function (err, res, body) {
                        assert.equal(body.name, 'Test');
                        assert.ok(body.address === undefined,
                            'address is not undefined');
                        assert.equal(body.comment, 'Comment');
                        done();
                    });
                });

                it('does not save private fields', function (done) {
                    request.post({
                        url: util.format('%s/api/v1/Customers', testUrl),
                        json: {
                            name: 'Test 3',
                            comment: 'Comment',
                            address: '123 Drury Lane'
                        },
                    }, function (err, res, body) {
                        var customer = body;

                        assert.equal(body.name, 'Test 3');
                        assert.ok(body.address === undefined,
                            'address is not undefined');
                        assert.equal(body.comment, 'Comment');

                        access = 'private';
                        request.get({
                            url: util.format('%s/api/v1/Customers/%s', testUrl,
                            customer._id),
                            json: true
                        }, function (err, res, body) {
                            assert.equal(body.name, 'Test 3');
                            assert.equal(body.comment, 'Comment');
                            assert.ok(body.address === undefined,
                                'address is not undefined');
                            done();
                        });
                    });
                });
            });

            describe('private access', function () {
                before(function () {
                    access = 'private';
                });

                it('returns all fields', function (done) {
                    request.get({
                        url: util.format('%s/api/v1/Customers/%s', testUrl,
                        savedCustomer._id),
                        json: true
                    }, function (err, res, body) {
                        assert.equal(body.name, 'Test');
                        assert.equal(body.address, '123 Drury Lane');
                        assert.equal(body.comment, 'Comment');
                        done();
                    });
                });

                it('saves all fields', function (done) {
                    request.post({
                        url: util.format('%s/api/v1/Customers', testUrl),
                        json: {
                            name: 'Test 4',
                            comment: 'Comment',
                            address: '123 Drury Lane'
                        },
                    }, function (err, res, body) {
                        var customer = body;

                        assert.equal(body.name, 'Test 4');
                        assert.equal(body.address, '123 Drury Lane');
                        assert.equal(body.comment, 'Comment');

                        request.get({
                            url: util.format('%s/api/v1/Customers/%s', testUrl,
                            customer._id),
                            json: true
                        }, function (err, res, body) {
                            assert.equal(body.name, 'Test 4');
                            assert.equal(body.address, '123 Drury Lane');
                            assert.equal(body.comment, 'Comment');

                            done();
                        });
                    });
                });
            });
        });
    });
});
