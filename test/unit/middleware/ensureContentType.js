'use strict'

const assert = require('assert')
const sinon = require('sinon')

describe('ensureContentType', () => {
  const ensureContentType = require('../../../src/middleware/ensureContentType')

  let onError = sinon.spy()
  let next = sinon.spy()

  afterEach(() => {
    onError.resetHistory()
    next.resetHistory()
  })

  it('calls next with an error (missing_content_type)', () => {
    let req = {
      erm: {},
      headers: {},
      params: {},
    }

    ensureContentType({ onError })(req, {}, next)

    sinon.assert.calledOnce(onError)
    sinon.assert.calledWithExactly(onError, sinon.match.instanceOf(Error) /*new Error('missing_content_type')*/, req, {}, next)
    sinon.assert.notCalled(next)
    assert.equal(req.access, undefined)
  })

  it('calls next with an error (invalid_content_type)', () => {
    let req = {
      erm: {},
      headers: {
        'content-type': 'invalid/type',
      },
      params: {},
    }

    ensureContentType({ onError })(req, {}, next)

    sinon.assert.calledOnce(onError)
    sinon.assert.calledWithExactly(onError, sinon.match.instanceOf(Error) /*new Error('invalid_content_type')*/, req, {}, next)
    sinon.assert.notCalled(next)
    assert.equal(req.access, undefined)
  })

  it('calls next', () => {
    let req = {
      headers: {
        'content-type': 'application/json',
      },
      params: {},
    }

    ensureContentType({ onError })(req, {}, next)

    sinon.assert.calledOnce(next)
    sinon.assert.calledWithExactly(next)
  })
})
