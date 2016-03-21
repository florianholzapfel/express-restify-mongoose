const assert = require('assert')
const CastError = require('mongoose/lib/error/cast')
const sinon = require('sinon')

describe('errorHandler', () => {
  const errorHandler = require('../../lib/errorHandler')

  it('is a function', () => {
    assert.equal(typeof errorHandler, 'function')
  })

  it('returns a function', () => {
    assert.equal(typeof errorHandler(), 'function')
  })

  it('returns a function that returns a function', () => {
    assert.equal(typeof errorHandler()(), 'function')
  })

  it('sets statusCode 400 and calls onError', () => {
    const options = {
      onError: sinon.spy()
    }

    const req = {
      erm: {},
      params: {}
    }

    const err = new Error('Something went wrong')

    errorHandler(options)(req)(err)

    sinon.assert.calledOnce(options.onError)
    assert.equal(req.erm.statusCode, 400)
  })

  it('sets statusCode 400 and calls onError', () => {
    const options = {
      onError: sinon.spy(),
      idProperty: '42'
    }

    const req = {
      erm: {},
      params: {
        id: '42'
      }
    }

    const err = new Error('Something went wrong')

    errorHandler(options)(req)(err)

    sinon.assert.calledOnce(options.onError)
    assert.equal(req.erm.statusCode, 400)
  })

  it('sets statusCode 404 and calls onError', () => {
    const options = {
      onError: sinon.spy(),
      idProperty: '_id'
    }

    const req = {
      erm: {},
      params: {
        id: '42'
      }
    }

    const err = new CastError('type', '42', '_id')

    errorHandler(options)(req)(err)

    sinon.assert.calledOnce(options.onError)
    assert.equal(req.erm.statusCode, 404)
  })
})
