var assert = require('assert')
var sinon = require('sinon')

describe('access', function () {
  var access = require('../../../lib/middleware/access')

  var next = sinon.spy()

  afterEach(function () {
    next.reset()
  })

  describe('returns (sync)', function () {
    it('adds access field to req', function () {
      var req = {}

      access({
        access: function () {
          return 'private'
        }
      })(req, {}, next)

      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      assert.equal(req.access, 'private')
    })

    it('throws an exception with unsupported parameter', function () {
      var req = {}

      assert.throws(function () {
        access({
          access: function () {
            return 'foo'
          }
        })(req, {}, next)
      }, 'Unsupported access, must be "public", "private" or "protected"')

      sinon.assert.notCalled(next)
      assert.equal(req.access, undefined)
    })
  })

  describe('yields (async)', function () {
    it('adds access field to req', function () {
      var req = {}

      access({
        access: function (req, cb) {
          return cb(null, 'private')
        }
      })(req, {}, next)

      sinon.assert.calledOnce(next)
      sinon.assert.calledWithExactly(next)
      assert.equal(req.access, 'private')
    })

    it('calls onError', function () {
      var req = {}
      var onError = sinon.spy()
      var err = new Error('Something bad happened')

      access({
        access: function (req, cb) {
          return cb(err, 'private')
        },
        onError: onError
      })(req, {}, next)

      sinon.assert.calledOnce(onError)
      sinon.assert.calledWithExactly(onError, err, req, {}, next)
      sinon.assert.notCalled(next)
      assert.equal(req.access, undefined)
    })

    it('throws an exception with unsupported parameter', function () {
      var req = {}

      assert.throws(function () {
        access({
          access: function (req, cb) {
            return cb(null, 'foo')
          }
        })(req, {}, next)
      }, 'Unsupported access, must be "public", "private" or "protected"')

      sinon.assert.notCalled(next)
      assert.equal(req.access, undefined)
    })
  })
})
