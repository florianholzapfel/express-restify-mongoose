var assert = require('assert')
var sinon = require('sinon')

describe('ensureContentType', function () {
  var ensureContentType = require('../../lib/middleware/ensureContentType')

  var onError = sinon.spy()
  var next = sinon.spy()

  afterEach(function () {
    onError.reset()
    next.reset()
  })

  it('calls next with an error (missing_content_type)', function () {
    var req = {
      headers: {}
    }

    var err = new Error('Bad Request')
    err.description = 'missing_content_type'
    err.statusCode = 400

    ensureContentType({
      onError: onError
    })(req, {}, next)

    sinon.assert.calledOnce(onError)
    sinon.assert.calledWithExactly(onError, err, req, {}, next)
    sinon.assert.notCalled(next)
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

    ensureContentType({
      onError: onError
    })(req, {}, next)

    sinon.assert.calledOnce(onError)
    sinon.assert.calledWithExactly(onError, err, req, {}, next)
    sinon.assert.notCalled(next)
    assert.equal(req.access, undefined)
  })

  it('calls next', function () {
    var req = {
      headers: {
        'content-type': 'application/json'
      }
    }

    ensureContentType({
      onError: onError
    })(req, {}, next)

    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
  })
})
