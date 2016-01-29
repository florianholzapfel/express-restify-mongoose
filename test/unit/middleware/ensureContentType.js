const assert = require('assert')
const sinon = require('sinon')

describe('ensureContentType', () => {
  const ensureContentType = require('../../../lib/middleware/ensureContentType')

  let onError = sinon.spy()
  let next = sinon.spy()

  afterEach(() => {
    onError.reset()
    next.reset()
  })

  it('calls next with an error (missing_content_type)', () => {
    let req = {
      headers: {}
    }

    let err = new Error('Bad Request')
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

  it('calls next with an error (invalid_content_type)', () => {
    let req = {
      headers: {
        'content-type': 'invalid/type'
      }
    }

    let err = new Error('Bad Request')
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

  it('calls next', () => {
    let req = {
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
