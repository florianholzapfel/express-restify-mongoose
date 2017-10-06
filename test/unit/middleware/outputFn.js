'use strict'

const sinon = require('sinon')

describe('outputFn', () => {
  const outputFn = require('../../../src/middleware/outputFn')

  let res = {
    sendStatus: function () {},
    status: function () {
      return this
    },
    json: function () {},
    send: function () {}
  }

  let sendStatus = sinon.spy(res, 'sendStatus')
  let status = sinon.spy(res, 'status')
  let json = sinon.spy(res, 'json')
  let send = sinon.spy(res, 'send')

  afterEach(() => {
    sendStatus.reset()
    status.reset()
    json.reset()
    send.reset()
  })

  describe('express', () => {
    it('sends status code and message', () => {
      outputFn(true)({
        erm: {
          statusCode: 200
        }
      }, res)

      sinon.assert.calledOnce(sendStatus)
      sinon.assert.calledWithExactly(sendStatus, 200)
      sinon.assert.notCalled(status)
      sinon.assert.notCalled(json)
      sinon.assert.notCalled(send)
    })

    it('sends data and status code', () => {
      let req = {
        erm: {
          statusCode: 201,
          result: {
            name: 'Bob'
          }
        }
      }

      outputFn(true)(req, res)

      sinon.assert.calledOnce(status)
      sinon.assert.calledWithExactly(status, 201)
      sinon.assert.calledOnce(json)
      sinon.assert.calledWithExactly(json, {
        name: 'Bob'
      })
      sinon.assert.notCalled(sendStatus)
      sinon.assert.notCalled(send)
    })
  })

  describe('restify', () => {
    it('sends status code', () => {
      outputFn(false)({
        erm: {
          statusCode: 200
        }
      }, res)

      sinon.assert.calledOnce(send)
      sinon.assert.calledWithExactly(send, 200, undefined)
      sinon.assert.notCalled(sendStatus)
      sinon.assert.notCalled(status)
      sinon.assert.notCalled(json)
    })

    it('sends data and status code', () => {
      let req = {
        erm: {
          statusCode: 201,
          result: {
            name: 'Bob'
          }
        }
      }

      outputFn(false)(req, res)

      sinon.assert.calledOnce(send)
      sinon.assert.calledWithExactly(send, 201, {
        name: 'Bob'
      })
      sinon.assert.notCalled(sendStatus)
      sinon.assert.notCalled(status)
      sinon.assert.notCalled(json)
    })
  })
})
