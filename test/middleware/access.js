'use strict'

var sinon = require('sinon')
var access = require('../../lib/middleware/access')
var assert = require('assert')

describe('access', function () {
  describe('returns (sync)', function () {
    it('adds access field to req', function (done) {
      var req = {}
      var accessFn = function () {
        return 'private'
      }

      access(accessFn)(req, {}, function (err) {
        assert.ifError(err)
        assert.equal(req.access, 'private')
        done()
      })
    })

    it('throws an exception with unsupported parameter', function () {
      var req = {}
      var next = sinon.spy()
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
    it('adds access field to req', function (done) {
      var req = {}
      var accessFn = function (req, cb) {
        return cb(null, 'private')
      }

      access(accessFn)(req, {}, function (err) {
        assert.ifError(err)
        assert.equal(req.access, 'private')
        done()
      })
    })

    it('calls next with an error', function (done) {
      var req = {}
      var error = new Error('Something bad happened')
      var accessFn = function (req, cb) {
        return cb(error, 'private')
      }

      access(accessFn)(req, {}, function (err) {
        assert.equal(err, error)
        assert.equal(req.access, undefined)
        done()
      })
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
