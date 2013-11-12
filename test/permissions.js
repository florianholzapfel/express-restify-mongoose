var sinon = require('sinon'),
    setup = require('./setup'),
    middleware = require('../lib/permissions');

var assert = require('assertmessage');

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
          .withArgs(403, { msg: 'Unauthorized' });
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

        it('fails', function () {
            var prereq = function () {
                return false;
            };

            middleware.allow(prereq)({}, res);
            this.mock.verify();
        });
    });

    describe('with prereq that yields', function (done) {
        it('passes', function (done) {
            var prereq = function (req, cb) { cb(true); };

            middleware.allow(prereq)({}, res, function () {
                assert(true);
                done();
            });
        });

        it('fails', function () {
            var prereq = function (req, cb) { cb(false); };

            middleware.allow(prereq)({}, res);
            this.mock.verify();
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
    });

    describe('with access that yields', function () {
        it('adds access field to req', function (done) {
            var req = {},
                accessFn = function (req, cb) {
                    return cb('private');
                };

            middleware.access(accessFn)(req, {}, function () {
                assert.equal(req.access, 'private');
                done();
            });
        });
    });
});
