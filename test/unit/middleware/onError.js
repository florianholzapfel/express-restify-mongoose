'use strict'

const sinon = require('sinon')

describe('onError', () => {
  const onError = require('../../../src/middleware/onError')

  const req = {
    erm: {
      statusCode: 500
    }
  }

  let res = {
    setHeader: () => {},
    status: function () {
      return this
    },
    send: () => {}
  }

  let setHeader = sinon.spy(res, 'setHeader')
  let status = sinon.spy(res, 'status')
  let send = sinon.spy(res, 'send')
  let next = sinon.spy()

  afterEach(() => {
    setHeader.reset()
    status.reset()
    send.reset()
    next.reset()
  })

  it('with express', () => {
    onError(true)(new Error('An error occurred'), req, res, next)

    sinon.assert.calledOnce(setHeader)
    sinon.assert.calledWithExactly(setHeader, 'Content-Type', 'application/json')
    sinon.assert.calledOnce(status)
    sinon.assert.calledWithExactly(status, 500)
    sinon.assert.calledOnce(send)
    sinon.assert.calledWithExactly(send, {
      message: 'An error occurred',
      name: 'Error'
    })
    sinon.assert.notCalled(next)
  })

  it('with restify', () => {
    onError(false)(new Error('An error occurred'), req, res, next)

    sinon.assert.calledOnce(setHeader)
    sinon.assert.calledWithExactly(setHeader, 'Content-Type', 'application/json')
    sinon.assert.notCalled(status)
    sinon.assert.calledOnce(send)
    sinon.assert.calledWithExactly(send, 500, {
      message: 'An error occurred',
      name: 'Error'
    })
    sinon.assert.notCalled(next)
  })
})
