/* global describe, beforeEach, it */
'use strict'

var sinon = require('sinon')
var middleware = require('../lib/permissions')
var assert = require('assertmessage')
var http = require('http')

var sandbox
beforeEach(function (done) {
  if (sandbox) {
    sandbox.restore()
  }
  sandbox = sinon.sandbox.create()
  done()
})

describe('permissions', function () {
  var noop = function () {}
  var res = { send: noop }

  beforeEach(function () {
    this.mock = sandbox.mock(res)
    this.mock.expects('send').once()
      .withArgs(403, { msg: http.STATUS_CODES[403] })
  })

  describe('with access that returns', function () {
    it('adds access field to req', function (done) {
      var req = {}
      var accessFn = function () {
        return 'private'
      }

      middleware.access(accessFn)(req, {}, function () {
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
        middleware.access(accessFn)(req, {}, next)
      }, 'Unsupported access, must be "public", "private" or "protected"')

      sinon.assert.notCalled(next)
    })
  })

  describe('with access that yields', function () {
    it('adds access field to req', function (done) {
      var req = {}
      var accessFn = function (req, cb) {
        return cb(null, 'private')
      }

      middleware.access(accessFn)(req, {}, function () {
        assert.equal(req.access, 'private')
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
        middleware.access(accessFn)(req, {}, next)
      }, 'Unsupported access, must be "public", "private" or "protected"')

      sinon.assert.notCalled(next)
    })
  })
})
