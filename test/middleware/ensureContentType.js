'use strict'

var ensureContentType = require('../../lib/middleware/ensureContentType')
var assert = require('assert')

describe('ensureContentType', function () {
  it('calls next with an error (missing_content_type)', function (done) {
    var req = {
      headers: {}
    }

    ensureContentType()(req, {}, function (err) {
      assert.ok(err)
      assert.equal(err.description, 'missing_content_type')
      assert.equal(err.message, 'Bad Request')
      assert.equal(err.statusCode, 400)
      assert.equal(req.access, undefined)
      done()
    })
  })

  it('calls next with an error (invalid_content_type)', function (done) {
    var req = {
      headers: {
        'content-type': 'invalid/type'
      }
    }

    ensureContentType()(req, {}, function (err) {
      assert.ok(err)
      assert.equal(err.description, 'invalid_content_type')
      assert.equal(err.message, 'Bad Request')
      assert.equal(err.statusCode, 400)
      assert.equal(req.access, undefined)
      done()
    })
  })

  it('calls next', function (done) {
    var req = {
      headers: {
        'content-type': 'application/json'
      }
    }

    ensureContentType()(req, {}, function (err) {
      assert.ifError(err)
      done()
    })
  })
})
