var assert = require('assert')
var sinon = require('sinon')

describe('ensureContentType', function () {
  var ensureContentType = require('../../lib/middleware/ensureContentType')

  var next = sinon.spy()

  afterEach(function () {
    next.reset()
  })

  it('calls next with an error (missing_content_type)', function () {
    var req = {
      headers: {}
    }

    var err = new Error('Bad Request')
    err.description = 'missing_content_type'
    err.statusCode = 400

    ensureContentType()(req, {}, next)

    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next, err)
    assert.equal(req.access, undefined)
  })

  it('calls next with an error (invalid_content_type)', function () {
    var req = {
      headers: {
        'content-type': 'invalid/type'
      }
    }

    var err = new Error('Bad Request')
    err.description = 'invalid_content_type'
    err.statusCode = 400

    ensureContentType()(req, {}, next)

    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next, err)
    assert.equal(req.access, undefined)
  })

  it('calls next', function () {
    var req = {
      headers: {
        'content-type': 'application/json'
      }
    }

    ensureContentType()(req, {}, next)

    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
  })
})
