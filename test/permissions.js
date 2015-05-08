'use strict';

var sinon = require('sinon'),
    setup = require('./setup'),
    middleware = require('../lib/permissions');

var assert = require('assertmessage');
var http = require('http');

var sandbox;
beforeEach(function (done) {
    if (sandbox) {
        sandbox.restore();
    }
    sandbox = sinon.sandbox.create();
    done();
});


describe('permissions', function () {
    var noop = function () {};
    var res = { send: noop };

    beforeEach(function () {
        this.mock = sandbox.mock(res);
        this.mock.expects('send').once()
          .withArgs(403, { msg: http.STATUS_CODES[403] });
    });

    describe('with prereq that returns', function () {
        it('passes', function (done) {
            var prereq = function () {
                return true;
            };

            middleware.allow(prereq)({}, res, function () {
                assert(true);
                done();
            });
        });

        it('fails', function (done) {
            var prereq = function () {
                return false;
            };

            middleware.allow(prereq, function () {
                assert(true);
                done();
            })({}, res);
        });
    });

    describe('with prereq that yields', function (done) {
        it('passes', function (done) {
            var prereq = function (req, cb) { cb(null, true); };

            middleware.allow(prereq)({}, res, function () {
                assert(true);
                done();
            });
        });

        it('fails', function (done) {
            var prereq = function (req, cb) { cb(null, false); };

            middleware.allow(prereq, function () {
                assert(true);
                done();
            })({}, res);
        });
    });

    describe('with access that returns', function () {
        it('adds access field to req', function (done) {
            var req = {},
                accessFn = function () {
                    return 'private';
                };

            middleware.access(accessFn)(req, {}, function () {
                assert.equal(req.access, 'private');
                done();
            });
        });
        
        it('throws an exception with unsupported parameter', function () {
            var req = {},
                next = sinon.spy(),
                accessFn = function () {
                    return 'foo';
                };
            
            assert.throws(function() {
                middleware.access(accessFn)(req, {}, next);
            }, 'Unsupported access, must be "public", "private" or "protected"');
            
            sinon.assert.notCalled(next);
        });
    });

    describe('with access that yields', function () {
        it('adds access field to req', function (done) {
            var req = {},
                accessFn = function (req, cb) {
                    return cb(null, 'private');
                };

            middleware.access(accessFn)(req, {}, function () {
                assert.equal(req.access, 'private');
                done();
            });
        });
        
        it('throws an exception with unsupported parameter', function () {
            var req = {},
                next = sinon.spy(),
                accessFn = function (req, cb) {
                    return cb(null, 'foo');
                };
            
            assert.throws(function() {
                middleware.access(accessFn)(req, {}, next);
            }, 'Unsupported access, must be "public", "private" or "protected"');
            
            sinon.assert.notCalled(next);
        });
    });
});
