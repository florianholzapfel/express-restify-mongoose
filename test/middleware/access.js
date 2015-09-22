var assert = require('assert')
var sinon = require('sinon')

describe('access', function () {
  var access = require('../../lib/middleware/access')

  var next = sinon.spy()

  afterEach(function () {
    next.reset()
  })

  describe('returns (sync)', function () {
    it('adds access field to req', function () {
      var req = {}
      var accessFn = function () {
        return 'private'
      }

      access(accessFn)(req, {}, next)

      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      assert.equal(req.access, 'private')
    })

    it('throws an exception with unsupported parameter', function () {
      var req = {}
      var accessFn = function () {
        return 'foo'
      }

      assert.throws(function () {
        access(accessFn)(req, {}, next)
      }, 'Unsupported access, must be "public", "private" or "protected"')

      sinon.assert.notCalled(next)
    })
  })

  describe('yields (async)', function () {
    it('adds access field to req', function () {
      var req = {}
      var accessFn = function (req, cb) {
        return cb(null, 'private')
      }

      access(accessFn)(req, {}, next)

      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      assert.equal(req.access, 'private')
    })

    it('calls next with an error', function () {
      var req = {}
      var err = new Error('Something bad happened')
      var accessFn = function (req, cb) {
        return cb(err, 'private')
      }

      access(accessFn)(req, {}, next)

      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next, err)
      assert.equal(req.access, undefined)
    })

    it('throws an exception with unsupported parameter', function () {
      var req = {}
      var next = sinon.spy()
      var accessFn = function (req, cb) {
        return cb(null, 'foo')
      }

      assert.throws(function () {
        access(accessFn)(req, {}, next)
      }, 'Unsupported access, must be "public", "private" or "protected"')

      sinon.assert.notCalled(next)
    })
  })
})
